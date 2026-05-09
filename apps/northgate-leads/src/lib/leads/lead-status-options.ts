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
