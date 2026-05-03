import type { Database } from "../types/database";
import { formatMortgageProtectionSMS } from "./templates/mortgage_protection";
import { formatFinalExpenseSMS } from "./templates/final_expense";

type LeadRow = Database["public"]["Tables"]["leads"]["Row"];

// Dispatcher for the agent SMS body — routes to per-product templates by
// `lead.product`. Each template owns its own Zod parsing of `lead.details`,
// fails loud on shape mismatch.
//
// Replaces Plan 1's hand-rolled type guard + cast pattern (which lived in
// this file pre-Plan-2a) with proper per-product validation. Adding a new
// product is now: add a case here + a template file + a Zod schema in
// validation/details/. No touching the old templates.
export function formatAgentSMS(lead: LeadRow): string {
  switch (lead.product) {
    case "mortgage_protection":
      return formatMortgageProtectionSMS(lead);
    case "final_expense":
      return formatFinalExpenseSMS(lead);
    default:
      throw new Error(
        `formatAgentSMS: lead ${lead.id} has unknown product='${lead.product}'. ` +
          `Add a template at packages/shared/twilio/templates/<product>.ts and ` +
          `wire it into the dispatcher.`,
      );
  }
}

// Match Twilio's auto-opt-out defaults (so our suppressions row exists for
// everything Twilio already blocks at the carrier layer), plus REVOKE which
// is broader than Twilio's default.
//
// ASYMMETRY documented in CHANGELOG:
//   STOP/STOPALL/UNSUBSCRIBE/CANCEL/END/QUIT/HALT → both Twilio and us
//   REVOKE → us only; Twilio does NOT auto-opt-out on REVOKE
//
// Verify Twilio's current default keyword set if this list seems stale:
// https://help.twilio.com/articles/360034798533
const STOP_KEYWORDS: ReadonlySet<string> = new Set([
  "STOP",
  "STOPALL",
  "UNSUBSCRIBE",
  "CANCEL",
  "END",
  "QUIT",
  "HALT",
  "REVOKE",
]);

export function isStopKeyword(text: string): boolean {
  return STOP_KEYWORDS.has(text.trim().toUpperCase());
}
