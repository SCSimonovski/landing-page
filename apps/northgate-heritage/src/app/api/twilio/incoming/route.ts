import { verifyTwilioSignature } from "@platform/shared/twilio/verify-signature";
import { isStopKeyword } from "@platform/shared/twilio/messages";
import { addSuppression } from "@platform/shared/db/suppressions";

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

// Note: per Plan 2a CHANGELOG (2026-05-03 entry, "Twilio attribution gap"),
// Heritage shares NP's Twilio number. STOPs from Heritage SMS recipients land
// on NP's webhook with source_brand='northgate-protection'. THIS handler only
// fires if Heritage gets its own Twilio number (separate A2P 10DLC, deferred
// until volume justifies — see AGENTS.md § 9). When that happens, this
// handler exists ready to receive. Until then, this is dormant infrastructure.
export async function POST(req: Request) {
  const form = await req.formData();
  const bodyParams: Record<string, string> = {};
  for (const [k, v] of form.entries()) bodyParams[k] = String(v);

  if (!verifyTwilioSignature(req, bodyParams)) {
    console.error("[twilio/incoming] signature_invalid");
    return new Response("forbidden", { status: 403 });
  }

  const from = bodyParams.From;
  const body = bodyParams.Body ?? "";

  if (from && isStopKeyword(body)) {
    try {
      await addSuppression({
        phone_e164: from,
        reason: "SMS_STOP",
        source_brand: "northgate-heritage",
      });
      const last4 = from.slice(-4);
      console.log(`[twilio/incoming] suppressed ...${last4}`);
    } catch (err) {
      const e = err as { code?: string };
      console.error(`[twilio/incoming] suppression_error code=${e.code ?? "unknown"}`);
    }
  }

  return twimlOk();
}
