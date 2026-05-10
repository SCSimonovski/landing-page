-- Add `full_name` to platform_users and make it the canonical source of truth.
--
-- Pre-Plan-5b state: full_name only existed on `agents.full_name` and was
-- only meaningful for role='agent' (admin/superadmin had no display name —
-- the sidebar/timeline fell back to email). Plan 5b makes full_name a
-- first-class column on platform_users so admin/superadmin get a proper
-- display name everywhere (sidebar footer, "Assigned: …" pill, activity
-- timeline actor labels, /users table).
--
-- Decision: platform_users.full_name is the single source of truth.
-- The agent invite path (apps/northgate-leads/src/app/users/actions.ts)
-- writes only to platform_users going forward; the `agents.full_name`
-- column is deprecated and will be dropped in a follow-up migration once
-- this ships and is verified. Keeping it for now to avoid coupling the
-- column drop to the type-regen + read-path-rewrite touched in the same
-- branch (smaller blast radius if we need to roll back).
--
-- Order:
--   1. ALTER TABLE adds the column (nullable)
--   2. Backfill from agents.full_name (covers every existing agent row)
--   3. Manual UPDATE for the existing superadmin (no agents row)
--
-- The column stays nullable for now. Future migration can ALTER ... SET
-- NOT NULL after we confirm every row has a value (and the application
-- enforces non-empty input via the invite Zod schema).
--
-- Note: this migration intentionally does NOT modify
-- current_platform_user(). Postgres rejects CREATE OR REPLACE FUNCTION
-- when the return-table shape changes (SQLSTATE 42P13 — "cannot change
-- return type of existing function"), and DROP FUNCTION ... CASCADE
-- would drop every RLS policy that references it (~10+ policies across
-- platform_users, agents, leads, consent_log, lead_events). The
-- application-side fix is much smaller: getPlatformUser() does a second
-- SELECT against platform_users by id to pull full_name. The user's own
-- platform_users SELECT policy (Plan 3) covers that read.

alter table public.platform_users
  add column full_name text;

comment on column public.platform_users.full_name is
  'Display name for the platform user. Canonical source for sidebar / "Assigned" pill / '
  'activity timeline actor label / /users table. Required at invite time via the Zod '
  'schema in apps/northgate-leads/src/app/users/invite-schema.ts. Nullable at the schema '
  'layer until follow-up migration ALTERs to NOT NULL.';

-- Backfill from agents (every role=agent row has full_name from the
-- pre-Plan-5b agent invite path). admin/superadmin rows skip this since
-- they have no agents join — handled by the manual UPDATE below.
update public.platform_users
   set full_name = agents.full_name
  from public.agents
 where public.platform_users.id = public.agents.platform_user_id;

-- Manual backfill for the existing superadmin (no agents row).
-- One-off — future admin/superadmin invites get full_name from the form
-- via the post-Plan-5b actions.ts.
update public.platform_users
   set full_name = 'Simon Simonovski'
 where email = 'simonovski132@gmail.com'
   and full_name is null;
