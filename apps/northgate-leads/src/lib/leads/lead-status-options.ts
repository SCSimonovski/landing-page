// Single source of truth for the lead_status enum on the platform.
//
// Mirrors the Postgres enum (`new / contacted / appointment / sold / dead /
// refunded`). Aligned with playbook 04 KPIs: appointment rate, close rate,
// refund rate. reach_rate is partially derivable (1 - count(new)/total) but
// doesn't distinguish "called, no answer" from "called, answered" — see
// Plan 5 OOB notes for the no_answer follow-up if agent feedback warrants.
//
// Badge color conventions (Plan 5 Decision #2):
//   new         → muted blue (informational, default)
//   contacted   → blue
//   appointment → amber (action pending; eyeballs on this row)
//   sold        → emerald (closed-won; explicitly NOT platform-primary sage
//                  to avoid visual collision with primary CTAs)
//   dead        → muted gray
//   refunded    → red (closed-lost-with-money-back)

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

// Tailwind class strings for the status badge. Uses the same approach as
// the Plan 4 brand/product/temp variants: a small object the badge cell
// pulls from, instead of multiplying badge variants in the cva.
export const LEAD_STATUS_BADGE_CLASS: Record<LeadStatus, string> = {
  new: "bg-blue-50 text-blue-900",
  contacted: "bg-blue-100 text-blue-900",
  appointment: "bg-amber-100 text-amber-900",
  sold: "bg-emerald-100 text-emerald-900",
  dead: "bg-muted text-muted-foreground",
  refunded: "bg-red-100 text-red-900",
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
