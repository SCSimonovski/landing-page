import "server-only";
import { validateRequest } from "twilio";

// Verify a Twilio webhook request's signature.
//
// Reconstructs the URL from x-forwarded-host + x-forwarded-proto because
// Twilio signs the public URL it called, not the internal req.url that
// Next.js sees behind a proxy (Vercel, ngrok during dev). Both Vercel and
// ngrok strip client-supplied versions of these headers, so trusting them
// is safe in those contexts. If we ever deploy through an untrusted proxy
// chain (Cloudflare with custom rules, a corporate gateway, etc.) revisit
// this assumption — an attacker could spoof the signed URL otherwise.
export function verifyTwilioSignature(
  req: Request,
  bodyParams: Record<string, string>,
): boolean {
  const signature = req.headers.get("x-twilio-signature");
  if (!signature) return false;

  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!host) return false;
  const url = `${proto}://${host}${new URL(req.url).pathname}`;

  return validateRequest(
    process.env.TWILIO_AUTH_TOKEN!,
    signature,
    url,
    bodyParams,
  );
}
