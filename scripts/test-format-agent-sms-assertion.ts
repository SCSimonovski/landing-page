// Negative-path verification for the formatAgentSMS runtime assertion
// added in Plan 1 (multi-brand schema migration). Confirms that the type
// guard fires when lead.details is malformed (e.g., backfill bug, or Plan 2
// routes a non-mortgage product through the wrong template).
//
// Run with:
//   NODE_OPTIONS='--conditions=react-server' pnpm dlx tsx scripts/test-format-agent-sms-assertion.ts

import { formatAgentSMS } from "../packages/shared/twilio/messages";

type FakeLead = Parameters<typeof formatAgentSMS>[0];

const BAD_LEAD_NULL_DETAILS = {
  id: "neg-test-null",
  product: "mortgage_protection",
  details: null,
} as unknown as FakeLead;

const BAD_LEAD_WRONG_SHAPE = {
  id: "neg-test-wrong-shape",
  product: "mortgage_protection",
  details: { foo: "bar" },
} as unknown as FakeLead;

const BAD_LEAD_FE_PRODUCT = {
  id: "neg-test-fe",
  product: "final_expense",
  details: { desired_coverage: 10000, is_smoker: true },
} as unknown as FakeLead;

let pass = 0;
let fail = 0;

function expectThrow(label: string, lead: FakeLead) {
  try {
    formatAgentSMS(lead);
    console.error(`  FAIL: ${label} — assertion did NOT fire (bug)`);
    fail++;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("invalid details shape")) {
      console.log(`  PASS: ${label} — threw with expected message`);
      console.log(`        message: ${msg}`);
      pass++;
    } else {
      console.error(`  FAIL: ${label} — threw but wrong message: ${msg}`);
      fail++;
    }
  }
}

console.log("--- assert: null details throws ---");
expectThrow("null details", BAD_LEAD_NULL_DETAILS);

console.log("--- assert: wrong-shape details throws ---");
expectThrow("wrong-shape details", BAD_LEAD_WRONG_SHAPE);

console.log("--- assert: FE-shape details on mortgage template throws ---");
expectThrow("FE shape on MP template", BAD_LEAD_FE_PRODUCT);

console.log(`\n${pass}/${pass + fail} assertions passed.`);
if (fail > 0) {
  process.exit(1);
}
