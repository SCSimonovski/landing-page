// MortgageProtectionDetailsSchema tests. Validates the canonical shape of
// the `details` JSONB column for product='mortgage_protection' leads.
// Catches: field renames (template parser would throw at runtime),
// type mismatches (Zod parse fails), out-of-range values, missing fields.

import { describe, expect, it } from "vitest";
import { MortgageProtectionDetailsSchema } from "./mortgage_protection";

describe("MortgageProtectionDetailsSchema", () => {
  it("accepts a valid shape", () => {
    const result = MortgageProtectionDetailsSchema.safeParse({
      mortgage_balance: 250_000,
      is_smoker: false,
      is_homeowner: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing mortgage_balance", () => {
    const result = MortgageProtectionDetailsSchema.safeParse({
      is_smoker: false,
      is_homeowner: true,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["mortgage_balance"]);
    }
  });

  it("rejects mortgage_balance below 50,000", () => {
    const result = MortgageProtectionDetailsSchema.safeParse({
      mortgage_balance: 10_000,
      is_smoker: false,
      is_homeowner: true,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["mortgage_balance"]);
    }
  });

  it("rejects mortgage_balance above 2,000,000", () => {
    const result = MortgageProtectionDetailsSchema.safeParse({
      mortgage_balance: 5_000_000,
      is_smoker: false,
      is_homeowner: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects wrong-typed is_smoker", () => {
    const result = MortgageProtectionDetailsSchema.safeParse({
      mortgage_balance: 250_000,
      is_smoker: "yes",
      is_homeowner: true,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["is_smoker"]);
    }
  });

  it("rejects non-integer mortgage_balance", () => {
    const result = MortgageProtectionDetailsSchema.safeParse({
      mortgage_balance: 250_000.50,
      is_smoker: false,
      is_homeowner: true,
    });
    expect(result.success).toBe(false);
  });
});
