// Per-product details JSONB shapes. Stored in `leads.details` post-multi-brand
// migration (2026-05-03). Type-safe access at read sites uses these interfaces
// plus runtime assertions (e.g. `formatAgentSMS` validates shape before
// reading fields, throws if details is malformed).
//
// Plan 2 (FE app scaffold) will add FinalExpenseDetails and a discriminated
// ProductDetails union. Until then, only mortgage_protection is populated.

export interface MortgageProtectionDetails {
  mortgage_balance: number;
  is_smoker: boolean;
  is_homeowner: boolean;
}

// Plan 2 will add:
// export interface FinalExpenseDetails {
//   desired_coverage: number;
//   is_smoker: boolean;
//   health_conditions: string[];
//   beneficiary_relationship: string;
// }
//
// export type ProductDetails =
//   | { product: "mortgage_protection"; details: MortgageProtectionDetails }
//   | { product: "final_expense"; details: FinalExpenseDetails };
