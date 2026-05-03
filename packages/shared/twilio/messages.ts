import type { Database } from "../types/database";
import type { MortgageProtectionDetails } from "../types/products";

type LeadRow = Database["public"]["Tables"]["leads"]["Row"];

// Runtime type guard for the details JSONB shape. Defends against the cast
// silently producing $NaN / $undefined in an SMS to the agent if the JSONB
// is malformed (backfill bug, Plan 2 routing FE leads through this template
// before the per-product split lands, etc.). Architect-required per Plan 1.
function isMortgageProtectionDetails(
  d: unknown,
): d is MortgageProtectionDetails {
  if (typeof d !== "object" || d === null) return false;
  const obj = d as Record<string, unknown>;
  return (
    typeof obj.mortgage_balance === "number" &&
    typeof obj.is_smoker === "boolean" &&
    typeof obj.is_homeowner === "boolean"
  );
}

// Format the agent SMS per docs/playbook/02_Technical_Reference.md Part 5.3.
// Uses .toLocaleString("en-US") for the mortgage balance — same pattern as
// the lead-form slider, avoids the locale-mismatch hydration bug.
//
// Note on segments: the leading emoji forces UCS-2 encoding (70-char
// segments instead of GSM-7's 160). This message is ~2 segments in trial
// mode (with the "Sent from your Twilio trial account" prefix) and 2
// segments in production. Cost analysis in the plan; keeping the emoji
// for the lock-screen UX win.
//
// Plan 2 will split this into per-product templates
// (packages/shared/twilio/templates/{northgate-protection,final-expense}.ts)
// and a dispatcher that routes by `lead.product`. Until then, this function
// is mortgage-protection-only and the runtime assertion below guards the
// JSONB shape.
export function formatAgentSMS(lead: LeadRow): string {
  if (!isMortgageProtectionDetails(lead.details)) {
    throw new Error(
      `formatAgentSMS: lead ${lead.id} (product=${lead.product}) has invalid ` +
        `details shape; expected MortgageProtectionDetails. Plan 2 should ` +
        `split this into per-product templates.`,
    );
  }
  const details = lead.details;
  const emoji = lead.temperature === "hot" ? "🔥" : "⚡";
  return [
    `${emoji} NEW ${lead.temperature.toUpperCase()} LEAD`,
    `${lead.first_name} ${lead.last_name}, age ${lead.age}`,
    `${lead.state} — mortgage $${details.mortgage_balance.toLocaleString("en-US")}`,
    `Call: ${lead.phone_e164}`,
    `Score: ${lead.intent_score}/90`,
    "",
    `Best time: ${lead.best_time_to_call}`,
  ].join("\n");
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
