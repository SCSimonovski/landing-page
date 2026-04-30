import { verifyTwilioSignature } from "@/lib/twilio/verify-signature";
import { isStopKeyword } from "@/lib/twilio/messages";
import { addSuppression } from "@/lib/db/suppressions";

export const dynamic = "force-dynamic";

// TwiML empty response. Twilio's auto-opt-out feature already sends the
// user-facing "You have been unsubscribed" reply on STOP-class keywords —
// returning our own message would double up. We just need the 200.
const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';

function twimlOk() {
  return new Response(EMPTY_TWIML, {
    status: 200,
    headers: { "content-type": "text/xml" },
  });
}

export async function POST(req: Request) {
  // Twilio sends application/x-www-form-urlencoded, not JSON.
  const form = await req.formData();
  const bodyParams: Record<string, string> = {};
  for (const [k, v] of form.entries()) bodyParams[k] = String(v);

  // Signature verification gate. 403 (not silent 200) so Twilio's exponential
  // backoff retries a few times then gives up — that's the correct behavior
  // for a forged or malformed request. Silent 200 would let attackers
  // pollute the suppressions table by guessing the URL.
  if (!verifyTwilioSignature(req, bodyParams)) {
    console.error("[twilio/incoming] signature_invalid");
    return new Response("forbidden", { status: 403 });
  }

  const from = bodyParams.From;
  const body = bodyParams.Body ?? "";

  if (from && isStopKeyword(body)) {
    try {
      await addSuppression({ phone_e164: from, reason: "SMS_STOP" });
      // Log last-4 of phone for forensics; full PII stays out of logs.
      const last4 = from.slice(-4);
      console.log(`[twilio/incoming] suppressed ...${last4}`);
    } catch (err) {
      const e = err as { code?: string };
      console.error(`[twilio/incoming] suppression_error code=${e.code ?? "unknown"}`);
      // Even on DB failure we return 200 — Twilio's auto-opt-out has
      // already happened at the carrier layer; failing the webhook would
      // trigger retries that won't fix anything DB-side.
    }
  }

  return twimlOk();
}
