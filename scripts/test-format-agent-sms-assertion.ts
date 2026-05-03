// Negative-path verification for the formatAgentSMS dispatcher (Plan 2b
// rewrite of the Plan 2a version). Confirms:
//   - dispatcher routes by lead.product
//   - per-product Zod parsing fires inside templates on shape mismatch
//   - both populated templates produce real output (FE no longer throws
//     post-Plan-2b)
//   - unknown product is rejected at the dispatcher's default branch
//
// 5 cases, 8 assertions. Enumerated per Plan 2b architect lock so
// verification is auditable.
//
// Run with:
//   NODE_OPTIONS='--conditions=react-server' pnpm dlx tsx scripts/test-format-agent-sms-assertion.ts

import { formatAgentSMS } from "../packages/shared/twilio/messages";

type FakeLead = Parameters<typeof formatAgentSMS>[0];

// ---------------------------------------------------------------------------
// Test fixtures
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
  details: { is_smoker: false, is_homeowner: true }, // missing mortgage_balance
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
  // missing desired_coverage + has_major_health_conditions + beneficiary
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
// Tracking
// ---------------------------------------------------------------------------

let pass = 0;
let fail = 0;

function assert(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  PASS: ${label}`);
    pass++;
  } else {
    console.error(`  FAIL: ${label}`);
    if (detail) console.error(`        ${detail}`);
    fail++;
  }
}

// ---------------------------------------------------------------------------
// Cases (5 total, 8 assertions)
// ---------------------------------------------------------------------------

console.log("--- Case 1: valid MP lead → produces SMS with MP LEAD prefix ---");
try {
  const sms = formatAgentSMS(VALID_MP_LEAD);
  // Assertion 1a: byte-identity (combined no-throw + correct output proof)
  assert(
    "MP SMS body byte-identical to expected template",
    sms === EXPECTED_MP_SMS,
    sms !== EXPECTED_MP_SMS
      ? `\n        EXPECTED:\n${JSON.stringify(EXPECTED_MP_SMS)}\n        ACTUAL:\n${JSON.stringify(sms)}`
      : undefined,
  );
  // Assertion 1b: MP LEAD prefix on line 1 (load-bearing Plan-2a marker)
  assert(
    "MP SMS line 1 contains 'MP LEAD' prefix",
    sms.split("\n")[0]?.includes("MP LEAD") === true,
  );
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  console.error(`  FAIL: valid MP lead unexpectedly threw: ${msg}`);
  fail += 2;
}

console.log("\n--- Case 2: MP lead with bad-shape details → throws via MP Zod ---");
try {
  formatAgentSMS(BAD_MP_LEAD_MISSING_BALANCE);
  console.error("  FAIL: bad-shape MP did NOT throw");
  fail++;
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  // Assertion 2: combined throw + message contains lead.id AND product
  assert(
    "MP bad-shape error message contains lead.id AND 'mortgage_protection'",
    msg.includes("test-mp-bad-shape") && msg.includes("mortgage_protection"),
    `actual message: ${msg}`,
  );
}

console.log("\n--- Case 3: valid FE lead → produces SMS with FE LEAD prefix (NEW post-2b) ---");
try {
  const sms = formatAgentSMS(VALID_FE_LEAD);
  // Assertion 3a: byte-identity vs expected FE template — load-bearing
  // proof that Plan 2b populated the FE template correctly.
  assert(
    "FE SMS body byte-identical to expected template",
    sms === EXPECTED_FE_SMS,
    sms !== EXPECTED_FE_SMS
      ? `\n        EXPECTED:\n${JSON.stringify(EXPECTED_FE_SMS)}\n        ACTUAL:\n${JSON.stringify(sms)}`
      : undefined,
  );
  // Assertion 3b: FE LEAD prefix on line 1
  assert(
    "FE SMS line 1 contains 'FE LEAD' prefix",
    sms.split("\n")[0]?.includes("FE LEAD") === true,
  );
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  console.error(`  FAIL: valid FE lead unexpectedly threw: ${msg}`);
  fail += 2;
}

console.log("\n--- Case 4: FE lead with bad-shape details → throws via FE Zod (NEW post-2b) ---");
try {
  formatAgentSMS(BAD_FE_LEAD_MISSING_COVERAGE);
  console.error("  FAIL: bad-shape FE did NOT throw");
  fail++;
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  assert(
    "FE bad-shape error message contains lead.id AND 'final_expense'",
    msg.includes("test-fe-bad-shape") && msg.includes("final_expense"),
    `actual message: ${msg}`,
  );
}

console.log("\n--- Case 5: unknown product → dispatcher throws ---");
try {
  formatAgentSMS(UNKNOWN_PRODUCT_LEAD);
  console.error("  FAIL: unknown product did NOT throw");
  fail++;
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  // Assertion 5a: error names the unknown product
  assert(
    "unknown product error message identifies the unknown product string",
    msg.includes("auto_insurance"),
    `actual message: ${msg}`,
  );
  // Assertion 5b: error originates from dispatcher (default branch),
  // not from a per-product template.
  assert(
    "unknown product error originates from dispatcher (formatAgentSMS)",
    msg.includes("formatAgentSMS"),
    `actual message: ${msg}`,
  );
}

console.log(`\n${pass}/${pass + fail} assertions passed.`);
if (fail > 0) {
  process.exit(1);
}
