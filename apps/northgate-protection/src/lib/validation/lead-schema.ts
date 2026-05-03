// Northgate Protection's form schema. Mortgage-protection-specific.
// Used by both the client form (via @hookform/resolvers/zod) and the
// /api/leads server route. Brand-agnostic primitives come from
// @platform/shared/validation/common; per-product details JSONB shape
// at the API-route layer maps from the form's flat fields.
//
// `phone` is the raw user input; the server normalizes to E.164 via
// @platform/shared/utils/phone before any DB op. `consent_text` is
// intentionally NOT in the schema — the server uses its own CONSENT_TEXT
// constant (apps/northgate-protection/src/lib/consent.ts) and ignores any
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
// from this file today; keeping that contract avoids deeper import-path churn
// in the form).
export { US_STATES, US_STATE_NAMES };

export const LeadFormSchema = z.object({
  // Qualification (mortgage-protection-specific)
  mortgage_balance: z.number().int().min(50_000).max(2_000_000),
  age: z.number().int().min(18).max(75),
  is_smoker: z.boolean(),
  is_homeowner: z.literal(true),
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
