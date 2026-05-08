-- Plan 3 (agent platform v0.1): introduce platform_users + role-aware RLS.
--
-- Per the architect-approved plan at .claude/plans/...as-dazzling-bumblebee.md.
--
-- Three role tiers from day one (agent / admin / superadmin) live on a new
-- platform_users table. agents becomes agents-only and links to platform_users
-- via FK (drops redundant email + active columns). The RLS policies that gate
-- /api/leads consumer-side reads are replaced with role-aware versions on
-- leads / agents / platform_users — using a SECURITY DEFINER helper function
-- (current_platform_user()) to avoid RLS recursion (Postgres 42P17 — naive
-- nested-exists-against-same-table policies recurse infinitely on first auth).
--
-- First time the `authenticated` role gets any grants on this schema. Per
-- AGENTS.md § 6, the migration's verification script (scripts/test-platform-rls.ts)
-- includes a "request that satisfies grants but fails RLS" test (assertion #6).
--
-- ROLLBACK PROCEDURE (if post-migration verification fails):
--   1. drop policy "leads_select_role_scoped" on leads;
--      drop policy "agents_select_own_or_admin" on agents;
--      drop policy "platform_users_select_own_or_admin" on platform_users;
--   2. revoke select on platform_users, leads, agents from authenticated;
--      revoke execute on function public.current_platform_user() from authenticated;
--   3. drop function public.current_platform_user();
--   4. alter table agents
--        add column email text,
--        add column active boolean default true;
--      update agents set
--        email = (select email from platform_users pu where pu.id = agents.platform_user_id),
--        active = (select active from platform_users pu where pu.id = agents.platform_user_id);
--      alter table agents
--        alter column email set not null,
--        alter column active set not null,
--        add constraint agents_email_unique unique (email),
--        drop column platform_user_id;
--   5. drop table platform_users;
--   6. recreate the original policies from the baseline migration:
--        create policy "agents_select_own" on agents for select using (auth.jwt() ->> 'email' = email);
--        create policy "leads_select_agent" on leads for select using (...);
--        create policy "leads_update_agent" on leads for update using (...);

-- ============================================================
-- A. platform_users — single source of truth for auth-bearing principals
-- ============================================================

create table platform_users (
  id uuid primary key default uuid_generate_v4(),
  -- Lowercase enforced at the schema layer. Supabase Auth normalizes JWT
  -- emails to lowercase, but a manual insert could land mixed case otherwise,
  -- which would silently fail every role-aware RLS comparison and lock the
  -- user out with no visible error. The CHECK is the load-bearing piece of
  -- the case-normalization defense (lower() in policies + ops checklist
  -- being the other two layers).
  email text not null unique check (email = lower(email)),
  -- Three tiers from day one. agent + admin behave identically in v0.1;
  -- superadmin diverges when destructive actions land in v0.X (delete leads,
  -- manage other platform_users, approve refunds — superadmin keeps these).
  -- Defining all three values now avoids an enum migration later.
  role text not null check (role in ('agent', 'admin', 'superadmin')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table platform_users enable row level security;

comment on table platform_users is
  'All authenticated principals on the agent platform (agent / admin / superadmin). '
  'Source of truth for email + active. agents.platform_user_id FKs here for role=agent rows.';

-- ============================================================
-- B. agents — add platform_user_id + backfill (drop columns deferred to D
-- after the dependent policies are dropped in C)
-- ============================================================

alter table agents
  add column platform_user_id uuid references platform_users(id) unique;
-- (NOT NULL set after backfill below)

-- Backfill: for each existing agent, create a platform_users row + link.
-- LOWERCASE the email on insert — existing agents.email might be mixed-case
-- (test data), and the platform_users CHECK constraint would reject it
-- otherwise and abort the whole migration.
insert into platform_users (email, role, active)
  select lower(email), 'agent', active from agents
  on conflict (email) do nothing;

update agents set platform_user_id = (
  select pu.id from platform_users pu
  where pu.email = lower(agents.email)
);

alter table agents
  alter column platform_user_id set not null;

-- ============================================================
-- C. Drop existing RLS policies that depend on agents.email
-- (must come BEFORE the column drop in section D, otherwise SQLSTATE 2BP01)
-- ============================================================

drop policy "leads_select_agent" on leads;
drop policy "leads_update_agent" on leads;
-- UPDATE policy gone for now — v0.2 status updates will introduce a
-- role-aware UPDATE policy at that point.

drop policy "agents_select_own" on agents;

-- ============================================================
-- D. agents — drop redundant email + active columns
-- (single source of truth: platform_users.email + platform_users.active)
-- ============================================================

alter table agents
  drop column email,
  drop column active;

-- ============================================================
-- E. current_platform_user() — SECURITY DEFINER function to avoid RLS recursion
--
-- The role-aware policies need to look up the JWT email's role + agent_id.
-- Naive nested exists-against-same-table policies recurse infinitely on first
-- auth (Postgres 42P17). Supabase's documented pattern: SECURITY DEFINER
-- function that bypasses RLS during the role lookup.
--
-- `set search_path = public` is LOAD-BEARING — without it, search-path
-- injection is a real attack vector on SECURITY DEFINER functions (an
-- attacker creates a malicious function in their schema with the same name
-- as one this function references). Don't omit.
-- ============================================================

create or replace function public.current_platform_user()
returns table (id uuid, role text, active boolean, agent_id uuid)
language sql
security definer
stable
set search_path = public
as $$
  select pu.id, pu.role, pu.active, a.id as agent_id
  from platform_users pu
  left join agents a on a.platform_user_id = pu.id
  where pu.email = lower((select auth.jwt() ->> 'email'))
$$;

grant execute on function public.current_platform_user() to authenticated;

comment on function public.current_platform_user() is
  'Resolve the authenticated JWT email to a platform_users row + linked agent_id (if role=agent). '
  'SECURITY DEFINER so RLS policies can call it without recursing into themselves. '
  'set search_path = public is load-bearing — protects against search-path injection.';

-- ============================================================
-- F. Role-aware RLS policies — flat shape via current_platform_user()
--
-- All three policies use `(select role from current_platform_user() where active)`
-- to short-circuit on admin/superadmin (sees all) and fall through to the
-- per-row check for agents. The auth.jwt() call inside the SECURITY DEFINER
-- function is wrapped in (select ...) for InitPlan execution per Supabase
-- performance guidance — defense-in-depth on perf even though the function
-- is `stable`.
-- ============================================================

create policy "platform_users_select_own_or_admin"
  on platform_users for select
  to authenticated
  using (
    -- Inactive users CAN see their own platform_users row by design.
    -- Avoids the "magic link works, but my own profile is empty" debugging
    -- mystery for a deactivated user. Their leads / other agents stay
    -- invisible (active-gated below).
    email = lower((select auth.jwt() ->> 'email'))
    or (select role from current_platform_user() where active) in ('admin', 'superadmin')
  );

create policy "agents_select_own_or_admin"
  on agents for select
  to authenticated
  using (
    platform_user_id = (select id from current_platform_user() where active)
    or (select role from current_platform_user() where active) in ('admin', 'superadmin')
  );

create policy "leads_select_role_scoped"
  on leads for select
  to authenticated
  using (
    (select role from current_platform_user() where active) in ('admin', 'superadmin')
    or agent_id = (select agent_id from current_platform_user() where active)
  );

-- ============================================================
-- G. Grants — first time `authenticated` role gets any schema grants
--
-- Per AGENTS.md § 6, the verification script (scripts/test-platform-rls.ts)
-- includes a "request that satisfies grants but fails RLS" test (assertion #6).
-- ============================================================

grant select on table public.platform_users to authenticated;
grant select on table public.leads to authenticated;
grant select on table public.agents to authenticated;
-- No INSERT / UPDATE / DELETE — v0.1 platform is read-only. Status updates
-- (v0.2) add their UPDATE grant + role-aware UPDATE policy at that point.
