# Changelog

Reverse chronological. What shipped, when, and any notes a future reader (or future you) needs to make sense of it. Keep entries short — one paragraph each. Schema migrations are described here in plain English; the migration file itself is the source of truth.

---

## 2026-04-30 — Twilio agent SMS dispatch + STOP webhook (paired)

Ships the agent SMS dispatcher and the inbound STOP webhook together — per `AGENTS.md` § 6, no outbound SMS goes out until STOP works end-to-end. Both pieces verified by execution; the live carrier-delivery loop closes when A2P 10DLC paperwork lands (see launch checklist below).

**Schema (one new migration, applied to `mpl-dev`):**
- `20260430003418_add_sms_skip_event_types.sql` — adds `sms_skipped_dnc` and `sms_skipped_suppression` to `lead_event_type`. Skips get a queryable audit row, not just a console log — refund disputes and compliance audits months later need the answer to "did we attempt dispatch for this lead?" Vercel logs rotate; `lead_events` is forever.

**New runtime deps:** `twilio` ^6.0, `server-only` ^0.0.1 (npm package needed for `tsx` to no-op the `import "server-only"` guards via `--conditions=react-server` when running scripts outside the Next bundler).

**New code:**
- `src/lib/twilio/client.ts` — server-only `getTwilioClient()` factory (cached per process)
- `src/lib/twilio/messages.ts` — `formatAgentSMS(lead)` per playbook 5.3 + STOP keyword set (matches Twilio's auto-opt-out defaults plus REVOKE — see asymmetry below)
- `src/lib/twilio/verify-signature.ts` — wraps Twilio SDK's `validateRequest`. Reconstructs the URL from `x-forwarded-host` + `x-forwarded-proto` (safe on Vercel and ngrok; revisit if we ever sit behind an untrusted proxy chain)
- `src/lib/sms/dispatch.ts` — `sendAgentSMS(leadId)` orchestrating: getLeadById → DNC re-query → suppressions re-query → format → twilio.messages.create → recordSmsSent. Catches all errors with no PII.
- `src/lib/db/suppressions.ts` — `addSuppression(...)` with code-level idempotency (pre-check on `phone_e164`; no DB unique constraint, follows the `findRecentDuplicate` precedent).
- `src/lib/db/leads.ts` — added `getLeadById`, `recordSmsSent`, `recordSmsSkipped` helpers
- `src/app/api/twilio/incoming/route.ts` — POST handler: signature verify → form parse → STOP keyword check → addSuppression → empty TwiML response. 403 on bad signature so Twilio backs off rather than retrying forever.
- `src/app/api/leads/route.ts` — wired dispatch via `after(() => sendAgentSMS(id))` from `next/server`. The `dup` (duplicate-phone) branch deliberately does NOT dispatch — the original lead was already notified.
- `scripts/test-dispatch-suppression.ts` — one-off verification script that bypasses `/api/leads` to exercise the dispatch-stage suppression skip path. Repo-tracked for future race-path tests. Run via `set -a; source .env.local; set +a; NODE_OPTIONS='--conditions=react-server' pnpm dlx tsx scripts/test-dispatch-suppression.ts`.

**Compliance — what we did:**
- **DNC re-query at dispatch time, in code.** The rule from the prior task ("on_dnc column is informational; the dispatcher must re-query") is now actually enforced. `sendAgentSMS` calls `isOnDNC(lead.phone_e164)` live before sending; on hit, writes `sms_skipped_dnc` and returns.
- **Suppressions re-query at dispatch time, in code.** Same defense for the rare race where a lead's phone gets suppressed between intake and dispatch (e.g., they STOP a different campaign in the gap).
- **`after()` from `next/server`, not `await`, so dispatch never blocks speed-to-lead.** `/api/leads` HTTP response time stays sub-500ms; SMS dispatch runs in the background and is independently bounded by `maxDuration`.
- **Twilio webhook signature verification mandatory.** Bad signature → HTTP 403, no DB write. Verified by curl with both valid (real HMAC-SHA1 over the Twilio params) and invalid signatures — see verification packet below.
- **No PII in logs.** Dispatch logs `[dispatch] lead=<id> sent sid=<sid>` or `[dispatch] lead=<id> skip=<reason>`. STOP webhook logs `[twilio/incoming] suppressed ...<last4>` (last 4 digits only, debugging-useful but not full PII).

**Compliance — REVOKE asymmetry (intentional, documented here):**
Our STOP keyword set includes `STOP/STOPALL/UNSUBSCRIBE/CANCEL/END/QUIT/HALT/REVOKE`. The first seven match Twilio's auto-opt-out defaults — Twilio blocks future sends to that number from this Twilio number, AND we add the row to `suppressions` for our own dispatch-time check. **REVOKE is broader than Twilio's default**: a user texting REVOKE lands in our `suppressions` (so our dispatch check stops future sends from any of our Twilio numbers, current or future) but Twilio's per-number auto-opt-out does NOT fire on REVOKE. Operationally fine because our dispatch check is the canonical gate; documented so future-us notices.

**Compliance — A2P 10DLC delivery wall (this changes the trial-account assumption):**
Trial accounts can no longer deliver SMS to US destinations without **A2P 10DLC** registration (long-codes, error 30034) or **TFV** (toll-free numbers, error 30032). Both verifications need an EIN (LLC formation gate per § 8). What this means in practice:
- Code is correct end-to-end. Twilio API returns success and a real SID for every dispatch.
- The `lead_events.sms_sent` row gets inserted as expected.
- The Twilio Message Logs show `status=undelivered` because the carrier rejected delivery.
- Until A2P 10DLC lands, **no SMS actually arrives at the agent's phone**. The "fire dispatch on every lead" wiring works; only the carrier-layer delivery is blocked.
- This is paperwork-blocked, not code-blocked. Prior plan tradeoff "Twilio trial works for full development" was wrong for outbound delivery as of late 2023; corrected here.

**Compliance — what we did NOT close:**
- Live STOP webhook with real Twilio → real public URL → our endpoint. We curl-simulated the webhook with a real Twilio-format signature, which proves our route logic. The remaining bit (Twilio actually hitting our public URL via DNS) gets verified post-Vercel-deploy. ngrok would have closed this gap during dev; the developer couldn't install it, so we accepted the gap with the Vercel-deploy backstop.
- SMS watchdog — Twilio API failure on dispatch is logged once and silently dropped. Phase 1 volume makes this acceptable; on the launch checklist (per playbook 4.5).

**Verification packet:**
- `pnpm lint` clean (one pre-existing RHF/React-Compiler warning, not new)
- `pnpm build` clean. Routes: `/` → `○ Static`, `/api/health` + `/api/leads` + **`/api/twilio/incoming`** → `ƒ Dynamic`
- Migration diagnostic: `lead_event_type` enum now includes `sms_skipped_dnc` and `sms_skipped_suppression`; types regenerated
- Paranoid grep on `.next/static/`: `TWILIO_AUTH_TOKEN`, `TWILIO_ACCOUNT_SID`, `TWILIO_FROM_NUMBER`, `AGENT_PHONE_NUMBER` (names) absent; 24-char value prefixes for token/SID and full phone-number values absent (silently checked, not echoed)
- **Dispatch-suppression script PASS (3 assertions):** no Twilio API call; `sms_skipped_suppression` event recorded; NO `sms_sent` event recorded. Closes the race-path verification.
- **Live dispatch round-trip:** form-submitted lead resulted in `lead_events.sms_sent` row with a real Twilio SID (`SMc99...`); Twilio Message Logs confirm dispatch was attempted and carrier-rejected with the expected A2P 10DLC error code.
- **Webhook signature (curl-simulated):** valid signature → HTTP 200 + suppressions row inserted with the test phone; invalid signature → HTTP 403 "forbidden", no row. Test rows cleaned up.

**Test data left in `mpl-dev`:** none from this task — all cleanups ran.

## 2026-04-29 — Multi-step lead form + /api/leads (compliance-load-bearing)

Ships the form (client component) and the server route that captures TCPA-consented leads end-to-end. Drops into the `<section id="lead-form">` placeholder from the prior skeleton.

**Schema (two new migrations, applied to `mpl-dev`):**
- `20260429114548_add_leads_intake_support.sql` — adds `'duplicate_attempt'` to the `lead_event_type` enum (used by the 30-day phone dedup audit row); adds `on_dnc boolean not null default false` to `leads` (informational flag set at insert time)
- `20260429114549_lead_insert_function.sql` — defines `insert_lead_with_consent(jsonb) returns uuid`, a SECURITY INVOKER PL/pgSQL function that performs the three-table insert atomically (`leads` + `consent_log` + `lead_events('created')`); grants EXECUTE to `service_role`

**New runtime deps:** `react-hook-form` ^7.74, `@hookform/resolvers` ^5.2, `zod` ^4.3, `libphonenumber-js` ^1.12, `@upstash/ratelimit` ^2.0, `@upstash/redis` ^1.37. Upstash Redis (free tier) prereq added — env: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.

**New code:**
- `src/lib/consent.ts` — `FORM_VERSION = "v1-draft"` + `CONSENT_TEXT` lifted verbatim from `01_Strategy_and_Offer.md` Part 4.3 (with `[BRAND NAME]` and `[opt-out email]` markers for the LLC formation moment)
- `src/lib/intent.ts` — pure `computeIntentScore` + `computeTemperature` per Part 3.7
- `src/lib/phone.ts` — server-side strict E.164 normalization via libphonenumber-js (US-only)
- `src/lib/rate-limit.ts` — Upstash sliding window, 3 / IP / hour, server-only
- `src/lib/validation/lead-schema.ts` — single Zod schema used by both client form (via `zodResolver`) and server route. Includes 50-state + DC enum
- `src/lib/db/leads.ts` — `insertLeadWithConsent`, `isSuppressed`, `isOnDNC`, `findRecentDuplicate`, `recordDuplicateAttempt`, all server-only
- `src/app/api/leads/route.ts` — POST handler, 12-step orchestration: rate limit → Zod → bot path (honeypot + sub-3s) → phone normalize → suppressions → DNC flag → 30-day dedup → score → atomic RPC. Returns generic `{"ok":true,"id":...}` or `{"ok":false}`. Notification dispatch (Twilio/Resend/Meta) is a TODO marker for the next plan
- `src/components/lead-form.tsx` — `"use client"` multi-step form (6 steps), RHF + zodResolver, off-screen honeypot, stable `form_loaded_at`, in-place success state, off-ramp screen for homeowner=No

**Compliance — what we did:**
- Consent captured per submission as an immutable snapshot in `consent_log` via the same DB transaction that creates the `leads` row (atomicity guaranteed by `insert_lead_with_consent`). Server uses its own `CONSENT_TEXT` constant; client-sent `consent_text` is ignored even if present (verified: a `"GOTCHA"` payload was discarded; the row contains the literal current text)
- Consent checkbox is unchecked by default — `consent` field is omitted from RHF defaults so the rendered checkbox is unchecked
- Honeypot accepts non-empty values (does NOT 400 at the schema layer, which would tip off bots) and silently 200s with a sentinel id at the route layer
- 3-second timing check on `form_loaded_at`; **known limitation**: relies on client clock, see plan tradeoffs
- IP rate limit 3 / hour via Upstash sliding window
- 30-day phone dedup is application-only (the playbook's partial unique index doesn't compile because `now()` is STABLE — see § 6). Dedup audit row goes in `lead_events` as `duplicate_attempt`, leaving `consent_log` unpolluted
- `on_dnc` column is a debugging breadcrumb, NOT the authoritative gate — the agent dispatcher (next plan) MUST re-query `dnc_registry` at dispatch time
- Service-role-only writes; `import "server-only"` on `supabase-server`, `rate-limit`, and `db/leads`
- Catch-block log line is correlation-id + error-code only — no PII
- Anon writes still blocked at the grants layer (the `/rest/v1/leads` denial test from a prior task remains the proof)

**Compliance — what we haven't done (launch-blocker checklist, per architect):**
- **Real attorney-reviewed consent text.** Currently `[PLACEHOLDER — pending attorney review]` per the playbook Part 4.3 template. `FORM_VERSION` bumps from `v1-draft` to `v1` at attorney sign-off
- **Email MX lookup + disposable-email blocklist.** Part 3.2 calls for both; we ship format-only validation
- **Names "obvious garbage" heuristic.** Part 3.2 calls for it; we ship Zod min/max length only
- These three are launch checklist items, NOT routine validation hardening

**Verification (live against `mpl-dev`):**
- Migration diagnostics: `service_role` has `EXECUTE` on `insert_lead_with_consent`; `leads.on_dnc` is `boolean NOT NULL default false`; `lead_event_type` enum includes `duplicate_attempt`
- Build: `pnpm lint` clean (one React Compiler warning on RHF `watch` — known incompatibility, not a real issue); `pnpm build` clean; `/` stays `○ Static`, `/api/leads` is `ƒ Dynamic`
- Live POST → HTTP 200 with new uuid; `leads`, `consent_log`, `lead_events` all show one row with the SAME `created_at` timestamp (atomicity proof). Lead computed `intent_score=80, temperature=hot`. Phone normalized to `+14155552671`. `consent_text` length 678 (full text snapshot)
- Bot honeypot: HTTP 200 + sentinel id, no insert
- Bot sub-3s: HTTP 200 + sentinel id, no insert
- Rate limit: 3 submissions succeed from one IP, 4th returns HTTP 429
- Suppressions: insert into `suppressions`, then submit with that phone → HTTP 200 + sentinel id, no insert; suppression cleaned up
- 30-day dedup: resubmit with same phone → HTTP 200 with the **existing** lead id; `leads` count stays at 1; `consent_log` count stays at 1; `lead_events` gains a `duplicate_attempt` row with `{source: "form_resubmit", attempted_state: "..."}`
- Consent server-controlled: client sent `consent_text: "GOTCHA"`, DB row has the real `CONSENT_TEXT`
- Paranoid grep: `SUPABASE_SERVICE_ROLE_KEY`, `UPSTASH_REDIS_REST_TOKEN`, `HEALTH_CHECK_SECRET` (names) and the value prefixes (silently checked, not echoed) all absent from `.next/static/`
- **Pending the developer:** visual mobile UI verification at 375px (Claude can't render); see plan verification step 4

**Doc reconciliation pending architect:** `docs/playbook/02_Technical_Reference.md` Part 3.4 still documents the partial unique index `leads_phone_recent_uniq` that we explicitly dropped from the baseline migration (the `now()`-in-partial-index issue). The schema in the doc and the schema in the database are now divergent. Per the working agreement, flagging back to the architect for a one-line edit (remove the index from the Part 3.4 schema block, add a one-line note that 30-day dedup happens in `/api/leads` per `AGENTS.md` § 6).

## 2026-04-29 — Landing page skeleton

- Replaced the create-next-app boilerplate at `src/app/page.tsx` with the Phase 1 landing page skeleton per `02_Technical_Reference.md` Part 2.2: hero (`<h1>` + sub + CTA + trust bar), how-it-works (3 numbered steps), `<section id="lead-form">` form placeholder for the Week 2 task to drop into, social proof placeholder, FAQ (5 `<details>` Q&As, native expand/collapse, no JS), footer with `/privacy` + `/terms` links, contact, and California Privacy Notice marker
- Server component (default for App Router); Tailwind v4; mobile-first with `sm:`/`md:` breakpoints; tap targets ≥ 44×44px on the hero CTA, "How it works" step circles, FAQ summaries, and footer links; CTA scrolls to the form via `<a href="#lead-form">` + site-wide `html { scroll-behavior: smooth }`
- Swapped Geist for Inter (`next/font/google`) per Part 2.5; updated `metadata.title` and `metadata.description` from boilerplate to placeholder marketing values; removed the dark-mode `@media (prefers-color-scheme: dark)` block from `globals.css` (marketing pages are designed in one tuned palette)
- Deleted five unused boilerplate icons: `public/{file,globe,next,vercel,window}.svg`. The now-empty `public/` directory was also removed by git (Next.js doesn't require it; will be recreated when we add a real favicon or hero image)
- **Compliance-safe placeholder copy** per Part 2.3 + `AGENTS.md` § 6: no `$` amounts, no "guaranteed", no "free" near insurance references, no fear language, no false urgency. Two architect-mandated specifics: (a) H1 is the literal string `[HEADLINE PLACEHOLDER]` rather than directional copy — H1 is the most screenshot-quotable string, easier to never accidentally ship; (b) "How it works" step 3 says "reach out shortly", not "within 2 minutes" — the 2-minute SLA is an internal operational commitment between us and the agent (per `01_Strategy_and_Offer.md` Part 3 and `04_Operations_Runbook.md` Part 2), not a consumer-facing promise (refund/misrepresentation risk if put in user copy)
- **Explicitly NOT shipped** in this task: real form logic, Zod schemas, real testimonials, real FAQ answers, `/privacy`, `/terms`, real California Privacy Notice text, brand name/logo, favicon. Each is a downstream task
- Verification: `pnpm lint` and `pnpm build` pass; `/` is classified `○ (Static)` (prerendered at build); compliance scan against `src/app/page.tsx` source confirms no forbidden tokens; HTML title and `<h1>` render as expected via `curl http://localhost:3000/`. **Visual mobile verification at 375px is pending — Claude can't render in a browser, so the developer needs to eyeball layout, tap targets, CTA scroll, and FAQ toggle manually**

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
