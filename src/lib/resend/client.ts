import "server-only";
import { Resend } from "resend";

let cached: Resend | null = null;

// Module-scoped cache: instantiate once per server process. Mirrors the
// Twilio client pattern. Resend's SDK is stateless and safe to share.
export function getResendClient(): Resend {
  if (cached) return cached;
  cached = new Resend(process.env.RESEND_API_KEY!);
  return cached;
}
