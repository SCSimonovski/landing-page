import type { Database } from "../../types/database";
import { FinalExpenseDetailsSchema } from "../../validation/details/final_expense";

type LeadRow = Database["public"]["Tables"]["leads"]["Row"];

// Format the agent SMS for a final_expense lead.
// Plan 2b (2026-05-03) populated this from Plan 2a's throw-placeholder.
//
// "FE LEAD" prefix on line 1 mirrors NP's "MP LEAD" prefix (added in Plan 2a)
// — tells the agent which product the lead is for at a glance, on the lock
// screen, before they unlock the phone.
//
// Uses .toLocaleString("en-US") for the coverage amount — same pattern as
// the lead-form slider, avoids the locale-mismatch hydration bug.
//
// Validates lead.details against FinalExpenseDetailsSchema at read time.
// Throws with descriptive error if shape is wrong (defense against backfill
// bugs or wrong-template routing). Same pattern as the MP template.
export function formatFinalExpenseSMS(lead: LeadRow): string {
  const result = FinalExpenseDetailsSchema.safeParse(lead.details);
  if (!result.success) {
    throw new Error(
      `formatFinalExpenseSMS: lead ${lead.id} (product=${lead.product}) ` +
        `has invalid details shape. Zod errors: ${JSON.stringify(result.error.issues)}`,
    );
  }
  const details = result.data;
  const emoji = lead.temperature === "hot" ? "🔥" : "⚡";
  return [
    `${emoji} NEW ${lead.temperature.toUpperCase()} FE LEAD`,
    `${lead.first_name} ${lead.last_name}, age ${lead.age}`,
    `${lead.state} — coverage $${details.desired_coverage.toLocaleString("en-US")}`,
    `Health: ${details.has_major_health_conditions ? "MAJOR conditions" : "no major"} · ${details.is_smoker ? "smoker" : "non-smoker"}`,
    `Beneficiary: ${details.beneficiary_relationship}`,
    `Call: ${lead.phone_e164}`,
    `Score: ${lead.intent_score}/90`,
    "",
    `Best time: ${lead.best_time_to_call}`,
  ].join("\n");
}
