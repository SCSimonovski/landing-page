// FinalExpenseDetailsSchema tests. Same coverage pattern as MP — validates
// the canonical shape of the `details` JSONB for product='final_expense'.

import { describe, expect, it } from "vitest";
import { FinalExpenseDetailsSchema } from "./final_expense";

describe("FinalExpenseDetailsSchema", () => {
  it("accepts a valid shape", () => {
    const result = FinalExpenseDetailsSchema.safeParse({
      desired_coverage: 15_000,
      is_smoker: false,
      has_major_health_conditions: false,
      beneficiary_relationship: "spouse",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing desired_coverage", () => {
    const result = FinalExpenseDetailsSchema.safeParse({
      is_smoker: false,
      has_major_health_conditions: false,
      beneficiary_relationship: "spouse",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["desired_coverage"]);
    }
  });

  it("rejects desired_coverage below 5,000", () => {
    const result = FinalExpenseDetailsSchema.safeParse({
      desired_coverage: 1_000,
      is_smoker: false,
      has_major_health_conditions: false,
      beneficiary_relationship: "spouse",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["desired_coverage"]);
    }
  });

  it("rejects desired_coverage above 50,000", () => {
    const result = FinalExpenseDetailsSchema.safeParse({
      desired_coverage: 100_000,
      is_smoker: false,
      has_major_health_conditions: false,
      beneficiary_relationship: "spouse",
    });
    expect(result.success).toBe(false);
  });

  it.each([["spouse"], ["child"], ["parent"], ["other"]])(
    "accepts beneficiary_relationship: %s",
    (relationship) => {
      const result = FinalExpenseDetailsSchema.safeParse({
        desired_coverage: 15_000,
        is_smoker: false,
        has_major_health_conditions: false,
        beneficiary_relationship: relationship,
      });
      expect(result.success).toBe(true);
    },
  );

  it("rejects invalid beneficiary_relationship enum value", () => {
    const result = FinalExpenseDetailsSchema.safeParse({
      desired_coverage: 15_000,
      is_smoker: false,
      has_major_health_conditions: false,
      beneficiary_relationship: "sibling",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["beneficiary_relationship"]);
    }
  });

  it("rejects wrong-typed has_major_health_conditions", () => {
    const result = FinalExpenseDetailsSchema.safeParse({
      desired_coverage: 15_000,
      is_smoker: false,
      has_major_health_conditions: "no",
      beneficiary_relationship: "spouse",
    });
    expect(result.success).toBe(false);
  });
});
