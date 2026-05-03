// US phone normalization tests. Pure-function coverage of normalizePhone —
// catches edge cases that would silently produce nulls (rejected leads) or
// wrong E.164 formatting (broken downstream Twilio calls).

import { describe, expect, it } from "vitest";
import { normalizePhone } from "./phone";

describe("normalizePhone", () => {
  describe("valid US inputs", () => {
    it.each([
      // [input, expected E.164 output]
      ["+12025550199", "+12025550199"],          // already E.164
      ["12025550199", "+12025550199"],           // raw 11 with country code
      ["2025550199", "+12025550199"],            // raw 10 (US default)
      ["(202) 555-0199", "+12025550199"],        // formatted parens
      ["202-555-0199", "+12025550199"],          // formatted dashes
      ["202.555.0199", "+12025550199"],          // formatted dots
      ["202 555 0199", "+12025550199"],          // formatted spaces
      ["+1 (202) 555-0199", "+12025550199"],     // mixed
    ])("normalizes %s → %s", (input, expected) => {
      expect(normalizePhone(input)).toBe(expected);
    });
  });

  describe("invalid / rejected inputs", () => {
    it.each([
      [""],
      ["abc"],
      ["123"],                       // too short
      ["+447911123456"],             // valid UK number — non-US, rejected
      ["+33123456789"],              // valid French number — non-US, rejected
      ["+12025"],                    // too short
      ["555-0199"],                  // missing area code
    ])("returns null for invalid input: %s", (input) => {
      expect(normalizePhone(input)).toBeNull();
    });
  });
});
