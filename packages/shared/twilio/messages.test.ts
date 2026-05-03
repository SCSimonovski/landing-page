// SMS dispatcher tests. Ported from scripts/test-format-agent-sms-assertion.ts
// (Plan 2c — see CHANGELOG). Same 5 cases / 8 assertions as the prior script;
// vitest format gives us watch mode + nicer failure output.
//
// Plus a separate isStopKeyword block — same file because it ships from the
// same module and shares the same brand-agnostic Twilio-utility scope.

import { describe, expect, it } from "vitest";
import { formatAgentSMS, isStopKeyword } from "./messages";

type FakeLead = Parameters<typeof formatAgentSMS>[0];

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const VALID_MP_LEAD = {
  id: "test-mp-valid",
  product: "mortgage_protection",
  brand: "northgate-protection",
  temperature: "hot",
  first_name: "Test",
  last_name: "User",
  age: 42,
  state: "TX",
  phone_e164: "+15555550100",
  intent_score: 85,
  best_time_to_call: "morning",
  details: {
    mortgage_balance: 250_000,
    is_smoker: false,
    is_homeowner: true,
  },
} as unknown as FakeLead;

const EXPECTED_MP_SMS = [
  "🔥 NEW HOT MP LEAD",
  "Test User, age 42",
  "TX — mortgage $250,000",
  "Call: +15555550100",
  "Score: 85/90",
  "",
  "Best time: morning",
].join("\n");

const BAD_MP_LEAD_MISSING_BALANCE = {
  id: "test-mp-bad-shape",
  product: "mortgage_protection",
  brand: "northgate-protection",
  temperature: "warm",
  first_name: "Test",
  last_name: "User",
  age: 42,
  state: "TX",
  phone_e164: "+15555550100",
  intent_score: 50,
  best_time_to_call: "afternoon",
  details: { is_smoker: false, is_homeowner: true },
} as unknown as FakeLead;

const VALID_FE_LEAD = {
  id: "test-fe-valid",
  product: "final_expense",
  brand: "northgate-heritage",
  temperature: "hot",
  first_name: "Test",
  last_name: "User",
  age: 65,
  state: "FL",
  phone_e164: "+15555550101",
  intent_score: 85,
  best_time_to_call: "morning",
  details: {
    desired_coverage: 15_000,
    is_smoker: false,
    has_major_health_conditions: false,
    beneficiary_relationship: "spouse",
  },
} as unknown as FakeLead;

const EXPECTED_FE_SMS = [
  "🔥 NEW HOT FE LEAD",
  "Test User, age 65",
  "FL — coverage $15,000",
  "Health: no major · non-smoker",
  "Beneficiary: spouse",
  "Call: +15555550101",
  "Score: 85/90",
  "",
  "Best time: morning",
].join("\n");

const BAD_FE_LEAD_MISSING_COVERAGE = {
  id: "test-fe-bad-shape",
  product: "final_expense",
  brand: "northgate-heritage",
  temperature: "warm",
  first_name: "Test",
  last_name: "User",
  age: 65,
  state: "FL",
  phone_e164: "+15555550101",
  intent_score: 50,
  best_time_to_call: "afternoon",
  details: { is_smoker: false },
} as unknown as FakeLead;

const UNKNOWN_PRODUCT_LEAD = {
  id: "test-unknown-product",
  product: "auto_insurance",
  brand: "some-brand",
  temperature: "cold",
  first_name: "Test",
  last_name: "User",
  age: 30,
  state: "CA",
  phone_e164: "+15555550102",
  intent_score: 30,
  best_time_to_call: "morning",
  details: {},
} as unknown as FakeLead;

// ---------------------------------------------------------------------------
// Dispatcher cases
// ---------------------------------------------------------------------------

describe("formatAgentSMS dispatcher", () => {
  describe("Case 1: valid MP lead", () => {
    it("returns SMS body byte-identical to expected MP template", () => {
      expect(formatAgentSMS(VALID_MP_LEAD)).toBe(EXPECTED_MP_SMS);
    });

    it("line 1 contains 'MP LEAD' prefix", () => {
      const sms = formatAgentSMS(VALID_MP_LEAD);
      expect(sms.split("\n")[0]).toContain("MP LEAD");
    });
  });

  describe("Case 2: MP lead with bad-shape details", () => {
    it("throws via MP Zod with lead.id and product in the message", () => {
      expect(() => formatAgentSMS(BAD_MP_LEAD_MISSING_BALANCE)).toThrow(
        /test-mp-bad-shape.*mortgage_protection/s,
      );
    });
  });

  describe("Case 3: valid FE lead (load-bearing FE-template proof)", () => {
    it("returns SMS body byte-identical to expected FE template", () => {
      expect(formatAgentSMS(VALID_FE_LEAD)).toBe(EXPECTED_FE_SMS);
    });

    it("line 1 contains 'FE LEAD' prefix", () => {
      const sms = formatAgentSMS(VALID_FE_LEAD);
      expect(sms.split("\n")[0]).toContain("FE LEAD");
    });
  });

  describe("Case 4: FE lead with bad-shape details", () => {
    it("throws via FE Zod with lead.id and product in the message", () => {
      expect(() => formatAgentSMS(BAD_FE_LEAD_MISSING_COVERAGE)).toThrow(
        /test-fe-bad-shape.*final_expense/s,
      );
    });
  });

  describe("Case 5: unknown product", () => {
    it("throws and the error names the unknown product string", () => {
      expect(() => formatAgentSMS(UNKNOWN_PRODUCT_LEAD)).toThrow(
        /auto_insurance/,
      );
    });

    it("error originates from dispatcher (formatAgentSMS), not a template", () => {
      expect(() => formatAgentSMS(UNKNOWN_PRODUCT_LEAD)).toThrow(
        /formatAgentSMS/,
      );
    });
  });
});

// ---------------------------------------------------------------------------
// isStopKeyword
// ---------------------------------------------------------------------------

describe("isStopKeyword", () => {
  it.each([
    ["STOP"],
    ["STOPALL"],
    ["UNSUBSCRIBE"],
    ["CANCEL"],
    ["END"],
    ["QUIT"],
    ["HALT"],
    ["REVOKE"],
  ])("recognizes canonical keyword %s", (keyword) => {
    expect(isStopKeyword(keyword)).toBe(true);
  });

  it.each([
    ["stop"],
    ["Stop"],
    ["sToP"],
    ["unsubscribe"],
  ])("is case-insensitive: %s", (variant) => {
    expect(isStopKeyword(variant)).toBe(true);
  });

  it("trims whitespace", () => {
    expect(isStopKeyword("  STOP  ")).toBe(true);
    expect(isStopKeyword("\tSTOP\n")).toBe(true);
  });

  it.each([
    ["stops"],
    ["unrelated"],
    ["please stop"],
    [""],
  ])("does not match non-keyword: %s", (input) => {
    expect(isStopKeyword(input)).toBe(false);
  });
});
