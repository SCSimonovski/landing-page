// NP (Mortgage Protection) intent score + temperature tests.
// Pure-function coverage. Tests each tier branch in computeIntentScore +
// every temperature threshold boundary so a silent tier-weight regression
// surfaces immediately rather than at live submission time.

import { describe, expect, it } from "vitest";
import { computeIntentScore, computeTemperature, type IntentInput } from "./intent";

// Baseline NP input with low scores everywhere — tests adjust one field
// at a time and assert the delta against this baseline.
function baseline(overrides: Partial<IntentInput> = {}): IntentInput {
  return {
    mortgage_balance: 50_000,        // <100k → 10pts
    age: 80,                         // outside 30-65 → 5pts
    is_smoker: true,                 // 0pts
    best_time_to_call: "afternoon",  // 0pts
    phone_e164: null,
    email: null,
    ...overrides,
  };
}
// Baseline score: 10 (balance) + 5 (age) = 15

describe("computeIntentScore (NP / mortgage_protection)", () => {
  it("baseline (low scores everywhere)", () => {
    expect(computeIntentScore(baseline())).toBe(15);
  });

  describe("mortgage_balance tiers", () => {
    it.each([
      [50_000, 10],
      [99_999, 10],
      [100_000, 20],
      [249_999, 20],
      [250_000, 30],
      [499_999, 30],
      [500_000, 40],
      [1_000_000, 40],
    ])("balance %i → %i pts", (mortgage_balance, expectedTierPts) => {
      const score = computeIntentScore(baseline({ mortgage_balance }));
      // baseline minus the balance-tier 10 + the new tier
      expect(score).toBe(15 - 10 + expectedTierPts);
    });
  });

  describe("age tiers", () => {
    it.each([
      [29, 5],
      [30, 25],
      [50, 25],
      [51, 15],
      [65, 15],
      [66, 5],
      [80, 5],
    ])("age %i → %i pts", (age, expectedTierPts) => {
      const score = computeIntentScore(baseline({ age }));
      expect(score).toBe(15 - 5 + expectedTierPts);
    });
  });

  it("non-smoker adds 15 pts", () => {
    expect(computeIntentScore(baseline({ is_smoker: false }))).toBe(15 + 15);
  });

  it("morning best_time adds 5 pts; afternoon/evening add 0", () => {
    expect(computeIntentScore(baseline({ best_time_to_call: "morning" }))).toBe(15 + 5);
    expect(computeIntentScore(baseline({ best_time_to_call: "afternoon" }))).toBe(15);
    expect(computeIntentScore(baseline({ best_time_to_call: "evening" }))).toBe(15);
  });

  it("phone+email both present adds 5 pts; either alone adds 0", () => {
    expect(
      computeIntentScore(baseline({ phone_e164: "+15555550100", email: "a@b.com" })),
    ).toBe(15 + 5);
    expect(
      computeIntentScore(baseline({ phone_e164: "+15555550100", email: null })),
    ).toBe(15);
    expect(
      computeIntentScore(baseline({ phone_e164: null, email: "a@b.com" })),
    ).toBe(15);
  });

  it("max-score lead hits 90", () => {
    const score = computeIntentScore({
      mortgage_balance: 750_000,        // 40
      age: 40,                          // 25
      is_smoker: false,                 // 15
      best_time_to_call: "morning",     // 5
      phone_e164: "+15555550100",       // 5 (with email)
      email: "a@b.com",
    });
    expect(score).toBe(90);
  });
});

describe("computeTemperature (NP)", () => {
  it.each([
    [0, "cold"],
    [49, "cold"],
    [50, "warm"],
    [69, "warm"],
    [70, "hot"],
    [90, "hot"],
  ])("score %i → %s", (score, expected) => {
    expect(computeTemperature(score)).toBe(expected);
  });
});
