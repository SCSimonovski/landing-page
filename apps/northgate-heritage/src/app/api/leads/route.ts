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
    // 2. Rate limit (Upstash, 3/IP/hour, shared bucket across brands).
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

    // 5. Normalize phone to E.164.
    const phone_e164 = normalizePhone(input.phone);
    if (!phone_e164) {
      return NextResponse.json({ ok: false, error: "phone" }, { status: 400 });
    }

    const email = input.email.toLowerCase();

    // 6. Suppressions check (cross-brand — phone OR email match → silent 200).
    if (await isSuppressed(phone_e164, email)) {
      return silentSuccess();
    }

    // 7. DNC check. Informational flag — agent dispatcher must re-query
    //    dnc_registry at dispatch time.
    const on_dnc = await isOnDNC(phone_e164);

    // 8. 30-day dedup, scoped to (phone, brand, product). A Heritage
    //    final_expense submission only dedupes against another Heritage
    //    final_expense within 30 days — a same-phone NP mortgage_protection
    //    lead from last week is a different product intent and lands as a
    //    fresh lead. See findRecentDuplicate's doc for the rationale.
    const dup = await findRecentDuplicate({
      phone: phone_e164,
      brand: "northgate-heritage",
      product: "final_expense",
    });
    if (dup) {
      await recordDuplicateAttempt(dup.id, {
        source: "form_resubmit",
        attempted_state: input.state,
      });
      return NextResponse.json({ ok: true, id: dup.id }, { status: 200 });
    }

    // 9. FE intent score + temperature (pure, FE-shaped weighting).
    const intent_score = computeIntentScore({
      desired_coverage: input.desired_coverage,
      age: input.age,
      is_smoker: input.is_smoker,
      has_major_health_conditions: input.has_major_health_conditions,
      phone_e164,
      email,
    });
    const temperature = computeTemperature(intent_score);

    // 10. Atomic insert via RPC: leads + consent_log + lead_events('created').
    //     Hardcoded brand + product; per-product details JSONB shape matches
    //     packages/shared/validation/details/final_expense.ts (the canonical
    //     FE schema). Server uses its own CONSENT_TEXT — client-sent values
    //     are ignored even if present (defense against tampering).
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
      brand: "northgate-heritage",
      product: "final_expense",
      details: {
        desired_coverage: input.desired_coverage,
        is_smoker: input.is_smoker,
        has_major_health_conditions: input.has_major_health_conditions,
        beneficiary_relationship: input.beneficiary_relationship,
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
    //     Same dispatchers as NP — they route by lead.product to the FE
    //     templates that Plan 2b populated.
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
