-- Grant service_role explicit privileges on all Phase 1 tables.
--
-- Why this migration exists: Supabase Cloud's "Automatically expose new tables"
-- project setting is disabled at this project's level by design. Tables created
-- via migrations therefore receive no default CRUD grants for any of the
-- Supabase API roles (anon, authenticated, service_role). The baseline
-- migration relied on those default grants and didn't include explicit GRANTs,
-- which surfaced as `permission denied for table agents` (SQLSTATE 42501) when
-- the /api/health smoke test first hit the DB.
--
-- Per AGENTS.md § 6 (Schema discipline), every table added in a future
-- migration must include explicit GRANT statements in the same migration file
-- for any role that needs access.
--
-- Scope: service_role only. anon and authenticated stay ungranted in Phase 1
-- because nothing in Phase 1 needs them (the form posts to /api/leads, which
-- runs server-side as service_role; agent self-service login is Phase 2).

grant select, insert, update, delete
  on table public.agents,
           public.leads,
           public.lead_events,
           public.suppressions,
           public.dnc_registry
  to service_role;

-- consent_log: SELECT + INSERT only. No UPDATE, no DELETE. Service role still
-- bypasses RLS, but the absence of these grants is the third layer of the
-- compliance discipline (after app-code discipline and the existing revokes
-- for non-service roles in the baseline migration).
grant select, insert
  on table public.consent_log
  to service_role;
