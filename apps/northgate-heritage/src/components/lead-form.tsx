"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  LeadFormSchema,
  type LeadFormInput,
  US_STATES,
  US_STATE_NAMES,
} from "@/lib/validation/lead-schema";
import { CONSENT_TEXT, LINKED_CONSENT_SUFFIX } from "@/lib/consent";

type SubmitState = "idle" | "submitting" | "success" | "error";

// Heritage's 6 form steps. No off-ramp (FE has no homeowner gate; eligibility
// is age-based and validated by the schema's age min=50).
const STEP_FIELDS: ReadonlyArray<ReadonlyArray<keyof LeadFormInput>> = [
  ["desired_coverage"],
  ["age", "is_smoker"],
  ["has_major_health_conditions", "beneficiary_relationship"],
  ["state", "first_name", "last_name"],
  ["phone", "email", "best_time_to_call"],
  ["consent"],
];

const TOTAL_STEPS = STEP_FIELDS.length;

const BENEFICIARY_LABELS: Record<
  "spouse" | "child" | "parent" | "other",
  string
> = {
  spouse: "Spouse",
  child: "Child",
  parent: "Parent",
  other: "Other",
};

export function LeadForm() {
  // form_loaded_at is stable across re-renders so the 3s honeypot timing
  // check on the server measures from initial mount, not from the last render.
  const formLoadedAt = useMemo(() => Date.now(), []);

  const [step, setStep] = useState(0);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submittedFirstName, setSubmittedFirstName] = useState<string>("");

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
      desired_coverage: 15_000,
      first_name: "",
      last_name: "",
      phone: "",
      email: "",
      // consent deliberately omitted — z.literal(true) in the schema.
      // Defaulting to true would pre-check the checkbox (TCPA violation).
      // Undefined → unchecked by default, validated on submit.
      form_loaded_at: formLoadedAt,
      honeypot: "",
    },
  });

  const coverage = watch("desired_coverage");
  const isSmoker = watch("is_smoker");
  const hasMajorHealth = watch("has_major_health_conditions");
  const beneficiary = watch("beneficiary_relationship");
  const bestTime = watch("best_time_to_call");

  async function next() {
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
      className="rounded-[20px] border border-border bg-background-card p-6 sm:p-9 shadow-[0_1px_0_rgba(20,37,58,0.04),0_24px_60px_-28px_rgba(20,37,58,0.18)]"
      aria-label="Final expense lead form"
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
      <input type="hidden" {...register("form_loaded_at", { valueAsNumber: true })} />

      <p
        className="mb-5 text-xs font-semibold tracking-[0.18em] uppercase text-accent-terracotta"
        aria-live="polite"
      >
        Step {step + 1} / {TOTAL_STEPS}
      </p>
      <div
        className="flex gap-1.5 mb-7"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={TOTAL_STEPS}
        aria-valuenow={step + 1}
        aria-label={`Step ${step + 1} of ${TOTAL_STEPS}`}
      >
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <span
            key={i}
            className={`flex-1 h-[5px] rounded-full transition-colors ${
              i <= step ? "bg-accent-terracotta" : "bg-foreground/10"
            }`}
          />
        ))}
      </div>

      {/* Step 1: desired coverage slider */}
      {step === 0 && (
        <fieldset>
          <legend className="text-[22px] sm:text-[26px] font-medium tracking-[-0.015em] leading-[1.2] text-foreground">
            How much coverage are you considering?
          </legend>
          <p className="mt-1.5 text-[13.5px] leading-[1.5] text-muted">
            A rough number works — slide to the closest amount.
          </p>
          <div className="mt-7 rounded-[14px] bg-background py-4 text-center">
            <p className="font-medium text-[44px] sm:text-[56px] leading-none tracking-[-0.03em] text-foreground">
              {coverage != null ? `$${coverage.toLocaleString("en-US")}` : "—"}
            </p>
            <p className="mt-1.5 text-[11px] uppercase tracking-[0.04em] text-muted">
              Coverage amount
            </p>
          </div>
          <input
            type="range"
            min={5_000}
            max={50_000}
            step={1_000}
            className="mt-5 w-full accent-[var(--accent-terracotta)]"
            aria-label="Desired coverage"
            {...register("desired_coverage", { valueAsNumber: true })}
          />
          <div className="mt-2 flex justify-between text-xs text-muted">
            <span>$5k</span>
            <span>$50k</span>
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
              min={50}
              max={85}
              className="mt-3 w-full min-h-11 rounded-md border border-border px-3 text-base"
              placeholder="65"
              aria-label="Age"
              {...register("age", { valueAsNumber: true })}
            />
            {errors.age && (
              <p role="alert" className="mt-1 text-sm text-red-600">
                Enter an age between 50 and 85.
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

      {/* Step 3: major health conditions + beneficiary */}
      {step === 2 && (
        <div className="mt-4 space-y-6">
          <fieldset>
            <legend className="text-lg font-semibold text-foreground">
              Have you had any major health conditions in the last 5 years?
            </legend>
            <p className="mt-1.5 text-[13px] leading-[1.5] text-muted">
              For example: heart attack, stroke, or cancer.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <YesNoButton
                selected={hasMajorHealth === false}
                onClick={() =>
                  setValue("has_major_health_conditions", false, { shouldValidate: true })
                }
              >
                No
              </YesNoButton>
              <YesNoButton
                selected={hasMajorHealth === true}
                onClick={() =>
                  setValue("has_major_health_conditions", true, { shouldValidate: true })
                }
              >
                Yes
              </YesNoButton>
            </div>
            {errors.has_major_health_conditions && (
              <p role="alert" className="mt-1 text-sm text-red-600">
                Please select an option.
              </p>
            )}
          </fieldset>

          <fieldset>
            <legend className="text-lg font-semibold text-foreground">
              Who would receive this coverage?
            </legend>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(["spouse", "child", "parent", "other"] as const).map((r) => (
                <YesNoButton
                  key={r}
                  selected={beneficiary === r}
                  onClick={() =>
                    setValue("beneficiary_relationship", r, { shouldValidate: true })
                  }
                >
                  {BENEFICIARY_LABELS[r]}
                </YesNoButton>
              ))}
            </div>
            {errors.beneficiary_relationship && (
              <p role="alert" className="mt-1 text-sm text-red-600">
                Please select an option.
              </p>
            )}
          </fieldset>
        </div>
      )}

      {/* Step 4: state + first name + last name */}
      {step === 3 && (
        <div className="mt-4 space-y-4">
          <fieldset>
            <legend className="text-lg font-semibold text-foreground">
              What state do you live in?
            </legend>
            <select
              className="mt-3 w-full min-h-11 rounded-md border border-border bg-background px-3 text-base"
              aria-label="State"
              defaultValue=""
              {...register("state")}
            >
              <option value="" disabled>
                Select your state
              </option>
              {US_STATES.map((s) => (
                <option key={s} value={s}>
                  {US_STATE_NAMES[s]}
                </option>
              ))}
            </select>
            {errors.state && (
              <p role="alert" className="mt-1 text-sm text-red-600">
                Please select your state.
              </p>
            )}
          </fieldset>
          <fieldset>
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
            <div className="mt-2 grid grid-cols-3 gap-2">
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
            {/* CONSENT_TEXT renders verbatim — same words go into consent_log
                via the server. Trailing LINKED_CONSENT_SUFFIX is replaced at
                render time with clickable <Link> elements. The stored constant
                is unchanged: audit trail shows the literal words. */}
            <span className="text-sm text-muted leading-relaxed">
              {CONSENT_TEXT.replace(LINKED_CONSENT_SUFFIX, "")}
              {" See our "}
              <Link href="/privacy" className="underline hover:text-foreground">
                Privacy Policy
              </Link>
              {" and "}
              <Link href="/terms" className="underline hover:text-foreground">
                Terms
              </Link>
              .
            </span>
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

      <div className="mt-7 flex items-center justify-between gap-3">
        {step > 0 ? (
          <button
            type="button"
            onClick={back}
            className="min-h-[52px] px-5 rounded-2xl border border-border text-base font-medium text-foreground hover:bg-background"
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
            className="inline-flex min-h-[52px] items-center gap-2 px-7 rounded-2xl bg-accent text-base font-medium text-background-card tracking-[-0.005em] hover:bg-accent-hover"
          >
            Continue
            <span aria-hidden="true" className="opacity-70">→</span>
          </button>
        ) : (
          <button
            type="submit"
            className="min-h-[52px] px-7 rounded-2xl bg-accent text-base font-medium text-background-card tracking-[-0.005em] hover:bg-accent-hover disabled:opacity-50"
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
      className={`min-h-11 px-3 sm:px-4 rounded-md border text-sm sm:text-base font-medium transition-colors ${
        selected
          ? "bg-accent text-background-card border-accent"
          : "bg-background-card text-foreground border-border hover:bg-background"
      }`}
    >
      {children}
    </button>
  );
}
