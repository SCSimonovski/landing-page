<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# AGENTS.md — Mortgage Protection Lead Engine

> The block above is auto-managed by `create-next-app` / Next.js codemods. Do not edit content between the BEGIN/END markers — future Next.js upgrades may rewrite it. Add new content below this line.

## ⚠️ Critical Instructions

1. **Read this entire file at the start of every session** before writing code, making plans, or suggesting architecture.
2. **Treat this file as project memory and current source of truth.** Conflicts with older plans, chat context, or memory: this file wins unless the developer says otherwise.
3. **Keep this file up to date after completed work.** Schema changes, dependency changes, architectural decisions, security rules, or convention changes go in the relevant section before ending the work.
4. **Don't duplicate.** Completed work goes in `docs/CHANGELOG.md`. Current state of conventions/schema/status lives here. The four playbook docs in `docs/playbook/` are read-only references — never edit them; if reality diverges from the playbook, capture the divergence in this file.

---

## Source of Truth Hierarchy

When information conflicts, use this order:

1. `AGENTS.md` (this file) — current state, conventions, immediate next task
2. `supabase/migrations/` — schema history, source of truth for the database
3. `docs/playbook/` — strategic and technical context, decision log; updated infrequently
4. Chat history — context only, never authoritative

---

## 1. What This Project Is

A consumer-facing landing page that captures mortgage protection leads from Meta ads, validates them, stores them in Supabase, and notifies a single licensed insurance agent via SMS within 2 minutes. US market, 1-agent pilot, $40/lead, $2,000 ad spend test.

This is **Phase 1 only**. The agent platform (Phase 2) lives on a separate domain and is a separate Next.js app — not this one. See `docs/playbook/03_Build_Plan.md` Part 3 for Phase 2 scope.

The business does not sell insurance and does not require an insurance license. The product is consented contact information delivered to one buying agent.

---

## 2. Read These When Relevant

The four playbook documents in `docs/playbook/`:

- **`01_Strategy_and_Offer.md`** — business model, unit economics, agent pitch, decision log. Read for: strategic context, pricing, why an architectural choice was made.
- **`02_Technical_Reference.md`** — system architecture, landing page spec, form fields, API contract, DB schema, integrations. Read for: any feature implementation.
- **`03_Build_Plan.md`** — Phase 1 weekly sequence, Phase 2 roadmap, Meta Ads launch, what NOT to build. Read for: scope, sequencing, gating criteria.
- **`04_Operations_Runbook.md`** — operating without an admin UI, daily/weekly rhythms, TCPA operational details, when something breaks. Read for: operational concerns and compliance routines.

Treat newer information from chat as superseding playbook content. The playbook docs are updated infrequently and may lag behind decisions made in conversation.

---

## 3. Stack

Next.js 16.2 (App Router) · TypeScript · Tailwind v4 · pnpm · Supabase (Postgres + Auth + RLS + Studio) · Vercel · Twilio (SMS + STOP webhook) · Resend (transactional email) · Meta Pixel + CAPI · Zod (request validation).

Detailed rationale and integration patterns in `02_Technical_Reference.md` Parts 1, 4, and 5.

---

## 4. Repo Structure

```
.
├── AGENTS.md                         ← canonical agent context (this file)
├── CLAUDE.md                         ← imports AGENTS.md via @-syntax
├── docs/
│   ├── playbook/                     ← read-only reference docs
│   │   ├── 01_Strategy_and_Offer.md
│   │   ├── 02_Technical_Reference.md
│   │   ├── 03_Build_Plan.md
│   │   └── 04_Operations_Runbook.md
│   └── CHANGELOG.md                  ← reverse chronological, what shipped
├── supabase/
│   ├── migrations/                   ← source of truth for schema
│   └── seed.sql                      ← deterministic dev seed data (added later)
├── src/
│   ├── app/                          ← Next.js routes
│   │   └── api/leads/                ← lead intake endpoint (added later)
│   └── lib/
│       ├── db/                       ← Supabase clients + query helpers
│       ├── validation/               ← Zod schemas
│       └── types/                    ← shared types (incl. generated DB types)
└── public/
```

The repo is a pnpm workspace. Workspace package `@platform/shared` holds the shared dispatchers, db helpers, validation schemas, and utilities that any app (consumer landing page or platform) imports. The shape:

```
apps/
  northgate-protection/    ← mortgage protection landing page (current)
  <future second brand>/   ← scaffolded when the second product is chosen
  platform/                ← agent platform (Phase 2)
packages/
  shared/                  ← @platform/shared (workspace internal)
    db/                    ← Supabase clients + leads/suppressions helpers (server-only)
    validation/            ← Zod schemas (used both client and server)
    types/                 ← generated Database types + shared interfaces
    twilio/                ← Twilio adapter (client, message format, signature verify)
    resend/                ← Resend adapter (client)
    sms/                   ← SMS dispatch business action (uses twilio/)
    email/                 ← Welcome email business action (uses resend/)
    utils/                 ← brand-agnostic helpers (phone normalize, rate-limit)
```

App imports look like `@platform/shared/db/leads`, `@platform/shared/validation/common`, etc. Internal cross-references inside `packages/shared/` use relative paths (`./supabase-server`, `../db/leads`). The shared package ships raw `.ts` source — `apps/northgate-protection/next.config.ts` adds `transpilePackages: ["@platform/shared"]` so Next compiles it on demand (no build step). The vendor-adapter (twilio/, resend/) vs business-action (sms/, email/) split is intentional: adapters can change independently of the action layer.

**Per-product vs per-app vs shared placement (post-Plan-2a):**
- **Per-app** (`apps/<app>/src/lib/`): brand-/product-specific code that varies between apps. Northgate Protection has its own `consent.ts` (CONSENT_TEXT verbatim per brand), `intent.ts` (computeIntentScore weights mortgage-specific fields), and `validation/lead-schema.ts` (form-shaped Zod schema with MP-specific fields). Heritage will have its own copies in Plan 2b.
- **Per-product, shared** (`packages/shared/{validation/details,twilio/templates,email/templates}/<product>.ts`): the canonical shape + render of one product, reused across any app that submits that product. SMS + email dispatchers in `packages/shared/twilio/messages.ts` and `packages/shared/email/welcome.ts` route by `lead.product` to the right per-product file.
- **Brand-agnostic, shared** (`packages/shared/`): infrastructure both brands need identically — DB helpers, suppressions/DNC, phone normalization, rate-limit, Twilio client + signature verify, Resend client, common Zod primitives (`US_STATES`, refinements).

---

## 5. Development Workflow

**Two tiers. Don't blur them.**

**Trivial work** — copy edits, page styling, adding an icon, small refactors of internal helpers, commit message fixes. Just do it. No plan needed.

**Non-trivial work** — anything in this list requires a written plan, presented to the developer for review before code is written:

- New or changed schema (migration files)
- New API route, or change to an API contract
- Anything touching `consent_log`, `dnc_registry`, or `suppressions` tables
- New external integration or change to an existing one (Twilio, Resend, Meta CAPI, Supabase auth)
- Change to RLS policies or service-role boundaries
- Changes to landing page copy that touch consent text, disclaimers, or compliance language
- Anything that changes the lead intake flow end-to-end

**Plan format:**

- **Context** — what exists, what playbook section was checked
- **Goal** — what this must achieve
- **Non-goals** — what is intentionally out of scope
- **Approach** — chosen solution and why
- **Tradeoffs** — alternatives considered and rejected
- **Steps** — numbered, with file paths
- **New files / modified files** — explicit
- **Database changes** — migrations / RLS / "none"
- **Dependencies** — new packages or "none"
- **Compliance impact** — TCPA, consent, suppression list — or "none"
- **Verification** — how we confirm it works

After approval: build only the approved scope. If implementation reveals a problem with the plan, stop and explain before changing direction.

After build: update § 9 here (next task), append an entry to `docs/CHANGELOG.md`, update any section in this file where conventions or schema changed.

**One reviewer.** The developer presents plans to Claude.ai (the project chat) for review. No second AI reviewer in Phase 1; that comes when Phase 2 (the platform app) starts.

---

## 6. Non-Negotiables

### Compliance (TCPA)

- **Consent checkbox is never pre-checked.** Default state is unchecked. The user must take a positive action.
- **Consent text is captured per submission as an immutable snapshot** in `consent_log` — full text, not a reference to a constant. If consent text changes, old leads keep their old text.
- **`consent_log` is append-only.** Never updated, never deleted. RLS denies UPDATE and DELETE.
- **Forbidden in landing page copy:** specific dollar amounts, fabricated testimonials, fear imagery (hospital beds, funerals, crying children), false urgency, "guaranteed approval" language. Detail in `02_Technical_Reference.md` Part 2.3.
- **STOP handling is mandatory** and must work end-to-end before any outbound SMS goes out. Inbound STOP/UNSUBSCRIBE/CANCEL/END/QUIT inserts into `suppressions`; the agent SMS dispatcher checks `suppressions` on every send.
- **DNC scrubbing** runs daily against the FTC list, populating `dnc_registry`. The form does not block submissions on DNC match; the agent dispatcher does.

### Speed-to-lead

- The product promise is **SMS to the agent within 2 minutes of submission.** This constrains the `/api/leads` route: notifications must not block the response. Validate and persist synchronously; dispatch SMS / email / Meta CAPI in fire-and-forget tasks. Failures in dispatch must not surface as user-visible errors.

### Security

- Service role key is server-only. Any file importing `SUPABASE_SERVICE_ROLE_KEY` starts with `import "server-only"`.
- All writes to `leads` and `consent_log` go through the API route. No direct client → Supabase writes.
- RLS enabled on every table from the first migration. Server-only write policies in Phase 1.
- Rate limit `/api/leads`: max 3 submissions per IP per hour.
- Honeypot field + sub-3-second submission-time check on the form.
- Never log PII (full name, email, phone) to console or Vercel logs. Use the lead `id` as the correlation key.

### Schema discipline

- All schema changes go through Supabase CLI migration files in `supabase/migrations/`. Never apply DDL through the dashboard SQL editor or MCP `execute_sql`.
- Migrations are checked into git and PR-reviewed.
- The `consent_log` table has no UPDATE or DELETE RLS policies AND has `update`/`delete` revoked from `authenticated, anon, public` — no legitimate reason to mutate consent records. Service role still bypasses RLS, so the discipline is also enforced in app code: no code path writes to `consent_log` except the initial INSERT in `/api/leads`.
- **30-day phone dedup is enforced in `/api/leads`, not via a DB partial unique index.** The playbook spec at `02_Technical_Reference.md` § 5.1 has `where created_at > now() - interval '30 days'` on a partial unique index, but PostgreSQL requires partial-index predicates to use IMMUTABLE functions and `now()` is STABLE — the migration fails. The 30-day rule lives in API code instead.
- **Migration verification rule:** after `supabase db push`, run `supabase db diff --linked` and confirm no diff in **authored objects** (tables, columns, indexes, RLS policies, grants, comments we wrote). Diffs in Supabase Cloud platform defaults (e.g., `pg_net` extension state, default role grants on auto-created tables, `rls_auto_enable` event trigger) are environment drift, not regressions — accept and move on.
- **Tables created in migrations must include explicit `GRANT` statements** for any role that needs access (typically `service_role`, sometimes `authenticated` for Phase 2). The Supabase project's "Automatically expose new tables" setting is **disabled at the project level by design**, so migration-created tables receive no default CRUD grants. Skipping the GRANTs surfaces as `permission denied for table X` (SQLSTATE 42501) — the failure mode that motivated the `20260426202626_grant_service_role.sql` migration.
- **Anon writes are blocked at the grants layer in Phase 1.** RLS policies are in place as a second layer but are **not exercised by current tests** because anon has no grants. When Phase 2 grants any privilege to `anon` or `authenticated`, that migration's verification must include an RLS-specific test (a request that satisfies grants but fails RLS — i.e., expect `"new row violates row-level security policy"`) to confirm the second layer is wired correctly.
- **Per-product qualifying data lives in `leads.details` (JSONB), not as top-level columns.** `brand` and `product` are text discriminators with app-level Zod validation, no DB-level enum (flexibility to add brands without DDL). Top-level columns on `leads` stay reserved for brand-agnostic demographics (state, age, names, contact) + control fields (status, agent_id, on_dnc) + attribution (utm_*, fbclid). Per-product fields like `mortgage_balance`, `is_smoker`, `is_homeowner` (Northgate Protection) or coverage amount + health questions (Northgate Heritage) live inside `details`.
- **Per-product Zod schemas in `packages/shared/validation/details/` are the canonical source of truth for the `details` JSONB shape** — used by both form-side validation (per-app) AND template-side parsers (shared dispatchers in `twilio/messages.ts` + `email/welcome.ts`). Type interfaces in `packages/shared/types/products.ts` are derived via `z.infer<>` from the Zod schemas (single source of truth — no hand-maintained type drift). The dispatcher pattern: `formatAgentSMS(lead)` switches on `lead.product` to the right `formatXxxSMS(lead)` template, which Zod-parses `lead.details` and throws with descriptive errors if shape is wrong. Adding a new product is: write the Zod schema in `validation/details/<product>.ts`, add the SMS + email templates in their `templates/<product>.ts` files, add the dispatcher cases.

### Operational discipline

- **Env-var changes are 5-place updates.** When adding or rotating any env var:
  1. Root `.env.local` (for Supabase CLI, scripts/, gen:types)
  2. `apps/northgate-protection/.env.local` (for NP's `next dev` / `next build`)
  3. `apps/northgate-heritage/.env.local` (for Heritage's `next dev` / `next build`, post-Plan-2b)
  4. Vercel: Northgate Protection project's Environment Variables
  5. Vercel: Northgate Heritage project's Environment Variables (post-Plan-2b)

  Run `pnpm verify-envs` before pushing to confirm the local-side three are in sync (key sets only — values legitimately differ per environment). Vercel-side requires manual per-project dashboard verification. **After any rotation, redeploy each Vercel project** to pick up the new value (Vercel does NOT auto-redeploy on env-var changes). Pre-Plan-2b this is effectively a 3-place rule (root + NP-local + NP-Vercel); the rule grows to 5 places when Heritage's `.env.local` and Vercel project land.

---

## 7. What NOT to Build (Phase 1 Boundary)

These are Phase 2 or later. Resist proposing them, and flag clearly if a request would pull us into them:

- Custom admin dashboard (Supabase Studio is the admin UI)
- Agent self-service login or status updates
- Multi-agent routing logic — there is one agent
- Lead nurture sequences beyond the welcome email
- Charts, analytics dashboards, attribution modeling
- Automated refund processing
- Mobile app, Slack integration, calendar booking

If a feature feels useful but the agent has not asked for it and operational pain hasn't surfaced it, it is premature. See `03_Build_Plan.md` Part 4.

---

## 8. Repo Ownership Status

The repo lives on the developer's personal GitHub account. The operating LLC has not yet been formed. **On LLC formation, this repo transfers to the LLC's GitHub organization.** GitHub repo transfer preserves history, issues, and stars — it is mechanical. Update this section on the day of transfer.

LLC formation is on the parallel critical path because Twilio A2P 10DLC and Meta Business Manager verification both want a registered legal entity with EIN.

---

## 9. What's Been Done / What's Next

### Done

See `docs/CHANGELOG.md`.

### Next immediate task

**Plan 2b: scaffold `apps/northgate-heritage/`.** Plan 2a (per-product template + per-app library refactors) shipped on 2026-05-03 with all three parity gates green and the dispatcher pattern wired — see CHANGELOG. Plan 2b is the architect-required follow-up: scaffold the second consumer brand under the same LLC as a sibling Next.js app at `apps/northgate-heritage/`, sharing infrastructure via `@platform/shared` but with its own UI, copy, env, and Vercel project. Architect-locked spec: directory `apps/northgate-heritage/` (Hearth visual direction — design templates from prior Northgate brand pass, reused here as sibling brand), full FE qualifying set (5–7 fields including age, smoker, desired coverage, basic health questions, beneficiary relationship), FE-shaped intent score in `apps/northgate-heritage/src/lib/intent.ts`, FE consent text in `apps/northgate-heritage/src/lib/consent.ts`, FE form-shaped Zod schema in `apps/northgate-heritage/src/lib/validation/lead-schema.ts`, and population of the placeholder Plan 2a left at `packages/shared/{validation/details,twilio/templates,email/templates}/final_expense.ts`. New Vercel project for Heritage with its own `.env.local` (5-place env-var rule activates).

Subsequent tasks (rough order, not committed): Meta Pixel client-side install (still blocked on Heritage being live for verification against the right URL); server-side Meta CAPI dispatch (`/api/leads` `Promise.all` third entry); daily DNC scrub cron (populates `dnc_registry` from the FTC list); replace placeholder copy + draft consent text + draft `/privacy` + `/terms` content with attorney-reviewed final versions; register custom consumer domains for both brands (gates on LLC + brand); `mpl-prod` Supabase project + baseline migration replay (deferred until launch is imminent — free-tier projects pause after 7 days of inactivity).

**Vercel deploy posture (current):** Public URL is `https://northgateprotection.vercel.app` (renamed from the auto-generated slug early in the deploy task). This is a **public-URL dev environment, NOT launch.** Vercel's production env points at `mpl-dev` (the only Supabase project we have). Real launch requires `mpl-prod` + custom domain + LLC + A2P 10DLC + attorney-reviewed text. CT-log scanners WILL find the `*.vercel.app` URL; expect junk lead accumulation in `mpl-dev` from automated probes (mitigations: rate limits already in place, mpl-dev gets dropped before launch). Twilio webhook now points at the Vercel URL; outbound SMS still A2P-blocked at the carrier.

**Brand identity (Meridian):** Northgate Protection brand pivoted from navy/cream/Georgia to the Meridian direction — sage `#6B8A7A` + coral `#E27A5F` + butter `#F7F3E9` + putty `#EDE8DD` page bg + deep-forest ink `#1F2A28` foreground, Geist sans (display + UI) with Fraunces italic for serif accents (the "*paid.*" / "*that's it.*" / "*One agent.*" flourishes). Logo at `public/northgate-logo.svg` (canonical asset) and as inline `<NorthgateLogo>` React component (color-prop driven for header/footer rendering on different bgs). **Hero imagery is the brand-mark arch motif used as a decorative graphic** (`<ArchMotif>` component), NOT photography — Meridian direction trades a photo for an editorial brand-mark approach. Header gets primary nav (`How it works` / `FAQ` / `Start my quote` pill). Footer is a dark-ink band with butter text. All FAQ + chip + step copy finalized per design spec. Compliance reword: "public-interest service" → "An independent service for homeowners" (the original framing implied non-profit/civic posture, which we are not).

**Outstanding launch checklist (paperwork-blocked, NOT routine follow-ups):**
- **Live STOP webhook end-to-end test** — Vercel deploy unblocked the infrastructure side (Twilio webhook now points at the live handler); test itself is deferred to next session with verified phone access. Validates Twilio → DNS → Vercel → handler → `suppressions` insert end-to-end, plus the backstop check (re-submit lead with STOP'd phone → silent 200, no lead created).
- **Hero imagery: Meridian uses the brand-mark arch as graphic, NOT photography.** Eliminated the "real hero photo before SAC" gate from the prior brand pass. Trade-off per playbook 02 Part 2.5 (real photos beat stock by ~20%; no-photo "almost certainly underperforms even stock") is acknowledged and accepted: the brand-mark editorial approach reads as intentional design rather than missing image. **Watch-item, not blocker for NP:** if SAC/CAC numbers post-launch don't justify the editorial choice, fallback is to swap `<ArchMotif>` for a real architectural-detail photo. Decision-point comes after the first ad-test cohort; not a launch-readiness gate.
- **Hero imagery for Heritage (post-Plan-2b): firm SAC blocker, NOT a watch-item.** Hearth visual direction *expects* photography; the diagonal-stripe/brand-mark fallback that works as intentional editorial in Meridian reads as "design unfinished" in Hearth. Heritage launch checklist must treat real hero photography as a hard prerequisite for SAC submission, not a post-launch optimization. Capture this in Plan 2b's launch-readiness gate when that plan lands.
- **Form "~50s left" indicator.** Borderline false-urgency framing (architect-flagged) kept in for now per developer call to "see how it looks" in preview. Revisit after live preview review — drop entirely or reword to "About 50 seconds total" (descriptive, non-pressuring).
- **Real attorney-reviewed legal text** — replaces the v1-draft consent text (playbook 4.3) AND the placeholder content on `/privacy` + `/terms` (currently a yellow-banner draft with bracket-marker `[PLACEHOLDER]` slots throughout). Legal review is one cross-cutting task, not three.
- Twilio A2P 10DLC registration — needs LLC + EIN. Until done, outbound SMS is silently dropped at the carrier (Twilio API returns success; messages show `status=undelivered` with carrier error 30034 for long-codes / 30032 for toll-free TFV). Code is right; delivery is paperwork-blocked.
- Email MX lookup + disposable-email blocklist (form validation hardening per playbook 3.2)
- Names "obvious garbage" heuristic (form validation hardening per playbook 3.2)
- SMS watchdog cron (per playbook 4.5 — silent dispatch failures get logged once and dropped today)
- Custom from-domain for the welcome email (currently `onboarding@resend.dev`; needs registered consumer domain + DKIM/SPF/Return-Path verification)
- Custom consumer domain (replaces `*.vercel.app`; gates on LLC + brand decision)
- `mpl-prod` Supabase project + migration replay (cutover swaps Vercel's Supabase env vars; from that moment Vercel URL is real production)
- **`HEALTH_CHECK_SECRET` re-rotation pre-launch.** Production secret was rotated fresh during Vercel deploy (separate from dev). Rotate again after attorney pass and before first ad spend — anything that's been visible in dev session logs deserves a final rotation before real users land.
- CAN-SPAM physical mailing address in welcome email body AND in `/privacy` + `/terms` text (needs LLC registered address; placeholder markers in all three places now)
- Email reply-to opt-out handling (welcome email body invites "reply 'unsubscribe'" but no inbox monitor in Phase 1; Phase 1 manual workaround = check the FROM_EMAIL inbox and `addSuppression` via Studio SQL editor)
- Welcome-email-vs-SMS independence asymmetry (welcome email promises a call by name even if SMS dispatch failed; refund risk at scale; see CHANGELOG entry for failure modes)
- `META_TEST_EVENT_CODE` removal pre-launch (when Meta CAPI ships) — forgot-to-remove means production events go to Test Events tab forever, never train the optimization model
- Meta Pixel install + privacy-policy ad-data-sharing disclosure (current `/privacy` placeholder mentions Meta CAPI sharing in section 4 but specifics need attorney review)
- LLC + EIN (gates several of the above)
- **Periodic ops action during public-URL-dev phase: weekly check on mpl-dev junk lead volume.** If volume exceeds ~50/week, revisit adding Cloudflare Turnstile / hCaptcha to the form (Phase 1 plan said no CAPTCHA based on a "not yet exposed publicly" assumption that no longer holds post-Vercel). **This belongs in `04_Operations_Runbook.md` once the architect proposes a runbook edit** — until then, tracked here.

> **Convention:** § 9 holds only the next immediate task. Completed items move to `docs/CHANGELOG.md`.