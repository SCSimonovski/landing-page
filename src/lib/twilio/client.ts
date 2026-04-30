import "server-only";
import twilio from "twilio";

let cached: ReturnType<typeof twilio> | null = null;

// Module-scoped cache: we instantiate once per server process. Twilio's
// client is stateless and safe to share. Avoids constructing a new client
// on every dispatch.
export function getTwilioClient() {
  if (cached) return cached;
  cached = twilio(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_AUTH_TOKEN!,
  );
  return cached;
}
