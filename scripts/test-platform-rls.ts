// Plan 3 RLS verification — 8 assertions covering role-aware policies on
// platform_users / agents / leads, the SECURITY DEFINER lookup function,
// and the email-lowercase CHECK constraint.
//
// Pattern note: the existing test-dispatch-suppression.ts uses the
// service-role client which BYPASSES RLS — useless for testing RLS. This
// script uses real Supabase-issued JWTs (matches the Bookr project's
// tests/helpers/users.ts pattern):
//   1. Service-role creates real auth.users via auth.admin.createUser
//      (email_confirm: true + throwaway password).
//   2. Insert the matching platform_users row (and agents row for agent
//      fixtures) via service-role.
//   3. Sign in via a fresh anon client with signInWithPassword → get a
//      real Supabase-issued JWT scoped to that user.
//   4. Use the per-user client to query under that user's RLS context.
//   5. Cleanup deletes leads → agents → platform_users → auth.users.
//
// No JWT secret needed — Supabase signs the JWT, we just use the standard
// auth flow. Robust against any future change in JWT signing (asymmetric
// vs symmetric, key rotation, etc.).
//
// Run with:
//   set -a; source .env.local; set +a
//   NODE_OPTIONS='--conditions=react-server' pnpm dlx tsx scripts/test-platform-rls.ts

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing one of NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY in env",
  );
}

// Service-role client for fixture setup + cleanup (bypasses RLS).
const sr = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Anon client for negative tests (anon should be blocked on all three tables).
const anon = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Per-user authenticated client. Real Supabase auth flow:
// signInWithPassword on a fresh client → Supabase issues a real JWT.
async function clientForUser(
  email: string,
  password: string,
): Promise<SupabaseClient> {
  const client = createClient(SUPABASE_URL!, ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(`signInWithPassword failed for ${email}: ${error.message}`);
  }
  return client;
}

// Fixture emails (deterministic; cleanup keys on these).
const TEST_PASSWORD = "test-rls-pw-12345";
const SUPER_EMAIL = "test-rls-super@example.test";
const ADMIN_EMAIL = "test-rls-admin@example.test";
const AGENT_A_EMAIL = "test-rls-agent-a@example.test";
const AGENT_B_EMAIL = "test-rls-agent-b@example.test";
const ALL_FIXTURE_EMAILS = [
  SUPER_EMAIL,
  ADMIN_EMAIL,
  AGENT_A_EMAIL,
  AGENT_B_EMAIL,
];

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
  // Order: leads → agents → platform_users → auth.users (FK chain).
  await sr.from("leads").delete().like("first_name", "TestRLS%");

  // Find the platform_users for our fixtures so we can chain delete.
  const { data: pus } = await sr
    .from("platform_users")
    .select("id")
    .in("email", ALL_FIXTURE_EMAILS);
  if (pus && pus.length > 0) {
    const puIds = pus.map((p) => p.id);
    await sr.from("agents").delete().in("platform_user_id", puIds);
  }
  await sr.from("platform_users").delete().in("email", ALL_FIXTURE_EMAILS);

  // Delete auth.users via Admin API. List + filter by email; the admin API
  // doesn't have a "delete by email" shortcut.
  const { data: usersList } = await sr.auth.admin.listUsers({ perPage: 200 });
  if (usersList?.users) {
    for (const u of usersList.users) {
      if (u.email && ALL_FIXTURE_EMAILS.includes(u.email)) {
        await sr.auth.admin.deleteUser(u.id);
      }
    }
  }
}

async function createAuthUser(email: string): Promise<string> {
  const { data, error } = await sr.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(
      `auth.admin.createUser failed for ${email}: ${error?.message ?? "no user returned"}`,
    );
  }
  return data.user.id;
}

async function main() {
  console.log("--- setup: cleanup any leftover fixtures from a prior run ---");
  await cleanup();

  console.log("--- setup: create auth.users via Admin API ---");
  await createAuthUser(SUPER_EMAIL);
  await createAuthUser(ADMIN_EMAIL);
  await createAuthUser(AGENT_A_EMAIL);
  await createAuthUser(AGENT_B_EMAIL);

  console.log("--- setup: insert role fixtures into platform_users + agents ---");
  const { data: pus, error: puErr } = await sr
    .from("platform_users")
    .insert([
      { email: SUPER_EMAIL, role: "superadmin" },
      { email: ADMIN_EMAIL, role: "admin" },
      { email: AGENT_A_EMAIL, role: "agent" },
      { email: AGENT_B_EMAIL, role: "agent" },
    ])
    .select();
  if (puErr || !pus || pus.length !== 4) {
    throw puErr ?? new Error("fixture: platform_users insert failed");
  }
  const puBy = (email: string) => pus.find((p) => p.email === email)!;

  const { data: agents, error: aErr } = await sr
    .from("agents")
    .insert([
      {
        platform_user_id: puBy(AGENT_A_EMAIL).id,
        full_name: "TestRLS Agent A",
        license_states: ["TX"],
      },
      {
        platform_user_id: puBy(AGENT_B_EMAIL).id,
        full_name: "TestRLS Agent B",
        license_states: ["FL"],
      },
    ])
    .select();
  if (aErr || !agents || agents.length !== 2) {
    throw aErr ?? new Error("fixture: agents insert failed");
  }
  const agentA = agents.find(
    (a) => a.platform_user_id === puBy(AGENT_A_EMAIL).id,
  )!;
  const agentB = agents.find(
    (a) => a.platform_user_id === puBy(AGENT_B_EMAIL).id,
  )!;

  // Insert deterministic test leads — 2 for A, 1 for B, 1 unassigned.
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
    details: {
      mortgage_balance: 250_000,
      is_smoker: false,
      is_homeowner: true,
    },
  };
  const { error: lErr } = await sr.from("leads").insert([
    {
      ...baseLead,
      first_name: "TestRLS-A1",
      phone_e164: "+15555550101",
      email: "a1@example.test",
      agent_id: agentA.id,
    },
    {
      ...baseLead,
      first_name: "TestRLS-A2",
      phone_e164: "+15555550102",
      email: "a2@example.test",
      agent_id: agentA.id,
    },
    {
      ...baseLead,
      first_name: "TestRLS-B1",
      phone_e164: "+15555550103",
      email: "b1@example.test",
      agent_id: agentB.id,
    },
    {
      ...baseLead,
      first_name: "TestRLS-Unassigned",
      phone_e164: "+15555550104",
      email: "u@example.test",
      agent_id: null,
    },
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
  const aClient = await clientForUser(AGENT_A_EMAIL, TEST_PASSWORD);
  const aPus = await aClient
    .from("platform_users")
    .select("id, email")
    .in("email", ALL_FIXTURE_EMAILS);
  assert(
    "agent A: 1 platform_users row (own)",
    aPus.error === null &&
      aPus.data?.length === 1 &&
      aPus.data[0]?.email === AGENT_A_EMAIL,
    aPus.error ? aPus.error.message : `got ${aPus.data?.length} rows`,
  );
  const aAgents = await aClient
    .from("agents")
    .select("id")
    .in("id", [agentA.id, agentB.id]);
  assert(
    "agent A: 1 agents row (own)",
    aAgents.error === null &&
      aAgents.data?.length === 1 &&
      aAgents.data[0]?.id === agentA.id,
    aAgents.error ? aAgents.error.message : `got ${aAgents.data?.length} rows`,
  );
  const aLeads = await aClient
    .from("leads")
    .select("id, agent_id, first_name")
    .like("first_name", "TestRLS%");
  assert(
    "agent A: 2 leads (own only — A1 + A2)",
    aLeads.error === null &&
      aLeads.data?.length === 2 &&
      aLeads.data.every((l) => l.agent_id === agentA.id),
    aLeads.error
      ? aLeads.error.message
      : `got ${aLeads.data?.length} rows: ${aLeads.data?.map((l) => l.first_name).join(", ")}`,
  );

  // ---------------------------------------------------------------------------
  // Assertion 3: agent A vs agent B isolation
  // ---------------------------------------------------------------------------
  console.log("\n--- Assertion 3: agent A vs agent B isolation ---");
  const bClient = await clientForUser(AGENT_B_EMAIL, TEST_PASSWORD);
  const bLeads = await bClient
    .from("leads")
    .select("id, agent_id, first_name")
    .like("first_name", "TestRLS%");
  assert(
    "agent B: 1 lead (own only — B1)",
    bLeads.error === null &&
      bLeads.data?.length === 1 &&
      bLeads.data[0]?.agent_id === agentB.id,
    bLeads.error ? bLeads.error.message : `got ${bLeads.data?.length} rows`,
  );
  // Cross-check: A's client cannot see B's lead even if it tries to filter for it.
  const aTriesB = await aClient
    .from("leads")
    .select("id")
    .eq("agent_id", agentB.id);
  assert(
    "agent A cannot see B's leads even with explicit filter",
    aTriesB.error === null && aTriesB.data?.length === 0,
    aTriesB.error ? aTriesB.error.message : `got ${aTriesB.data?.length} rows`,
  );

  // ---------------------------------------------------------------------------
  // Assertion 4: admin sees all of each table
  // ---------------------------------------------------------------------------
  console.log("\n--- Assertion 4: admin sees all platform_users + agents + leads ---");
  const adminClient = await clientForUser(ADMIN_EMAIL, TEST_PASSWORD);
  const adminPus = await adminClient
    .from("platform_users")
    .select("id")
    .in("email", ALL_FIXTURE_EMAILS);
  assert(
    "admin: 4 platform_users rows (all fixtures)",
    adminPus.error === null && adminPus.data?.length === 4,
    adminPus.error ? adminPus.error.message : `got ${adminPus.data?.length} rows`,
  );
  const adminAgents = await adminClient
    .from("agents")
    .select("id")
    .in("id", [agentA.id, agentB.id]);
  assert(
    "admin: 2 agents rows (both)",
    adminAgents.error === null && adminAgents.data?.length === 2,
    adminAgents.error ? adminAgents.error.message : `got ${adminAgents.data?.length} rows`,
  );
  const adminLeads = await adminClient
    .from("leads")
    .select("id")
    .like("first_name", "TestRLS%");
  assert(
    "admin: 4 leads (all fixtures including unassigned)",
    adminLeads.error === null && adminLeads.data?.length === 4,
    adminLeads.error ? adminLeads.error.message : `got ${adminLeads.data?.length} rows`,
  );

  // ---------------------------------------------------------------------------
  // Assertion 5: superadmin sees all (functionally identical to admin in v0.1)
  // ---------------------------------------------------------------------------
  console.log("\n--- Assertion 5: superadmin sees all (same as admin in v0.1) ---");
  const superClient = await clientForUser(SUPER_EMAIL, TEST_PASSWORD);
  const superLeads = await superClient
    .from("leads")
    .select("id")
    .like("first_name", "TestRLS%");
  assert(
    "superadmin: 4 leads (all fixtures)",
    superLeads.error === null && superLeads.data?.length === 4,
    superLeads.error ? superLeads.error.message : `got ${superLeads.data?.length} rows`,
  );

  // ---------------------------------------------------------------------------
  // Assertion 6: inactive platform_user sees own platform_users row only
  // ---------------------------------------------------------------------------
  console.log("\n--- Assertion 6: inactive agent A sees own platform_users row only ---");
  await sr
    .from("platform_users")
    .update({ active: false })
    .eq("email", AGENT_A_EMAIL);
  // Re-sign-in so the new client picks up a fresh JWT (the active flag isn't
  // in the JWT, but a fresh client with no caches makes the test cleaner).
  const aClientInactive = await clientForUser(AGENT_A_EMAIL, TEST_PASSWORD);
  const inPus = await aClientInactive
    .from("platform_users")
    .select("id, email")
    .in("email", ALL_FIXTURE_EMAILS);
  assert(
    "inactive A: 1 platform_users row (own — by design)",
    inPus.error === null &&
      inPus.data?.length === 1 &&
      inPus.data[0]?.email === AGENT_A_EMAIL,
    inPus.error ? inPus.error.message : `got ${inPus.data?.length} rows`,
  );
  const inAgents = await aClientInactive
    .from("agents")
    .select("id")
    .in("id", [agentA.id]);
  assert(
    "inactive A: 0 agents rows (active-gated)",
    inAgents.error === null && inAgents.data?.length === 0,
    inAgents.error ? inAgents.error.message : `got ${inAgents.data?.length} rows`,
  );
  const inLeads = await aClientInactive
    .from("leads")
    .select("id")
    .like("first_name", "TestRLS%");
  assert(
    "inactive A: 0 leads (active-gated)",
    inLeads.error === null && inLeads.data?.length === 0,
    inLeads.error ? inLeads.error.message : `got ${inLeads.data?.length} rows`,
  );
  // Restore A's active flag for the rest of the suite.
  await sr
    .from("platform_users")
    .update({ active: true })
    .eq("email", AGENT_A_EMAIL);

  // ---------------------------------------------------------------------------
  // Assertion 7: no INSERT/UPDATE/DELETE grants on leads (admin → permission denied)
  // ---------------------------------------------------------------------------
  console.log("\n--- Assertion 7: no INSERT/UPDATE/DELETE grants on leads (admin) ---");
  const adminInsert = await adminClient.from("leads").insert({
    ...baseLead,
    first_name: "TestRLS-AdminInsert",
    phone_e164: "+15555550199",
    email: "admin-insert@example.test",
  });
  assert(
    "admin INSERT on leads → permission denied",
    adminInsert.error !== null &&
      /permission denied|not allowed|insufficient/i.test(adminInsert.error.message),
    adminInsert.error
      ? `actual: ${adminInsert.error.message}`
      : "expected an error",
  );
  const adminUpdate = await adminClient
    .from("leads")
    .update({ first_name: "X" })
    .like("first_name", "TestRLS%");
  assert(
    "admin UPDATE on leads → permission denied",
    adminUpdate.error !== null &&
      /permission denied|not allowed|insufficient/i.test(adminUpdate.error.message),
    adminUpdate.error
      ? `actual: ${adminUpdate.error.message}`
      : "expected an error",
  );
  const adminDelete = await adminClient
    .from("leads")
    .delete()
    .like("first_name", "TestRLS%");
  assert(
    "admin DELETE on leads → permission denied",
    adminDelete.error !== null &&
      /permission denied|not allowed|insufficient/i.test(adminDelete.error.message),
    adminDelete.error
      ? `actual: ${adminDelete.error.message}`
      : "expected an error",
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
    badInsert.error !== null &&
      /check.*email|email.*check|violates check constraint/i.test(badInsert.error.message),
    badInsert.error
      ? `actual: ${badInsert.error.message}`
      : "expected a CHECK error",
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
