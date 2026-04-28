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

When Phase 2 begins, this repo becomes a pnpm workspace and `src/lib/{db,validation,types}/` lifts cleanly into a `packages/shared` folder. Keep code in those folders cohesive and free of Next.js-specific imports so the migration stays mechanical.

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

Build the landing page skeleton (HTML structure, basic styles, placeholder content) per `03_Build_Plan.md` Week 1 § Bootstrap. Replace the create-next-app boilerplate at `src/app/page.tsx` with a single-page layout matching the structure in `02_Technical_Reference.md` Part 2.2 (above-the-fold hero, below-the-fold trust block, form placeholder). No real form logic yet — that's the Week 2 task. Mobile-first per Part 2.4.

After the skeleton: form + `/api/leads` (Week 2 — the compliance-load-bearing task). The `mpl-prod` Supabase project + baseline migration is a separate task deferred until launch is imminent (free-tier projects pause after 7 days of inactivity).

> **Convention:** § 9 holds only the next immediate task. Completed items move to `docs/CHANGELOG.md`.