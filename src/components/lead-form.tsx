"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  LeadFormSchema,
  type LeadFormInput,
  US_STATES,
} from "@/lib/validation/lead-schema";
import { CONSENT_TEXT } from "@/lib/consent";

type SubmitState = "idle" | "submitting" | "success" | "error";

// Step → fields validated by RHF before "Next" is allowed.
// Note: is_homeowner intentionally omitted — its handling is special
// (homeowner=no → off-ramp, doesn't satisfy the literal(true) schema rule).
const STEP_FIELDS: ReadonlyArray<ReadonlyArray<keyof LeadFormInput>> = [
  ["mortgage_balance"],
  ["age", "is_smoker"],
  ["state"],
  ["first_name", "last_name"],
  ["phone", "email", "best_time_to_call"],
  ["consent"],
];

const TOTAL_STEPS = STEP_FIELDS.length;

export function LeadForm() {
  // form_loaded_at is stable across re-renders so the 3s honeypot timing
  // check on the server measures from initial mount, not from the last render.
  const formLoadedAt = useMemo(() => Date.now(), []);

  const [step, setStep] = useState(0);
  const [offRamp, setOffRamp] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submittedFirstName, setSubmittedFirstName] = useState<string>("");
  // Local UI state for the homeowner choice. is_homeowner is z.literal(true)
  // in the schema so RHF can't represent the "false" answer. We track the
  // raw choice here, only mirror to RHF when the answer is true.
  const [homeownerChoice, setHomeownerChoice] = useState<boolean | undefined>(undefined);
  const [homeownerError, setHomeownerError] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    trigger,
    formState: { errors },
  } = useForm<LeadFormInput>({
    resolver: zodResolver(LeadFormSchema),
    mode: "onTouched",
    defaultValues: {
      mortgage_balance: 250_000,
      first_name: "",
      last_name: "",
      phone: "",
      email: "",
      // consent + is_homeowner deliberately omitted — both are z.literal(true)
      // in the schema. Defaulting them to true would pre-check the checkbox
      // (TCPA violation) and lying with `as true` would be a footgun.
      // Undefined → unchecked by default, validated on submit.
      form_loaded_at: formLoadedAt,
      honeypot: "",
    },
  });

  const balance = watch("mortgage_balance");
  const isSmoker = watch("is_smoker");
  const bestTime = watch("best_time_to_call");

  async function next() {
    // Special case: homeowner question on step 2 (index). is_homeowner is
    // z.literal(true) at the schema level — RHF can't represent "false".
    // homeownerChoice is local UI state; we only mirror to RHF on Yes.
    if (step === 2) {
      if (homeownerChoice === undefined) {
        setHomeownerError(true);
        return;
      }
      if (homeownerChoice === false) {
        setOffRamp(true);
        return;
      }
      const ok = await trigger("state");
      if (!ok) return;
      setStep((s) => s + 1);
      return;
    }

    const ok = await trigger(STEP_FIELDS[step] as Array<keyof LeadFormInput>);
    if (!ok) return;
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }

  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function onSubmit(data: LeadFormInput) {
    setSubmitState("submitting");

    // Capture UTM + Meta click ids from the URL at submit time.
    const params =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : new URLSearchParams();
    const attribution = {
      utm_source: params.get("utm_source") || undefined,
      utm_campaign: params.get("utm_campaign") || undefined,
      utm_adset: params.get("utm_adset") || undefined,
      utm_creative: params.get("utm_creative") || undefined,
      fbclid: params.get("fbclid") || undefined,
    };

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, ...attribution }),
      });
      const json = await res.json().catch(() => ({ ok: false }));
      if (!res.ok || !json.ok) {
        // Field-specific errors: jump back to the relevant step and show
        // an inline error so the user can correct without guessing.
        if (json?.error === "phone") {
          setError("phone", {
            type: "server",
            message: "Please enter a valid US phone number.",
          });
          setStep(4); // step index for phone/email/best_time_to_call
          setSubmitState("idle");
          return;
        }
        setSubmitState("error");
        return;
      }
      setSubmittedFirstName(data.first_name);
      setSubmitState("success");
    } catch {
      setSubmitState("error");
    }
  }

  // ---------- Off-ramp screen (homeowner=no) ----------
  if (offRamp) {
    return (
      <div className="rounded-lg border border-border p-8 text-center">
        <p className="text-base text-foreground">
          We can only help homeowners right now. If your situation changes,
          please come back and try again.
        </p>
      </div>
    );
  }

  // ---------- Success state ----------
  if (submitState === "success") {
    return (
      <div className="rounded-lg border border-border p-8 text-center">
        <h3 className="text-2xl font-semibold text-foreground">
          Thanks{submittedFirstName ? `, ${submittedFirstName}` : ""}.
        </h3>
        <p className="mt-3 text-base text-muted">
          A licensed agent will reach out shortly. You can close this page.
        </p>
      </div>
    );
  }

  // ---------- The form ----------
  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="rounded-lg border border-border p-6 sm:p-8"
      aria-label="Mortgage protection lead form"
    >
      {/* Hidden bot trap. Off-screen, not focusable, ignored by AT. */}
      <div
        aria-hidden="true"
        style={{ position: "absolute", left: -10000, top: "auto", width: 1, height: 1, overflow: "hidden" }}
      >
        <label>
          Website
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            {...register("honeypot")}
          />
        </label>
      </div>
      {/* form_loaded_at carried in form state; registered as hidden number. */}
      <input type="hidden" {...register("form_loaded_at", { valueAsNumber: true })} />

      <p className="text-sm text-muted text-right" aria-live="polite">
        Step {step + 1} of {TOTAL_STEPS}
      </p>

      {/* Step 1: mortgage balance slider */}
      {step === 0 && (
        <fieldset className="mt-4">
          <legend className="text-lg font-semibold text-foreground">
            What&apos;s your remaining mortgage balance?
          </legend>
          <p className="mt-4 text-2xl font-bold text-accent text-center">
            {balance != null ? balance.toLocaleString("en-US") : "—"}
          </p>
          <input
            type="range"
            min={50_000}
            max={1_000_000}
            step={10_000}
            className="mt-4 w-full"
            aria-label="Mortgage balance"
            {...register("mortgage_balance", { valueAsNumber: true })}
          />
          <div className="mt-2 flex justify-between text-xs text-muted">
            <span>50k</span>
            <span>1M+</span>
          </div>
        </fieldset>
      )}

      {/* Step 2: age + smoker */}
      {step === 1 && (
        <div className="mt-4 space-y-6">
          <fieldset>
            <legend className="text-lg font-semibold text-foreground">
              How old are you?
            </legend>
            <input
              type="number"
              inputMode="numeric"
              min={18}
              max={75}
              className="mt-3 w-full min-h-11 rounded-md border border-border px-3 text-base"
              placeholder="35"
              aria-label="Age"
              {...register("age", { valueAsNumber: true })}
            />
            {errors.age && (
              <p role="alert" className="mt-1 text-sm text-red-600">
                Enter an age between 18 and 75.
              </p>
            )}
          </fieldset>

          <fieldset>
            <legend className="text-lg font-semibold text-foreground">
              Are you a smoker?
            </legend>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <YesNoButton
                selected={isSmoker === false}
                onClick={() => setValue("is_smoker", false, { shouldValidate: true })}
              >
                No
              </YesNoButton>
              <YesNoButton
                selected={isSmoker === true}
                onClick={() => setValue("is_smoker", true, { shouldValidate: true })}
              >
                Yes
              </YesNoButton>
            </div>
            {errors.is_smoker && (
              <p role="alert" className="mt-1 text-sm text-red-600">
                Please select an option.
              </p>
            )}
          </fieldset>
        </div>
      )}

      {/* Step 3: homeowner + state */}
      {step === 2 && (
        <div className="mt-4 space-y-6">
          <fieldset>
            <legend className="text-lg font-semibold text-foreground">
              Do you own your home?
            </legend>
            <HomeownerChoice
              value={homeownerChoice}
              onChange={(v) => {
                setHomeownerChoice(v);
                setHomeownerError(false);
                if (v) setValue("is_homeowner", true, { shouldValidate: true });
              }}
            />
            {homeownerError && (
              <p role="alert" className="mt-2 text-sm text-red-600">
                Please select an option.
              </p>
            )}
          </fieldset>

          <fieldset>
            <legend className="text-lg font-semibold text-foreground">
              What state do you live in?
            </legend>
            <select
              className="mt-3 w-full min-h-11 rounded-md border border-border bg-white px-3 text-base"
              aria-label="State"
              defaultValue=""
              {...register("state")}
            >
              <option value="" disabled>
                Select your state
              </option>
              {US_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {errors.state && (
              <p role="alert" className="mt-1 text-sm text-red-600">
                Please select your state.
              </p>
            )}
          </fieldset>
        </div>
      )}

      {/* Step 4: name */}
      {step === 3 && (
        <div className="mt-4 space-y-4">
          <fieldset>
            <legend className="sr-only">Your name</legend>
            <label className="block text-base font-medium text-foreground">
              First name
              <input
                type="text"
                autoComplete="given-name"
                className="mt-2 w-full min-h-11 rounded-md border border-border px-3 text-base"
                {...register("first_name")}
              />
            </label>
            {errors.first_name && (
              <p role="alert" className="mt-1 text-sm text-red-600">
                Please enter your first name.
              </p>
            )}
          </fieldset>
          <fieldset>
            <label className="block text-base font-medium text-foreground">
              Last name
              <input
                type="text"
                autoComplete="family-name"
                className="mt-2 w-full min-h-11 rounded-md border border-border px-3 text-base"
                {...register("last_name")}
              />
            </label>
            {errors.last_name && (
              <p role="alert" className="mt-1 text-sm text-red-600">
                Please enter your last name.
              </p>
            )}
          </fieldset>
        </div>
      )}

      {/* Step 5: phone + email + best time to call */}
      {step === 4 && (
        <div className="mt-4 space-y-4">
          <fieldset>
            <label className="block text-base font-medium text-foreground">
              Phone
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="(555) 123-4567"
                className="mt-2 w-full min-h-11 rounded-md border border-border px-3 text-base"
                {...register("phone")}
              />
            </label>
            {errors.phone && (
              <p role="alert" className="mt-1 text-sm text-red-600">
                {errors.phone.message ?? "Enter a valid US phone number."}
              </p>
            )}
          </fieldset>
          <fieldset>
            <label className="block text-base font-medium text-foreground">
              Email
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                className="mt-2 w-full min-h-11 rounded-md border border-border px-3 text-base"
                {...register("email")}
              />
            </label>
            {errors.email && (
              <p role="alert" className="mt-1 text-sm text-red-600">
                Enter a valid email address.
              </p>
            )}
          </fieldset>
          <fieldset>
            <legend className="block text-base font-medium text-foreground">
              Best time to call
            </legend>
            <div className="mt-2 grid grid-cols-3 gap-3">
              {(["morning", "afternoon", "evening"] as const).map((t) => (
                <YesNoButton
                  key={t}
                  selected={bestTime === t}
                  onClick={() => setValue("best_time_to_call", t, { shouldValidate: true })}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </YesNoButton>
              ))}
            </div>
            {errors.best_time_to_call && (
              <p role="alert" className="mt-1 text-sm text-red-600">
                Please pick a time.
              </p>
            )}
          </fieldset>
        </div>
      )}

      {/* Step 6: consent + submit */}
      {step === 5 && (
        <fieldset className="mt-4">
          <legend className="text-lg font-semibold text-foreground">
            One last thing
          </legend>
          <label className="mt-4 flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 min-h-[20px] min-w-[20px] flex-shrink-0"
              {...register("consent")}
            />
            {/* CONSENT_TEXT renders verbatim — the same words go into consent_log
                via the server. /privacy and /terms substring linking is a
                follow-up task once those pages exist. */}
            <span className="text-sm text-muted leading-relaxed">{CONSENT_TEXT}</span>
          </label>
          {errors.consent && (
            <p role="alert" className="mt-2 text-sm text-red-600">
              You must check the consent box to continue.
            </p>
          )}
        </fieldset>
      )}

      {submitState === "error" && (
        <p role="alert" className="mt-4 text-sm text-red-600 text-center">
          Something went wrong. Please try again.
        </p>
      )}

      <div className="mt-8 flex items-center justify-between gap-3">
        {step > 0 ? (
          <button
            type="button"
            onClick={back}
            className="min-h-11 px-5 rounded-md border border-border text-base font-medium text-foreground hover:bg-gray-50"
            disabled={submitState === "submitting"}
          >
            Back
          </button>
        ) : (
          <span />
        )}
        {step < TOTAL_STEPS - 1 ? (
          <button
            type="button"
            onClick={next}
            className="min-h-11 px-6 rounded-md bg-accent text-base font-medium text-white hover:bg-accent-hover"
          >
            Next
          </button>
        ) : (
          <button
            type="submit"
            className="min-h-11 px-6 rounded-md bg-accent text-base font-medium text-white hover:bg-accent-hover disabled:opacity-50"
            disabled={submitState === "submitting"}
          >
            {submitState === "submitting" ? "Sending..." : "Get my options"}
          </button>
        )}
      </div>
    </form>
  );
}

function YesNoButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`min-h-11 px-4 rounded-md border text-base font-medium transition-colors ${
        selected
          ? "bg-accent text-white border-accent"
          : "bg-white text-foreground border-border hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  );
}

function HomeownerChoice({
  value,
  onChange,
}: {
  value: boolean | undefined;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-3">
      <YesNoButton selected={value === false} onClick={() => onChange(false)}>
        No
      </YesNoButton>
      <YesNoButton selected={value === true} onClick={() => onChange(true)}>
        Yes
      </YesNoButton>
    </div>
  );
}
