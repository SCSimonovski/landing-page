// Plan 3 RLS verification — 8 assertions covering role-aware policies on
// platform_users / agents / leads, the SECURITY DEFINER lookup function,
// and the email-lowercase CHECK constraint.
//
// Pattern note: the existing test-dispatch-suppression.ts uses the
// service-role client which BYPASSES RLS — useless for testing RLS. This
// script signs JWTs LOCALLY using SUPABASE_JWT_SECRET, then creates a
// per-user Supabase client with `Authorization: Bearer <jwt>` so each
// query runs in that user's RLS context.
//
// ENV REQUIRED beyond the standard set:
//   SUPABASE_JWT_SECRET — Supabase dashboard → Project Settings → API →
//                         JWT Settings → JWT Secret. Used to sign test JWTs.
//
// Run with:
//   set -a; source .env.local; set +a
//   NODE_OPTIONS='--conditions=react-server' pnpm dlx tsx scripts/test-platform-rls.ts

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
  throw new Error("Missing one of NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY in env");
}
if (!JWT_SECRET) {
  throw new Error(
    "Missing SUPABASE_JWT_SECRET in env. Get it from Supabase dashboard → " +
      "Project Settings → API → JWT Settings → JWT Secret. Required for RLS testing.",
  );
}

// Service-role client for fixture setup + cleanup (bypasses RLS).
const sr = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Anon client (RLS-gated as anon).
const anon = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Per-user authenticated client. Local JWT signing — no real signInWithOtp
// flow needed for RLS testing; the policies key off the JWT email claim.
function clientForUser(email: string): SupabaseClient {
  const token = jwt.sign(
    {
      sub: email,
      email,
      role: "authenticated",
      aud: "authenticated",
      exp: Math.floor(Date.now() / 1000) + 3600,
    },
    JWT_SECRET!,
  );
  return createClient(SUPABASE_URL!, ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

// Fixture emails (deterministic; cleanup keys on these).
const SUPER_EMAIL = "test-rls-super@example.com";
const ADMIN_EMAIL = "test-rls-admin@example.com";
const AGENT_A_EMAIL = "test-rls-agent-a@example.com";
const AGENT_B_EMAIL = "test-rls-agent-b@example.com";
const ALL_FIXTURE_EMAILS = [SUPER_EMAIL, ADMIN_EMAIL, AGENT_A_EMAIL, AGENT_B_EMAIL];

let pass = 0;
let fail = 0;

function assert(label: string, ok: boolean, detail?: string) {
  if (ok) {
    console.log(`  PASS: ${label}`);
    pass++;
  } else {
    console.error(`  FAIL: ${label}`);
    if (detail) console.error(`        ${detail}`);
    fail++;
  }
}

async function cleanup() {
  // Order: leads → agents → platform_users (FK chain).
  await sr.from("leads").delete().like("first_name", "TestRLS%");
  // Delete agents whose platform_user matches our fixtures.
  const { data: pus } = await sr
    .from("platform_users")
    .select("id")
    .in("email", ALL_FIXTURE_EMAILS);
  if (pus && pus.length > 0) {
    const puIds = pus.map((p) => p.id);
    await sr.from("agents").delete().in("platform_user_id", puIds);
  }
  await sr.from("platform_users").delete().in("email", ALL_FIXTURE_EMAILS);
}

async function main() {
  console.log("--- setup: cleanup any leftover fixtures from a prior run ---");
  await cleanup();

  console.log("--- setup: insert role fixtures ---");
  // 1 superadmin, 1 admin, 2 agents.
  const { data: pus, error: puErr } = await sr
    .from("platform_users")
    .insert([
      { email: SUPER_EMAIL, role: "superadmin" },
      { email: ADMIN_EMAIL, role: "admin" },
      { email: AGENT_A_EMAIL, role: "agent" },
      { email: AGENT_B_EMAIL, role: "agent" },
    ])
    .select();
  if (puErr || !pus || pus.length !== 4) throw puErr ?? new Error("fixture: platform_users insert failed");
  const puBy = (email: string) => pus.find((p) => p.email === email)!;

  const { data: agents, error: aErr } = await sr
    .from("agents")
    .insert([
      { platform_user_id: puBy(AGENT_A_EMAIL).id, full_name: "TestRLS Agent A", license_states: ["TX"] },
      { platform_user_id: puBy(AGENT_B_EMAIL).id, full_name: "TestRLS Agent B", license_states: ["FL"] },
    ])
    .select();
  if (aErr || !agents || agents.length !== 2) throw aErr ?? new Error("fixture: agents insert failed");
  const agentA = agents.find((a) => a.platform_user_id === puBy(AGENT_A_EMAIL).id)!;
  const agentB = agents.find((a) => a.platform_user_id === puBy(AGENT_B_EMAIL).id)!;

  // Insert deterministic test leads — 2 for A, 1 for B, 1 unassigned (NULL agent_id).
  // Use brand=northgate-protection / product=mortgage_protection (existing) +
  // valid details JSONB (mortgage_balance + is_smoker + is_homeowner).
  const baseLead = {
    last_name: "RLS",
    state: "TX",
    age: 42,
    best_time_to_call: "morning" as const,
    intent_score: 50,
    temperature: "warm" as const,
    on_dnc: false,
    brand: "northgate-protection",
    product: "mortgage_protection",
    details: { mortgage_balance: 250_000, is_smoker: false, is_homeowner: true },
  };
  const { error: lErr } = await sr.from("leads").insert([
    { ...baseLead, first_name: "TestRLS-A1", phone_e164: "+15555550101", email: "a1@example.com", agent_id: agentA.id },
    { ...baseLead, first_name: "TestRLS-A2", phone_e164: "+15555550102", email: "a2@example.com", agent_id: agentA.id },
    { ...baseLead, first_name: "TestRLS-B1", phone_e164: "+15555550103", email: "b1@example.com", agent_id: agentB.id },
    { ...baseLead, first_name: "TestRLS-Unassigned", phone_e164: "+15555550104", email: "u@example.com", agent_id: null },
  ]);
  if (lErr) throw lErr;

  // ---------------------------------------------------------------------------
  // Assertion 1: anon blocked on all three tables (no anon grants)
  // ---------------------------------------------------------------------------
  console.log("\n--- Assertion 1: anon blocked on platform_users / agents / leads ---");
  for (const table of ["platform_users", "agents", "leads"] as const) {
    const { error } = await anon.from(table).select("id").limit(1);
    assert(
      `anon SELECT on ${table} → permission denied`,
      error !== null && /permission denied|not allowed|insufficient/i.test(error.message),
      error ? `actual error: ${error.message}` : "expected an error, got none",
    );
  }

  // ---------------------------------------------------------------------------
  // Assertion 2: agent A sees own platform_users + own agent + own leads only
  // ---------------------------------------------------------------------------
  console.log("\n--- Assertion 2: agent A sees own platform_users + own agent + own leads ---");
  const aClient = clientForUser(AGENT_A_EMAIL);
  const aPus = await aClient.from("platform_users").select("id, email").in("email", ALL_FIXTURE_EMAILS);
  assert(
    "agent A: 1 platform_users row (own)",
    aPus.error === null && aPus.data?.length === 1 && aPus.data[0]?.email === AGENT_A_EMAIL,
    aPus.error ? aPus.error.message : `got ${aPus.data?.length} rows`,
  );
  const aAgents = await aClient.from("agents").select("id").in("id", [agentA.id, agentB.id]);
  assert(
    "agent A: 1 agents row (own)",
    aAgents.error === null && aAgents.data?.length === 1 && aAgents.data[0]?.id === agentA.id,
    aAgents.error ? aAgents.error.message : `got ${aAgents.data?.length} rows`,
  );
  const aLeads = await aClient.from("leads").select("id, agent_id, first_name").like("first_name", "TestRLS%");
  assert(
    "agent A: 2 leads (own only — A1 + A2)",
    aLeads.error === null && aLeads.data?.length === 2 && aLeads.data.every((l) => l.agent_id === agentA.id),
    aLeads.error ? aLeads.error.message : `got ${aLeads.data?.length} rows: ${aLeads.data?.map((l) => l.first_name).join(", ")}`,
  );

  // ---------------------------------------------------------------------------
  // Assertion 3: agent A vs agent B isolation
  // ---------------------------------------------------------------------------
  console.log("\n--- Assertion 3: agent A vs agent B isolation ---");
  const bClient = clientForUser(AGENT_B_EMAIL);
  const bLeads = await bClient.from("leads").select("id, agent_id, first_name").like("first_name", "TestRLS%");
  assert(
    "agent B: 1 lead (own only — B1)",
    bLeads.error === null && bLeads.data?.length === 1 && bLeads.data[0]?.agent_id === agentB.id,
    bLeads.error ? bLeads.error.message : `got ${bLeads.data?.length} rows`,
  );
  // Cross-check: A's client cannot see B's lead even if it tries to filter for it.
  const aTriesB = await aClient.from("leads").select("id").eq("agent_id", agentB.id);
  assert(
    "agent A cannot see B's leads even with explicit filter",
    aTriesB.error === null && aTriesB.data?.length === 0,
    aTriesB.error ? aTriesB.error.message : `got ${aTriesB.data?.length} rows`,
  );

  // ---------------------------------------------------------------------------
  // Assertion 4: admin sees all of each table
  // ---------------------------------------------------------------------------
  console.log("\n--- Assertion 4: admin sees all platform_users + agents + leads ---");
  const adminClient = clientForUser(ADMIN_EMAIL);
  const adminPus = await adminClient.from("platform_users").select("id").in("email", ALL_FIXTURE_EMAILS);
  assert(
    "admin: 4 platform_users rows (all fixtures)",
    adminPus.error === null && adminPus.data?.length === 4,
    adminPus.error ? adminPus.error.message : `got ${adminPus.data?.length} rows`,
  );
  const adminAgents = await adminClient.from("agents").select("id").in("id", [agentA.id, agentB.id]);
  assert(
    "admin: 2 agents rows (both)",
    adminAgents.error === null && adminAgents.data?.length === 2,
    adminAgents.error ? adminAgents.error.message : `got ${adminAgents.data?.length} rows`,
  );
  const adminLeads = await adminClient.from("leads").select("id").like("first_name", "TestRLS%");
  assert(
    "admin: 4 leads (all fixtures including unassigned)",
    adminLeads.error === null && adminLeads.data?.length === 4,
    adminLeads.error ? adminLeads.error.message : `got ${adminLeads.data?.length} rows`,
  );

  // ---------------------------------------------------------------------------
  // Assertion 5: superadmin sees all (functionally identical to admin in v0.1)
  // ---------------------------------------------------------------------------
  console.log("\n--- Assertion 5: superadmin sees all (same as admin in v0.1) ---");
  const superClient = clientForUser(SUPER_EMAIL);
  const superLeads = await superClient.from("leads").select("id").like("first_name", "TestRLS%");
  assert(
    "superadmin: 4 leads (all fixtures)",
    superLeads.error === null && superLeads.data?.length === 4,
    superLeads.error ? superLeads.error.message : `got ${superLeads.data?.length} rows`,
  );

  // ---------------------------------------------------------------------------
  // Assertion 6: inactive platform_user sees own platform_users row only
  // ---------------------------------------------------------------------------
  console.log("\n--- Assertion 6: inactive agent A sees own platform_users row only ---");
  await sr.from("platform_users").update({ active: false }).eq("email", AGENT_A_EMAIL);
  const aClientInactive = clientForUser(AGENT_A_EMAIL);
  const inPus = await aClientInactive.from("platform_users").select("id, email").in("email", ALL_FIXTURE_EMAILS);
  assert(
    "inactive A: 1 platform_users row (own — by design)",
    inPus.error === null && inPus.data?.length === 1 && inPus.data[0]?.email === AGENT_A_EMAIL,
    inPus.error ? inPus.error.message : `got ${inPus.data?.length} rows`,
  );
  const inAgents = await aClientInactive.from("agents").select("id").in("id", [agentA.id]);
  assert(
    "inactive A: 0 agents rows (active-gated)",
    inAgents.error === null && inAgents.data?.length === 0,
    inAgents.error ? inAgents.error.message : `got ${inAgents.data?.length} rows`,
  );
  const inLeads = await aClientInactive.from("leads").select("id").like("first_name", "TestRLS%");
  assert(
    "inactive A: 0 leads (active-gated)",
    inLeads.error === null && inLeads.data?.length === 0,
    inLeads.error ? inLeads.error.message : `got ${inLeads.data?.length} rows`,
  );
  // Restore A's active flag for the rest of the suite.
  await sr.from("platform_users").update({ active: true }).eq("email", AGENT_A_EMAIL);

  // ---------------------------------------------------------------------------
  // Assertion 7: no INSERT/UPDATE/DELETE grants on leads (admin tries → permission denied)
  // ---------------------------------------------------------------------------
  console.log("\n--- Assertion 7: no INSERT/UPDATE/DELETE grants on leads (admin) ---");
  const adminInsert = await adminClient.from("leads").insert({
    ...baseLead,
    first_name: "TestRLS-AdminInsert",
    phone_e164: "+15555550199",
    email: "admin-insert@example.com",
  });
  assert(
    "admin INSERT on leads → permission denied",
    adminInsert.error !== null && /permission denied|not allowed|insufficient/i.test(adminInsert.error.message),
    adminInsert.error ? `actual: ${adminInsert.error.message}` : "expected an error",
  );
  const adminUpdate = await adminClient.from("leads").update({ first_name: "X" }).like("first_name", "TestRLS%");
  assert(
    "admin UPDATE on leads → permission denied",
    adminUpdate.error !== null && /permission denied|not allowed|insufficient/i.test(adminUpdate.error.message),
    adminUpdate.error ? `actual: ${adminUpdate.error.message}` : "expected an error",
  );
  const adminDelete = await adminClient.from("leads").delete().like("first_name", "TestRLS%");
  assert(
    "admin DELETE on leads → permission denied",
    adminDelete.error !== null && /permission denied|not allowed|insufficient/i.test(adminDelete.error.message),
    adminDelete.error ? `actual: ${adminDelete.error.message}` : "expected an error",
  );

  // ---------------------------------------------------------------------------
  // Assertion 8: email case normalization (CHECK constraint fires)
  // ---------------------------------------------------------------------------
  console.log("\n--- Assertion 8: email case normalization (CHECK constraint) ---");
  const badInsert = await sr.from("platform_users").insert({
    email: "Mixed.Case@Example.com",
    role: "agent",
  });
  assert(
    "non-lowercase platform_users insert → CHECK violation",
    badInsert.error !== null && /check.*platform_users_email_check|email/i.test(badInsert.error.message),
    badInsert.error ? `actual: ${badInsert.error.message}` : "expected a CHECK error",
  );

  console.log("\n--- cleanup ---");
  await cleanup();
  console.log("  done");

  console.log(`\n${pass}/${pass + fail} assertions passed.`);
  if (fail > 0) {
    process.exit(1);
  }
}

main().catch(async (err) => {
  console.error("\n✗ SCRIPT FAILED:", err);
  // Best-effort cleanup even on failure.
  await cleanup().catch(() => undefined);
  process.exit(1);
});
