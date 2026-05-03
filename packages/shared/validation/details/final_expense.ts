import { z } from "zod";

// Placeholder for Plan 2b. Plan 2a creates the empty schema so the dispatcher
// (packages/shared/twilio/messages.ts + email/welcome.ts) is shape-complete
// and routes to placeholder template files. Plan 2b populates the actual FE
// shape: desired_coverage, is_smoker, health_conditions, beneficiary_relationship.

export const FinalExpenseDetailsSchema = z.object({}).passthrough();

export type FinalExpenseDetails = z.infer<typeof FinalExpenseDetailsSchema>;
