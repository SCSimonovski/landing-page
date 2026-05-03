import { z } from "zod";

// Final Expense product details schema. Canonical source of truth for the
// `details` JSONB shape on leads where product='final_expense'. Used by both
// form-side validation (apps/northgate-heritage/src/lib/validation/lead-schema
// flattens these into the form's flat fields, then /api/leads re-shapes into
// details on insert) AND read-side template parsers (the FE SMS + email
// templates Zod-parse this when rendering).
//
// Plan 2b (2026-05-03) populated this from Plan 2a's z.object({}).passthrough()
// placeholder. Field set is the architect-locked lean 5-field FE qualifying
// pass: desired_coverage + is_smoker + has_major_health_conditions +
// beneficiary_relationship. The chassis age field is not part of details
// (it's a top-level lead column shared across brands). best_time_to_call
// also stays at the top level (chassis).

export const FinalExpenseDetailsSchema = z.object({
  desired_coverage: z.number().int().min(5_000).max(50_000),
  is_smoker: z.boolean(),
  has_major_health_conditions: z.boolean(),
  beneficiary_relationship: z.enum(["spouse", "child", "parent", "other"]),
});

export type FinalExpenseDetails = z.infer<typeof FinalExpenseDetailsSchema>;
