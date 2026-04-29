// Single Zod schema used by both the client form (via @hookform/resolvers/zod)
// and the /api/leads server route. NOT server-only — imported by both sides.
//
// `phone` is the raw user input; the server normalizes to E.164 via
// src/lib/phone.ts before any DB op. `consent_text` is intentionally NOT in
// the schema — the server uses its own CONSENT_TEXT constant and ignores
// any client-sent value (defense against tampering).

import { z } from "zod";

export const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
  "DC",
] as const;

export const LeadFormSchema = z.object({
  // Qualification
  mortgage_balance: z.number().int().min(50_000).max(2_000_000),
  age: z.number().int().min(18).max(75),
  is_smoker: z.boolean(),
  is_homeowner: z.literal(true),
  state: z.enum(US_STATES),

  // Contact
  first_name: z.string().trim().min(2).max(50),
  last_name: z.string().trim().min(2).max(50),
  // US-only: 10 digits, or 11 digits starting with 1 (country code).
  // Formatting characters (spaces, dashes, dots, parens, +) are stripped
  // before counting. Server still does strict E.164 normalization via
  // libphonenumber-js — this is the client-side fast-fail.
  phone: z
    .string()
    .trim()
    .min(7)
    .max(20)
    .refine(
      (s) => {
        const digits = s.replace(/\D/g, "");
        return digits.length === 10 || (digits.length === 11 && digits.startsWith("1"));
      },
      { message: "Please enter a 10-digit US phone number." },
    ),
  email: z.email().max(254),
  best_time_to_call: z.enum(["morning", "afternoon", "evening"]),

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
