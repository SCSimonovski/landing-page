// Mirrors the Postgres lead_status enum. Aligned with playbook 04 KPIs
// (appointment rate, close rate, refund rate). reach_rate is partially
// derivable (1 - count(new)/total) but doesn't distinguish "no answer"
// from "answered" — see Plan 5 OOB notes for the no_answer follow-up.

export const LEAD_STATUS_VALUES = [
  "new",
  "contacted",
  "appointment",
  "sold",
  "dead",
  "refunded",
] as const;

export type LeadStatus = (typeof LEAD_STATUS_VALUES)[number];

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  appointment: "Appointment",
  sold: "Sold",
  dead: "Dead",
  refunded: "Refunded",
};

// Tailwind classes per status. Pulled in by the badge cell directly to
// keep the cva variant count down.
export const LEAD_STATUS_BADGE_CLASS: Record<LeadStatus, string> = {
  new: "bg-blue-50 text-blue-700",
  contacted: "bg-cyan-50 text-cyan-800",
  appointment: "bg-amber-50 text-amber-800",
  sold: "bg-emerald-50 text-emerald-800",
  dead: "bg-zinc-100 text-zinc-700",
  refunded: "bg-red-50 text-red-800",
};

export function isLeadStatus(value: string): value is LeadStatus {
  return (LEAD_STATUS_VALUES as readonly string[]).includes(value);
}

// Funnel ordering for the regression-warning UI on the bulk-status modal.
// Forward moves (e.g., contacted → appointment) are normal progress;
// backward moves (e.g., appointment → contacted) are regressions worth
// flagging. Terminal states (`dead`, `refunded`) are reachable from
// anywhere and don't have an ordinal — moving INTO them is fine; moving
// OUT of them isn't a "regression" per se but is unusual.
//
// Lower index = earlier in funnel. Terminal states get rank null.
const FUNNEL_RANK: Record<LeadStatus, number | null> = {
  new: 0,
  contacted: 1,
  appointment: 2,
  sold: 3,
  dead: null,
  refunded: null,
};

// True when changing from `current` to `next` would move a lead BACKWARD
// in the sales funnel. Used in the bulk modal to flag regressions
// distinctly. Terminal-state transitions (anything involving `dead` or
// `refunded`) return false — those are intentional out-of-funnel moves.
export function isStatusRegression(
  current: LeadStatus,
  next: LeadStatus,
): boolean {
  const cur = FUNNEL_RANK[current];
  const nxt = FUNNEL_RANK[next];
  if (cur === null || nxt === null) return false;
  return nxt < cur;
}
