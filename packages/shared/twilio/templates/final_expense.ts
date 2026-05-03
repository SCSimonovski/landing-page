import type { Database } from "../../types/database";

type LeadRow = Database["public"]["Tables"]["leads"]["Row"];

// Placeholder for Plan 2b (apps/northgate-heritage scaffold). The dispatcher
// in messages.ts routes here for product='final_expense' leads, but no such
// leads exist post-Plan-2a. Plan 2b will populate the actual FE template:
// "FE LEAD" line-1 prefix, coverage/health/beneficiary fields interpolated
// from the FinalExpenseDetailsSchema.
export function formatFinalExpenseSMS(lead: LeadRow): string {
  throw new Error(
    `formatFinalExpenseSMS: lead ${lead.id} cannot be formatted yet. ` +
      `Plan 2b will populate this template when apps/northgate-heritage/ ships.`,
  );
}
