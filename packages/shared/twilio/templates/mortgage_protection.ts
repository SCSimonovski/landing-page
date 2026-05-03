import type { Database } from "../../types/database";
import { MortgageProtectionDetailsSchema } from "../../validation/details/mortgage_protection";

type LeadRow = Database["public"]["Tables"]["leads"]["Row"];

// Format the agent SMS for a mortgage_protection lead.
// Spec: docs/playbook/02_Technical_Reference.md Part 5.3.
//
// Uses .toLocaleString("en-US") for the mortgage balance — same pattern as
// the lead-form slider, avoids the locale-mismatch hydration bug.
//
// Note on segments: the leading emoji forces UCS-2 encoding (70-char
// segments instead of GSM-7's 160). This message is ~2 segments in trial
// mode (with the "Sent from your Twilio trial account" prefix) and 2
// segments in production. Cost analysis in the plan; keeping the emoji
// for the lock-screen UX win.
//
// "MP LEAD" prefix on line 1 is the per-product label (added in Plan 2a
// for symmetry with the eventual "FE LEAD" prefix on the final_expense
// template). Tells the agent which product the lead is for at a glance.
//
// Validates lead.details against MortgageProtectionDetailsSchema at read
// time. Throws with descriptive error if shape is wrong (defense against
// backfill bugs or wrong-template routing).
export function formatMortgageProtectionSMS(lead: LeadRow): string {
  const result = MortgageProtectionDetailsSchema.safeParse(lead.details);
  if (!result.success) {
    throw new Error(
      `formatMortgageProtectionSMS: lead ${lead.id} (product=${lead.product}) ` +
        `has invalid details shape. Zod errors: ${JSON.stringify(result.error.issues)}`,
    );
  }
  const details = result.data;
  const emoji = lead.temperature === "hot" ? "🔥" : "⚡";
  return [
    `${emoji} NEW ${lead.temperature.toUpperCase()} MP LEAD`,
    `${lead.first_name} ${lead.last_name}, age ${lead.age}`,
    `${lead.state} — mortgage $${details.mortgage_balance.toLocaleString("en-US")}`,
    `Call: ${lead.phone_e164}`,
    `Score: ${lead.intent_score}/90`,
    "",
    `Best time: ${lead.best_time_to_call}`,
  ].join("\n");
}
