// Northgate Heritage's form schema. Final-expense-specific.
// Used by both the client form (via @hookform/resolvers/zod) and the
// /api/leads server route. Brand-agnostic primitives come from
// @platform/shared/validation/common; per-product details JSONB shape is
// authoritatively defined at @platform/shared/validation/details/final_expense
// (the API route flattens these form fields into that shape on submit).
//
// `phone` is the raw user input; the server normalizes to E.164 via
// @platform/shared/utils/phone before any DB op. `consent_text` is
// intentionally NOT in the schema — the server uses its own CONSENT_TEXT
// constant (apps/northgate-heritage/src/lib/consent.ts) and ignores any
// client-sent value (defense against tampering).

import { z } from "zod";
import {
  US_STATES,
  US_STATE_NAMES,
  TIME_OF_DAY,
  phoneSchema,
  emailSchema,
  firstNameSchema,
  lastNameSchema,
} from "@platform/shared/validation/common";

// Re-export for the form component (lead-form.tsx imports US_STATES + names
// from this file; same convention as NP — keeps the form's import path
// stable when chassis primitives shift).
export { US_STATES, US_STATE_NAMES };

// FE eligibility is age-based (50-85 typical buyer window). NP uses 18-75
// because mortgage protection has a wider buyer window. The narrower range
// here doubles as a soft eligibility filter — under-50 submissions get a
// validation error rather than a wasted agent call. See out-of-band note in
// Plan 2b for the "calendar-reminder for under-50 curious users" deferred
// flow.
export const LeadFormSchema = z.object({
  // Qualification (final-expense-specific)
  desired_coverage: z.number().int().min(5_000).max(50_000),
  is_smoker: z.boolean(),
  has_major_health_conditions: z.boolean(),
  beneficiary_relationship: z.enum(["spouse", "child", "parent", "other"]),

  // Chassis demographics
  age: z.number().int().min(50).max(85),
  state: z.enum(US_STATES),

  // Contact (chassis)
  first_name: firstNameSchema,
  last_name: lastNameSchema,
  phone: phoneSchema,
  email: emailSchema,
  best_time_to_call: z.enum(TIME_OF_DAY),

  // TCPA — must be true; server uses its own CONSENT_TEXT for the snapshot
  consent: z.literal(true),

  // Bot protection
  form_loaded_at: z.number().int().positive(),
  // honeypot: any string, including non-empty. The route handler checks
  // for non-empty and silently 200s the request (silent reject) — we don't
  // reject at the schema layer because that returns 400 and tips off the bot.
  honeypot: z.string(),

  // Optional attribution (UTM + Meta)
  utm_source: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_adset: z.string().optional(),
  utm_creative: z.string().optional(),
  fbclid: z.string().optional(),
  fbc: z.string().optional(),
  fbp: z.string().optional(),
  landing_page_variant: z.string().optional(),
});

export type LeadFormInput = z.infer<typeof LeadFormSchema>;
