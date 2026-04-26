# Changelog

Reverse chronological. What shipped, when, and any notes a future reader (or future you) needs to make sense of it. Keep entries short — one paragraph each. Schema migrations are described here in plain English; the migration file itself is the source of truth.

---

## 2026-04-26 — Initial scaffold

- Next.js 16.2 app generated with TypeScript, Tailwind v4, App Router, ESLint, `src/` directory, pnpm
- Repo initialised on personal GitHub (private). Will transfer to LLC organisation on formation.
- Playbook documents (`01_Strategy_and_Offer`, `02_Technical_Reference`, `03_Build_Plan`, `04_Operations_Runbook`) added to `docs/playbook/` as read-only references
- `CLAUDE.md` and `AGENTS.md` created at repo root
- `.env.example` created with placeholders for Supabase, Twilio, Resend, Meta CAPI
- Empty `supabase/migrations/` directory created (baseline migration is the next task)
