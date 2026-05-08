-- Fix-up migration for the platform_users table created in
-- 20260504120000_add_platform_users_and_role_aware_rls.sql.
--
-- Per AGENTS.md § 6: "Tables created in migrations must include explicit
-- GRANT statements for any role that needs access (typically service_role,
-- sometimes authenticated for Phase 2)." The original migration granted
-- SELECT to authenticated but missed service_role on platform_users — caught
-- when scripts/test-platform-rls.ts hit
--   "permission denied for table platform_users" (SQLSTATE 42501).
--
-- Mirrors the grants pattern in 20260426202626_grant_service_role.sql for
-- the other tables (agents / leads / lead_events / suppressions / dnc_registry).
-- Service role bypasses RLS, but it doesn't bypass grants — both layers must
-- be wired explicitly when "Automatically expose new tables" is disabled at
-- the project level (which it is here, by design).

grant select, insert, update, delete
  on table public.platform_users
  to service_role;
