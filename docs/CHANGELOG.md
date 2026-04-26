# Changelog

Reverse chronological. What shipped, when, and any notes a future reader (or future you) needs to make sense of it. Keep entries short — one paragraph each. Schema migrations are described here in plain English; the migration file itself is the source of truth.

---

## 2026-04-26 — Baseline Supabase migration applied to mpl-dev

- `mpl-dev` Supabase project created (US East, free tier, PG 17.6.1.111). `mpl-prod` deferred until launch is imminent (free tier pauses after 7 days of inactivity)
- Supabase CLI installed project-scoped (`pnpm add -D supabase`); pnpm `onlyBuiltDependencies` allowlist added so the postinstall binary download runs
- `supabase init` generated `supabase/config.toml` (PG `major_version = 17`, matches dev) and `supabase/.gitignore`. Repo linked to `mpl-dev` via `supabase link`
- Baseline migration `supabase/migrations/20260426145609_baseline.sql` applied. Creates: `uuid-ossp` extension; enums `lead_status`, `lead_temperature`, `lead_event_type`, `time_of_day`; tables `agents`, `leads`, `consent_log`, `lead_events`, `suppressions`, `dnc_registry`; indexes on FKs and lookup columns; RLS enabled on all six tables with policies `agents_select_own`, `leads_select_agent`, `leads_update_agent` (forward-compatible for Phase 2 agent auth, inert in Phase 1 since service role bypasses RLS)
- **Three deviations from the playbook spec at `02_Technical_Reference.md` § 5.1**, all driven by architect review:
    1. `leads_phone_recent_uniq` partial unique index NOT created — `now()` is STABLE and PostgreSQL requires partial-index predicates to use IMMUTABLE functions, so the spec's SQL would fail. Added a non-unique `leads_phone_e164_idx` instead; 30-day phone dedup moves to `/api/leads`. Captured in `AGENTS.md` § 6.
    2. FK indexes added on `consent_log.lead_id` and `lead_events.lead_id` (PostgreSQL doesn't auto-index FKs; both tables grow under the FTC TSR retention window).
    3. `revoke update, delete on consent_log from authenticated, anon, public;` added on top of RLS default-deny — defends against future permissive policies added by mistake. Service role still bypasses RLS; the discipline that no code path mutates `consent_log` is enforced in app code.
- Verification: all 6 tables present with RLS enabled; all expected indexes present; `leads_phone_recent_uniq` confirmed absent; `consent_log` table comment + revoked grants verified via `information_schema.table_privileges`; anon-key curl against `POST /rest/v1/leads` returned HTTP 401 with PostgreSQL error 42501 ("permission denied for table leads"), confirming RLS denial works end-to-end
- `supabase db diff --linked` returned non-empty but the diff was confined to Supabase Cloud platform defaults (`pg_net` extension, default role grants, `rls_auto_enable` event trigger) — environment drift between the local Postgres image and the Cloud project, not regressions in authored objects. Verification rule in `AGENTS.md` § 6 tightened from "diff returns empty" to "no diff in authored objects" to reflect this for future migrations

## 2026-04-26 — Initial scaffold

- Next.js 16.2 app generated with TypeScript, Tailwind v4, App Router, ESLint, `src/` directory, pnpm
- Repo initialised on personal GitHub (private). Will transfer to LLC organisation on formation.
- Playbook documents (`01_Strategy_and_Offer`, `02_Technical_Reference`, `03_Build_Plan`, `04_Operations_Runbook`) added to `docs/playbook/` as read-only references
- `CLAUDE.md` and `AGENTS.md` created at repo root
- `.env.example` created with placeholders for Supabase, Twilio, Resend, Meta CAPI
- Empty `supabase/migrations/` directory created (baseline migration is the next task)
