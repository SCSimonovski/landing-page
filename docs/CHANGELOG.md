# Changelog

Reverse chronological. What shipped, when, and any notes a future reader (or future you) needs to make sense of it. Keep entries short — one paragraph each. Schema migrations are described here in plain English; the migration file itself is the source of truth.

---

## 2026-04-28 — Supabase server client + /api/health smoke test (with mid-task grants fix)

- Installed `@supabase/supabase-js` 2.104.1 as a runtime dependency
- Added `gen:types` script to `package.json` using `--linked` (no project ref hardcoded; reads from `supabase/.temp/project-ref`); generated `src/lib/types/database.ts` from the live `mpl-dev` schema. **Postgrest version captured at generation time: 14.5** (the `__InternalSupabase.PostgrestVersion` field at the top of the generated file). Future regen will overwrite — re-check the version then if migrating to a newer client lib
- Created `src/lib/db/supabase-server.ts` — service-role client factory, guarded with `import "server-only"`, options `{ auth: { persistSession: false, autoRefreshToken: false } }` (server has no localStorage; service role key is static)
- Created `src/app/api/health/route.ts` — header-gated `GET` smoke test. Requires `x-health-secret` header (404s anything without it, including any header but the right value); on hit, runs `select("id").limit(0)` against `agents` to exercise auth + a non-PII table; returns `{"ok":true}` or `{"ok":false}` only — no error echoing, no version strings, no row data
- Added `HEALTH_CHECK_SECRET` placeholder to `.env.example`; the local `.env.local` got a randomly-generated value
- **Mid-task discovery → new migration `supabase/migrations/20260426202626_grant_service_role.sql`.** The first positive curl returned 503 with PostgreSQL error 42501 ("permission denied for table agents"). Root cause: Supabase Cloud's "Automatically expose new tables" project setting is disabled (deliberately, at project creation), so tables created via migrations get **no** default CRUD grants — the baseline migration relied on grants that don't exist. Also retroactively clarified that the previous task's anon-curl verification was a *grant* denial, not the *RLS* denial we attributed it to (RLS was never exercised). New migration grants `service_role`: SELECT/INSERT/UPDATE/DELETE on `agents`, `leads`, `lead_events`, `suppressions`, `dnc_registry`; SELECT/INSERT only on `consent_log` (no UPDATE/DELETE — fourth layer of the consent-log mutation discipline). Anon and authenticated stay ungranted (Phase 2 work)
- **Two new schema-discipline rules in `AGENTS.md` § 6:** (a) tables created in migrations must include explicit GRANT statements because Auto-expose is off by design; (b) anon writes are blocked at the grants layer in Phase 1, so the RLS policies that exist on `leads` are not exercised by current tests — when Phase 2 grants any privilege to `anon`/`authenticated`, that migration's verification must include an RLS-specific test (a request that satisfies grants but fails RLS) to confirm the second layer
- Verification: diagnostic query confirms service_role privileges per spec; anon POST to `/rest/v1/leads` returns the expected 42501 grant denial; `/api/health` curl tests pass — positive 200 `{"ok":true}` with header, 404 "Not found" without header (and with wrong header), 503 `{"ok":false}` (no error leak) when service role key is overridden to invalid via shell env (no `.env.local` edit); `db diff --linked --schema public` shows no missing service_role grants — only platform-drift entries documented in the previous CHANGELOG entry; `pnpm lint` and `pnpm build` pass with `/api/health` correctly classified as `ƒ (Dynamic)`; `grep -r SUPABASE_SERVICE_ROLE_KEY .next/static/` returns no matches (key never reached the client bundle)
- Operational hygiene note: during the paranoid grep, the first 15 chars of the service role key briefly echoed to chat output (5 unique chars after the universal `sb_secret_` prefix). Practical risk is low but the key should be rotated as a precaution

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
