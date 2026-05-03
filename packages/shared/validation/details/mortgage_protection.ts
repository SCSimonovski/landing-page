import { z } from "zod";

// Canonical schema for the `leads.details` JSONB shape when
// `product = 'mortgage_protection'`. Used by:
//   - SMS template parser (packages/shared/twilio/templates/mortgage_protection.ts)
//   - Email template parser (packages/shared/email/templates/mortgage_protection.ts)
//   - Form-side validation in apps/northgate-protection/ (eventually)
//
// Single canonical source of truth — if the JSONB shape ever drifts between
// what the form writes and what the templates read, TypeScript catches it
// at compile-time and Zod catches it at runtime. Bounds match the legacy
// CHECK constraint on leads.mortgage_balance (50k–2M) that was dropped in
// Plan 1's migration when the column moved into the JSONB.
export const MortgageProtectionDetailsSchema = z.object({
  mortgage_balance: z.number().int().min(50_000).max(2_000_000),
  is_smoker: z.boolean(),
  is_homeowner: z.boolean(),
});

export type MortgageProtectionDetails = z.infer<
  typeof MortgageProtectionDetailsSchema
>;
