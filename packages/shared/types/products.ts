// Per-product details JSONB shape types. Re-exports from the canonical Zod
// schemas in validation/details/ — single source of truth (Plan 2a refactor).
//
// Use these for type annotations in app code. The Zod schemas themselves
// live alongside their template parsers and are imported at runtime for
// safeParse(). For type-only imports, import from here instead.

export type { MortgageProtectionDetails } from "../validation/details/mortgage_protection";
export type { FinalExpenseDetails } from "../validation/details/final_expense";
