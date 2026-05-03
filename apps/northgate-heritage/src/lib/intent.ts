// Heritage (Final Expense) intent score + temperature.
// Per Plan 2b architect-locked decision: age + coverage primary, health
// secondary. /90 scale matches NP for cross-brand temperature comparability
// (hot / warm / cold thresholds are identical so the agent's response
// playbook stays uniform across brands).
//
// Pure functions; no DB, no PII handling. Called by /api/leads.

export type Temperature = "hot" | "warm" | "cold";

export type FEIntentInput = {
  age: number;
  desired_coverage: number;
  is_smoker: boolean;
  has_major_health_conditions: boolean;
  phone_e164: string | null;
  email: string | null;
};

// FE peak market is 60-75 (older buyers with concrete burial-cost concerns
// and adult children who'd inherit the bill). 50-59 is the early-planner
// segment. 76-85 is reachable but coverage gets capped/expensive.
// Under 50 is rare for FE — the form schema already gates at age >= 50,
// so this branch only fires if validation is bypassed.
export function computeIntentScore(lead: FEIntentInput): number {
  let score = 0;

  if (lead.age >= 60 && lead.age <= 75) score += 35;
  else if (lead.age >= 50 && lead.age <= 59) score += 25;
  else if (lead.age >= 76 && lead.age <= 85) score += 20;
  else score += 5;

  // Coverage tiers reflect FE conversion data: $25k+ = serious buyer
  // (covers funeral + headstone + final medical); $15-25k = standard
  // burial coverage; $10-15k = baseline; $5-10k = minimum-floor entry.
  if (lead.desired_coverage >= 25_000) score += 25;
  else if (lead.desired_coverage >= 15_000) score += 20;
  else if (lead.desired_coverage >= 10_000) score += 15;
  else score += 10;

  // Health is binary qualifier (not gradient): major conditions reduce
  // insurability + raise premiums; smoker is a separate underwriting signal.
  if (!lead.has_major_health_conditions) score += 15;
  if (!lead.is_smoker) score += 10;

  // Engagement signal — phone + email both provided is a higher-intent
  // pattern than form-fill with one channel only. Same as NP.
  if (lead.phone_e164 && lead.email) score += 5;

  return score;
}

// Same thresholds as NP (apps/northgate-protection/src/lib/intent.ts) so the
// agent's hot/warm/cold response cadence is consistent across brands.
// Considered shared promotion — deferred per Plan 2b out-of-band notes
// (4-line function, no abstraction debt yet).
export function computeTemperature(score: number): Temperature {
  if (score >= 70) return "hot";
  if (score >= 50) return "warm";
  return "cold";
}
