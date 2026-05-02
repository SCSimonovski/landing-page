// US phone number normalization to E.164.
// Server-side strict validation; client does soft format checks only
// to keep libphonenumber-js out of the client bundle.

import { parsePhoneNumberFromString } from "libphonenumber-js";

export function normalizePhone(input: string): string | null {
  const parsed = parsePhoneNumberFromString(input, "US");
  if (!parsed || !parsed.isValid() || parsed.country !== "US") return null;
  return parsed.number;
}
