// Welcome email body byte-identity tests for both per-product templates.
// Mirrors the SMS dispatcher test's protection — catches accidental copy
// edits to user-facing TCPA-relevant text at test time rather than at
// live-submission time.
//
// Filename intentionally __byte_identity.test.ts (single test for both
// templates) since the assertion shape is identical and locking both in
// one file makes drift visible in a single diff.

import { describe, expect, it } from "vitest";
import { renderMortgageProtectionWelcomeEmail } from "./mortgage_protection";
import { renderFinalExpenseWelcomeEmail } from "./final_expense";

const SITE = "https://example.com";

describe("renderMortgageProtectionWelcomeEmail", () => {
  const result = renderMortgageProtectionWelcomeEmail("Alice", SITE);

  it("subject is byte-identical", () => {
    expect(result.subject).toBe(
      "Your mortgage protection quote is on its way, Alice",
    );
  });

  it("body is byte-identical", () => {
    const expected = [
      "Hi Alice,",
      "",
      "Thanks for requesting a mortgage protection quote.",
      "",
      "One of our licensed agents will call you shortly from a US number to talk through options",
      "tailored to your mortgage. The call takes 10-15 minutes. There's no obligation, no pressure,",
      "and no medical exam required for an initial quote.",
      "",
      "If you'd prefer a different time, just reply to this email.",
      "",
      "Talk soon,",
      "[AGENT NAME PLACEHOLDER]",
      "[BRAND NAME PLACEHOLDER]",
      "",
      "---",
      `Privacy policy: ${SITE}/privacy`,
      "Reply STOP to any text or 'unsubscribe' here to opt out.",
    ].join("\n");
    expect(result.text).toBe(expected);
  });
});

describe("renderFinalExpenseWelcomeEmail", () => {
  const result = renderFinalExpenseWelcomeEmail("Alice", SITE);

  it("subject is byte-identical", () => {
    expect(result.subject).toBe(
      "Your final expense quote is on its way, Alice",
    );
  });

  it("body is byte-identical", () => {
    const expected = [
      "Hi Alice,",
      "",
      "Thanks for requesting a final expense insurance quote.",
      "",
      "One of our licensed agents will call you shortly from a US number to talk through coverage",
      "options that fit your needs and budget. The call takes 10-15 minutes. There's no obligation,",
      "no pressure, and no medical exam required for an initial quote.",
      "",
      "If you'd prefer a different time, just reply to this email.",
      "",
      "Talk soon,",
      "[AGENT NAME PLACEHOLDER]",
      "[BRAND NAME PLACEHOLDER]",
      "",
      "---",
      `Privacy policy: ${SITE}/privacy`,
      "Reply STOP to any text or 'unsubscribe' here to opt out.",
    ].join("\n");
    expect(result.text).toBe(expected);
  });
});
