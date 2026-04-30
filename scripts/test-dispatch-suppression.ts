// Verification script for the dispatch-time suppression skip path.
//
// /api/leads's intake-stage suppression check fires first (silent 200, no
// insert), so the dispatch-stage check is normally only exercised in a
// race condition where a lead is created and then the phone gets
// suppressed BEFORE the after() callback fires. This script bypasses
// /api/leads entirely and exercises only the dispatch path.
//
// Run with the same env-loading pattern as the migration commands, plus
// the react-server export condition so the `server-only` package's no-op
// fork loads instead of its throw-on-import production guard:
//   set -a; source .env.local; set +a
//   NODE_OPTIONS='--conditions=react-server' pnpm dlx tsx scripts/test-dispatch-suppression.ts
//
// The script asserts BOTH:
//   1. NO Twilio API call fired (queries Twilio's message log)
//   2. lead_events has a sms_skipped_suppression row for the test lead
// Both must hold — "we logged a skip" and "we sent SMS and ALSO logged a
// skip" are very different bugs.

import { createServiceRoleClient } from "@/lib/db/supabase-server";
import { sendAgentSMS } from "@/lib/sms/dispatch";
import { getTwilioClient } from "@/lib/twilio/client";

const TEST_PHONE = "+12025550199";
const TEST_EMAIL = "test+dispatch-suppression@example.com";
const TEST_REASON = "test_dispatch_suppression";

async function main() {
  const supabase = createServiceRoleClient();
  const twilio = getTwilioClient();
  const agentPhone = process.env.AGENT_PHONE_NUMBER;
  if (!agentPhone) throw new Error("AGENT_PHONE_NUMBER not set");

  console.log("--- setup: insert test lead bypassing /api/leads ---");
  const { data: lead, error: leadErr } = await supabase
    .from("leads")
    .insert({
      first_name: "TestDispatch",
      last_name: "Supp",
      phone_e164: TEST_PHONE,
      email: TEST_EMAIL,
      state: "DC",
      mortgage_balance: 250_000,
      age: 40,
      is_smoker: false,
      is_homeowner: true,
      best_time_to_call: "morning",
      intent_score: 50,
      temperature: "warm",
      on_dnc: false,
    })
    .select()
    .single();
  if (leadErr || !lead) throw leadErr ?? new Error("no lead");
  console.log(`  lead.id = ${lead.id}`);

  console.log("--- setup: insert suppression AFTER lead exists ---");
  const { error: suppErr } = await supabase
    .from("suppressions")
    .insert({ phone_e164: TEST_PHONE, reason: TEST_REASON });
  if (suppErr) throw suppErr;

  const testStartTime = new Date();

  console.log(`--- exercise: sendAgentSMS(${lead.id}) ---`);
  await sendAgentSMS(lead.id);

  // Allow a moment for Twilio's API to reflect any (unwanted) messages.
  await new Promise((r) => setTimeout(r, 1500));

  console.log(
    "--- assert 1: NO Twilio message sent to AGENT_PHONE_NUMBER since test start ---",
  );
  const messages = await twilio.messages.list({
    to: agentPhone,
    dateSentAfter: testStartTime,
    limit: 5,
  });
  if (messages.length > 0) {
    throw new Error(
      `FAIL: ${messages.length} Twilio messages sent to agent during test (sids: ${messages.map((m) => m.sid).join(", ")})`,
    );
  }
  console.log("  PASS: no Twilio messages sent");

  console.log(
    "--- assert 2: lead_events has sms_skipped_suppression for this lead ---",
  );
  const { data: skipped, error: skipErr } = await supabase
    .from("lead_events")
    .select("event_type, event_data")
    .eq("lead_id", lead.id)
    .eq("event_type", "sms_skipped_suppression");
  if (skipErr) throw skipErr;
  if (!skipped || skipped.length === 0) {
    throw new Error("FAIL: no sms_skipped_suppression event found");
  }
  console.log(`  PASS: found ${skipped.length} sms_skipped_suppression event(s)`);

  console.log(
    "--- assert 3: lead_events has NO sms_sent for this lead (catches double-fire bug) ---",
  );
  const { data: sent, error: sentErr } = await supabase
    .from("lead_events")
    .select("event_type")
    .eq("lead_id", lead.id)
    .eq("event_type", "sms_sent");
  if (sentErr) throw sentErr;
  if (sent && sent.length > 0) {
    throw new Error(`FAIL: found ${sent.length} sms_sent event(s) — dispatch fired AND logged skip`);
  }
  console.log("  PASS: no sms_sent event");

  console.log("--- cleanup ---");
  await supabase.from("lead_events").delete().eq("lead_id", lead.id);
  await supabase.from("leads").delete().eq("id", lead.id);
  await supabase
    .from("suppressions")
    .delete()
    .eq("phone_e164", TEST_PHONE)
    .eq("reason", TEST_REASON);
  console.log("  done");

  console.log("\n✓ ALL ASSERTIONS PASSED");
}

main().catch((err) => {
  console.error("\n✗ SCRIPT FAILED:", err);
  process.exit(1);
});
