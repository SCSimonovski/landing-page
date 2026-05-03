// Heritage (Final Expense) intent score + temperature tests.
// Pure-function coverage of the Plan 2b-locked FE intent model
// (age + coverage primary, health secondary, /90 scale).
//
// Temperature thresholds are intentionally identical to NP for cross-brand
// comparability (see Plan 2b CHANGELOG); the temperature tests here doubles
// as a "thresholds didn't drift" check across the two brands.

import { describe, expect, it } from "vitest";
import {
  computeIntentScore,
  computeTemperature,
  type FEIntentInput,
} from "./intent";

// Baseline FE input with low scores everywhere.
function baseline(overrides: Partial<FEIntentInput> = {}): FEIntentInput {
  return {
    age: 40,                              // outside 50-85 → 5pts
    desired_coverage: 5_000,              // <10k → 10pts
    is_smoker: true,                      // 0pts
    has_major_health_conditions: true,    // 0pts
    phone_e164: null,
    email: null,
    ...overrides,
  };
}
// Baseline score: 5 (age) + 10 (coverage) = 15

describe("computeIntentScore (Heritage / final_expense)", () => {
  it("baseline (low scores everywhere)", () => {
    expect(computeIntentScore(baseline())).toBe(15);
  });

  describe("age tiers (FE peak market is 60-75)", () => {
    it.each([
      [40, 5],     // outside 50-85
      [49, 5],     // outside 50-85
      [50, 25],    // 50-59
      [59, 25],    // 50-59
      [60, 35],    // 60-75 PEAK
      [75, 35],    // 60-75 PEAK
      [76, 20],    // 76-85
      [85, 20],    // 76-85
      [86, 5],     // outside 50-85
    ])("age %i → %i pts", (age, expectedTierPts) => {
      const score = computeIntentScore(baseline({ age }));
      expect(score).toBe(15 - 5 + expectedTierPts);
    });
  });

  describe("desired_coverage tiers", () => {
    it.each([
      [5_000, 10],
      [9_999, 10],
      [10_000, 15],
      [14_999, 15],
      [15_000, 20],
      [24_999, 20],
      [25_000, 25],
      [50_000, 25],
    ])("coverage $%i → %i pts", (desired_coverage, expectedTierPts) => {
      const score = computeIntentScore(baseline({ desired_coverage }));
      expect(score).toBe(15 - 10 + expectedTierPts);
    });
  });

  it("no major health conditions adds 15 pts", () => {
    expect(
      computeIntentScore(baseline({ has_major_health_conditions: false })),
    ).toBe(15 + 15);
  });

  it("non-smoker adds 10 pts", () => {
    expect(computeIntentScore(baseline({ is_smoker: false }))).toBe(15 + 10);
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
      age: 65,                              // 35 (peak)
      desired_coverage: 25_000,             // 25
      is_smoker: false,                     // 10
      has_major_health_conditions: false,   // 15
      phone_e164: "+15555550100",           // 5 (with email)
      email: "a@b.com",
    });
    expect(score).toBe(90);
  });
});

describe("computeTemperature (Heritage)", () => {
  // Same thresholds as NP — confirms cross-brand parity.
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
