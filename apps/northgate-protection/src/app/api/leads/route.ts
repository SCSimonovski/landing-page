import { NextResponse, after } from "next/server";
import { LeadFormSchema, type LeadFormInput } from "@/lib/validation/lead-schema";
import { CONSENT_TEXT, FORM_VERSION } from "@/lib/consent";
import { computeIntentScore, computeTemperature } from "@/lib/intent";
import { normalizePhone } from "@platform/shared/utils/phone";
import { checkRateLimit } from "@platform/shared/utils/rate-limit";
import {
  insertLeadWithConsent,
  isSuppressed,
  isOnDNC,
  findRecentDuplicate,
  recordDuplicateAttempt,
  type LeadInsertInput,
} from "@platform/shared/db/leads";
import { sendAgentSMS } from "@platform/shared/sms/dispatch";
import { sendWelcomeEmail } from "@platform/shared/email/welcome";

export const dynamic = "force-dynamic";

const FAKE_BOT_ID = "00000000-0000-0000-0000-000000000000";

function silentSuccess(id: string = FAKE_BOT_ID) {
  return NextResponse.json({ ok: true, id }, { status: 200 });
}

function genericError(status = 500) {
  return NextResponse.json({ ok: false }, { status });
}

export async function POST(req: Request) {
  // Correlation id for log lines that fire before any lead row exists.
  // Once a lead is inserted, the lead id takes over.
  const reqId = crypto.randomUUID();

  // 1. Extract IP + UA + page URL.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "0.0.0.0";
  const ua = req.headers.get("user-agent") ?? "";
  const pageUrl = req.headers.get("referer") ?? "";

  try {
    // 2. Rate limit (Upstash, 3/IP/hour).
    const rl = await checkRateLimit(ip);
    if (!rl.ok) return NextResponse.json({ ok: false }, { status: 429 });

    // 3. Parse + Zod-validate.
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return genericError(400);
    }
    const parsed = LeadFormSchema.safeParse(body);
    if (!parsed.success) return genericError(400);
    const input: LeadFormInput = parsed.data;

    // 4. Honeypot OR submission < 3s → silent 200, no insert.
    if (input.honeypot || Date.now() - input.form_loaded_at < 3000) {
      return silentSuccess();
    }

    // 5. Normalize phone to E.164. Returns a specific error code so the
    //    form can jump back to the phone step and show an inline message
    //    rather than the generic "something went wrong" fallback.
    const phone_e164 = normalizePhone(input.phone);
    if (!phone_e164) {
      return NextResponse.json({ ok: false, error: "phone" }, { status: 400 });
    }

    // Lowercase email for normalization (per playbook).
    const email = input.email.toLowerCase();

    // 6. Suppressions check (phone OR email match) → silent 200.
    if (await isSuppressed(phone_e164, email)) {
      return silentSuccess();
    }

    // 7. DNC check. Informational flag — agent dispatcher must re-query
    //    dnc_registry at dispatch time (DNC list updates daily; this column
    //    is a snapshot from insert time).
    const on_dnc = await isOnDNC(phone_e164);

    // 8. 30-day duplicate phone check (application-level only — partial unique
    //    index dropped per AGENTS.md § 6 because now() is STABLE).
    const dup = await findRecentDuplicate(phone_e164);
    if (dup) {
      await recordDuplicateAttempt(dup.id, {
        source: "form_resubmit",
        attempted_state: input.state,
      });
      return NextResponse.json({ ok: true, id: dup.id }, { status: 200 });
    }

    // 9. Intent score + temperature (pure).
    const intent_score = computeIntentScore({
      mortgage_balance: input.mortgage_balance,
      age: input.age,
      is_smoker: input.is_smoker,
      best_time_to_call: input.best_time_to_call,
      phone_e164,
      email,
    });
    const temperature = computeTemperature(intent_score);

    // 10. Atomic insert via RPC: leads + consent_log + lead_events('created').
    //     Server uses its OWN consent text constant — client-sent values are
    //     ignored even if present (defense against tampering).
    // Per-product qualifying fields go into details JSONB
    // (post-multi-brand-migration 2026-05-03). brand + product are text
    // discriminators; this app is hard-coded to northgate-protection /
    // mortgage_protection. Plan 2 will scaffold apps/final-expense/ which
    // populates these differently.
    const insertInput: LeadInsertInput = {
      first_name: input.first_name,
      last_name: input.last_name,
      phone_e164,
      email,
      state: input.state,
      age: input.age,
      best_time_to_call: input.best_time_to_call,
      intent_score,
      temperature,
      on_dnc,
      brand: "northgate-protection",
      product: "mortgage_protection",
      details: {
        mortgage_balance: input.mortgage_balance,
        is_smoker: input.is_smoker,
        is_homeowner: input.is_homeowner,
      },
      consent_text: CONSENT_TEXT,
      form_version: FORM_VERSION,
      ip_address: ip,
      user_agent: ua,
      page_url: pageUrl,
      utm_source: input.utm_source,
      utm_campaign: input.utm_campaign,
      utm_adset: input.utm_adset,
      utm_creative: input.utm_creative,
      fbclid: input.fbclid,
      fbc: input.fbc,
      fbp: input.fbp,
      landing_page_variant: input.landing_page_variant,
    };

    const id = await insertLeadWithConsent(insertInput);

    // 11. Fire-and-forget notification dispatch via Next 16 `after()`.
    //     Runs after the response is sent, so it does NOT add to the
    //     /api/leads response time. Vercel keeps the function alive up to
    //     `maxDuration` for after() callbacks.
    //     Dispatchers run in PARALLEL (Promise.all) — they're independent;
    //     serial would extend the SMS path's effective deadline by however
    //     long Resend takes. Each catches its own errors internally so a
    //     failure in one doesn't reject the Promise.all.
    //     Meta CAPI is the third notification, slots into the same
    //     Promise.all in its plan.
    after(async () => {
      await Promise.all([sendAgentSMS(id), sendWelcomeEmail(id)]);
    });

    // 12. Return success with the new lead id only — no PII echoed back.
    return NextResponse.json({ ok: true, id }, { status: 200 });
  } catch (err) {
    const e = err as { code?: string };
    console.error(`[/api/leads] req=${reqId} code=${e.code ?? "unknown"}`);
    return genericError();
  }
}
