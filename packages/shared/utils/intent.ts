// Lead intent score + temperature.
// Spec: docs/playbook/02_Technical_Reference.md Part 3.7.
// Pure functions; no DB, no PII handling. Called by /api/leads.

export type Temperature = "hot" | "warm" | "cold";

export type IntentInput = {
  mortgage_balance: number;
  age: number;
  is_smoker: boolean;
  best_time_to_call: "morning" | "afternoon" | "evening";
  phone_e164: string | null;
  email: string | null;
};

export function computeIntentScore(lead: IntentInput): number {
  let score = 0;

  if (lead.mortgage_balance >= 500_000) score += 40;
  else if (lead.mortgage_balance >= 250_000) score += 30;
  else if (lead.mortgage_balance >= 100_000) score += 20;
  else score += 10;

  if (lead.age >= 30 && lead.age <= 50) score += 25;
  else if (lead.age >= 51 && lead.age <= 65) score += 15;
  else score += 5;

  if (!lead.is_smoker) score += 15;

  if (lead.best_time_to_call === "morning") score += 5;

  if (lead.phone_e164 && lead.email) score += 5;

  return score;
}

export function computeTemperature(score: number): Temperature {
  if (score >= 70) return "hot";
  if (score >= 50) return "warm";
  return "cold";
}
