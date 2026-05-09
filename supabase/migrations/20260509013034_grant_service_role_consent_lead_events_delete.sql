-- Fix-up migration: service_role lacked DELETE grant on consent_log +
-- lead_events. The baseline (20260426145609) granted INSERT (since
-- /api/leads writes both via insert_lead_with_consent) but never granted
-- DELETE — until Plan 5's test-platform-rls.ts cleanup tried to remove
-- test fixtures it never surfaced.
--
-- Same pattern as 20260504130000_grant_service_role_platform_users.sql —
-- the Supabase project has "auto-expose new tables" disabled, so any role
-- that needs access has to be granted explicitly.
--
-- Why service_role specifically: only the test cleanup script (run from
-- our local env) needs to delete from these tables. App paths (/api/leads,
-- the Plan 5 RPCs) never delete from consent_log + lead_events — they're
-- append-only audit tables for production. Granting DELETE doesn't expose
-- a write surface to anyone except scripts/maintenance running with
-- service-role.

grant delete on table public.consent_log to service_role;
grant delete on table public.lead_events to service_role;
