// Negative-path verification for the formatAgentSMS dispatcher
// (Plan 2a — replaces the Plan 1 runtime-assertion test). Confirms that
// the dispatcher routes by lead.product, that per-product Zod parsing
// fires inside templates on shape mismatch, that the FE placeholder
// throws, and that an unknown product is rejected at the dispatcher.
//
// Run with:
//   NODE_OPTIONS='--conditions=react-server' pnpm dlx tsx scripts/test-format-agent-sms-assertion.ts

import { formatAgentSMS } from "../packages/shared/twilio/messages";

type FakeLead = Parameters<typeof formatAgentSMS>[0];

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
  details: { is_smoker: false, is_homeowner: true }, // missing mortgage_balance
} as unknown as FakeLead;

const FE_LEAD = {
  id: "test-fe-placeholder",
  product: "final_expense",
  brand: "northgate-heritage",
  temperature: "hot",
  first_name: "Test",
  last_name: "User",
  age: 70,
  state: "FL",
  phone_e164: "+15555550101",
  intent_score: 80,
  best_time_to_call: "evening",
  details: { desired_coverage: 10000 },
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

let pass = 0;
let fail = 0;

function expectMatch(label: string, actual: string, expected: string | RegExp) {
  const ok = expected instanceof RegExp ? expected.test(actual) : actual.includes(expected);
  if (ok) {
    console.log(`  PASS: ${label}`);
    pass++;
  } else {
    console.error(`  FAIL: ${label}`);
    console.error(`        expected to match: ${expected}`);
    console.error(`        actual: ${actual}`);
    fail++;
  }
}

function expectThrowMatching(label: string, lead: FakeLead, expected: string | RegExp) {
  try {
    formatAgentSMS(lead);
    console.error(`  FAIL: ${label} — did NOT throw`);
    fail++;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const ok = expected instanceof RegExp ? expected.test(msg) : msg.includes(expected);
    if (ok) {
      console.log(`  PASS: ${label}`);
      console.log(`        message: ${msg}`);
      pass++;
    } else {
      console.error(`  FAIL: ${label} — threw but wrong message`);
      console.error(`        expected to match: ${expected}`);
      console.error(`        actual: ${msg}`);
      fail++;
    }
  }
}

console.log("--- 1. valid MP lead → produces SMS with MP LEAD prefix ---");
try {
  const sms = formatAgentSMS(VALID_MP_LEAD);
  expectMatch("contains 'NEW HOT MP LEAD'", sms, "NEW HOT MP LEAD");
  expectMatch("contains formatted balance '$250,000'", sms, "$250,000");
  expectMatch("first line ends after the MP LEAD label", sms.split("\n")[0]!, /MP LEAD$/);
} catch (e) {
  console.error(`  FAIL: valid MP lead unexpectedly threw: ${e instanceof Error ? e.message : e}`);
  fail++;
}

console.log("\n--- 2. MP lead with bad-shape details → throws (Zod parse fails) ---");
expectThrowMatching("MP bad-shape throws with template+lead-id error", BAD_MP_LEAD_MISSING_BALANCE, /formatMortgageProtectionSMS.*test-mp-bad-shape.*invalid details shape/s);

console.log("\n--- 3. FE lead → throws Plan-2b placeholder error ---");
expectThrowMatching("FE placeholder throws with Plan 2b reference", FE_LEAD, /Plan 2b will populate this template/);

console.log("\n--- 4. unknown product → dispatcher throws descriptive error ---");
expectThrowMatching("unknown product caught at dispatcher", UNKNOWN_PRODUCT_LEAD, /unknown product='auto_insurance'/);

console.log(`\n${pass}/${pass + fail} assertions passed.`);
if (fail > 0) {
  process.exit(1);
}
