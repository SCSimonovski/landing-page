// Brand/product-agnostic validation primitives. Each app's per-product form
// schema imports from here so US_STATES + US_STATE_NAMES + reusable refinements
// stay one canonical source. Plan 2a extraction; per-app `lead-schema.ts`
// (in apps/<app>/src/lib/validation/) composes these.

import { z } from "zod";

export const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
  "DC",
] as const;

// Full state names for UI labels. The form's <option> shows these to the
// user, but `value` stays the 2-letter code so the schema/DB/SMS shape
// is unchanged. Order matches US_STATES (alphabetical by full name).
export const US_STATE_NAMES: Record<(typeof US_STATES)[number], string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  DC: "District of Columbia",
};

export const TIME_OF_DAY = ["morning", "afternoon", "evening"] as const;

// US-only phone: 10 digits, or 11 digits starting with 1 (country code).
// Formatting characters (spaces, dashes, dots, parens, +) are stripped
// before counting. Server still does strict E.164 normalization via
// libphonenumber-js — this is the client-side fast-fail.
export const phoneSchema = z
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
  );

export const emailSchema = z.email().max(254);

export const firstNameSchema = z.string().trim().min(2).max(50);
export const lastNameSchema = z.string().trim().min(2).max(50);
