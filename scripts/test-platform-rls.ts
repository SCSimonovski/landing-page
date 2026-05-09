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
const SUPER2_EMAIL = "test-rls-super2@example.test"; // Plan 5: superadmin-on-superadmin deactivation
const ADMIN_EMAIL = "test-rls-admin@example.test";
const AGENT_A_EMAIL = "test-rls-agent-a@example.test";
const AGENT_B_EMAIL = "test-rls-agent-b@example.test";
const ALL_FIXTURE_EMAILS = [
  SUPER_EMAIL,
  SUPER2_EMAIL,
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
  // Order: lead_events / consent_log → leads → agents → platform_users →
  // auth.users (FK chain). consent_log + lead_events have no ON DELETE
  // CASCADE on their leads FK, so they must be deleted first.
  // ALSO: lead_events.actor_platform_user_id → platform_users has no
  // ON DELETE CASCADE either, so we need to clear those references before
  // deleting platform_users (orphan events from earlier runs would block).
  const { data: testLeads } = await sr
    .from("leads")
    .select("id")
    .like("first_name", "TestRLS%");
  if (testLeads && testLeads.length > 0) {
    const leadIds = testLeads.map((l) => l.id);
    await sr.from("lead_events").delete().in("lead_id", leadIds);
    await sr.from("consent_log").delete().in("lead_id", leadIds);
  }
  await sr.from("leads").delete().like("first_name", "TestRLS%");

  // Find the platform_users for our fixtures so we can chain delete.
  // Also delete any stray lead_events whose actor points at fixture rows
  // (defends against orphans left by prior partial runs — the FK has no
  // ON DELETE CASCADE).
  const { data: pus } = await sr
    .from("platform_users")
    .select("id")
    .in("email", ALL_FIXTURE_EMAILS);
  if (pus && pus.length > 0) {
    const puIds = pus.map((p) => p.id);
    await sr.from("lead_events").delete().in("actor_platform_user_id", puIds);
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
  await createAuthUser(SUPER2_EMAIL);
  await createAuthUser(ADMIN_EMAIL);
  await createAuthUser(AGENT_A_EMAIL);
  await createAuthUser(AGENT_B_EMAIL);

  console.log("--- setup: insert role fixtures into platform_users + agents ---");
  const { data: pus, error: puErr } = await sr
    .from("platform_users")
    .insert([
      { email: SUPER_EMAIL, role: "superadmin" },
      { email: SUPER2_EMAIL, role: "superadmin" },
      { email: ADMIN_EMAIL, role: "admin" },
      { email: AGENT_A_EMAIL, role: "agent" },
      { email: AGENT_B_EMAIL, role: "agent" },
    ])
    .select();
  if (puErr || !pus || pus.length !== 5) {
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

  // Plan 5: also seed consent_log rows so the SELECT-policy tests have data.
  // /api/leads writes these via insert_lead_with_consent atomically; for the
  // test fixture we insert directly via service-role.
  const { data: leadIds } = await sr
    .from("leads")
    .select("id, agent_id, first_name")
    .like("first_name", "TestRLS%");
  const leadByName = (n: string) =>
    leadIds!.find((l) => l.first_name === n)!;
  const a1Id = leadByName("TestRLS-A1").id;
  const a2Id = leadByName("TestRLS-A2").id;
  const b1Id = leadByName("TestRLS-B1").id;
  await sr.from("consent_log").insert([
    {
      lead_id: a1Id,
      brand: "northgate-protection",
      consent_text: "TestRLS consent text A1",
      form_version: "test",
      ip_address: "127.0.0.1",
      page_url: "https://test/leads",
      user_agent: "test",
    },
    {
      lead_id: a2Id,
      brand: "northgate-protection",
      consent_text: "TestRLS consent text A2",
      form_version: "test",
      ip_address: "127.0.0.1",
      page_url: "https://test/leads",
      user_agent: "test",
    },
    {
      lead_id: b1Id,
      brand: "northgate-protection",
      consent_text: "TestRLS consent text B1",
      form_version: "test",
      ip_address: "127.0.0.1",
      page_url: "https://test/leads",
      user_agent: "test",
    },
  ]);

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
    "admin: 5 platform_users rows (all fixtures)",
    adminPus.error === null && adminPus.data?.length === 5,
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

  // ===========================================================================
  // Plan 5: RPC + SELECT-policy + anti-grant assertions (~15 new)
  // ===========================================================================
  // Re-create per-user clients here so we get fresh JWTs after the assertion-6
  // active-flag flip. Existing aClient / bClient / adminClient / superClient
  // were minted before the flip; safer to mint fresh.
  const aClientRpc = await clientForUser(AGENT_A_EMAIL, TEST_PASSWORD);
  const bClientRpc = await clientForUser(AGENT_B_EMAIL, TEST_PASSWORD);
  const adminClientRpc = await clientForUser(ADMIN_EMAIL, TEST_PASSWORD);
  const superClientRpc = await clientForUser(SUPER_EMAIL, TEST_PASSWORD);
  const super2ClientRpc = await clientForUser(SUPER2_EMAIL, TEST_PASSWORD);

  // ---------------------------------------------------------------------------
  // Assertion 9: update_lead_status — agent on own lead → success
  // ---------------------------------------------------------------------------
  console.log("\n--- Assertion 9: update_lead_status agent on own lead ---");
  const u9 = await aClientRpc.rpc("update_lead_status", {
    p_lead_id: a1Id,
    p_new_status: "contacted",
  });
  assert(
    "agent A: update_lead_status('contacted') on own lead → success",
    u9.error === null,
    u9.error ? `actual: ${u9.error.message}` : "",
  );
  // Verify the status persisted + a status_change event was written with actor.
  const { data: a1AfterRow } = await sr
    .from("leads")
    .select("status")
    .eq("id", a1Id)
    .single();
  assert(
    "agent A's lead.status now = 'contacted'",
    a1AfterRow?.status === "contacted",
    `actual: ${a1AfterRow?.status}`,
  );
  const { data: a1Events } = await sr
    .from("lead_events")
    .select("event_type, event_data, actor_platform_user_id")
    .eq("lead_id", a1Id)
    .eq("event_type", "status_change");
  assert(
    "lead_events row written for status_change with actor_platform_user_id set",
    !!a1Events &&
      a1Events.length >= 1 &&
      a1Events.some(
        (e) => e.actor_platform_user_id === puBy(AGENT_A_EMAIL).id,
      ),
    `events: ${JSON.stringify(a1Events)}`,
  );

  // ---------------------------------------------------------------------------
  // Assertion 10: update_lead_status — agent on another agent's lead → denied
  // ---------------------------------------------------------------------------
  console.log("\n--- Assertion 10: update_lead_status agent A on B's lead → denied ---");
  const u10 = await aClientRpc.rpc("update_lead_status", {
    p_lead_id: b1Id,
    p_new_status: "contacted",
  });
  assert(
    "agent A: update_lead_status on B's lead → access denied",
    u10.error !== null && /access denied|not found/i.test(u10.error.message),
    u10.error ? `actual: ${u10.error.message}` : "expected an error",
  );

  // ---------------------------------------------------------------------------
  // Assertion 11: update_lead_status — admin on any lead → success
  // ---------------------------------------------------------------------------
  console.log("\n--- Assertion 11: update_lead_status admin on B's lead → success ---");
  const u11 = await adminClientRpc.rpc("update_lead_status", {
    p_lead_id: b1Id,
    p_new_status: "appointment",
  });
  assert(
    "admin: update_lead_status on B's lead → success",
    u11.error === null,
    u11.error ? `actual: ${u11.error.message}` : "",
  );

  // ---------------------------------------------------------------------------
  // Assertion 12: update_lead_notes — agent on own lead → success + event
  // ---------------------------------------------------------------------------
  console.log("\n--- Assertion 12: update_lead_notes agent on own lead ---");
  const u12 = await aClientRpc.rpc("update_lead_notes", {
    p_lead_id: a1Id,
    p_notes: "TestRLS: left voicemail at 2pm",
  });
  assert(
    "agent A: update_lead_notes on own lead → success",
    u12.error === null,
    u12.error ? `actual: ${u12.error.message}` : "",
  );
  const { data: a1NotesRow } = await sr
    .from("leads")
    .select("notes")
    .eq("id", a1Id)
    .single();
  assert(
    "agent A's lead.notes persisted",
    a1NotesRow?.notes === "TestRLS: left voicemail at 2pm",
    `actual: ${a1NotesRow?.notes}`,
  );

  // ---------------------------------------------------------------------------
  // Assertion 13: assign_lead — admin → success + assigned event with actor
  // ---------------------------------------------------------------------------
  console.log("\n--- Assertion 13: assign_lead admin → success ---");
  // Find the unassigned lead.
  const { data: unassignedRow } = await sr
    .from("leads")
    .select("id")
    .eq("first_name", "TestRLS-Unassigned")
    .single();
  const unId = unassignedRow!.id;
  const u13 = await adminClientRpc.rpc("assign_lead", {
    p_lead_id: unId,
    p_new_agent_id: agentB.id,
  });
  assert(
    "admin: assign_lead(B) on unassigned → success",
    u13.error === null,
    u13.error ? `actual: ${u13.error.message}` : "",
  );
  const { data: unAfterRow } = await sr
    .from("leads")
    .select("agent_id")
    .eq("id", unId)
    .single();
  assert(
    "lead.agent_id updated to agent B",
    unAfterRow?.agent_id === agentB.id,
    `actual: ${unAfterRow?.agent_id}`,
  );
  const { data: unAssignedEvents } = await sr
    .from("lead_events")
    .select("event_type, actor_platform_user_id")
    .eq("lead_id", unId)
    .eq("event_type", "assigned");
  assert(
    "assigned event written with admin actor",
    !!unAssignedEvents &&
      unAssignedEvents.length === 1 &&
      unAssignedEvents[0]?.actor_platform_user_id === puBy(ADMIN_EMAIL).id,
    `events: ${JSON.stringify(unAssignedEvents)}`,
  );

  // ---------------------------------------------------------------------------
  // Assertion 14: assign_lead — agent → permission denied
  // ---------------------------------------------------------------------------
  console.log("\n--- Assertion 14: assign_lead agent → permission denied ---");
  const u14 = await aClientRpc.rpc("assign_lead", {
    p_lead_id: a1Id,
    p_new_agent_id: agentB.id,
  });
  assert(
    "agent A: assign_lead → permission denied",
    u14.error !== null &&
      /admin or superadmin required|access denied/i.test(u14.error.message),
    u14.error ? `actual: ${u14.error.message}` : "expected an error",
  );

  // ---------------------------------------------------------------------------
  // Assertion 15: assign_lead — admin assigns to NULL → success
  // ---------------------------------------------------------------------------
  console.log("\n--- Assertion 15: assign_lead to NULL (unassign) ---");
  const u15 = await adminClientRpc.rpc("assign_lead", {
    p_lead_id: unId,
    p_new_agent_id: null,
  });
  assert(
    "admin: assign_lead(NULL) → success (unassign)",
    u15.error === null,
    u15.error ? `actual: ${u15.error.message}` : "",
  );

  // ---------------------------------------------------------------------------
  // Assertion 16: set_platform_user_active — admin deactivates agent B → success
  // ---------------------------------------------------------------------------
  console.log("\n--- Assertion 16: set_platform_user_active admin deactivates agent ---");
  const u16 = await adminClientRpc.rpc("set_platform_user_active", {
    p_target_user_id: puBy(AGENT_B_EMAIL).id,
    p_new_active: false,
  });
  assert(
    "admin: set_platform_user_active(B, false) → success",
    u16.error === null,
    u16.error ? `actual: ${u16.error.message}` : "",
  );
  // Restore for the rest.
  await sr
    .from("platform_users")
    .update({ active: true })
    .eq("id", puBy(AGENT_B_EMAIL).id);

  // ---------------------------------------------------------------------------
  // Assertion 17: admin self-deactivation → 'cannot deactivate yourself'
  // ---------------------------------------------------------------------------
  console.log("\n--- Assertion 17: admin self-deactivation refused ---");
  const u17 = await adminClientRpc.rpc("set_platform_user_active", {
    p_target_user_id: puBy(ADMIN_EMAIL).id,
    p_new_active: false,
  });
  assert(
    "admin self-deactivation → 'cannot deactivate yourself'",
    u17.error !== null && /cannot deactivate yourself/i.test(u17.error.message),
    u17.error ? `actual: ${u17.error.message}` : "expected an error",
  );

  // ---------------------------------------------------------------------------
  // Assertion 18: admin deactivating superadmin → admin/superadmin divergence
  // ---------------------------------------------------------------------------
  console.log("\n--- Assertion 18: admin cannot deactivate superadmin ---");
  const u18 = await adminClientRpc.rpc("set_platform_user_active", {
    p_target_user_id: puBy(SUPER_EMAIL).id,
    p_new_active: false,
  });
  assert(
    "admin → set_platform_user_active(superadmin) → 'admin cannot deactivate superadmin'",
    u18.error !== null &&
      /admin cannot deactivate superadmin/i.test(u18.error.message),
    u18.error ? `actual: ${u18.error.message}` : "expected an error",
  );

  // ---------------------------------------------------------------------------
  // Assertion 19: superadmin deactivates another superadmin → success (allowed)
  // ---------------------------------------------------------------------------
  console.log("\n--- Assertion 19: superadmin can deactivate another superadmin ---");
  const u19 = await superClientRpc.rpc("set_platform_user_active", {
    p_target_user_id: puBy(SUPER2_EMAIL).id,
    p_new_active: false,
  });
  assert(
    "superadmin → set_platform_user_active(other superadmin, false) → success",
    u19.error === null,
    u19.error ? `actual: ${u19.error.message}` : "",
  );
  // Restore so SUPER2 can sign in for any later assertion (none today, but
  // re-running the script needs SUPER2 active for cleanup symmetry).
  await sr
    .from("platform_users")
    .update({ active: true })
    .eq("id", puBy(SUPER2_EMAIL).id);

  // ---------------------------------------------------------------------------
  // Assertion 20: agent → set_platform_user_active → permission denied
  // ---------------------------------------------------------------------------
  console.log("\n--- Assertion 20: agent → set_platform_user_active → denied ---");
  const u20 = await aClientRpc.rpc("set_platform_user_active", {
    p_target_user_id: puBy(AGENT_B_EMAIL).id,
    p_new_active: false,
  });
  assert(
    "agent A: set_platform_user_active → 'admin or superadmin required'",
    u20.error !== null &&
      /admin or superadmin required/i.test(u20.error.message),
    u20.error ? `actual: ${u20.error.message}` : "expected an error",
  );

  // ---------------------------------------------------------------------------
  // Assertion 21: update_agent_profile — agent on own row → success
  // ---------------------------------------------------------------------------
  console.log("\n--- Assertion 21: update_agent_profile agent on own row ---");
  const u21 = await aClientRpc.rpc("update_agent_profile", {
    p_full_name: "TestRLS Agent A v2",
    p_license_states: ["TX", "FL", "CA"],
  });
  assert(
    "agent A: update_agent_profile → success",
    u21.error === null,
    u21.error ? `actual: ${u21.error.message}` : "",
  );
  const { data: agentARow } = await sr
    .from("agents")
    .select("full_name, license_states")
    .eq("id", agentA.id)
    .single();
  assert(
    "agents row updated: full_name + license_states",
    agentARow?.full_name === "TestRLS Agent A v2" &&
      Array.isArray(agentARow?.license_states) &&
      agentARow!.license_states.length === 3,
    `actual: ${JSON.stringify(agentARow)}`,
  );

  // ---------------------------------------------------------------------------
  // Assertion 22: update_agent_profile — admin (no agent row) → loud failure
  // ---------------------------------------------------------------------------
  console.log("\n--- Assertion 22: update_agent_profile admin (no agent row) → denied ---");
  const u22 = await adminClientRpc.rpc("update_agent_profile", {
    p_full_name: "Should Not Work",
    p_license_states: ["TX"],
  });
  assert(
    "admin: update_agent_profile → 'no agent row for current user'",
    u22.error !== null &&
      /no agent row for current user/i.test(u22.error.message),
    u22.error ? `actual: ${u22.error.message}` : "expected an error",
  );

  // ---------------------------------------------------------------------------
  // Assertion 23: update_agent_profile — empty license_states → validation
  // ---------------------------------------------------------------------------
  console.log("\n--- Assertion 23: update_agent_profile empty license_states → validation ---");
  const u23 = await aClientRpc.rpc("update_agent_profile", {
    p_full_name: "TestRLS Agent A v3",
    p_license_states: [],
  });
  assert(
    "agent A: update_agent_profile([]) → 'license_states must be non-empty'",
    u23.error !== null && /non-empty/i.test(u23.error.message),
    u23.error ? `actual: ${u23.error.message}` : "expected an error",
  );

  // ---------------------------------------------------------------------------
  // Assertion 24-25: SELECT consent_log via role-aware policy
  // ---------------------------------------------------------------------------
  console.log("\n--- Assertion 24: agent SELECT consent_log for own lead → returns row ---");
  const cl24 = await aClientRpc
    .from("consent_log")
    .select("id, consent_text")
    .eq("lead_id", a1Id);
  assert(
    "agent A: SELECT consent_log for own lead → 1 row",
    cl24.error === null && cl24.data?.length === 1,
    cl24.error
      ? cl24.error.message
      : `got ${cl24.data?.length} rows`,
  );

  console.log("\n--- Assertion 25: agent SELECT consent_log for B's lead → 0 rows ---");
  const cl25 = await aClientRpc
    .from("consent_log")
    .select("id")
    .eq("lead_id", b1Id);
  assert(
    "agent A: SELECT consent_log for B's lead → 0 rows (RLS hides)",
    cl25.error === null && cl25.data?.length === 0,
    cl25.error ? cl25.error.message : `got ${cl25.data?.length} rows`,
  );

  // ---------------------------------------------------------------------------
  // Assertion 26-27: SELECT lead_events via role-aware policy
  // ---------------------------------------------------------------------------
  console.log("\n--- Assertion 26: agent SELECT lead_events for own lead → returns rows ---");
  const le26 = await aClientRpc
    .from("lead_events")
    .select("id, event_type")
    .eq("lead_id", a1Id);
  assert(
    "agent A: SELECT lead_events for own lead → at least 1 row (status_change)",
    le26.error === null && (le26.data?.length ?? 0) >= 1,
    le26.error ? le26.error.message : `got ${le26.data?.length} rows`,
  );

  console.log("\n--- Assertion 27: agent SELECT lead_events for B's lead → 0 rows ---");
  const le27 = await aClientRpc
    .from("lead_events")
    .select("id")
    .eq("lead_id", b1Id);
  assert(
    "agent A: SELECT lead_events for B's lead → 0 rows (RLS hides)",
    le27.error === null && le27.data?.length === 0,
    le27.error ? le27.error.message : `got ${le27.data?.length} rows`,
  );

  // ---------------------------------------------------------------------------
  // Assertion 28-29: anon blocked on consent_log + lead_events
  // ---------------------------------------------------------------------------
  console.log("\n--- Assertion 28-29: anon SELECT consent_log + lead_events → permission denied ---");
  for (const table of ["consent_log", "lead_events"] as const) {
    const { error } = await anon.from(table).select("id").limit(1);
    assert(
      `anon SELECT on ${table} → permission denied`,
      error !== null &&
        /permission denied|not allowed|insufficient/i.test(error.message),
      error ? `actual: ${error.message}` : "expected an error",
    );
  }

  // ---------------------------------------------------------------------------
  // Assertion 30: anti-grant — agent .from('leads').update(...) → denied
  // ---------------------------------------------------------------------------
  // The RPC pattern only works because authenticated has NO direct UPDATE
  // grant on leads. Without this test, a future migration that accidentally
  // grants UPDATE to authenticated would silently allow agents to bypass the
  // RPCs (e.g., agent could craft .update({ on_dnc: true })).
  // Defends Plan 5 Decision #13 (RPC-only-writes pattern).
  console.log("\n--- Assertion 30: agent direct UPDATE on leads → permission denied ---");
  const ag30 = await aClientRpc
    .from("leads")
    .update({ on_dnc: true })
    .eq("id", a1Id);
  assert(
    "agent A: .from('leads').update({on_dnc}) → permission denied",
    ag30.error !== null &&
      /permission denied|not allowed|insufficient/i.test(ag30.error.message),
    ag30.error ? `actual: ${ag30.error.message}` : "expected an error",
  );

  // ===========================================================================
  // Plan 5+: bulk RPCs (bulk_assign_leads, bulk_update_lead_status)
  // ===========================================================================

  // ---------------------------------------------------------------------------
  // Assertion 31: bulk_assign_leads — admin assigns 2 leads to agent A
  // ---------------------------------------------------------------------------
  console.log("\n--- Assertion 31: bulk_assign_leads admin → success ---");
  const u31 = await adminClientRpc.rpc("bulk_assign_leads", {
    p_lead_ids: [a1Id, a2Id],
    p_new_agent_id: agentA.id,
  } as never);
  assert(
    "admin: bulk_assign_leads([a1, a2] → A) → success (no-op for already-assigned)",
    u31.error === null,
    u31.error ? `actual: ${u31.error.message}` : "",
  );
  // Bulk-reassign to B (real change), then verify agent_id + per-lead events.
  const u31b = await adminClientRpc.rpc("bulk_assign_leads", {
    p_lead_ids: [a1Id, a2Id],
    p_new_agent_id: agentB.id,
  } as never);
  assert(
    "admin: bulk_assign_leads([a1, a2] → B) → success",
    u31b.error === null,
    u31b.error ? `actual: ${u31b.error.message}` : "",
  );
  const { data: bulkAssignedRows } = await sr
    .from("leads")
    .select("id, agent_id")
    .in("id", [a1Id, a2Id]);
  assert(
    "both leads now assigned to B",
    !!bulkAssignedRows &&
      bulkAssignedRows.every((r) => r.agent_id === agentB.id),
    `rows: ${JSON.stringify(bulkAssignedRows)}`,
  );
  const { data: bulkAssignedEvents } = await sr
    .from("lead_events")
    .select("lead_id, event_type, actor_platform_user_id, bulk_operation_id")
    .in("lead_id", [a1Id, a2Id])
    .eq("event_type", "assigned")
    .order("created_at", { ascending: false })
    .limit(2);
  assert(
    "two 'assigned' events written with admin actor + non-null bulk_operation_id",
    !!bulkAssignedEvents &&
      bulkAssignedEvents.length === 2 &&
      bulkAssignedEvents.every(
        (e) =>
          e.actor_platform_user_id === puBy(ADMIN_EMAIL).id &&
          e.bulk_operation_id !== null,
      ),
    `events: ${JSON.stringify(bulkAssignedEvents)}`,
  );
  // Restore so subsequent assertions / cleanup don't get confused.
  await sr
    .from("leads")
    .update({ agent_id: agentA.id })
    .in("id", [a1Id, a2Id]);

  // ---------------------------------------------------------------------------
  // Assertion 32: bulk_assign_leads — agent → permission denied
  // ---------------------------------------------------------------------------
  console.log("\n--- Assertion 32: bulk_assign_leads agent → denied ---");
  const u32 = await aClientRpc.rpc("bulk_assign_leads", {
    p_lead_ids: [a1Id],
    p_new_agent_id: agentB.id,
  } as never);
  assert(
    "agent A: bulk_assign_leads → 'admin or superadmin required'",
    u32.error !== null &&
      /admin or superadmin required/i.test(u32.error.message),
    u32.error ? `actual: ${u32.error.message}` : "expected an error",
  );

  // ---------------------------------------------------------------------------
  // Assertion 33: bulk_update_lead_status — agent on own leads → success
  // ---------------------------------------------------------------------------
  console.log("\n--- Assertion 33: bulk_update_lead_status agent on own leads → success ---");
  const u33 = await aClientRpc.rpc("bulk_update_lead_status", {
    p_lead_ids: [a1Id, a2Id],
    p_new_status: "appointment",
  } as never);
  assert(
    "agent A: bulk_update_lead_status([own]) → success",
    u33.error === null,
    u33.error ? `actual: ${u33.error.message}` : "",
  );
  const { data: bulkStatusRows } = await sr
    .from("leads")
    .select("id, status")
    .in("id", [a1Id, a2Id]);
  assert(
    "both leads now status=appointment",
    !!bulkStatusRows &&
      bulkStatusRows.every((r) => r.status === "appointment"),
    `rows: ${JSON.stringify(bulkStatusRows)}`,
  );

  // ---------------------------------------------------------------------------
  // Assertion 34: atomicity — agent batch including foreign lead → whole reverts
  // ---------------------------------------------------------------------------
  console.log("\n--- Assertion 34: bulk_update_lead_status agent including B's lead → atomic revert ---");
  // Capture pre-state.
  const { data: preRows } = await sr
    .from("leads")
    .select("id, status")
    .in("id", [a1Id, b1Id]);
  const preMap = new Map((preRows ?? []).map((r) => [r.id, r.status]));
  const u34 = await aClientRpc.rpc("bulk_update_lead_status", {
    p_lead_ids: [a1Id, b1Id], // a1 is own, b1 is foreign
    p_new_status: "sold",
  } as never);
  assert(
    "agent A: bulk_update_lead_status([own, foreign]) → access denied",
    u34.error !== null &&
      /access denied/i.test(u34.error.message),
    u34.error ? `actual: ${u34.error.message}` : "expected an error",
  );
  // Verify a1 was NOT updated (atomic revert).
  const { data: postRows } = await sr
    .from("leads")
    .select("id, status")
    .in("id", [a1Id, b1Id]);
  const postMap = new Map((postRows ?? []).map((r) => [r.id, r.status]));
  assert(
    "atomic revert: a1.status unchanged after failed bulk",
    preMap.get(a1Id) === postMap.get(a1Id),
    `pre: ${preMap.get(a1Id)} post: ${postMap.get(a1Id)}`,
  );

  // ===========================================================================
  // Plan 5+ safety layer: bulk_operation_id grouping + 100-row cap
  // ===========================================================================

  // ---------------------------------------------------------------------------
  // Assertion 35: bulk RPC events all share one bulk_operation_id
  // ---------------------------------------------------------------------------
  console.log("\n--- Assertion 35: bulk_assign_leads events share bulk_operation_id ---");
  // Reset assignments first to ensure both leads will write events.
  await sr.from("leads").update({ agent_id: null }).in("id", [a1Id, a2Id]);
  const u35 = await adminClientRpc.rpc("bulk_assign_leads", {
    p_lead_ids: [a1Id, a2Id],
    p_new_agent_id: agentA.id,
  } as never);
  assert(
    "bulk_assign_leads([a1, a2] → A) → success",
    u35.error === null,
    u35.error ? `actual: ${u35.error.message}` : "",
  );
  const { data: opEvents } = await sr
    .from("lead_events")
    .select("lead_id, bulk_operation_id")
    .in("lead_id", [a1Id, a2Id])
    .eq("event_type", "assigned")
    .order("created_at", { ascending: false })
    .limit(2);
  const uniqueOpIds = new Set(
    (opEvents ?? []).map((e) => e.bulk_operation_id),
  );
  assert(
    "two events both have non-null bulk_operation_id, same value",
    !!opEvents &&
      opEvents.length === 2 &&
      uniqueOpIds.size === 1 &&
      !uniqueOpIds.has(null),
    `events: ${JSON.stringify(opEvents)}`,
  );

  // ---------------------------------------------------------------------------
  // Assertion 36: per-row RPC writes leave bulk_operation_id NULL
  // ---------------------------------------------------------------------------
  console.log("\n--- Assertion 36: per-row update_lead_status leaves bulk_operation_id NULL ---");
  const u36 = await aClientRpc.rpc("update_lead_status", {
    p_lead_id: a1Id,
    p_new_status: "sold",
  } as never);
  assert(
    "update_lead_status (per-row) → success",
    u36.error === null,
    u36.error ? `actual: ${u36.error.message}` : "",
  );
  const { data: perRowEvent } = await sr
    .from("lead_events")
    .select("bulk_operation_id, event_type")
    .eq("lead_id", a1Id)
    .eq("event_type", "status_change")
    .order("created_at", { ascending: false })
    .limit(1);
  assert(
    "per-row status_change event has bulk_operation_id = NULL",
    !!perRowEvent &&
      perRowEvent.length === 1 &&
      perRowEvent[0].bulk_operation_id === null,
    `event: ${JSON.stringify(perRowEvent)}`,
  );

  // ---------------------------------------------------------------------------
  // Assertion 37: 100-row hard cap fires
  // ---------------------------------------------------------------------------
  console.log("\n--- Assertion 37: bulk RPC cap rejects > 100 ids ---");
  // 101 fake UUIDs — RPC should reject before ever looking up rows.
  const tooMany = Array.from({ length: 101 }, () =>
    crypto.randomUUID(),
  );
  const u37 = await adminClientRpc.rpc("bulk_assign_leads", {
    p_lead_ids: tooMany,
    p_new_agent_id: agentA.id,
  } as never);
  assert(
    "bulk_assign_leads with 101 ids → 'limited to 100 leads'",
    u37.error !== null && /limited to 100 leads/i.test(u37.error.message),
    u37.error ? `actual: ${u37.error.message}` : "expected an error",
  );
  const u37b = await adminClientRpc.rpc("bulk_update_lead_status", {
    p_lead_ids: tooMany,
    p_new_status: "contacted",
  } as never);
  assert(
    "bulk_update_lead_status with 101 ids → 'limited to 100 leads'",
    u37b.error !== null && /limited to 100 leads/i.test(u37b.error.message),
    u37b.error ? `actual: ${u37b.error.message}` : "expected an error",
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
