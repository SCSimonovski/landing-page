# Changelog

Reverse chronological. What shipped, when, and any notes a future reader (or future you) needs to make sense of it. Keep entries short — one paragraph each. Schema migrations are described here in plain English; the migration file itself is the source of truth.

---

## 2026-05-09 — Plan 5+ safety layer: bulk_operation_id + 100-row cap + confirm modal

Same `v03-platform` branch — picked up architect feedback on the bulk RPCs (Claude Web review). Three architectural concerns addressed; one strategic decision (RPC stays dumb, modal carries safety logic).

**Migration** (`20260509192618_bulk_operation_id_and_cap.sql`):
- `lead_events.bulk_operation_id` (nullable uuid). NULL for individual RPC writes (Plan 5's per-row pattern) and for `insert_lead_with_consent`'s system events; populated by both bulk RPCs going forward — every event from one bulk call shares the same UUID. **Backfill is impossible** (the grouping doesn't exist after the fact), so the column had to be added before any future caller would have wanted it.
- `CREATE OR REPLACE` on both bulk RPCs (`bulk_assign_leads`, `bulk_update_lead_status`) to: (a) generate a fresh `gen_random_uuid()` per call, (b) stamp it on every `lead_events` insert in that call, (c) reject arrays over **100 leads** with `'bulk operations limited to 100 leads (got N)'` (errcode `22023`). The cap guards against the lock-holding scenario where a 500-lead bulk would queue concurrent `/api/leads` writers.
- Same RPC signatures as the prior migration (`(uuid[], uuid)` / `(uuid[], lead_status)`). **No `mode` parameter.** Architect call: the per-row no-op short-circuit already handles "skip rows where current === target"; mode would have been functionally informational. Modal carries all caller-side safety logic.
- Replaces the legacy `event_data.bulk = true` field — superseded by the dedicated column. `event_data` for bulk events now matches per-row events (just `{old, new}` for status_change, `{old_agent_id, new_agent_id}` for assigned).

**`<BulkConfirmDialog>`** — alert-style modal, two shapes:
- **Status mode** (triggered when any selected lead has `status !== target`): breakdown per current status; distinct red warning when any selected lead would move *backward* in the sales funnel (`new < contacted < appointment < sold`; terminals `dead` / `refunded` reachable from anywhere — funnel ranks live as a frontend constant in `lib/leads/lead-status-options.ts`, RPC stays dumb). Two buttons when regressions present: **primary** "Apply to N (skip downgrades)" + **secondary** "Apply to all (incl. K downgrades)". Single primary button when no regressions.
- **Assign mode** (triggered when any selected lead has `agent_id IS NOT NULL` and `agent_id !== target`): breakdown per current agent. Single primary button "Reassign all N" — no skip-mode needed per architect call (assign-overwrite is the actual intent of bulk-assign; the modal's job is showing the cross-agent diff so the operator confirms knowingly).

**Heterogeneity branching in `<BulkActionBar>`:**
- Pick "Assign to Bob": all selected unassigned → submit immediately (fresh assignment, no overwrite). Mix includes already-assigned-to-others → modal opens.
- Pick "Set Contacted": all selected already in target → toast "no-op" with no action. Anything else → modal opens.
- Submitting via modal sends only the IDs the chosen button corresponds to (safe-only vs all). The RPC's no-op short-circuit further filters; the result is the same DB state regardless of which button you pick when there are no regressions.

**Verification** (`scripts/test-platform-rls.ts`): now **62 assertions** (~50s runtime). Three new assertions:
- Two `assigned` events from one `bulk_assign_leads` call share a non-null `bulk_operation_id` (same UUID across both rows)
- Per-row `update_lead_status` (Plan 5 RPC) leaves `bulk_operation_id = NULL` (proves the column distinguishes bulk vs per-row writes)
- 101-id arrays to either bulk RPC raise `'bulk operations limited to 100 leads'`

Updated the existing Assertion #31 to check `bulk_operation_id !== NULL` instead of the legacy `event_data.bulk` field.

**vitest unchanged** (10 files / 192 tests). NP + Heritage lint unchanged (1 pre-existing RHF warning each).

**Architect's separation principle locked in:** RPC validates auth + cap + atomic per-row apply with bulk_operation_id stamp; that's it. Modal owns all UX safety — heterogeneity detection, regression warning, default vs override. Lets the safety logic evolve (different funnel ordering, additional warnings) without schema migrations.

---

## 2026-05-09 — Plan 5+ polish: bulk lead operations (assign + status change)

Same `v03-platform` branch — picked up the user's feedback after Plan 5 smoke ("assigning leads one by one is tedious"). Mirrors Plan 5's RPC-only-writes pattern for bulk operations.

**Migration** (`20260509030752_bulk_lead_rpcs.sql`):
- `bulk_assign_leads(p_lead_ids uuid[], p_new_agent_id uuid)` — admin/superadmin only. Atomic transaction (all-or-nothing). Per-lead no-op short-circuit. Per-lead `assigned` event with actor + `event_data.bulk = true`. NULL agent_id allowed (= unassign).
- `bulk_update_lead_status(p_lead_ids uuid[], p_new_status lead_status)` — agent on own leads OR admin/superadmin. **Atomicity guarantee:** an agent passing a batch that includes a foreign lead → whole batch reverts (verified). Per-lead no-op short-circuit. Per-lead `status_change` event with actor + `bulk = true`.

Both EXECUTE granted to `authenticated`. No new direct UPDATE grants on `leads` — extends Plan 5 Decision #13 (RPC-only-writes pattern).

**UI** (admin/superadmin only):
- **Checkbox column** at the leftmost position of `/leads` table — agents don't see it (matches RPC's admin-only constraint for bulk_assign + keeps the agent UI uncluttered).
- **Header checkbox** = select-all-visible-on-this-page (cross-page selection deferred). Three states: checked / indeterminate / unchecked.
- **Sticky `<BulkActionBar>`** at top of the page when selection is non-empty. Shows `N leads selected` + `Assign to ▼` + `Set status ▼` + `Clear`. Each action calls its bulk RPC. Toast on success, refresh + clear selection. Designed so future actions (Mark DNC, bulk delete) drop in as more buttons.
- **Selection state** lives in a `<LeadSelectionProvider>` client context wrapping the page (NOT in URL — selection is ephemeral; persisting across navigations is its own UX problem).
- Row checkbox click stops propagation so it doesn't trigger the row's click-to-detail navigation.

**Verification:** `scripts/test-platform-rls.ts` extended from 47 → **56 assertions** (~45s runtime). Four new bulk-RPC assertions:
- bulk_assign_leads: admin succeeds + writes per-lead `assigned` events with bulk=true; agent → permission denied
- bulk_update_lead_status: agent on own leads succeeds; agent on mixed (own + foreign) batch → atomic revert (verified pre/post state)

vitest unchanged (10 files / 192 tests — bulk RPCs are integration-tested via the script).

**Defer / OOB:**
- Bulk delete — TCPA-adjacent (consent_log is append-only per AGENTS.md § 6; `lead_events` + `consent_log` FK chain has no CASCADE). Worth its own plan covering soft-delete-via-`deleted_at`-column vs hard-delete-with-explicit-child-cleanup.
- Cross-page selection persistence — header checkbox currently scopes to visible page only. Adding "select all 247 matching leads" UX needs a different selection model (filter-based vs id-based) and a confirmation hint.
- Bulk Mark DNC — admin-only action sketched in user's mental model; defer to a small plan once the immediate pain is gone.

NP + Heritage runtime byte-identical (no consumer-app changes).

---

## 2026-05-09 — Plan 5: Northgate Leads v0.3 (lead detail + status + assignment + notes + /account + RPC-only-writes)

Plan 5 per the architect-approved plan at `.claude/plans/reviewing-the-plan-as-dazzling-bumblebee.md`. Closes the three operator gaps Plan 4's smoke surfaced: no in-app lead assignment (was SQL-only), no agent status updates (`leads.status` enum sat unused), no profile / password change UI. Architectural lock-in: **all row-scoped writes from `authenticated` flow through SECURITY DEFINER RPCs**, NOT direct UPDATE grants — Plan 5 is where the RPC-only-writes pattern gets written into the codebase as the convention.

**Schema discoveries that significantly tightened scope:**
- `leads.status` ENUM column already existed (`new / contacted / appointment / sold / dead / refunded`, 6 states aligned with playbook 04 KPIs). Resolved Claude Web's "wrong vocabulary" risk by using what's there. Captures appointment_rate / close_rate / refund_rate directly; reach_rate is partially derivable (`1 - count(new)/total`) but doesn't distinguish "no answer" from "answered" — see OOB note for the `no_answer` follow-up.
- `lead_event_type` enum already had `created`, `status_change`, `note_added` (+ infra events). `insert_lead_with_consent` already writes `created` events for every new lead — **no backfill needed; no `/api/leads` change.**
- `leads.notes` + `leads.outcome` columns already existed, currently unused. Surfaced `notes` on the detail page.

**Migration** (`20260509012042_v03_rpcs_and_lead_events_actor.sql`): adds `lead_events.actor_platform_user_id` (nullable FK to `platform_users(id)`); adds `'assigned'` to `lead_event_type` enum; adds 5 SECURITY DEFINER RPCs (all `set search_path = public`, all `EXECUTE` granted to `authenticated`):
- `update_lead_status(p_lead_id, p_new_status)` — agent on own leads OR admin/superadmin. No-op short-circuit. Atomic update + `status_change` event with actor.
- `update_lead_notes(p_lead_id, p_notes)` — same auth scope. Soft-truncates at 1000 chars (paste-from-CRM tolerance). `note_added` event.
- `assign_lead(p_lead_id, p_new_agent_id)` — admin/superadmin only. NULL = unassign. `assigned` event.
- `set_platform_user_active(p_target_user_id, p_new_active)` — admin/superadmin. **Refuses self-deactivation; refuses admin deactivating a superadmin** (first place admin diverges from superadmin per Plan 3 Decision #3; superadmin-on-superadmin is allowed).
- `update_agent_profile(p_full_name, p_license_states)` — caller must have an `agents` row. **Raises `'no agent row for current user'` for admin/superadmin callers** — UI hides the section but RPC defends in depth.

Adds SELECT grants + role-aware policies on `consent_log` and `lead_events` (admin/superadmin all; agent own-lead via `leads.agent_id` join). NO direct UPDATE / INSERT / DELETE grants on any of these tables for `authenticated` — writes only through the RPCs.

**Fix-up migration** (`20260509013034_grant_service_role_consent_lead_events_delete.sql`): pre-existing baseline-era gap — `service_role` lacked DELETE on `consent_log` + `lead_events`. Surfaced when `test-platform-rls.ts` cleanup tried to delete test fixtures. Same pattern as Plan 3's `20260504130000_grant_service_role_platform_users.sql` fix-up.

**Lead detail page** (`/leads/[id]`): single-page card stack (no tabs):
- Header: name + `<LeadStatusSelect>` (color-coded badge per status) + `<LeadAssignSelect>` (admin-only)
- Contact info, per-product details, **notes editor** (debounced 1s idle auto-save — NOT blur), Compliance card (`consent_log` rows), Activity timeline (`lead_events` reverse chronological with actor display)
- Activity copy: type-specific per event_type (`status_change` renders both badges inline; `assigned`/`note_added`/`created`/system events all custom)
- Actor display: `agents.full_name` for agent actors, `email` for admin/superadmin, "system" for NULL
- Empty states: "No consent records found for this lead." (anomaly — should never fire) / "No activity yet."
- RLS: if user can't see this lead, the SELECT returns null → `notFound()`.

**`/users` polish:** active/inactive toggle column with shadcn `<Switch>` calling `set_platform_user_active`. Self-toggle and admin→superadmin both client-side disabled with tooltip; RPC also enforces (defense in depth).

**`/leads` polish:** status column added (color-coded badge); status sortable; **assigned-agent-name sortable** via Supabase's `foreignTable: "agent"` option; status filter (multi-select FilterMenu, 6 options, `?status=x&status=y`); **click row → navigate to detail** (`onClick + router.push` per Plan 4's asChild rule; `tel:`/`mailto:` cells `stopPropagation()`; `cursor-pointer` for affordance). Extracted per-row client wrapper (`<LeadRow>`) so the table chrome stays a Server Component.

**`/account` page:** Sidebar gains an Account link (visible to all roles).
- **Profile section** (server-side conditional, agents only): full_name + license_states via `update_agent_profile` RPC. Reuses extracted `<LicenseStatesPicker>` (also used by InviteUserDialog).
- **Password section** (all roles): two-step — verify current via `signInWithPassword` (Supabase replaces session cookies in-place; no sign-out cycle), then `updateUser({ password })`. 8-char min matches setup-password convention.
- **Email section** (all roles): read-only with disclaimer: "Contact your administrator to change your email." Email change deferred — JWT identity + `platform_users.email` join-key + Supabase Auth confirmation flow is real scope (v0.4 OOB).

**Verification** (`scripts/test-platform-rls.ts` extended from 8 → **47 assertions**, ~40s runtime):
- All 5 RPCs: agent-on-own success / agent-on-other denied / admin success matrix
- `assigned` event written with correct actor; `status_change` event written with correct actor
- `set_platform_user_active`: admin self-deactivation refused; admin → superadmin refused (first divergence); superadmin → superadmin allowed; agent → permission denied
- `update_agent_profile`: agent on own → success; admin (no agent row) → loud failure; agent submitting empty `license_states` → validation error
- SELECT-policy tests: agent sees own-lead consent_log + lead_events; agent sees 0 rows for other agents' leads; anon blocked on both tables
- **Anti-grant test**: agent calling `.from('leads').update({ on_dnc: true })` → permission denied (defends the RPC-only-writes pattern against a future migration accidentally adding the grant)
- Cleanup: deletes lead_events + consent_log + leads + agents + platform_users + auth.users in FK-safe order; verified clean by re-running the script back-to-back.

**Branch:** `v03-platform` off `main` (Plan 4's `shadcn-refactor` merged via PR #8 first per Plan 5 sequencing decision).

**Tests:** vitest stays at 10 files / 192 tests (added 4 new assertions in `leads-query.test.ts` covering status filter + foreignTable sort + status validation; the integration RPC coverage lives in `test-platform-rls.ts`).

**Decisions locked** (full table in plan file): 26 entries; key ones:
- D#1 Status enum: existing 6 (no churn)
- D#13 RPC-only-writes pattern: locked
- D#7 admin cannot deactivate superadmin (first divergence point)
- D#22 click-row-to-detail: `onClick + router.push` (NOT `<TableRow asChild><Link>`)
- D#23 no-op short-circuit on status/notes/assignment unchanged

**Open follow-ups** (post-Plan-5):
- Email change on /account (Supabase Auth confirmation flow + `platform_users.email` sync; defer to v0.4)
- `no_answer` 7th status state — if agent feedback says reach_rate granularity matters
- Refund workflow (v0.4) — the `refunded` enum value is wired but no programmatic flow yet; admin manually marks for now
- Bulk reassignment when an agent leaves
- Notification on assignment (silent today)
- Search by name/phone/email (defer until volume)
- Docs pass omnibus (status enum vocabulary in playbook 04 § 3.1; RPC-only-writes pattern in AGENTS.md § 6 — already done; Plan 3 magic-link → password decision-log; northgate-leads rename; asChild convention from Plan 4; sortable headers reversal of Plan 3 Decision #20)

NP + Heritage runtime byte-identical (no consumer-app changes; `/api/leads` already inserts `created` event via existing `insert_lead_with_consent` RPC).

---

## 2026-05-09 — Plan 4 polish pass (palette, filters, sortable headers, pending-invite, cursor, hydration)

Same `shadcn-refactor` branch — picked up the previous day's UI smoke feedback. No schema or RLS changes.

- **Custom palette** replacing the initial shadcn slate base. Warm-stone neutrals (oklch hue ~70) instead of cool slate (~260) — reads less "Bootstrap admin." Primary is a deep desaturated sage (oklch 0.42 0.05 165) that connects subtly to the consumer-side NP brand without going on-brand. Sidebar gets a slight sage tint to read as its own surface. `--link` / `--link-hover` kept distinct from `--primary` so phone/email links in the leads table don't visually compete with primary CTAs. Brand badges (NP / Heritage / temperature) preserved verbatim.
- **Logo recolored** to match NP family: arch + NORTHGATE in `#1F2A28` (same deep-forest ink as Northgate Protection's foreground), LEADS subline in `#4F7263` (deep sage matching the platform's primary). Cohesive across all three apps.
- **SidebarTrigger moved into the sidebar header** (previously sat in a separate top bar inside SidebarInset). When the sidebar is icon-collapsed, the trigger is the only element that fits — so it stays clickable to expand.
- **Filter UX overhaul** — replaced the always-visible Plan-4-day-1 chip rows with per-category dropdowns (Linear / Airtable style). Each filter (Brand, Product, Temperature, Created, Agent) is its own button → opens a popover with checkboxes (multi-select) or check-icon list (single-select for Created). Active count badge on the trigger; "Clear" inside each popover; "Reset all" on the right when any filter is active. URL is still source of truth — every toggle is `router.push`. Multi-value supported end-to-end: `?brand=x&brand=y` → `parseFilters` returns arrays → `buildLeadsQuery` uses `.in()` (and `.or()` for the unassigned-mixed-with-agents case).
- **Sortable column headers**. Click Created / Name / State / Age / Score → cycles asc → desc → cleared (back to default `created_at desc`). Faded `↕` icon for sortable-but-inactive; solid `↑` / `↓` for the active column. URL: `?sort=age&dir=desc`. Whitelist on the server (`SORT_COLUMNS`) — typo'd or malicious sort columns are silently ignored, so `.order()` never sees an arbitrary string.
- **Pending-invite state on /users**. Plan-4-day-1's `Status: Active` + `Joined: today` was misleading for a freshly-invited user — `platform_users.active` is an admin toggle, not a "completed onboarding" signal. Now reads `auth.users.email_confirmed_at` via service-role `auth.admin.listUsers` and shows three states: **Active** (green) when confirmed, **Pending invite** (amber) when invited but not accepted, **Inactive** (muted) when the admin disabled the account. The Joined column labels itself per row: "Invited X" for pending, "Joined X" for accepted.
- **Cursor pointer on shadcn buttons** — added `cursor-pointer` to the Button cva base + `sidebarMenuButtonVariants`. shadcn intentionally omits this per HTML semantics, but users expect pointer cursors on clickable buttons. `disabled:cursor-not-allowed` for disabled state.
- **Hydration fixes for `asChild` composition with React 19 + radix-ui v1.4.** Multi-level Slot composition (e.g., `<DropdownMenuTrigger asChild><SidebarMenuButton>...</SidebarMenuButton></DropdownMenuTrigger>` or `<SidebarMenuButton asChild><Link>...</Link></SidebarMenuButton>`) produced server/client diffs in dev. Established rule across the branch: shadcn primitives are used either alone (no asChild) OR composed with native HTML / `next/link` only — never with another shadcn primitive via asChild. `sidebarMenuButtonVariants` extracted from the `"use client"` `sidebar.tsx` into a sibling `sidebar-variants.ts` so Server Components (and the rewired DropdownMenuTrigger / nav links) can apply the classes directly.
- **Vitest** total: 10 files / 187 tests (12 new tests across multi-value parsing, sort cycling, agent-unassigned `.or()` query shape).

---

## 2026-05-08 — Plan 4: Northgate Leads UI v0.2 (shadcn refactor + Invite User + User Management)

Plan 4 per the architect-approved plan at `.claude/plans/reviewing-the-plan-as-dazzling-bumblebee.md`. **Full UI overhaul of `apps/northgate-leads/`** — chrome + leads table + auth forms + badges + filter bar all migrated to shadcn/ui. Adds a persistent sidebar shell, `/users` page (admin/superadmin only), in-app **Invite User** dialog (replaces the manual SQL provisioning workflow from Plan 3), and closes the dead-error-param gap that Plan 3 introduced (`/login` redirects with `?error=...` had no display surface). NP + Heritage runtime unchanged. **No schema or RLS migrations** — Plan 3's posture preserved.

**App-shell + routing:**
- New Next.js route group `(auth)/` holds `/login` + `/auth/{setup,forgot,reset}-password` chromeless (logo-only header, no sidebar). Existing routes preserved (URL paths unchanged — route groups don't add URL segments).
- Root `app/layout.tsx` now wraps signed-in routes in shadcn `<SidebarProvider>` + `<AppSidebar>` + `<SidebarInset>`. Auth routes branch out via the `(auth)/layout.tsx` override.
- **Server-side cookie read for first paint** — `cookies()` reads `sidebar_state` and passes to `<SidebarProvider defaultOpen={...}>`. Without this, every navigation flashed the default open state before client hydration corrected it.
- `<AppSidebar>` is a server component, role-aware: Leads link always; **Users link only for admin/superadmin** (server-side conditional render — RLS already isolates server-side; UI matches).
- Sidebar footer has a `<DropdownMenu>` with the signed-in email + sign-out form (posts to existing `/auth/signout` route handler from Plan 3).
- `<Toaster />` (shadcn Sonner) mounted in root layout, NOT in the auth-group layout — toasts surface from anywhere in the authed app.

**UI refactor (full overhaul):**
- shadcn primitives installed: button, input, label, form, table, badge, dialog, sidebar, card, separator, sheet, select, sonner, dropdown-menu, tooltip, skeleton, checkbox. Lives in `src/components/ui/` (copy-paste model — no version-pin headaches).
- `src/lib/utils.ts` adds the standard `cn` helper (clsx + tailwind-merge).
- `globals.css` rewritten with shadcn slate tokens (OKLCH per Tailwind v4 convention) + the brand-color badge tokens preserved verbatim from Plan 3.
- `<Badge>` extended with brand/product/temp/dnc cva variants. Helpers `brandVariant` / `productVariant` / `tempVariant` (+ `*Label` companions) live in the same file. Old `components/badge.tsx` deleted.
- `<FilterBar>` chips now `<Button asChild variant={active ? "default" : "outline"} size="sm">` wrapping `<Link>` — preserves Plan 3's URL-as-state pattern (server-rendered, no client interactivity layer).
- `<LeadTable>` migrated to shadcn `<Table>` primitives. Same column logic, same admin-only Assigned column conditional. DNC column renders `<Badge variant="dnc">` instead of the inline red dot.
- `<Pagination>` Prev/Next become shadcn `<Button>` with lucide chevron icons.
- Auth pages (login + setup/forgot/reset-password) wrapped in shadcn `<Card>` + `<Input>` + `<Label>` + `<Button>`. **Effect bodies untouched** — the dual-flow handlers (`?code=` PKCE + `#access_token` implicit) and Strict Mode short-circuits from Plan 3 commits `3abd327` + `b2a7a9a` preserved byte-for-byte. JSX-only edits.
- Old `components/sign-out-button.tsx` deleted (sidebar dropdown takes over).

**`/login` error banner (closes Plan 3 silent-param gap):**
- `<LoginErrorBanner>` subcomponent reads `useSearchParams()` and maps three keys to copy: `not_provisioned`, `inactive`, `insufficient_role`. **Wrapped in `<Suspense fallback={null}>`** — Next 16 fails the build with "useSearchParams should be wrapped in a Suspense boundary" otherwise.
- `/leads/page.tsx` reads `?error=insufficient_role` from server-side `searchParams` props (no useSearchParams, no Suspense — Server Component) and renders an inline banner above the FilterBar.

**`/users` page + Invite User flow:**
- `/users` Server Component fetches `platform_users` with nested `agents (full_name, license_states)` join. Renders shadcn `<Table>` with email + role badge + Active/Inactive status indicator + agent details (— for non-agents) + relative-time joined.
- "Invite user" button opens `<InviteUserDialog>` (client component, RHF + Zod resolver + shadcn `<Form>`). Conditional fields via `useWatch` on role: full_name + license_states required only for `role=agent`. License states render as a 6-column grid of shadcn `<Checkbox>` for the 50 US states.
- `inviteUser` server action: `assertAdmin` first (defense-in-depth), then `auth.admin.inviteUserByEmail` → `platform_users` insert → `agents` insert (only when role=agent). **Explicit try/catch reversal** in opposite order on failure (agent → platform_user → auth user); never throws from cleanup; logs every step with `[invite-cleanup]` prefix.
- Ordering rationale: invite-first because `inviteUserByEmail` is the highest-failure-rate step (email delivery, rate limits) — failing first means no DB writes need reversal. Race window for "user clicks link before platform_users row commits" is bounded by email-delivery latency (≥seconds) which is orders of magnitude longer than the remaining DB writes (single-statement inserts, milliseconds).
- `agents.platform_user_id` FK has NO `ON DELETE CASCADE` (Plan 3 migration), so the cleanup branch deletes agents explicitly before platform_users. Documented in OOB notes for follow-up.
- Toast on success via shadcn Sonner; inline form error on failure.

**Server-side role gating — TWO helpers, separated by call-site:**
- `requireAdmin()` (for Server Component pages): redirects to `/leads?error=insufficient_role` on failure.
- `assertAdmin()` (for Server Actions): throws `Error("Forbidden")` on failure. The action's existing try/catch turns it into `{ ok: false, error: "Forbidden" }` so the dialog renders an inline error.
- Why split: `redirect()` from inside a Server Action throws `NEXT_REDIRECT` which becomes a 303 navigation; the action's declared return type never resolves and the calling RHF submit handler hangs. Splitting preserves the clean inline-error UX while keeping page-level redirects working.

**Email lowercasing — schema-only single source of truth:**
- `inviteSchema` uses `z.string().email().toLowerCase()` transform. Action consumes the parsed value and inserts as-is — no second normalization layer. Test asserts uppercase / mixed-case email is normalized (load-bearing — fires loudly if anyone removes the transform).

**New deps** (`apps/northgate-leads/package.json`):
- `@hookform/resolvers`, `react-hook-form` — invite form
- `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css` — shadcn primitives + cva variants
- `lucide-react` — icons
- `next-themes` — bundled by shadcn (theme switcher not used in v0.2)
- `radix-ui` — shadcn primitive backbone (single combined package, not individual @radix-ui/*)
- `sonner` — toast
- `zod` — invite schema

**Tests:** new `apps/northgate-leads/src/app/users/invite-schema.test.ts` (11 assertions covering conditional validation, email normalization, role enum, US state validation, agent vs admin/superadmin requirements). Vitest suite total: 10 files / 159 tests.

**Verification:**
- `pnpm test` clean (159 tests).
- `pnpm --filter northgate-leads lint` clean (two upstream shadcn lint patterns suppressed inline: `Math.random` in skeleton width memo, `setState` in matchMedia effect — both intentional).
- `pnpm --filter northgate-leads build` clean. Routes: `/`, `/api/health`, `/auth/{callback,forgot-password,reset-password,setup-password,signout}`, `/leads`, `/login`, `/users`, `/_not-found`. All `(auth)/` group paths resolve to their stripped URLs as expected.
- NP + Heritage lint unchanged (only the pre-existing 1 RHF warning each).
- `supabase db diff --linked` clean (no migrations).

**Decisions locked** (full table in plan file):
- Two helpers: `requireAdmin` (page redirect) + `assertAdmin` (action throw)
- Schema-only lowercasing via Zod transform
- `<Suspense fallback={null}>` around `useSearchParams()` on `/login`; server-side `searchParams` props on `/leads`
- JS-side cleanup branch (no SECURITY DEFINER RPC for v0.2)
- Active/inactive toggle deferred to v0.3
- Cleanup log prefix `[invite-cleanup]` (hyphen — searchable)

**Open follow-ups:**
- Lead detail page (`/leads/[id]`) → v0.3 platform.
- Active/inactive toggle in `/users` → small follow-up (one server action + Switch).
- Account / profile page → when a user wants to update license_states.
- Migrate `agents.platform_user_id` to `ON DELETE CASCADE` if any other delete path emerges.
- Migrate `inviteUser` cleanup branch to a SECURITY DEFINER RPC if production hits the rollback branch >0 times.
- Auth-model decision-log entry (Plan 3 magic-link → invite-then-password) — fold into the next docs pass alongside other Plan 3/4 doc updates.
- Verify `auth.admin.deleteUser` against current Supabase JS docs at the next dependency bump (currently relied on per the same Admin API surface as `test-platform-rls.ts`).

**Branch:** `shadcn-refactor` off `main` (Plan 3's `add-agent-platform` merged via PR #7 first per Plan 4 Decision #21).

---

## 2026-05-04 — Plan 3: Agent platform v0.1 + role-aware RLS

Plan 3 per the architect-approved plan at `.claude/plans/reviewing-the-plan-as-dazzling-bumblebee.md`. Phase 2 begins. Scaffolds `apps/northgate-leads/` (third Next.js app, magic-link auth, cross-brand leads table with filters + pagination), introduces a `platform_users` table to hold all auth-bearing principals (agent / admin / superadmin), and replaces the original tight `leads_select_agent` RLS with role-aware policies. NP + Heritage runtime unchanged. **First time the `authenticated` role gets any grants on the schema** — verified via mandatory grants-vs-RLS test per AGENTS.md § 6.

**Schema changes** (one atomic migration `20260504120000_add_platform_users_and_role_aware_rls.sql`):
- New `platform_users` table: `(id uuid pk, email text unique check (email = lower(email)), role text check (role in ('agent', 'admin', 'superadmin')), active boolean default true, created_at)`. Email lowercase enforced at the schema layer (CHECK constraint) — load-bearing defense against silent-failure case-mismatch in RLS policies.
- `agents` modified: added `platform_user_id uuid references platform_users(id) unique not null` FK, backfilled from existing `agents.email` (lowercased on insert to satisfy `platform_users` CHECK), then dropped `agents.email` and `agents.active` (single source of truth: `platform_users`).
- New `current_platform_user()` SECURITY DEFINER function returning `(id, role, active, agent_id)` — looks up the JWT email's role + linked agent_id without recursing into the same RLS policies that would call it. `set search_path = public` is load-bearing protection against search-path injection on SECURITY DEFINER. `auth.jwt()` wrapped in `(select ...)` for InitPlan execution. Used by both the RLS policies AND the platform's `getPlatformUser()` helper at page load (single source of truth for email→role mapping).
- Dropped existing policies: `leads_select_agent`, `leads_update_agent` (UPDATE is v0.2 territory), `agents_select_own`.
- Created three role-aware RLS policies — flat shape via `current_platform_user()` (no nested `exists` against the same table → no Postgres 42P17 recursion):
  - `platform_users_select_own_or_admin` — own row by email match (NO active check on this branch by design — avoids "magic link works but my profile is empty" mystery for deactivated users); admin/superadmin sees all.
  - `agents_select_own_or_admin` — agent reads own row via platform_user_id match; admin/superadmin reads all (so agent-filter dropdown can populate).
  - `leads_select_role_scoped` — admin/superadmin sees all leads; agent sees only `agent_id = their.agents.id`. Both branches active-gated.
- Grants: `grant select on platform_users + leads + agents to authenticated`. No INSERT/UPDATE/DELETE — v0.1 platform is read-only. `service_role` grants unchanged (consumer apps' `/api/leads` continues bypassing RLS). `grant execute on function current_platform_user() to authenticated`.
- Naming: policies renamed to reflect role-aware behavior (`leads_select_role_scoped`, etc.) — old `_agent` names no longer fit.

**App code changes** (workspace + new app):
- New `apps/northgate-leads/` Next.js app (~22 files): chassis (eslint, tsconfig, next.config, postcss, package.json, vercel.json, public/platform-logo.svg, favicon, .env.local, middleware.ts), 7 routes (`/`, `/login`, `/leads`, `/auth/callback`, `/auth/signout`, `/api/health`, error boundary), 5 components (`lead-table`, `filter-bar`, `pagination`, `sign-out-button`, `badge`), Supabase clients (`server.ts`, `browser.ts`, `middleware.ts`), `auth/get-platform-user.ts` (RPC to `current_platform_user`), `lib/leads-query.ts` (pure builder), `lib/url-params.ts` (pure helpers), tests for both.
- `apps/northgate-leads/package.json` adds `@supabase/ssr` + `@supabase/supabase-js` deps. Pinned `dev` script to `--port 3002`.
- `packages/shared/types/database.ts` regenerated via `pnpm gen:types` — picked up new `platform_users` table + dropped `agents.email`/`active` + new `current_platform_user` function. NP + Heritage `LeadInsertInput` doesn't reference any of these; consumer apps unchanged.
- Root devDeps: `jsonwebtoken` + `@types/jsonwebtoken` added for `scripts/test-platform-rls.ts` (signs JWTs locally to exercise authenticated RLS contexts).

**Decisions locked** (from the plan; full ~25 in plan file):
- Shared `mpl-dev` Supabase project (architecturally baked in since Plan 1).
- Magic link auth, invite-only via admin pre-provisioning. Same flow for ALL roles.
- Three role tiers from day one (`agent` / `admin` / `superadmin`). admin == superadmin in v0.1; superadmin diverges when destructive actions land in v0.X.
- Schema shape: separate `platform_users` table (architect option 2) over role-on-agents (option 1). Cleaner — admin rows aren't required to carry agent-specific fields.
- Filters: brand, product, temperature, date range. Plus agent (admin/superadmin only). NO search/state/score-range — defer until lead volume justifies (v0.3 territory).
- Per-product details rendering: inline switch in `<LeadTable>` for v1; refactor to shared on second use site.
- Visual direction: utilitarian neutral palette (slate/white/blue accent). Brand colors only as in-table badges.
- Vercel project slug: `northgateleads.vercel.app` (matches the Northgate family: `northgateprotection`, `northgateheritage`, `northgateleads`).
- Magic-link email sender: default Supabase Auth — custom SMTP via Resend deferred to follow-up (architect call; configure before pilot agent activation for deliverability).
- Multi-agent guardrail: OBSOLETE — role-aware RLS isolates agents by design.
- RLS policy performance: InitPlan-optimized `(select ...)` wrappers around `auth.jwt()` AND the `exists` subqueries.
- Email case normalization: three-layer defense (CHECK constraint on `platform_users.email` + `lower()` on JWT side in policies + ops-checklist guidance). CHECK is the load-bearing piece.
- Mobile posture: `overflow-x-auto` wrapper for free horizontal scroll. Proper card layout deferred.
- Sequencing: TWO commits on the branch (migration+verification first, then app). Single PR.

**Verification — all PASS:**
- `pnpm --filter northgate-leads lint` clean (0 errors).
- `pnpm --filter northgate-leads build` clean. Route table: 7 dynamic routes (all read session) + middleware. No static routes (auth check at the top of every page).
- `pnpm --filter northgate-protection lint && build` clean — NP runtime unchanged.
- `pnpm --filter northgate-heritage lint && build` clean — Heritage runtime unchanged.
- `pnpm verify-envs` clean — 4 locations × 17 keys (becomes × 18 once user adds `SUPABASE_JWT_SECRET` for the RLS verification script).
- `pnpm test` clean — vitest suite gains `apps/northgate-leads/src/lib/{leads-query,url-params}.test.ts` (~34 new assertions). Total: 9 files / 148 tests / 286ms.
- Migration applied to `mpl-dev` cleanly. Initial attempt failed (drop column ordered before policy drop → SQLSTATE 2BP01); fixed by reordering in the migration file (drop policies between backfill and column-drop). Apply was atomic — no partial state.

**Migration verification (per AGENTS.md § 6, mandatory):** new `scripts/test-platform-rls.ts` (8 assertions, role fixtures: superadmin / admin / agent A + B with their `agents` rows; deterministic test leads). **Critical mechanism:** the existing `test-dispatch-suppression.ts` uses service-role which bypasses RLS — useless for testing RLS. The new script creates real test users via `auth.admin.createUser` (Admin API) and signs them in via `signInWithPassword` on per-user anon clients — Supabase issues real JWTs scoped to each user; queries run under their RLS context. Pattern matches Bookr project's `tests/helpers/users.ts`. Local JWT signing with the Legacy JWT Secret was the initial approach (Plan 3 part 1 first commit) but rejected per architect call: Supabase has flagged the Legacy JWT Secret as legacy in favor of asymmetric RS256/ES256 signing on new projects, so building new code against a deprecation path was the wrong call. The Admin API approach is robust against any future change in JWT signing (asymmetric vs symmetric, key rotation) and stays uniform with Bookr's testing pattern.

8 assertions:
1. Anon SELECT on `platform_users` + `leads` + `agents` → permission denied (no anon grants).
2. Agent A: 1 platform_users row (own), 1 agents row (own), 2 leads (own only).
3. Agent A vs B isolation (no cross-agent reads even with explicit `agent_id` URL param).
4. Admin sees all of each table.
5. Superadmin sees all (functionally identical to admin in v0.1).
6. Inactive A: 1 platform_users row (own — by design per the policy's no-active-check on email branch), 0 agents, 0 leads.
7. Admin INSERT/UPDATE/DELETE on leads → permission denied (no grants).
8. Email case normalization — non-lowercase insert into `platform_users` → CHECK constraint violation.

**Vercel project setup checklist (user-side ops, deferred to user execution):**
1. Vercel dashboard → New Project → import from GitHub.
2. Project name: `northgate-leads` (matches the Northgate consumer-brand naming: `northgate-protection`, `northgate-heritage`, `northgate-leads`).
3. Root Directory: `apps/platform`.
4. Build / Install Commands: defaults (Vercel detects pnpm workspaces).
5. Environment Variables: copy from NP project. Notes: Supabase / Twilio / Resend / Upstash / Meta / AGENT_PHONE_NUMBER copied for env-key parity (platform doesn't read most). `HEALTH_CHECK_SECRET`: ROTATE FRESH (don't reuse NP/Heritage values; one was rotated for local dev — `e3e2958ea56f70f9b319efa626a2a1fb`). Set `NEXT_PUBLIC_SITE_URL=https://northgateleads.vercel.app` after step 6.
6. Deploy. Rename Vercel slug to `northgateleads.vercel.app`. Update `NEXT_PUBLIC_SITE_URL` to match. Trigger redeploy.
7. Supabase Auth setup (one-time per Supabase project): Authentication → URL Configuration → Site URL = platform's prod URL + add `/auth/callback` to Redirect URLs.
8. **Provision yourself as superadmin:** Supabase dashboard → Authentication → Users → Invite (lowercase email). SQL: `insert into platform_users (email, role) values ('you@example.com', 'superadmin');`
9. **Provision the pilot agent** (atomic two-table insert):
   ```sql
   with new_pu as (
     insert into platform_users (email, role)
     values ('agent@example.com', 'agent')
     returning id
   )
   insert into agents (platform_user_id, full_name, license_states)
   select id, 'Agent Name', '{"TX","FL"}'::text[] from new_pu;
   ```
10. **Optional: provision an admin** — same as superadmin but `role='admin'`.
11. Verify: `curl -H "x-health-secret: <PLATFORM_HEALTH_CHECK_SECRET>" https://northgateleads.vercel.app/api/health` → `{"ok":true}`.

**Phase 1 reality check:** if `agent_id` auto-assignment on intake isn't wired, the pilot agent's table is empty. Either (a) backfill `agent_id` on existing leads, (b) wire intake-side assignment as a follow-up, or (c) accept the agent only sees leads created after assignment ships. Captured in AGENTS.md § 9 launch checklist.

**AGENTS.md updates:**
- § 4 repo tree: `apps/northgate-leads/` annotated with "Phase 2 v0.1: Supabase Auth + cross-brand leads table".
- § 4 placement note unchanged (consumer-app-focused; platform doesn't fit the per-product-vs-per-app vs shared dimension).
- § 5 Tests paragraph: updated test count + mention of `test-platform-rls.ts` + JWT-signing mechanism.
- § 6 Schema discipline: added Role-aware RLS pattern note + `platform_users.email` lowercase CHECK note.
- § 6 Operational discipline: 5-place env-var rule grew to **7-place** (root + 3 apps + 3 Vercel projects). Currently 17 keys × 4 locations.
- § 7 What NOT to Build: rephrased "Custom admin dashboard" — the platform IS one now; Studio remains the data-engineer admin UI. Clarified "1-agent pilot" is about *buying* agents, not platform user count.
- § 9 next-task slot: moves back to **Meta Pixel client-side install** (Plan 3 was a pivot; Pixel install resumes its queued position).
- § 9 launch checklist: added platform-specific items (Vercel project setup, custom domain, Supabase Auth custom SMTP via Resend, `agent_id` auto-assignment, platform `HEALTH_CHECK_SECRET` re-rotation).

**Out-of-band notes (Plan 3 carryovers):**
- **Status updates / lead detail page** — playbook 03 § 3.4 v0.1 spec; deferred. Adds detail route, status dropdown, notes textarea, UPDATE grant + role-aware UPDATE policy. v0.2 territory.
- **Superadmin-vs-admin divergence** — destructive actions (delete leads, manage other platform_users, approve refunds) land in v0.X with `role='superadmin'` filter; admin keeps SELECT only.
- **Custom SMTP via Resend** — needed before pilot agent activation. One Supabase Auth dashboard config screen.
- **Search by name/phone/email** (v0.3) — defer until lead volume justifies.
- **Counts strip** (v0.3 — this week's lead count + status breakdown).
- **Refund/replacement workflow** (v0.2).
- **Mobile-optimized layout** — card-style for narrow viewports; defer until phone usage is real.
- **Custom platform domain** — gates on LLC + brand decision.
- **Audit lead detail / consent_log surfacing** — when needed for TCPA dispute response, add `/leads/[id]/audit` page with grants for SELECT on `consent_log` for admin/superadmin.
- **Per-app `.env.local` key parity vs per-app subsets** — Plan 3 keeps full key parity (platform's `.env.local` has 17 keys even though it reads ~4). Future refactor of `pnpm verify-envs` to support per-app key subsets if friction is real.
- **Operator dashboard** (v1.0 territory per playbook) — separate from agent platform; for the team to monitor everything across brands.
- **Per-product lead-row rendering shared module** — when a second use site appears (lead detail page), extract per-product details summary into `packages/shared/rendering/lead-row/<product>.ts`.
- **Rename `agents` table** — naming is slightly stale (post-`platform_users` separation, `agents` is the agent-only sub-table). Rename to e.g., `agent_profiles` if friction is real later. Future cleanup, not Plan 3 scope.

## 2026-05-03 — Plan 2c: Vitest test suite + high-ROI pure-function coverage

Plan 2c per the architect-approved plan at `.claude/plans/reviewing-the-plan-as-dazzling-bumblebee.md`. **Pure local-dev tooling — no production code paths added, no API contracts changed, no schema/migrations.** Adds vitest at the workspace root + 7 test files covering the highest-ROI pure functions across the codebase, ports the existing bespoke dispatcher script to vitest format, and deletes the original. NP runtime unchanged. Heritage runtime unchanged.

**Vitest setup:**
- `vitest@^2.1.9` added as a single root devDep. No new runtime deps. No new app deps.
- `vitest.config.ts` at repo root — auto-discovers `**/*.test.ts` workspace-wide, excludes `node_modules` / `.next` / `dist`. Default `node` environment. `@platform/shared` resolved via alias to `packages/shared/` (mirrors how each app's `next.config.ts` uses `transpilePackages: ["@platform/shared"]` — without the alias vitest would try Node package-export resolution against the raw-`.ts` shipping pattern and fail).
- Root `package.json` gains `"test": "vitest run"` and `"test:watch": "vitest"` scripts.

**7 test files, 114 assertions, ~700ms full-suite runtime:**

| File | Coverage |
|---|---|
| `apps/northgate-protection/src/lib/intent.test.ts` | NP `computeIntentScore` per tier (mortgage_balance × age × smoker × time × engagement) + max-score 90 + `computeTemperature` boundaries (0/49/50/69/70/90). 26 assertions. |
| `apps/northgate-heritage/src/lib/intent.test.ts` | Heritage `computeIntentScore` per FE tier (age 60-75=35, 50-59=25, 76-85=20, else=5; coverage tiers; health flags; engagement) + max-score 90 + `computeTemperature` (intentionally identical thresholds to NP — confirms cross-brand parity). 28 assertions. |
| `packages/shared/utils/phone.test.ts` | `normalizePhone`: 8 valid US variants (E.164 in/out, raw 10/11, parens, dashes, dots, spaces, mixed) + 7 invalid (empty, garbage, too short, non-US UK/FR, missing area code). 15 assertions. |
| `packages/shared/twilio/messages.test.ts` | **Ported** `scripts/test-format-agent-sms-assertion.ts` — 5 dispatcher cases (valid MP, bad-shape MP, valid FE, bad-shape FE, unknown product) → 8 vitest assertions. PLUS `isStopKeyword`: canonical keywords (8) + case-insensitivity (4) + whitespace (2) + non-matches (4). 25 assertions. |
| `packages/shared/validation/details/mortgage_protection.test.ts` | `MortgageProtectionDetailsSchema.safeParse`: valid + 5 rejection cases (missing balance, balance < 50k, balance > 2M, wrong-typed smoker, non-integer balance). 6 assertions. |
| `packages/shared/validation/details/final_expense.test.ts` | `FinalExpenseDetailsSchema.safeParse`: valid + 4 rejection cases + 4 valid beneficiary enum values + invalid enum + wrong-typed health. 10 assertions. |
| `packages/shared/email/templates/__byte_identity.test.ts` | `renderMortgageProtectionWelcomeEmail` + `renderFinalExpenseWelcomeEmail` byte-identity for both subject + body. Mirrors the SMS dispatcher test's protection — catches accidental copy edits to user-facing TCPA-relevant text at test time. 4 assertions. |

**Script migration:**
- `scripts/test-format-agent-sms-assertion.ts` PORTED to `packages/shared/twilio/messages.test.ts` and DELETED. Single source of truth — keeping both would drift.
- `scripts/test-dispatch-suppression.ts` STAYS as a bespoke `tsx` script. It's an integration test (hits Supabase + Twilio APIs, requires `.env.local` loaded, exercises real side effects, slow). Belongs in the "live verification" register, not the "fast unit" register.
- `scripts/verify-envs.ts` STAYS — utility, not a test.

**Decisions locked** (from the plan):
- Vitest as the test runner (vs Jest or `node --test`) — modern default for Next.js/TS workspaces, fast watch, nice assertion API.
- Co-located test files (`<source>.test.ts` next to source) — vs centralized `tests/` dir or `__tests__/` directories.
- Single root `vitest.config.ts` with `@platform/shared` alias — vs per-package configs.
- Pure-function tests only — DB / dispatch / Twilio webhook / `/api/leads` E2E explicitly out of scope.
- No coverage reporting (`@vitest/coverage-v8`), no CI integration (no GitHub Actions), no UI snapshot tests, no mocking infrastructure (`vi.mock`) — all Phase 2 territory.
- No setup needed for `server-only` modules — initial tests don't import any. Punt the `vi.mock("server-only", () => ({}))` pattern until first need.

**Verification — all PASS:**
- `pnpm install` clean (one new devDep).
- `pnpm test` runs the full suite: **7 files / 114 tests / 81ms test-runtime / ~700ms wall-clock**, all PASS.
- `pnpm test:watch` watches and re-runs on file changes.
- `pnpm --filter northgate-protection lint && build` clean — vitest is a devDep, doesn't affect production.
- `pnpm --filter northgate-heritage lint && build` clean.
- `pnpm verify-envs` clean (no env changes).

**Intentional-regression verification (Approach G):**
- Temporarily flipped Heritage's `if (lead.age >= 60 && lead.age <= 75) score += 35;` → `score += 30;`.
- Ran `pnpm test`. Caught by **3 failing tests** with clear locators:
  - `computeIntentScore (Heritage / final_expense) > age tiers > age 60 → 35 pts` — `expected 40 to be 45`.
  - `computeIntentScore (Heritage / final_expense) > age tiers > age 75 → 35 pts` — `expected 40 to be 45`.
  - `computeIntentScore (Heritage / final_expense) > max-score lead hits 90` — `expected 85 to be 90`.
- Reverted the flip. All 114 PASS again. Tests are wired to source, not vacuously passing.

**AGENTS.md updates:**
- § 5 Development Workflow gains a "Tests" paragraph: `pnpm test` for the unit suite, `pnpm test:watch` for the dev loop, what's covered, where test files live, what's NOT covered (integration / CI / coverage / snapshots — Phase 2).
- § 9 next-task slot stays at "Meta Pixel client-side install" (Plan 2c is supporting infra; doesn't shift the next-task slot).

**Out-of-band notes (Plan 2c carryovers):**
- **Phase 2 follow-ups:** GitHub Actions CI to run `pnpm test` on every PR; coverage reporting if it ever feels valuable (probably still skip); UI snapshot tests for the platform's React components if they justify it.
- **Integration test gap (intentional):** `/api/leads`, the dispatch path, the Twilio webhook, and the Supabase RPC are not unit-tested. Live-submission parity protocol covers them. Revisit if Phase 2 introduces more code paths through these.
- **`server-only` mocking pattern (deferred):** when first needed, the standard pattern is `vi.mock("server-only", () => ({}))` in the test file.
- **Test file naming convention:** `<source>.test.ts` co-located. Do NOT use `__tests__/` directories or `tests/` parallel trees — co-location is the established pattern from this plan.

## 2026-05-03 — Heritage UI: apply user-supplied Hearth direction (cream + navy + terracotta)

Follow-up to the Plan 2b commit on the same `scaffold-northgate-heritage` branch. The first Plan 2b commit shipped Heritage with an invented warm-cream + burgundy/gold palette that the user had not approved. User supplied two design screenshots (mobile + desktop) showing the actual Hearth direction — pivots Heritage to:

- **Palette:** warm cream `#EBE0CE` page bg, dark navy `#14253A` foreground/`background-deep`, terracotta `#B85541` accent for CTAs / italic flourishes / breadcrumb dashes / chip bullets / step numerals. Lighter cream `#F4ECDB` for cards. Stone border `#D4C7AC`. Replaces the prior burgundy/gold tokens in `apps/northgate-heritage/src/app/globals.css`.
- **Typography:** Fraunces serif (loaded with both `normal` + `italic` styles in `layout.tsx`) for H1 + section headings + numerals. Geist sans for body, chips, nav, form. The serif italic emphasis pattern (`*settled.*` / `*That's all.*` / `*One agent.*` / `*won't*`) carries the brand voice.
- **Layout:** matches the screenshots — left-content + right-hero side-by-side on desktop, stacked on mobile. Breadcrumb-style label above H1 (`— Final Expense · For Families` with terracotta dash). Terracotta CTA button. Bullet chips on a thin border-top divider. "HOW IT WORKS" section on dark navy with cream text + italic terracotta numerals (01/02/03) + step content. PROMISES section similar (italic terracotta numerals on dark navy band). FAQ with `+` toggle in terracotta.
- **Header:** clean — logo + nav. Removed the top dark compliance band (Form NH-1 strip) that the prior commit had — screenshots show no such band. Mobile shows phone-number CTA on the right.
- **Logos:** rebuilt `public/heritage-logo*.svg` to use NP's arch motif (sibling-brand visual unity) with `HERITAGE` wordmark in dark navy `#14253A` + terracotta `#B85541` for the small-caps brand line. Replaces the placeholder triangle/hearth mark from the first Plan 2b commit.
- **`<HeritageHero>`:** rewritten as a diagonal-stripe cream rectangle + small dark-navy "THE POINT" callout overlay (`If something happens, the costs are covered.`). Matches the screenshot composition. **No longer a placeholder banner** — this IS the design.
- **`NEXT_PUBLIC_HERO_PLACEHOLDER` env var REMOVED** from all 3 `.env.local` files. The new hero is the actual design (intentional editorial composition), not a placeholder gated on a banner. `pnpm verify-envs` now back to 17 keys × 3 locations (was 18 in the prior commit).

**FE copy** (only thing changed from the screenshots' NP text per user direction):
- Breadcrumb: `— Final Expense · For Families` (was `— Mortgage Protection · For Homeowners`).
- H1: `What you leave them, *settled.*` (was `The home you've paid into, *still home.*`).
- Hero body: `Coverage that pays for end-of-life expenses so your family isn't left with the bill. We connect you with one licensed agent in your state — they explain the options, you decide.`
- "THE POINT" callout: `If something happens, the costs are covered.` (was `If something happens, the mortgage still gets paid.`).
- Hero stripe overlay: `Home · Table · Quiet hour` (was `Home · Porch · Golden hour`).
- Step 1 title: `Tell us a few basics` (was `Tell us about your mortgage`); detail: `Six short questions. Coverage, age, beneficiary, the basics.`
- Steps 2 + 3 unchanged (`We match you with an agent`, `They reach out`).
- FAQ: 7 entries (NP has 5). Heritage adds two FE-specific entries: "What is final expense insurance?" + "Do I need a medical exam?".
- All compliance constraints from playbook 02 § 2.3 still cleared (no specific dollar amounts, no fear imagery, no false urgency, no fabricated testimonials, no "guaranteed approval").

**Files modified vs first Plan 2b commit:**
- `apps/northgate-heritage/src/app/globals.css` — palette tokens swapped (burgundy/gold → terracotta on cream + navy).
- `apps/northgate-heritage/src/app/layout.tsx` — Fraunces loaded with `normal` + `italic` (was `italic` only).
- `apps/northgate-heritage/src/app/page.tsx` — full layout rewrite to match screenshot composition + FE copy adapted from screenshot's NP copy.
- `apps/northgate-heritage/src/app/privacy/page.tsx` + `terms/page.tsx` — token swaps `accent-burgundy` → `accent-terracotta`.
- `apps/northgate-heritage/src/components/site-header.tsx` — removed top compliance band; clean logo + nav; mobile phone CTA.
- `apps/northgate-heritage/src/components/site-footer.tsx` — palette swap (burgundy → navy + terracotta).
- `apps/northgate-heritage/src/components/heritage-hero.tsx` — rewrote as diagonal-stripe rect + THE POINT callout. No longer reads `NEXT_PUBLIC_HERO_PLACEHOLDER`.
- `apps/northgate-heritage/src/components/lead-form.tsx` — token swaps `accent-burgundy*` → `accent-terracotta*`; box-shadow color swap to navy.
- `apps/northgate-heritage/public/heritage-logo*.svg` — rebuilt to NP arch + `HERITAGE` wordmark + dark-navy + terracotta.
- `.env.local` (root) + `apps/northgate-protection/.env.local` + `apps/northgate-heritage/.env.local` — removed `NEXT_PUBLIC_HERO_PLACEHOLDER` key.
- `AGENTS.md` § 9 launch checklist — Heritage hero photography goes from "firm SAC blocker" to "intentional editorial choice; real photo optional future enhancement" (mirrors NP's Meridian posture).

**Files orphaned (not removed, harmless):**
- `apps/northgate-heritage/public/hero-placeholder.svg` — no longer referenced. Permission denied on rm; left as dead file. Can be deleted manually.

**Verification — all PASS:**
- Heritage lint clean (1 RHF warning — same pattern as NP, 0 errors).
- Heritage build clean. Route table identical to first Plan 2b commit (4 static + 3 dynamic).
- `pnpm verify-envs` clean — 3 locations × 17 keys (down from 18 after `NEXT_PUBLIC_HERO_PLACEHOLDER` removal).
- Negative-path test (`scripts/test-format-agent-sms-assertion.ts`): unchanged — still 8/8 PASS. The redo touches Heritage UI only; per-product Zod schemas + dispatcher templates are untouched.
- NP unchanged — runtime, route table, SMS body all identical to Plan 2a post-state.

**Why a follow-up commit instead of amending the first Plan 2b commit:** standard practice per AGENTS.md. The first commit shipped a UI direction the user hadn't approved; the follow-up applies the user's actual design. Keeping both commits in history makes the design pivot legible to future readers (and to anyone reading the branch diff before merge). The two commits will land together in the same PR.

## 2026-05-03 — Scaffold apps/northgate-heritage (Plan 2b — Final Expense sibling brand)

Plan 2b of the second-brand sequence per the architect-approved plan at `.claude/plans/reviewing-the-plan-as-dazzling-bumblebee.md`. **Heritage app scaffolded as a sibling Next.js app** (`apps/northgate-heritage/`) sharing infrastructure via `@platform/shared` but with its own UI, copy, env, and (forthcoming) Vercel project. The 4 placeholder files Plan 2a left at `packages/shared/{validation/details, twilio/templates, email/templates}/final_expense.ts` were populated with real implementations. NP unchanged at runtime (only NP-touching change is dev-script port pin from `next dev` to `next dev --port 3000` for symmetric explicitness with Heritage's `--port 3001`).

**Heritage app structure** (`apps/northgate-heritage/`):
- Chassis files mirror NP exactly (eslint, tsconfig, next.config, postcss, package.json, vercel.json). Pinned region `iad1`. `pnpm dev --port 3001` so both apps run simultaneously with deterministic ports.
- Per-app library at `apps/northgate-heritage/src/lib/`:
  - `consent.ts` — Heritage CONSENT_TEXT diverges from NP at the product mention only ("mortgage protection insurance" → "final expense insurance"). Same `v1-draft` form version as NP (both bump together at attorney pass). Module-load assertion enforces LINKED_CONSENT_SUFFIX matching.
  - `intent.ts` — FE-specific scoring per Plan 2b Decision #3 (age + coverage primary, health secondary). Age 60-75 = 35pts (FE peak market), 50-59 = 25, 76-85 = 20. Coverage tiers $25k+/15k+/10k+ = 25/20/15. No major conditions = 15. Non-smoker = 10. Phone+email = 5. Total /90, same temperature thresholds as NP (`hot ≥70 / warm ≥50 / cold <50`) for cross-brand comparability.
  - `validation/lead-schema.ts` — Heritage form schema. 4 product fields (`desired_coverage` $5k-$50k, `is_smoker`, `has_major_health_conditions`, `beneficiary_relationship` enum spouse|child|parent|other) + chassis (age 50-85 narrower than NP's 18-75 — soft FE eligibility filter). Imports primitives from `@platform/shared/validation/common`.
- Pages + chrome at `apps/northgate-heritage/src/`:
  - `app/globals.css` — Hearth color tokens (warm cream + burgundy/gold palette) replacing Meridian's sage/coral. Final values from user's design screenshots; current scaffold uses sensible warm-direction defaults.
  - `app/layout.tsx` — Heritage metadata (title: "Northgate Heritage — Final Expense Insurance Quotes").
  - `app/page.tsx` — Hearth-direction landing page with FE-product CHIPS / PROMISES / FAQ (7 entries; first one defines what FE is) / STEPS. **Compliance checkpoint applied:** copy reviewed against playbook 02 § 2.3 forbidden list (no specific dollar amounts in marketing copy, no fabricated testimonials, no fear imagery, no false urgency, no "guaranteed approval" claims, no specific premium quotes). FE products attract these tropes; the page intentionally stays in the "calm, plain-language, family-warmth" register that Hearth direction is built around.
  - `app/privacy/page.tsx` + `terms/page.tsx` — clones of NP's draft with brand + product mentions swapped (yellow-banner draft posture stays; same `[BRAND NAME PLACEHOLDER]` / `[LLC NAME]` / `[REGISTERED ADDRESS]` markers).
  - `components/site-header.tsx` + `site-footer.tsx` — copies of NP's, adapted for Heritage logo + LLC string + opt-out email (`hello@northgateheritage.com`).
  - `components/lead-form.tsx` — 6-step form, no homeowner gate (FE eligibility is age-based, validated by schema). FE-specific steps: coverage slider, age + smoker, major-health + beneficiary, state + names, contact + best time, consent.
  - `components/heritage-hero.tsx` — placeholder image renderer with dev-only banner gated on `NEXT_PUBLIC_HERO_PLACEHOLDER`. Real Hearth photography is a firm SAC blocker per AGENTS.md § 9.
- API routes at `apps/northgate-heritage/src/app/api/`:
  - `health/route.ts` — verbatim copy of NP's. Header-based secret check + lenient rate limit.
  - `leads/route.ts` — clone of NP's with hardcoded `brand: 'northgate-heritage'`, `product: 'final_expense'`, and `details: { desired_coverage, is_smoker, has_major_health_conditions, beneficiary_relationship }`. Uses Heritage's per-app `computeIntentScore` (FE-shaped). Cross-brand suppression check, DNC check, 30-day duplicate enforcement preserved (a phone that came in via NP within 30 days dedupes here too — `recordDuplicateAttempt` payload now includes `attempted_brand` for cross-brand audit).
  - `twilio/incoming/route.ts` — clone of NP's with `source_brand: 'northgate-heritage'`. Dormant infrastructure today — Heritage shares NP's Twilio number, so Heritage STOPs land on NP's webhook. This handler exists ready to receive once Heritage gets its own Twilio number (gates on second A2P 10DLC paperwork).
- Public assets:
  - `public/heritage-logo.svg` + `heritage-logo-horizontal-{light,dark}.svg` — placeholder Hearth logos using a triangle/hearth mark + warm burgundy/gold tones to visually distinguish from NP's arch + sage/coral. PLACEHOLDER comments at top of each SVG.
  - `public/hero-placeholder.svg` — diagonal-stripe placeholder with explicit "PLACEHOLDER" text. Renders behind the dev-only banner.
  - `src/app/favicon.ico` — copy of NP's for now (user can swap when Heritage favicon exists).

**Plan 2a placeholder population** (4 files):
- `packages/shared/validation/details/final_expense.ts` — `z.object({}).passthrough()` placeholder replaced with real `FinalExpenseDetailsSchema` (4 fields per Heritage's qualifying set). `FinalExpenseDetails` re-export in `packages/shared/types/products.ts` becomes meaningful (already wired via `z.infer<>` in Plan 2a).
- `packages/shared/twilio/templates/final_expense.ts` — throw-placeholder replaced with `formatFinalExpenseSMS`. **`FE LEAD` line-1 prefix** mirrors Plan 2a's `MP LEAD` for symmetry. SMS body lines: lead name + age, state + coverage, health summary (`MAJOR conditions` vs `no major` · smoker/non-smoker), beneficiary, call number, score/90, best time. Same `toLocaleString("en-US")` pattern for the coverage number to avoid the locale-mismatch hydration bug.
- `packages/shared/email/templates/final_expense.ts` — throw-placeholder replaced with `renderFinalExpenseWelcomeEmail`. Mirrors MP's structure (plain text, similar length, `[AGENT NAME PLACEHOLDER]` + `[BRAND NAME PLACEHOLDER]` markers). Subject: "Your final expense quote is on its way, {firstName}".
- `packages/shared/types/products.ts` — no edit needed; the `z.infer<>` re-export Plan 2a wired in becomes meaningful automatically.

**Operational changes:**
- New env var `NEXT_PUBLIC_HERO_PLACEHOLDER` (gates Heritage hero placeholder banner). 5-place rule first exercise: landed in root `.env.local` + NP `.env.local` + Heritage `.env.local` (parity for `pnpm verify-envs`); Vercel-side will land when each project's dashboard is updated.
- Heritage's `HEALTH_CHECK_SECRET` rotated fresh — never reused from NP (cross-project secret reuse trivially leaks if either is compromised). All other Heritage env values match NP per Plan 2b decisions (Supabase + Twilio + Resend + Upstash + Meta + AGENT_PHONE_NUMBER).
- NP's `package.json` `dev` script changed from `next dev` to `next dev --port 3000` for explicit port pinning (symmetric with Heritage's `--port 3001`). Both apps can run simultaneously with deterministic port assignment. Build script unchanged.
- `pnpm verify-envs` now reports 3 locations × 18 keys (was 2 × 17 in Plan 2a).

**Decisions locked** (from the plan + 3 user-confirmed business decisions):
- Heritage app directory: `apps/northgate-heritage/` (sibling to NP).
- FE qualifying field set: lean 5-field set (Plan 2b Decision #2).
- FE intent score model: age + coverage primary, health secondary, /90 scale (Decision #3).
- Heritage Twilio number: reuse NP's; attribution gap documented; second number deferred (Decision #4).
- Per-app chrome copies (`<SiteHeader>`, `<SiteFooter>`, `<LeadForm>`) — re-evaluate after both brands ship + see one design feedback round.
- FE SMS template line-1 prefix: `🔥 NEW HOT FE LEAD` (mirrors `MP LEAD`).
- Heritage CONSENT_TEXT: NP's draft with "mortgage protection insurance" → "final expense insurance"; `v1-draft` form version stays for both brands until joint attorney pass.
- Heritage hero treatment: placeholder + dev-only banner; real photography firm SAC blocker.
- Heritage age range 50-85 (vs NP's 18-75) — soft FE eligibility filter via the chassis age field's Zod min/max.
- Heritage `is_homeowner` gate: NONE.
- Heritage `AGENT_PHONE_NUMBER`: SAME as NP per Phase 1 one-agent commitment (Decision #11).
- Local dev port pinning: Heritage on `--port 3001`, NP on `--port 3000`, both pinned explicitly (Decision #12).
- New env var `NEXT_PUBLIC_HERO_PLACEHOLDER` gates Heritage hero banner (Decision #13).
- NP bundle byte-length post-Plan-2b expected to grow because `@platform/shared` now contains real FE template + schema code (Decision #14). Not a regression.
- `computeTemperature` per-app duplication considered, deferred (4-line function, no abstraction debt). Don't propose extracting it as new work without reading why duplication was chosen.

**Verification — all PASS:**
- **Lint:** Heritage clean (1 RHF warning matching NP's pre-existing pattern, 0 errors). NP clean (same as Plan 2a post-state).
- **Build:** Heritage clean. Route table mirrors NP exactly: 4 static (`/`, `/_not-found`, `/privacy`, `/terms`) + 3 dynamic (`/api/health`, `/api/leads`, `/api/twilio/incoming`). NP build clean (route table identical to Plan 2a post-state).
- **`pnpm verify-envs`:** clean — 3 locations × 18 keys, all match.
- **Negative-path test (`scripts/test-format-agent-sms-assertion.ts`)**: rewritten as the Plan 2b dispatcher-aware version. **5 cases / 8 assertions, all PASS:**
  - Case 1 (valid MP): SMS body byte-identical to expected MP template + `MP LEAD` prefix on line 1.
  - Case 2 (bad-shape MP): throws via MP Zod, error contains lead.id + `mortgage_protection`.
  - Case 3 (valid FE — NEW post-2b): SMS body byte-identical to expected FE template + `FE LEAD` prefix on line 1. **Load-bearing FE-template proof.**
  - Case 4 (bad-shape FE — NEW): throws via FE Zod, error contains lead.id + `final_expense`.
  - Case 5 (unknown product): throws at dispatcher (not template), error contains `auto_insurance` + `formatAgentSMS`.
- **NP regression byte-identity scope (per architect-required clarification):** runtime outputs and DB row shapes are byte-identical to Plan 2a's post-state — `intent_score=80`, `temperature=hot`, SMS body still starts `🔥 NEW HOT MP LEAD`, `consent_text` byte-identical, lead/consent_log/lead_events row shapes unchanged. **Bundle byte-length intentionally not in the parity scope** — `@platform/shared` grew because Plan 2a's ~10-line FE placeholders are now real implementations; NP's runtime never executes the FE branch but the FE code ships in the same bundle. Bundle delta acceptable, flagged not regression.

**Hero placeholder gate (production safety check):**
- Local dev with `NEXT_PUBLIC_HERO_PLACEHOLDER=true` → banner renders (✓ verified visually in next dev).
- Production build with `NEXT_PUBLIC_HERO_PLACEHOLDER` UNSET → banner does NOT render. The browser-side env var is bundled at build time, so the production build with the var unset is the actual safety check. Heritage's `.env.local` ships with `=true`; Heritage's Vercel project will have it UNSET in production env (per the Vercel checklist below).

**Heritage Vercel project setup checklist** (user-side ops, deferred to user execution):

1. Vercel dashboard → Add New → Project → import from GitHub (existing repo, SCSimonovski/landing-page).
2. Project name: `northgate-heritage` (matches the apps/ subdirectory).
3. Framework Preset: Next.js (auto-detected).
4. Root Directory: `apps/northgate-heritage`.
5. Build Command: leave default (Vercel detects pnpm workspaces) OR set explicitly to `cd ../.. && pnpm install --frozen-lockfile && pnpm --filter northgate-heritage build`.
6. Output Directory: leave default (`.next`).
7. Install Command: leave Vercel's default (`pnpm install --frozen-lockfile`).
8. Environment Variables: copy from NP's project, paste here. 18 keys total (matches `pnpm verify-envs` count). Notes:
   - Supabase keys: SAME as NP (shared `mpl-dev` project).
   - Twilio (account_sid + auth_token + from_number): SAME as NP per Decision #4.
   - Resend, Upstash: SAME.
   - `AGENT_PHONE_NUMBER`: SAME as NP per Decision #11.
   - Meta keys: empty for now (Pixel install hasn't shipped — next-task slot).
   - `HEALTH_CHECK_SECRET`: ROTATE FRESH — DO NOT reuse NP's. Use `node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"` to generate.
   - `NEXT_PUBLIC_SITE_URL`: set to `https://northgateheritage.vercel.app` (after step 9).
   - `NEXT_PUBLIC_HERO_PLACEHOLDER`: **leave UNSET in production env.** Setting it would render the placeholder banner in prod ads (firm SAC blocker safety check).
9. Deploy. Auto-generated slug appears (e.g., `northgate-heritage-abc123.vercel.app`). Rename in Project Settings → Domains to: `northgateheritage.vercel.app`.
10. Update `NEXT_PUBLIC_SITE_URL` env to the renamed URL. Trigger a redeploy (Vercel does NOT auto-redeploy on env-var changes).
11. Twilio dashboard: confirm STOP webhook still points at NP's URL. Heritage doesn't need its own STOP webhook because Heritage shares NP's number — STOPs hit NP's handler regardless of which brand sent the SMS. Documented attribution gap stands.
12. Verify deploy: `curl -H "x-health-secret: <HERITAGE_HEALTH_CHECK_SECRET>" https://northgateheritage.vercel.app/api/health` → expect `{"ok":true}`.

**Live submission verification (deferred to user when convenient):** the load-bearing FE template proofs are mechanical (byte-identity in the negative-path test). A live FE submission via `pnpm --filter northgate-heritage dev` (port 3001) confirms the full intake → DB → dispatch chain works end-to-end with `brand='northgate-heritage'`, `product='final_expense'`, FE-shaped `details` JSONB, and the FE intent score model. Deterministic test inputs: age=65, desired_coverage=$15k, is_smoker=false, has_major_health_conditions=false, beneficiary_relationship=spouse, state=TX, best_time_to_call=morning → expected `intent_score=85` (35 + 20 + 15 + 10 + 5), `temperature=hot`, SMS body starts `🔥 NEW HOT FE LEAD`. Outbound SMS still A2P-blocked at the carrier (same gate as NP).

**Out-of-band notes (carryovers + Plan 2c surfacings):**
- **`computeTemperature` shared promotion considered, deferred.** Both NP's and Heritage's `computeTemperature` are 4 lines, identical. Could be promoted to `@platform/shared/utils/temperature.ts` if a third use site lands. Don't propose extracting as new work without reading this why.
- **Heritage age range 50-85.** Real form-validation difference vs NP's 18-75. Acceptable for engineering verification; if Heritage ever goes commercial, a "you don't qualify yet, here's a calendar reminder for when you turn 50" flow might be worth adding. Out of scope for Phase 1.
- **Operational reality post-Plan-2b:** adding any new env var (e.g., a future `META_PIXEL_ID` for Heritage) is now a 5-place change (root + 2 apps' `.env.local` + 2 Vercel project dashboards). `pnpm verify-envs` catches local-side drift; Vercel-side stays manual.
- **Plan 2c possibility (don't bundle into Plan 2b's PR):** if real-world Heritage operation surfaces structural decisions worth pinning (shared chrome extraction once both brands stabilize, intent.ts parameterization, computeTemperature promotion), capture as a Plan 2c proposal in CHANGELOG carryover. Don't refactor Plan 2b retroactively.

**Heritage hero photography blocker:** firm SAC blocker. Heritage cannot run paid ads with the placeholder banner rendering. Tracked in AGENTS.md § 9 launch checklist.

AGENTS.md updated: § 4 repo tree replaces `<future second brand>/` with `northgate-heritage/`; § 4 placement note refreshed for Heritage live (no more "Heritage will have its own copies in Plan 2b"); § 6 Operational discipline drops the "post-Plan-2b" qualifier from the 5-place env-var rule; § 9 next-task slot moves to "Meta Pixel client-side install"; § 9 launch checklist updates Heritage hero photography from "firm SAC blocker" gate to active blocker, adds Heritage A2P 10DLC second number deferred line, adds Heritage `AGENT_PHONE_NUMBER` Phase 1 commitment context.

## 2026-05-03 — Per-product template + per-app library refactors (Plan 2a)

Plan 2a of the second-brand sequence per the architect-approved plan at `.claude/plans/reviewing-the-plan-as-dazzling-bumblebee.md`. **Pure refactors — no Heritage app, no second brand populated in DB, no schema changes.** Closes the two CHANGELOG follow-ups Plan 1 flagged (`formatAgentSMS` runtime guard → per-product Zod parsing; `consent.ts`/`intent.ts` per-app extraction) plus a third refactor that surfaced during design (common validation primitives extraction). Plan 2b (apps/northgate-heritage scaffold) was split out for blast-radius isolation per architect override of the original Plan 2 scope.

**Per-product template + email split** (architect's first ask):
- `packages/shared/validation/details/{mortgage_protection,final_expense}.ts` (NEW): per-product Zod schemas as the single canonical source of truth for `details` JSONB shape — used by both form-side validation (per-app, eventually) AND template-side parsers (shared dispatchers). FE schema is a `z.object({}).passthrough()` placeholder; Plan 2b populates it.
- `packages/shared/twilio/templates/{mortgage_protection,final_expense}.ts` (NEW): MP template extracted from the old `formatAgentSMS` body; replaces Plan 1's hand-rolled `isMortgageProtectionDetails` type guard with `MortgageProtectionDetailsSchema.safeParse()`. FE template throws `Plan 2b will populate this template` placeholder.
- `packages/shared/email/templates/{mortgage_protection,final_expense}.ts` (NEW): same pattern. MP welcome-email body extracted verbatim; FE placeholder.
- `packages/shared/twilio/messages.ts` + `packages/shared/email/welcome.ts` (REFACTORED): both files become dispatchers — switch on `lead.product`, route to per-product template, throw with descriptive error on unknown product. The `STOP_KEYWORDS` set + `isStopKeyword` helper stay in `messages.ts` as brand-agnostic Twilio webhook utilities. `sendWelcomeEmail()` orchestration (suppressions check, Resend call, `recordEmailSent`, error handling) unchanged.
- `packages/shared/types/products.ts` (REFACTORED): `MortgageProtectionDetails` interface is now `z.infer<typeof MortgageProtectionDetailsSchema>` re-export. Single source of truth — no hand-maintained drift between interface and Zod schema.

**Per-app `consent.ts` + `intent.ts` extraction** (architect's second ask):
- `apps/northgate-protection/src/lib/consent.ts` (MOVED from `packages/shared/utils/consent.ts`). `CONSENT_TEXT` references "mortgage protection insurance" — brand-specific, doesn't belong in shared. Module-load assertion (`endsWith(LINKED_CONSENT_SUFFIX)`) re-runs from new file location.
- `apps/northgate-protection/src/lib/intent.ts` (MOVED from `packages/shared/utils/intent.ts`). `computeIntentScore` weights `mortgage_balance` + `is_smoker` + form-shaped flat input — no abstraction to share with Heritage's eventual FE-shaped score. Per-app placement was the architect-flagged option from Plan 1.
- `packages/shared/utils/` keeps only brand-agnostic helpers: `phone.ts`, `rate-limit.ts`.

**Common validation extraction** (third refactor, surfaced during Plan 2 design):
- `packages/shared/validation/common.ts` (NEW): `US_STATES`, `US_STATE_NAMES`, `TIME_OF_DAY`, `phoneSchema`, `emailSchema`, `firstNameSchema`, `lastNameSchema` — brand-agnostic Zod primitives both apps will reuse.
- `apps/northgate-protection/src/lib/validation/lead-schema.ts` (MOVED from `packages/shared/validation/lead-schema.ts`). The form-shaped MP schema is brand-specific. Refactored to import primitives from `@platform/shared/validation/common`. Re-exports `US_STATES` + `US_STATE_NAMES` for the form component.
- `apps/northgate-protection/package.json` gains `zod` as a direct dep (the moved schema needs it; previously transitive via `@platform/shared`).

**`pnpm verify-envs` script + 5-place env-var rule** (architect's operational additions):
- `scripts/verify-envs.ts` (NEW): reads root `.env.local` + each `apps/<app>/.env.local`, parses keys (ignores values — those legitimately differ per environment), reports drift if any location is missing keys present elsewhere. Read-only, exits 0 on match, non-zero with diff on drift. Wired into root `package.json` as `pnpm verify-envs` (added `tsx` as root devDep).
- AGENTS.md § 6 gains an "Operational discipline" section with the **5-place env-var update rule** (root + each app's `.env.local` + each Vercel project's dashboard). Pre-Plan-2b this is effectively 3-place (root + NP + NP-Vercel); rule grows when Heritage's `.env.local` and Vercel project land.
- AGENTS.md § 4 + § 6 updated to reflect post-Plan-2a reality (per-app vs per-product vs shared placement, Zod-as-single-source-of-truth pattern).

**`packages/shared/package.json` `exports` field** (REFACTORED): removed orphaned (`./validation/lead-schema`, `./utils/consent`, `./utils/intent`); added new (`./validation/common`, `./validation/details/{mortgage_protection,final_expense}`, `./twilio/templates/{mortgage_protection,final_expense}`, `./email/templates/{mortgage_protection,final_expense}`, `./types/products`).

**Decisions locked** (from the plan):
- Plan 2a + 2b split (architect-required) — refactors land first under independent verification, Heritage app scaffold is a separate plan.
- Per-product Zod schemas in `packages/shared/validation/details/` (not per-app) — single canonical source for `details` JSONB shape, used by form-side AND template-side.
- `MortgageProtectionDetails` interface derived via `z.infer<>`, not hand-maintained.
- `consent.ts` + `intent.ts` placement per-app, not parameterized in shared.
- `lead-schema.ts` placement per-app, with shared primitives in `validation/common.ts`.
- **NP SMS template line-1 changed: `🔥 NEW HOT LEAD` → `🔥 NEW HOT MP LEAD`.** Intentional one-line content change for symmetry with Heritage's eventual `FE LEAD` prefix. Tells the agent which product the lead is for at a glance. Parity check #1 explicitly accepted this single-line diff.
- Email template content for NP unchanged (byte-identical).

**Architect-required parity verification — all PASS:**
- **Parity check #1 (Step 1, post-template-split):** Submitted lead `92cb2eb1` via local dev with deterministic input set matching Plan 1's baseline. SMS body byte-comparison: line 1 reads `🔥 NEW HOT MP LEAD` (was `🔥 NEW HOT LEAD` — intentional +3 bytes); every other line byte-identical. Verified via Twilio API by SID. Email body: byte-identical (no email change for NP).
- **Parity check #2 (Step 2, post-consent.ts move):** Submitted lead `2a8b66b9`. `consent_text` byte-identical to baseline (file move only, content unchanged). Module-load assertion `endsWith(LINKED_CONSENT_SUFFIX)` still fires from new location. Form still renders the linked consent paragraph correctly.
- **Parity check #3 (Step 3, post-lead-schema move):** Submitted lead `f3a7e5cd`. Form validation accepts the same input set the same way. `intent_score=80`, `temperature=hot`, `consent_text` byte-identical. Zod refinements (phone E.164, US state, etc.) imported from `validation/common.ts` produce identical validation behavior.

**Negative-path verification (Step 6):** rewrote `scripts/test-format-agent-sms-assertion.ts` as the dispatcher-aware replacement. Exercises 4 cases: (1) valid MP lead → produces SMS with `MP LEAD` prefix + correct balance formatting; (2) MP lead with bad-shape details (missing `mortgage_balance`) → throws via Zod parse inside MP template, error names lead id + product; (3) FE lead → throws Plan-2b placeholder error from `formatFinalExpenseSMS`; (4) unknown product (`'auto_insurance'`) → dispatcher throws with descriptive "add a template at packages/shared/twilio/templates/<product>.ts" error. All 6 assertions PASS.

**Build + lint:** clean. 1 pre-existing RHF warning, 0 errors. Route table identical to Plan 1's post-state (4 static + 3 dynamic — `/`, `/_not-found`, `/privacy`, `/terms` static; `/api/health`, `/api/leads`, `/api/twilio/incoming` dynamic). `pnpm verify-envs` clean (17 keys both locations match).

**Bundle parity:** consent text content unchanged (CONSENT_TEXT constant moved files but stayed byte-identical), so chunk content for the form is functionally identical — verified via parity check #2 (live-form `consent_text` byte-identical at the DB write). Exact chunk byte-length not captured cleanly because an IDE/extension process kept spawning parallel `next build` invocations during inspection; the load-bearing parity proof is the runtime check, not the static chunk.

**Cleanup:** Deleted `scratch/pre-migration-backup.sql` + `scratch/pre-migration-data.sql` (Plan 1 backups, ≥24h post-merge soak elapsed; rollback procedure remains in the migration file's header comment).

**Twilio attribution gap (carryover note for Plan 2b — set the framing now):** Plan 2b will introduce Heritage as a sibling brand sharing NP's Twilio number. All STOPs from any brand land on NP's `/api/twilio/incoming` and get `source_brand='northgate-protection'`. **This is a known compliance imprecision, not a bug.** Suppression *enforcement* stays cross-brand (correct — `isSuppressed(phone)` queries by phone alone, ignores brand); but the *attribution* on the suppression row is unreliable for "which brand's SMS triggered this user's STOP." If a TCPA dispute ever asks that question, the answer comes from Twilio's API message log (which records the from-number + timestamp authoritatively), NOT from `suppressions.source_brand`. Resolves only when a separate Twilio number is provisioned for Heritage (gates on a separate A2P 10DLC application for the second number).

**Flag for Plan 2b (Heritage app scaffold):**
- Scaffold `apps/northgate-heritage/` mirroring `apps/northgate-protection/` structure (sibling brand, sharing `@platform/shared`).
- Hearth visual direction (design templates from prior Northgate brand pass, repurposed for sibling brand).
- Populate FE-specific files: `apps/northgate-heritage/src/lib/{consent.ts, intent.ts, validation/lead-schema.ts}` plus the 4 placeholder shared files Plan 2a left at `packages/shared/{validation/details, twilio/templates, email/templates}/final_expense.ts`.
- New Vercel project for Heritage. Activates the 5-place env-var rule (root + NP + Heritage `.env.local`s + 2 Vercel project dashboards).
- Heritage launch checklist: real hero photography is a **firm blocker** for SAC submission (not a watch-item like NP's brand-mark fallback) — Hearth direction reads as "design unfinished" without photos.

AGENTS.md updated: § 4 (per-app vs per-product vs shared placement note replaces the old "consent.ts/intent.ts are mortgage-specific" caveat); § 6 Schema discipline gains a per-product Zod schemas bullet + new "Operational discipline" section with the 5-place env-var rule + `pnpm verify-envs` guidance; § 9 next-task slot moves to "Plan 2b: scaffold apps/northgate-heritage/"; § 9 hero-imagery launch-checklist item gains the firm-blocker-for-Heritage carryover note.

## 2026-05-03 — Multi-brand schema migration (brand + product + details JSONB)

Plan 1 of the second-brand sequence per the architect-approved plan at `.claude/plans/reviewing-the-plan-as-dazzling-bumblebee.md`. **Pure schema infrastructure** — no FE app, no second brand populated in DB. The `apps/final-expense/` scaffold is Plan 2.

**Schema changes** (one atomic migration `20260503120000_multi_brand_schema.sql`):
- `leads`: added `brand text NOT NULL`, `product text NOT NULL`, `details jsonb NOT NULL`. Backfilled all existing rows with `brand='northgate-protection'`, `product='mortgage_protection'`, `details=jsonb_build_object('mortgage_balance',...,'is_smoker',...,'is_homeowner',...)`. **Dropped** `mortgage_balance`, `is_smoker`, `is_homeowner` top-level columns. Added `leads_brand_product_idx` composite index for cross-brand queries.
- `consent_log`: added `brand text NOT NULL`, backfilled to `'northgate-protection'`.
- `suppressions`: added `source_brand text` (nullable, informational only — enforcement stays cross-brand via existing `isSuppressed(phone)` query).
- `insert_lead_with_consent(jsonb)` RPC: dropped + recreated with new payload shape (top-level brand/product, details as jsonb, dropped 3 column references). New `created` event_data also includes brand + product for downstream debugging.

**Backfill outcome:** 18/18 existing `leads` rows backfilled cleanly (null_brand=0, null_details=0). 18/18 `consent_log` rows backfilled. Zero NULL values, zero data loss.

**App code changes** (workspace + app):
- `packages/shared/types/products.ts` (NEW): `MortgageProtectionDetails` interface; comments scaffolding `FinalExpenseDetails` for Plan 2.
- `packages/shared/db/leads.ts`: `LeadInsertInput` reshaped (drop 3 flat fields, add `brand`/`product`/`details`).
- `packages/shared/twilio/messages.ts`: `formatAgentSMS` reads `lead.details.mortgage_balance` via cast + **runtime type guard** that throws with descriptive error if details shape is malformed (defense-in-depth against backfill bugs or Plan 2 mis-routing). Plan 2 will replace this with per-product templates routed by `lead.product`.
- `packages/shared/db/suppressions.ts`: `addSuppression()` accepts optional `source_brand` parameter.
- `packages/shared/utils/intent.ts`: comment update only — function signature unchanged because `/api/leads` computes intent score from form input (not from a DB row), so it doesn't need to read from JSONB.
- `apps/northgate-protection/src/app/api/leads/route.ts`: payload assembly now puts `mortgage_balance`/`is_smoker`/`is_homeowner` inside `details: { ... }`, plus hardcoded `brand: 'northgate-protection'`, `product: 'mortgage_protection'`.
- `apps/northgate-protection/src/app/api/twilio/incoming/route.ts`: STOP webhook passes `source_brand: 'northgate-protection'`.

**Decisions locked** (from the plan):
- Brand/product as `text` columns (not enum) — flexibility to add brands without DDL.
- `is_smoker` stays in `details` per-product (not promoted to top-level even though FE will also use it) — cleaner per-product contract.
- No DB-level CHECK constraints on JSONB-derived fields — Zod at the form layer is the source of truth.
- Single atomic migration (not multi-step) — all-or-nothing transactional.
- Cross-brand suppression enforcement preserved — `source_brand` is informational only.
- Cross-brand DNC scrubbing + 30-day phone dedup unchanged.
- `lead_events` does NOT carry `brand` directly — joinable via `lead_id`; the new composite index on `leads(brand, product)` makes cross-brand event queries efficient.

**Architect-required parity verification — all PASS:**
- Pre-migration baseline (lead `4688211f`): intent_score=80, temperature=hot, SMS body 152 chars from Twilio API by SID, Resend `validation_error` on example.com.
- Post-migration baseline (lead `77cc5884`, same deterministic input set except phone): intent_score=80 ✓, temperature=hot ✓, SMS body 152 chars ✓ (only phone differs by 1 char — intentional input change), Resend `validation_error` ✓.
- **SMS body byte-identity verified** via Twilio API fetch. The `formatAgentSMS` cast + runtime assertion produces the same string the pre-migration code did. `DC — mortgage $250,000` rendered identically from `lead.details.mortgage_balance` as it did from `lead.mortgage_balance`.
- All `consent_log` columns byte-identical (consent_text, form_version, ip_address, user_agent, page_url) plus the new `brand` field populated correctly.
- All `lead_events` types in order: `created` → `sms_sent`. `created` event_data adds `brand`+`product` (architect's "modulo new fields" additive part).

**Negative-path verification (Plan 1 Step 7.5, architect-recommended):** ran `scripts/test-format-agent-sms-assertion.ts` which calls `formatAgentSMS` with three malformed details shapes (null details, `{foo: "bar"}`, FE-shaped `{desired_coverage, is_smoker}`). All 3 assertions fired with the expected error message naming the lead id and product. Confirms the runtime guard catches Plan 2 routing mistakes when they happen.

**Bundle parity:** 3 consent-text fragments (`"By checking this box and clicking"`, `"revoke consent at any"`, `"STOP to any text"`) present exactly once in the form chunk. Chunk filename + byte length identical to pre-migration (form code didn't change in this migration).

**Build + lint:** clean. 1 pre-existing RHF warning, 0 errors. Route table identical (4 static + 3 dynamic). `pnpm gen:types` regenerated `packages/shared/types/database.ts` correctly.

**Backups + rollback:**
- `scratch/pre-migration-backup.sql` (schema, 14.5KB) + `scratch/pre-migration-data.sql` (data, 32.5KB, all current rows) preserved before applying migration.
- Inline rollback procedure documented in the migration file's header comment block (re-create columns, back-extract from details JSONB, drop new columns, restore RPC).
- **DO NOT delete `scratch/` until Plan 1 is merged + verified clean for ≥24h on live Vercel.**

**Production-window note:** The migration applied to `mpl-dev` before the merge to `main` lands. Per AGENTS.md § 9, the live Vercel deploy at `northgateprotection.vercel.app` shares `mpl-dev` with the dev environment (no `mpl-prod` yet), so production was in a broken state between "Step 3: migration applied" and "Step 11: PR merged". Window kept short (~2-3h). When `mpl-prod` lands as a separate task, this kind of migration can apply to dev independently of production.

**Flag for Plan 2 (FE app scaffold):**
- `packages/shared/utils/consent.ts` and `packages/shared/utils/intent.ts` are mortgage-protection-specific (CONSENT_TEXT references "mortgage protection insurance", computeIntentScore weights mortgage_balance + smoker). Plan 2 needs to either parameterize these by product or move them to per-app. Already noted in the workspace-lift CHANGELOG; this migration didn't change them.
- `formatAgentSMS` is mortgage-only with a runtime guard. Plan 2 splits this into `packages/shared/twilio/templates/{northgate-protection,final-expense}.ts` and adds a dispatcher routing by `lead.product`.

AGENTS.md updated: § 6 Schema discipline gains a bullet about the multi-brand discriminator pattern + per-product `details` JSONB. § 9 next-task slot moves to "Plan 2: scaffold apps/final-expense/".

## 2026-05-02 — Workspace lift to pnpm workspace (apps/ + packages/shared/)

Pure mechanical refactor per AGENTS.md § 4 + the architect-approved plan at `.claude/plans/reviewing-the-plan-as-dazzling-bumblebee.md`. Repo lifted to a pnpm workspace: current Next.js app moved to `apps/northgate-protection/`, shared infrastructure (db helpers, validation schemas, dispatchers, utilities) extracted to `@platform/shared` at `packages/shared/`. **Zero functional changes, zero schema changes, zero new brand introduced.** Why now: the codebase is small enough that the lift is mechanically simple, and it unblocks both the agent platform (Phase 2) and any second-brand scaffold without coupling those decisions to structural refactor risk.

**Final structure:** `apps/northgate-protection/` (Next app + its config, public/, src/), `packages/shared/` with four-sibling layout (`db/`, `validation/`, `types/`, `twilio/`, `resend/`, `sms/`, `email/`, `utils/`) — vendor adapters (`twilio/`, `resend/`) sit beside business actions (`sms/`, `email/`) so adapters can change independently. The orphan utilities (`consent.ts`, `intent.ts`, `phone.ts`, `rate-limit.ts`) all live in `packages/shared/utils/`.

**Workspace package name `@platform/shared`** (not `@northgate/shared`) — scope reflects the workspace's role as a platform hosting multiple consumer brands + the agent platform, not any single brand.

**Parity verification (architect-required, all passed):**
- DB row diff: pre-lift lead `9d2fd112-...` vs post-lift lead `977303c4-...` with deterministic input set. Every non-id, non-timestamp, non-input field byte-identical: `intent_score=80`, `temperature=hot`, `consent_text` (678 chars verbatim), `form_version=v1-draft`, all flag columns, `lead_events` types in order (`created` → `sms_sent`), event_data shapes. (`email_sent` not exercised in either run because Resend rejects `example.com` with `validation_error` — identical pre/post behavior. Other dispatcher paths byte-identical.)
- Bundle: `00~jq1uzt_99d.js` (311,617 bytes) → `0hs5m_u_6oi~k.js` (311,617 bytes). **Exact byte-length match.** All three consent-text fragments (`"By checking this box and clicking"`, `"revoke consent at any"`, `"STOP to any text"`) present exactly once in both.
- Route table identical: 4 static (`/`, `/_not-found`, `/privacy`, `/terms`), 3 dynamic (`/api/health`, `/api/leads`, `/api/twilio/incoming`).
- `pnpm --filter northgate-protection lint` clean (1 pre-existing RHF warning, 0 errors, 0 new warnings).
- `pnpm --filter northgate-protection build` clean.

**Deviations from the plan worth noting:**
- **`.npmrc` added at repo root** with `public-hoist-pattern[]=*eslint*` and `public-hoist-pattern[]=*next*`. Standard pnpm-monorepo workaround for `eslint-config-next` not being able to resolve its `next` peer-dep from the strict-isolated `.pnpm` store.
- **Dep split corrected mid-execution:** the original plan had `eslint`, `eslint-config-next`, `@types/{node,react,react-dom}`, `tailwindcss`, `@tailwindcss/postcss` at workspace root. They actually belong with the app because `eslint-config-next` peer-deps on `next` (which lives in the app). Final split — root devDeps: `supabase`, `typescript`. App devDeps: eslint chain + `@types/*` + tailwind chain. Shared runtime: vendor SDKs (`@supabase/supabase-js`, `@upstash/{ratelimit,redis}`, `libphonenumber-js`, `resend`, `server-only`, `twilio`, `zod`).
- **`.env.local` exists in two locations** now: repo root (for Supabase CLI, `gen:types`, `scripts/test-dispatch-suppression.ts`, the `set -a; source .env.local` pattern) AND `apps/northgate-protection/.env.local` (for Next dev/build, since Next 16 loads env relative to `next.config.ts` and doesn't walk up to workspace root). **Operational rule: when rotating any secret or adding a new env var, update both copies.** Both gitignored via `.env*`. Long-term — revisit if the count of duplicate env files grows to 3+ apps; potential successors are direnv, a small "sync env to apps" script, or moving to a single canonical location with all tools wired to read from there.
- **`transpilePackages: ["@platform/shared"]`** in `apps/northgate-protection/next.config.ts`. The shared package exports raw `.ts` source (no build step) — Next compiles it on demand. Tradeoff vs adding a tsc/tsup build to shared: `transpilePackages` is simpler for a small workspace; build step is more conventional but adds build orchestration, watch mode, source maps. Per-app transpilation cost will roughly double once `apps/northgate-leads/` lands as a second consumer; not a real concern at our scale. Fallback if lint/build resolution issues surface later: add a tsup build step to shared.
- **`@platform/shared` exports field has 16 entries** (per-file granularity). Easy to maintain now; consider a barrel-export pattern (`./db` re-exports `./db/index.ts`) as a follow-up if every new shared file requires an entry. Not needed now.
- **Windows operational note:** `taskkill //F //PID <pid>` was needed to release file locks on `src/app/` after the `pnpm dev` background process didn't fully die via `TaskStop`. Next dev server child processes don't always propagate signals cleanly on Windows; if a future workspace-restructure operation hits "Permission denied" on `src/`-tree mv operations, that's the cause.
- **Mid-execution snag (caught and fixed):** `git mv src/app apps/northgate-protection/src/app` initially nested as `apps/.../src/app/app/api/...` because my `mkdir -p` had pre-created the destination. Fixed by lifting `app/api` up one level. Final structure correct.

**Compliance impact:** none. Every dispatcher, validation rule, DB helper, and route handler is byte-identical content (only import paths changed). Consent text, suppressions, DNC behavior unchanged. `consent.ts` unchanged. The bundle byte-length identity (311,617 == 311,617) is the strongest possible signal that the dispatcher code paths are the same bytes pre/post.

**Flag for second-brand task (when it lands):** `packages/shared/utils/consent.ts` and `packages/shared/utils/intent.ts` contain mortgage-protection-specific values — `CONSENT_TEXT` references "mortgage protection insurance" verbatim, `computeIntentScore` weights mortgage_balance and smoker status. They live in shared/utils/ today because there is one app. When the second consumer brand lands, re-evaluate placement — they likely move to per-app or get parameterized by product. AGENTS.md § 4 calls this out.

**AGENTS.md updated:** § 4 rewritten to reflect the actual final structure (four-sibling layout, `@platform/shared` package name, `utils/` for the orphans). § 9 next-task slot returned to "Meta Pixel client-side install" per the architect-approved subsequent-tasks ordering.

**Vercel deploy:** lift pushed to feature branch `workspace-lift`. Vercel preview build will fail until the dashboard's Root Directory setting is flipped to `apps/northgate-protection` (the setting is per-project, not per-branch — flip after the feature branch push, before merging to main, so the existing main deployment isn't broken before its own redeploy lands). Preview URL must verify clean (curl `/`, `/api/health` with prod secret, submit a test lead, check DB rows) before merging to main.

## 2026-04-30 — Meridian brand pivot (sage + coral + butter, Geist + Fraunces, brand-mark hero)

Pivots from the navy/cream/Georgia brand pass committed earlier today (`6900c03`) to the Meridian design direction: warm-sage neutrals + coral as singular accent, Geist sans (display + UI) with Fraunces italic for serif accents, and **the arch motif used as decorative imagery instead of photography** — which eliminates the "real hero photo before SAC submission" launch-checklist gate entirely.

The previous brand pass isn't wasted work — the form, deploy infra (`vercel.json`, `/api/health` rate-limit), consent wiring, and compliance scaffolding all carry forward. The visual layer is fully redone.

**No schema changes, no new runtime deps** — `geist` (Vercel's open-source sans) is loaded via `next/font/google` (no install needed; available on Google Fonts). Fraunces same.

**New files:**
- `src/components/northgate-logo.tsx` — inline SVG component with `color`/`muted`/`size` props. Replaces the previous `<Image src="/northgate-logo.svg">` pattern; the inline SVG lets the footer render the wordmark in butter `#F7F3E9` on the dark-ink background without the `brightness-0 invert` hack and without losing the wordmark's typography. The original SVG file at `public/northgate-logo.svg` stays as the canonical asset for OG images / favicon usage.
- `src/components/arch-motif.tsx` — abstracted-arch decorative SVG. Slightly more rounded than the literal logo arch (path uses 50,40 ellipse outer / 36,32 inner). Sized 420px @ 18% opacity behind the hero, 320px @ 12% behind the form. Pure decoration; `aria-hidden`.

**Modified:**
- `src/app/globals.css` — full token swap to Meridian palette. `--background: #EDE8DD` (warm putty), `--background-deep: #E2DCCB`, `--background-card: #F7F3E9` (butter for raised cards), `--foreground: #1F2A28` (very deep forest green-black), `--foreground-soft: #3A4845`, `--muted: #6E6A5C`, `--accent: #1F2A28` (ink stays primary action color), `--accent-hover: #3A4845`, `--accent-sage: #6B8A7A`, `--accent-sage-deep: #4F6B5D` (italic accent text + deep brand voice), `--accent-coral: #E27A5F` (used very sparingly — eyebrow dot, CTA arrow circle, step 1 number bg, "~50s left" indicator dot), `--border: #CFC6B0` (warm rule). Drops `--accent-secondary` (gold-brown) from prior pass — no longer in palette. Font vars switch to `--font-geist` and `--font-fraunces`.
- `src/app/layout.tsx` — replaces system-sans + Georgia with `Geist` + `Fraunces` from `next/font/google`. Geist loads default (latin, swap). Fraunces loads italic-only (`style: ["italic"]`) since the only usage is the italic accents in headlines — keeps the payload tight. `display: "swap"` on both means brief unstyled flash before swap, no FOIT block. Net cost vs prior pass: 2 Google Fonts requests (~80-120KB cached after first paint). Updated `metadata.description` to the new subhead copy.
- `src/components/site-header.tsx` — substantially expanded. Now sticky header with primary nav (`How it works` / `FAQ` anchor links + `Start my quote →` pill button using ink bg + butter text). Mobile-only: hide nav, show "MORTGAGE PROTECTION" small-caps eyebrow on the right. Uses `<NorthgateLogo size="sm">`. Header height is `h-14` mobile / `h-16` desktop.
- `src/app/page.tsx` — full rewrite per Meridian spec. Hero is a single-column copy block (max-w 880) with the arch motif decorating the right side (`hidden sm:block`); headline uses Geist 44/88px with Fraunces italic for "*paid.*" in sage-deep. Pill eyebrow ("An independent service for homeowners") with coral dot. CTA pill (rounded-full, ink bg, butter text) with a small coral arrow circle. Trust chips with checkmark glyphs in a wrap. **How it works** is a 1fr/2fr grid (`lg:grid-cols-[1fr_2fr]`): heading on the left, three rounded-card steps stacked on the right. Each step has a colored number circle: step 1 coral, step 2 sage, step 3 ink (per Meridian spec — distinct color per step is intentional progression). Numbers rendered as Fraunces italic. **Form section** is a 1fr/1.1fr grid: copy left, `<LeadForm>` right. **FAQ** uses rounded card-per-question with `+` expander in a circle (rotates to × on `group-open`). **Footer** is the dark-ink band with butter text; uses `<NorthgateLogo color="#F7F3E9" muted="rgba(247,243,233,0.6)">`. All copy from the design spec verbatim — chips: "Licensed agents · No obligation · One agent, not many · Opt out anytime"; steps: per Meridian; FAQ: 5 finalized Q&A from prior brand brief restyled.
- `src/components/lead-form.tsx` — visual updates only. (1) Form container: `rounded-[20px]`, butter card bg, border, soft layered shadow (`0 1px 0 rgba(31,42,40,0.04), 0 24px 60px -28px rgba(31,42,40,0.18)` per spec). (2) Replaces the single thin progress bar from the prior pass with a header row (Step X / 6 in sage-deep on left, "~50s left" with coral dot on right) + 6-segment progress pills (sage-filled past + present, foreground/10% future). (3) Step 1 (mortgage balance) gets new visual: legend "What's left on your mortgage?" + subhead "A rough number works — slide to the closest amount.", value displayed in an inset rounded card on putty bg with $-prefixed locale-formatted big-display number + uppercase "ESTIMATED BALANCE" subtitle, range slider with `accent-[var(--accent-sage)]` so the native track + thumb pick up the sage. (4) Buttons: `rounded-2xl`, min-height 52px (was 44px). Next button changed to "Continue →" with arrow span. Submit unchanged ("Get my options"). (5) `YesNoButton` selected state uses `text-background-card` (butter) on `bg-accent` (ink), unselected hovers to putty `bg-background`. (6) Native `<select>` element bg switched from `bg-white` to `bg-background` for visual cohesion with the form's butter card surface (input fields are slightly darker than card to give "well" affordance). **Zero changes to label/input pairing or RHF wiring** — same architect rule as the prior pass.

**Compliance — what we did:**
- **"Public-interest service" pill reworded to "An independent service for homeowners"** (architect + dev decision). Original framing implied non-profit/civic posture; we are a for-profit lead-gen connecting consumers with one paid agent. State AGs have been pursuing this kind of framing aggressively. Reword preserves the pill design element + tonality, drops the misleading civic implication.
- **Hero imagery: brand-mark arch instead of photography.** This eliminates the "real hero photo before SAC" launch-checklist gate. Trade-off per playbook 02 Part 2.5 ("real photos beat stock by ~20%; shipping with no photo at all underperforms stock") is acknowledged and accepted: the editorial brand-mark approach reads as intentional design, not missing image. Watch-item post-launch — if SAC/CAC numbers don't justify the editorial choice, swap `<ArchMotif>` for a real photo (one Edit). Not a launch-readiness gate.
- **Compliance grep with broadened stems** (`\bguarantee`, `\bfree\b`, `$\d+`, `risk-free`, `no risk`, `everyone qualifies`, `limited time`, `ends tonight`, `offer ends`, `public-interest`) across `src/`: zero hits. The `public-interest` token added to the grep specifically to verify the rewrite caught all instances; clean.
- **Consent text untouched.** `git diff HEAD -- src/lib/consent.ts` returns zero changes. Bundle substring check: `"By checking this box and clicking"`, `"revoke consent at any"`, `"STOP to any text"` each present exactly once in the form chunk.
- **Geist + Fraunces via `next/font/google`** with `display: "swap"` and `subsets: ["latin"]`. Fraunces loads `style: ["italic"]` only (no regular weight) since italic is the sole usage. Net page-weight cost vs the prior system-sans pass: one extra HTTP/3 request to fonts.googleapis.com + ~80-120KB cached fonts. `next/font` handles preconnect + font-display:swap, so brief unstyled flash before swap rather than FOIT.

**Post-preview iteration (uncommitted, in working tree):**
- **Logo swap to horizontal variants.** Two new SVGs in `public/`: `northgate-logo-horizontal-light.svg` (dark ink on transparent, for cream backgrounds) and `northgate-logo-horizontal-dark.svg` (light text on baked-in ink rect, for dark backgrounds). 360×80 viewBox, more horizontal proportion than the original 320×170 stacked mark. Header uses `-light`, footer uses `-dark`. **Inline `<NorthgateLogo>` component is now unused** — deleted from imports (file remains on disk, unimported, tree-shaken from build; safe to delete in a follow-up commit). The original `public/northgate-logo.svg` stays as the canonical asset for OG/favicon.
- **"~50s left" indicator removed from form** per developer review of preview. Header row simplified to single `Step X / 6` paragraph. Drops the architect-flagged false-urgency footgun.
- **Utility band added above sticky header.** Ink bg + butter text, full-width, non-sticky (scrolls away with page). Left: "Northgate Protection". Right (desktop only, hidden on mobile): "TCPA-compliant intake · Licensed insurance agents". Note on the band copy: my initial proposal included "Licensed agents · 50 states" but the "50 states" claim contradicted FAQ #5 ("If your state isn't currently covered, we'll let you know and won't pass your details on") — corrected to "Licensed insurance agents" (drops the unsubstantiated coverage claim, keeps the institutional credibility signal). State-AG-bait avoided.
- **`/privacy` and `/terms` aligned with Meridian chrome.** Both pages now wrap `<SiteHeader />` (utility band + sticky nav) at top and `<SiteFooter />` (extracted from home into a shared component for the three-page reuse) at bottom. Body typography swapped from generic Tailwind defaults to Meridian: h1 in Geist sans medium with italic Fraunces accent (`Privacy *Policy.*`, `Terms of *Service.*`), h2 sections in Geist sans medium, body in muted Geist with relaxed line-height. Yellow `bg-yellow-50` draft banner replaced with a Meridian-palette equivalent: butter-card bg + `border-accent-coral/30` + coral `<strong>` heading — preserves the "this is draft" warning signal in the sage/coral language. **Zero copy changes** — every `[BRACKETED PLACEHOLDER]` and section's substantive text stays exactly as drafted; only chrome + visual treatment touched. Both pages still classified `○ (Static)` in the route table (prerendered).
- **`<SiteFooter />` extracted** to `src/components/site-footer.tsx`. Inline footer block from home `page.tsx` removed; behavior unchanged. Now reused by home + privacy + terms.
- **Promises / "what we won't do" section added** between hero and how-it-works. Dark ink band, butter text, coral accents (eyebrow + italic "*won't*"), 6-card grid (3 cols desktop / 1 col mobile). Numbered 01-06: No cost to talk · No obligation · Licensed in your state · One agent, not many · About 60 seconds · Opt out anytime. Spec source: Meridian JSX `compliance === "primary"` variant (gated off by default in JSX; user-surfaced via screenshots as desired).
- **FAQ kept** alongside the promises cards (after a brief delete-then-restore round). Final order: Hero → How it works → Form → FAQ → Promises → Footer. The two sections answer overlapping questions in different formats — promises cards are the skim view, FAQ accordions hold the full friendly answers including "If your state isn't currently covered, we'll let you know and won't pass your details on" (FAQ Q5). Nav link to `#faq` restored.
- **Header bumped:** sticky nav height grew from `h-14`/`h-16` to `h-16`/`h-20`; logo from `h-9`/`sm:h-10` to `h-11`/`sm:h-14`. Subtle bottom shadow added (`shadow-[0_1px_3px_rgba(31,42,40,0.06)]`) so the sticky chrome reads as a distinct surface against the cream page bg without a hard rule line. Federal direction uses a hard `border-b`; Meridian leans softer, so shadow over border.
- **Utility band copy** changed by developer to "Form NG-1 · Mortgage Protection Inquiry" (Federal-direction flavor) on the left; right side unchanged. Font size 8px (was 10px).
- **Real-device walkthrough of all 6 form steps + consent text comparison against `src/lib/consent.ts:20-29`** belongs to the post-deploy handoff. Bundle substring check confirms the constant *is present* in the production JS — manual walkthrough confirms what *renders*.
- **iOS Safari sticky-header behavior** during address-bar collapse. Header is now `h-14` mobile (was `h-14` previously, unchanged), but the mobile eyebrow + smaller logo means the visual weight changed; worth re-confirming.
- **Footer description added: "A small service that connects homeowners with licensed insurance agents."** New marketing/tone copy. Compliance-clean (no superlatives, no claims about cost/coverage), but worth the dev's attention since it's the first time we've shipped a tagline-style line publicly.

**Verification packet:**
- `pnpm lint` clean — 1 pre-existing RHF/React-Compiler warning, 0 errors, 0 new warnings.
- `pnpm build` clean. Routes table unchanged: `/`, `/_not-found`, `/privacy`, `/terms`, `/api/health` (ƒ), `/api/leads` (ƒ), `/api/twilio/incoming` (ƒ). `/` remains `○ (Static)`.
- Compliance grep: zero hits.
- `consent.ts` working-tree-vs-HEAD diff: zero changes.
- Bundle substring check: 3 distinct fragments of `CONSENT_TEXT` present in the form chunk exactly once each.

## 2026-04-30 — Northgate Protection brand identity + finalized landing copy

Applies the Northgate Protection brand pass to the landing page: deep-navy + cream + gold-brown palette, Georgia serif headings + system sans body, sticky logo header, polished hero with finalized copy, navy footer band. Drops the `[HEADLINE PLACEHOLDER]` and `[Placeholder answer]` slots that have been on the page since the form/api task; replaces them with the brand-brief copy verbatim. Deletes the testimonials section entirely (no fake testimonials before real customer outcomes). Form internals untouched — visual polish only (progress bar above step counter + button color tokens).

**No schema changes, no new deps, no removed deps** (Inter Google Font import is dropped from `layout.tsx` per brand spec — package was already a dep of `next/font`, no install change).

**New files:**
- `public/northgate-logo.svg` — canonical brand mark. 320×170 viewBox, arch + serif "NORTHGATE" + spaced "PROTECTION" with the brand colors baked in. Lives in `public/` so Next.js serves it directly via `<Image>`.
- `src/components/site-header.tsx` — sticky header (`top-0 z-30 h-14`), cream background with 95% opacity + backdrop-blur (so content scrolling beneath isn't visually jarring), navy bottom border, logo top-left only (no nav menu — single-page site). Server component. Uses `<Image>` with `priority` so the logo lands in the LCP candidate set.

**Modified:**
- `src/app/globals.css` — token swap from generic blue/gray to brand palette. `--background: #F2EBDC` (cream), `--foreground: #102841` (navy), `--accent: #102841` (navy is the primary action color), `--accent-hover: #1B3A5C`, `--accent-secondary: #7A6A4F` (gold-brown, used sparingly), `--border: #D8CFB8` (warm off-cream). New CSS vars `--font-serif: Georgia, "Times New Roman", serif` and `--font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif` registered into Tailwind v4's `@theme inline` so `font-serif` / `font-sans` utilities work. Body `font-family` set explicitly to the sans chain.
- `src/app/layout.tsx` — drops `next/font/google` Inter import (brand brief: "system sans"; an Inter request would contradict the spec and add a render-blocking font fetch). Updates `metadata.title` to `"Northgate Protection — Mortgage Protection Quotes"` and `metadata.description` to the brand subheadline. `<html>` className loses `${inter.variable}`; system sans renders instantly with no FOIT.
- `src/app/page.tsx` — full restructure. New `<SiteHeader />` above `<main>`. Hero is a 2-column grid on `lg+` (`grid-cols-[1.1fr_1fr]`), stacked on mobile; left side has finalized headline ("Keep Your Family In The Home You Built." in serif at `text-4xl` mobile / `text-6xl` desktop, weight 500) + subheadline + navy CTA + trust bar (`Licensed agents · No obligation · 60 seconds`); right side reserves a square aspect-ratio image slot (Option C per brand brief — architectural-detail direction). How-it-works step circles flipped from `bg-accent text-white` to `bg-foreground text-background` for cohesion with the new palette. Form section heading is "Start your quote" (was "Get started"). FAQ has the 5 finalized answers from the brief verbatim, with question type switched to serif. **Testimonials section (lines 98-113 of the prior page.tsx) deleted entirely.** New navy footer band (`bg-foreground text-background`) with logo (inverted via `brightness-0 invert` for cream rendering on the navy band), Privacy/Terms/Contact links, legal entity placeholder line, and the brief's California Privacy Notice short version.
- `src/components/lead-form.tsx` — adds a thin (`h-1`) horizontal progress bar above the existing "Step X of 6" counter. Navy fill on `border-border` (cream-warm) track, animated width transition. ARIA: `role="progressbar"` with `aria-valuemin`/`aria-valuemax`/`aria-valuenow`/`aria-label`. Button color tokens swapped from `text-white` to `text-background` (cream) per brief's "navy fill, cream text" CTA spec; selected `YesNoButton` and Next/Submit/Back buttons all updated. **Zero changes to form labels, input pairing, or field structure** — the existing `<label>FieldName <input/></label>` nested pattern is correctly associated and not in scope per architect review (structural label changes are NOT visual polish).

**Hero image slot — dev-only placeholder, NOT for SAC submission:**
- The right-column image slot reserves a square aspect ratio with a cream-to-darker-cream gradient and an inline SVG of the logo's arch motif at ~15% opacity, centered. Renders without layout shift; visually intentional rather than "broken image."
- **Real photo required before Meta SAC review submission** (per playbook 02 Part 2.5: real photos beat stock by ~20%; shipping with no photo at all underperforms even stock). Tracked in `AGENTS.md` § 9 launch checklist. Sourcing direction: architectural-detail shot (porch column, doorway, mailbox, window detail) — easy to find on Unsplash without looking stock.

**Compliance — what we did:**
- **`--muted` color contrast hardened.** Initial brand pick of `#5C6B7A` over cream `#F2EBDC` measured 4.76:1 — WCAG AA passes (4.5:1 minimum) but borderline. Per architect review, dropped to `#4A5764` which measures ~6.3:1, comfortable margin. Affects all secondary text (subheadline, trust bar, FAQ answers, footer disclosure).
- **Compliance grep stems broadened** to catch standard insurance-copy traps. Final pattern: `\bguarantee` (catches "guaranteed", "guarantees", "guaranteeing"), `\bfree\b` (insurance-context whole-word), `$\d+` (price claims), `risk-free`, `no risk`, `everyone qualifies`, `limited time`, `ends tonight`, `offer ends`. All zero hits across `src/app/page.tsx` + `src/components/`.
- **Consent text untouched.** `git diff HEAD -- src/lib/consent.ts` reports zero changes. Render layer in `lead-form.tsx` (the `.replace(LINKED_CONSENT_SUFFIX, "")` block + linked Privacy/Terms `<Link>` wrapping) was not modified — only the progress-bar block above and the button color classes below it were touched. Bundle check: literal substrings `"By checking this box and clicking"`, `"revoke consent at any"`, `"STOP to any text"` each appear exactly once in the production JS chunk that contains the form.
- **Section dividers (gold-brown decorative line) dropped** per architect: "quiet beats decorative for this brand." Plain section borders only. Easy to add back later if the brand matures and additional ornament feels warranted.
- **Testimonials section deleted, not "left blank with placeholder."** Brief explicitly forbids fake testimonials. The slot existed previously with `[Real testimonials needed before launch]` text — removing the section entirely is cleaner than leaving a placeholder visible to anyone hitting the public URL.
- **California Privacy Notice short version** in footer references the full notice on `/privacy`. Cross-ref consistent — both still pre-attorney-review (yellow-banner draft on `/privacy` is unchanged).
- **Drops Inter Google Font.** No more `https://fonts.googleapis.com/...` request from the page; system fonts render instantly. Mild privacy improvement (no Google fingerprint per page load) and a small payload reduction. Aligns with brand brief's "system sans" spec.

**Compliance — flagged, requires real-device verification post-deploy:**
- **iOS Safari sticky header + address-bar collapse interaction.** The `sticky top-0 h-14` header may overlap content during iOS Safari's address-bar transition in ways devtools 375px mode cannot reproduce. Verification on a real iPhone is the architect-flagged check before merge confidence.
- **Manual consent-checkbox text walkthrough on a real phone.** Diff against `consent.ts` and bundle-substring checks confirm the constant is present, but rendered output equality requires walking through every form step and reading the consent box at step 6 against `src/lib/consent.ts:20-29`. Diff catches *unintended changes*; manual walkthrough catches *render drift*. Both checks belong to launch-readiness, not lint.
- **Hero placeholder is dev/preview only** — see CHANGELOG section above. Real photo gate before SAC.

**Verification packet:**
- `pnpm lint` clean — 1 pre-existing RHF/React-Compiler warning, 0 errors, 0 new warnings (the two `<img>` warnings introduced by the initial header + footer logo pass were resolved by switching to `next/image`).
- `pnpm build` clean. Routes table unchanged: `/`, `/_not-found`, `/privacy`, `/terms`, `/api/health` (ƒ), `/api/leads` (ƒ), `/api/twilio/incoming` (ƒ). `/` remains `○ (Static)` — the brand pass didn't introduce any new server-side dependencies on the home page.
- Compliance grep with broadened stems: zero hits across `src/app/page.tsx` and `src/components/`.
- `consent.ts` working-tree-vs-HEAD diff: zero changes.
- Bundle substring check: 3 distinct fragments of `CONSENT_TEXT` present in the form chunk exactly once each.
- Build output: `pnpm build` finished in ~3.7s; static-page generation completed for 6 pages.

## 2026-04-30 — Vercel hobby deploy (public-URL dev environment, NOT launch)

Ships the app to a public URL: `https://northgateprotection.vercel.app`. Closes the ngrok-blocked Phase-1 gap that has been parking the live STOP webhook test, gives Meta a real URL to verify the eventual Pixel install against, and validates the speed-to-lead network-RTT prediction (Vercel us-east → Supabase us-east replaces the dev-from-Macedonia path). Project name was renamed from the auto-generated `landing-page-blush-chi-49` to `northgateprotection` mid-task; both the Vercel domain and `NEXT_PUBLIC_SITE_URL` were updated, then redeployed.

**Explicitly NOT launch.** Vercel's production env points at `mpl-dev` (the only Supabase project we have); custom domain is deferred (gates on LLC + brand); no `mpl-prod` (free-tier projects pause after 7 days idle, not worth keeping warm pre-launch); no preview-deploy environments yet. Real launch requires `mpl-prod` + LLC + EIN + A2P 10DLC + attorney-reviewed text + custom domain — none of those happen here.

**No schema changes, no new deps.**

**New files:**
- `vercel.json` — region pinned to `iad1` (US East) to co-locate with Supabase + Upstash; explicit `maxDuration: 10` on `/api/leads`. Co-location is **load-bearing for the entire speed-to-lead story** — without the region pin, Vercel routes to whichever edge is closest to the user's geo, adding variable RTT to every Supabase + Upstash call. Verify after any infrastructure change. The explicit `maxDuration` makes the after()-deadline visible in code review rather than relying on Vercel hobby's implicit default.

**Modified:**
- `src/lib/rate-limit.ts` — split into two named limiters with separate Redis prefixes (`leads-api` and `health-api`) so a `/api/leads` burst doesn't lock out `/api/health` probes from the same IP and vice versa. Reuses the same Upstash project. Added `checkHealthRateLimit(ip)` helper, lenient cap (10/IP/hour) appropriate for legitimate uptime monitors that poll on a schedule but cuts off bots probing the endpoint brute-force-style.
- `src/app/api/health/route.ts` — rate-limit check fires BEFORE the `x-health-secret` header gate. Reasoning: by the time an attacker has gotten past the rate limit, they've already received 10 `404`s confirming the route exists, so hiding behind 404 vs 429 buys nothing. Returns `429` after the limit, `404` for missing/wrong header, `200` `{ok:true}` on success, `503` `{ok:false}` on DB failure.

**Vercel env-var configuration (production environment):**
- All `.env.local` values mirrored to Vercel **except**:
  - `SUPABASE_DB_PASSWORD` — CLI-only, never needed at runtime; not set on Vercel.
  - `HEALTH_CHECK_SECRET` — **rotated fresh** for production (NOT a copy of dev's). Reasoning: dev secret has been visible in chat session logs more than once during testing; reusing it on a public endpoint where anyone can probe gives meaningful attack surface to anyone with chat-log access. Standard secret-rotation hygiene on environment promotion.
  - `NEXT_PUBLIC_SITE_URL` — set to `https://northgateprotection.vercel.app` (different from `.env.local`'s `http://localhost:3000`). Affects the welcome email body's privacy link.
  - `META_PIXEL_ID`, `META_CAPI_ACCESS_TOKEN`, `META_TEST_EVENT_CODE` — skipped (Meta integration is the next task; vars get set when Pixel ships).
- Both Production AND Preview environments selected for all vars. Acceptable for the public-URL-dev phase: we have no PR-based preview workflow, and even if a preview fires it'd hit the same `mpl-dev` / Twilio trial / Resend / Upstash. Re-scope when `mpl-prod` exists and previews need isolation.
- Auto-deploy on push to `main` is enabled (Vercel default). Matches the continuous-integration model; deploy gates can be added later if needed.

**Twilio webhook reconfiguration:**
- "A MESSAGE COMES IN" webhook URL on the trial number changed from the unreachable dev `localhost` URL to `https://northgateprotection.vercel.app/api/twilio/incoming` (POST). Signature verification works the same on Vercel because `verify-signature.ts` reconstructs the URL from `x-forwarded-host` + `x-forwarded-proto`, both of which Vercel's edge sets correctly.

**Compliance — what we did:**
- **Rate-limit hardening on `/api/health`** before exposing it to the public internet (per architect review). New 10/IP/hour limiter with its own Redis prefix; doesn't share the bucket with `/api/leads`. Probing the endpoint costs an attacker rate-limit budget; hitting the limit returns 429.
- **`HEALTH_CHECK_SECRET` rotated on environment promotion.** Dev keeps its old value; production gets a fresh one. Standard hygiene for any secret that's been visible in dev logs.
- **CT-log discoverability acknowledged operationally.** Every `*.vercel.app` cert lands in the public Certificate Transparency log within minutes of issuance, so the deploy URL is discoverable from day one regardless of marketing. Rate limits are the per-IP defense; bots rotating IPs will still get some submissions through. mpl-dev getting dropped before launch handles the data-pollution side; weekly junk-volume monitoring is the operational defense (added to launch checklist + flagged for Ops Runbook).
- **Region co-location preserved.** Vercel functions pinned to `iad1`, Supabase project is `us-east-1`, Upstash bucket is `us-east-1`. Same continent, same coast. Verify after any infrastructure change — this is the speed-to-lead story.
- **Secret-handling discipline established.** Per architect review: developer keeps `HEALTH_CHECK_SECRET` locally, never echoed in chat. Curl commands written as templates with `<your-secret>` placeholders for the dev to fill in. We've had two prior near-misses where "low-stakes" secrets got pasted into chat (Upstash dashboard, ngrok authtoken) and the answer each time was "rotate it" — the rule now is cleaner: secrets stay with the developer.

**Compliance — flagged for ongoing awareness:**
- **`mpl-dev` is the database for everything submitted via the Vercel URL.** Every form submission from `northgateprotection.vercel.app` writes to `mpl-dev`. This is the "public-URL dev environment" posture — fine for now, dropped before `mpl-prod` cutover. Any junk lead rows in `mpl-dev` from CT-log scanners are expected and will be cleaned up at cutover.
- **CT-log scanners will find the URL.** Operational expectation, not a fixable thing in this phase. Placeholder `/privacy` + `/terms` content remains publicly accessible until attorney review lands; don't share the URL more broadly than necessary while drafts are live.
- **Twilio dispatches still A2P-blocked at the carrier.** Code path works (Twilio API returns success); messages show `status=undelivered` with the carrier's A2P 10DLC error. Same paperwork-blocked state as dev.
- **Resend emails actually deliver from the Vercel deploy.** `onboarding@resend.dev` is verified at Resend; test submissions on Vercel will send real emails to whatever address is submitted. Same as dev.
- **Welcome email body URLs now point at `https://northgateprotection.vercel.app/privacy`** instead of localhost. Correct behavior for the deployed environment, just worth knowing — links in emails to real recipients now work.
- **Ops Runbook addition for architect to propose:** weekly check on `mpl-dev` junk lead volume during the public-URL-dev phase. Threshold for revisiting CAPTCHA: ~50 junk submissions/week. Phase 1 plan deferred CAPTCHA based on a "not exposed publicly" assumption that no longer holds. Tracked in `AGENTS.md` § 9 launch checklist until the runbook entry lands in `docs/playbook/04_Operations_Runbook.md`.

**Verification packet:**
- `pnpm lint` clean (one pre-existing RHF/React-Compiler warning, not new).
- `pnpm build` clean. Route table includes `/`, `/_not-found`, `/privacy`, `/terms`, `/api/health`, `/api/leads`, `/api/twilio/incoming`.
- All public pages on Vercel return HTTP 200: `/`, `/privacy`, `/terms` (verified with curl against the renamed domain).
- `/api/health` with valid `x-health-secret` header → 200 `{"ok":true}`; without header → 404; 11+ rapid hits from same IP → 429 (rate-limit fires as intended).
- **Live form submission round-trip via Vercel URL:** form submitted, `/api/leads` returned 200, welcome email arrived at the developer's gmail with the correct production URL in the body (`Privacy policy: https://northgateprotection.vercel.app/privacy`). Link clicks load the deployed page.
- **Speed-to-lead on Vercel:** measurement attempted with 3 timed POSTs from the dev box; first two showed the predicted sub-500ms response (down from the dev-mode ~850ms Macedonia → us-east floor), confirming the iad1 co-location prediction. **Third attempt fired the rate-limit (429)** — surfaced explicitly per architect's "pause on weird-but-passing" protocol. Cause is correct production behavior, not a bug: Vercel prepends the real client IP to `x-forwarded-for`, so spoofed-IP load tests from one dev box all share the same per-IP bucket. Note: spoofing IP headers won't work for load testing on Vercel; use distributed runners or temporarily widen the limit when a real load-test session is needed.
- **Live STOP webhook end-to-end test deferred** — Vercel deploy + Twilio webhook reconfiguration completed the infrastructure side; the test itself moves to the next session when verified phone access is available. Tracked in `AGENTS.md` § 9 launch checklist as the now-unblocked-but-pending item.
- **Paranoid view-source on the deployed bundle:** downloaded all 10 JS chunks served from `northgateprotection.vercel.app` (~968KB total) and grepped for env-var name leaks (`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_PASSWORD`, `TWILIO_AUTH_TOKEN`, `TWILIO_ACCOUNT_SID`, `RESEND_API_KEY`, `HEALTH_CHECK_SECRET`, `UPSTASH_REDIS_REST_TOKEN`, `UPSTASH_REDIS_REST_URL`, `META_CAPI_ACCESS_TOKEN`), JWT-shape strings (`eyJ...`), Twilio SID prefixes (`AC...`), Resend key prefixes (`re_...`), generic secret prefixes (`sk_...`), and `process.env` literals. **All searches: zero matches.** No JWTs even though the Supabase anon key is one — confirms no browser-side Supabase client is instantiated (all DB writes go through `/api/leads` server-side). Clean bundle.

## 2026-04-30 — /privacy + /terms pages (placeholder, attorney review pending)

Closes the dangling references that have been on the launch checklist since the form/api task. Every row in `consent_log` captures a `consent_text` that mentions "Privacy Policy" and "Terms" — pages that previously 404'd. Now they resolve, and the form's consent step + welcome email body link to them.

**No schema changes, no new deps.**

**New files:**
- `src/app/privacy/page.tsx` — server component, max-width prose container, prominent yellow `DRAFT — pending attorney review` banner, h1 + 13 sections (who we are, what we collect, third parties, user rights, TCPA opt-out, California Privacy Notice, cookies, retention, children's privacy, international transfers, etc.)
- `src/app/terms/page.tsx` — same shape, 11 sections (service description, acceptable use, user representations, disclaimer, liability, indemnification, governing law, dispute resolution, etc.)

Both pages classified as `○ (Static)` in the build — prerendered, no per-request work.

**Modified:**
- `src/lib/consent.ts` — added `LINKED_CONSENT_SUFFIX` export and a module-load assertion that `CONSENT_TEXT.endsWith(LINKED_CONSENT_SUFFIX)`. Per architect review: defends against the silent failure mode where a future copy edit changes the trailing sentence, the form's `.replace()` no-ops, and the rendered consent shows duplicated content. Throw at import time means the dev server refuses to boot before anyone notices.
- `src/components/lead-form.tsx` — replaced the single `<span>{CONSENT_TEXT}</span>` consent block with a render-layer pattern: strip `LINKED_CONSENT_SUFFIX` from the constant, render the body as plain text, then append the trailing sentence with `<Link>` elements wrapping "Privacy Policy" and "Terms". The constant itself is unchanged — what's stored in `consent_log` remains the literal words the user agreed to (audit-trail integrity).
- `src/lib/email/welcome.ts` — replaced `[link to be added once /privacy ships]` placeholder with `${process.env.NEXT_PUBLIC_SITE_URL}/privacy` (absolute URL because emails have no base). Added a missing-env runtime guard: if `NEXT_PUBLIC_SITE_URL` is unset/blank at dispatch time, skip the send and log without PII rather than render `Privacy policy: undefined/privacy` in the body. Defense-in-depth on top of the existing pre-flight check that the env var is in `.env.local`.

**Placeholder writing discipline:** both pages use bracketed UPPERCASE markers (`[BRAND NAME PLACEHOLDER]`, `[REGISTERED ADDRESS]`, `[RETENTION PERIOD — attorney to specify]`, `[STATE PLACEHOLDER]`, etc.) for every specific claim, commitment, or numerical statement. The yellow draft banner catches "this is unfinished"; the bracket-marker convention catches "this placeholder accidentally makes a claim we'd have to honor." 14 markers in `/privacy`, 12 in `/terms`. Compliance scan against the two files is clean: no `$N`, no "guaranteed", no `\bfree\b`, no "limited time".

**Compliance — what we did:**
- `consent_log` audit-trail dangling references resolve. Form's consent text now has clickable links; emailed welcome includes the absolute privacy URL; both URLs point at real pages. Internally consistent.
- `CONSENT_TEXT` constant unchanged; verified by querying the latest `consent_log` row — `position(' See our Privacy Policy and Terms.' in consent_text) = 645`, `length = 678`, suffix occupies the trailing 34 characters exactly. The render layer change did NOT mutate the stored words.
- Module-load assertion in `consent.ts` is the safety net for the `.replace()` fragility: if anyone edits the constant's trailing sentence without updating `LINKED_CONSENT_SUFFIX`, import-time throw with an actionable error message.
- Welcome email runtime guard: missing-env failure is loud, not silent.

**Compliance — what we did NOT close (still on the launch checklist):**
- Real attorney-reviewed legal text replacing both pages — **important: review all three artifacts together** (`/privacy`, `/terms`, `src/lib/consent.ts` `CONSENT_TEXT`), because they cross-reference each other. ToS § 4 representations interact with the consent text; ToS § 11 Privacy ↔ Privacy § 4 third parties; ToS § 8 governing law ↔ LLC formation state. Single attorney engagement covering all three is cheaper and more coherent than three separate reviews.
- LLC name + registered address (currently `[BRAND NAME PLACEHOLDER]` / `[REGISTERED ADDRESS]` markers throughout — same convention as the consent text and skeleton H1)
- Real "last updated" date once content is finalized
- California Privacy Notice section reviewed against current CCPA requirements (placeholder mentions categories but specifics need attorney pass)
- CAN-SPAM physical address in welcome email body (gates on LLC; consistent with the gap above)
- ToS § 9 dispute resolution: deliberate forum/arbitration/jury-trial-waiver decision (currently a neutral bracket marker that forces attorney to choose, not a default that nudges toward arbitration)
- Privacy § 4 third-party list: add Meta Platforms when Meta CAPI ships (companion edit baked into the eventual Meta CAPI plan; see comment in `src/app/privacy/page.tsx` § 4)

**Verification packet:**
- `pnpm lint` clean (one pre-existing RHF/React-Compiler warning, not new)
- `pnpm build` clean. `/privacy` and `/terms` both classified `○ (Static)` in the route table
- `curl http://localhost:3000/privacy` → HTTP 200; same for `/terms` (previously 404)
- `grep -F "See our Privacy Policy and Terms." src/lib/consent.ts` → constant unchanged
- Compliance scan on new pages: clean (no forbidden tokens)
- Bracket-marker presence: 14 in `/privacy`, 12 in `/terms` (intentionally heavy — a real attorney pass would replace each)
- Live form submission: `consent_log` row stores the literal `CONSENT_TEXT` verbatim (suffix at the right position, length matches); welcome email body via Resend API confirms `Privacy policy: http://localhost:3000/privacy` rendered correctly

## 2026-04-30 — Resend welcome email (parallel dispatch with Twilio)

Ships the welcome email, the second of three notifications dispatched from `/api/leads`. Plain-text per playbook 4.3, sent in parallel with the agent SMS via `Promise.all` inside the existing `after()` callback so neither dispatcher gates on the other's completion.

**Schema (one new migration, applied to `mpl-dev`):**
- `20260430110618_add_email_skip_event_type.sql` — adds `'email_skipped_suppression'` to `lead_event_type`. `'email_sent'` was already in the baseline enum (verified via pre-flight `unnest(enum_range(...))` check before drafting the migration). No DNC variant for email — DNC is a phone-only registry.

**New runtime dep:** `resend` ^6.12.

**New code:**
- `src/lib/resend/client.ts` — server-only `getResendClient()` factory, cached per process (mirrors the Twilio client factory pattern).
- `src/lib/email/welcome.ts` — welcome email template + `sendWelcomeEmail(leadId)` orchestration: `getLeadById` → suppressions re-query → render template with `{firstName}` substitution → `resend.emails.send` → `recordEmailSent`. Catches all errors with no PII (lead id only).
- `src/lib/db/leads.ts` — added `recordEmailSent(leadId, resendId)` and `recordEmailSkipped(leadId)` helpers (parallel to the SMS skip helpers). Single skip variant; no DNC equivalent for email.
- `src/app/api/leads/route.ts` — replaced the single-dispatcher `after()` with `await Promise.all([sendAgentSMS(id), sendWelcomeEmail(id)])`. Parallel because the dispatchers are independent; serial would extend the SMS path's effective deadline by however long Resend takes. Meta CAPI (next plan) slots into the same `Promise.all`.

**Compliance — what we did:**
- **Plain text email (no HTML)** per playbook 4.3 — higher inbox placement, no rendering surprises, privacy-friendlier (no remote image fetches).
- **Suppressions re-query at dispatch time, in code.** Mirrors SMS dispatch — same defense-in-depth for the rare race where an STOP came in via SMS in the milliseconds between intake and email send. Skip → `email_skipped_suppression` event row, no email sent.
- **No PII in logs.** `[email] lead=<id> sent id=<resend-id>` or `[email] lead=<id> skip=suppression`.
- **email_skipped_suppression event row, not just console log.** Same audit-trail rationale as the SMS skip events: refund disputes / compliance audits months later need the queryable history.
- **From-address: `onboarding@resend.dev`** (Resend's pre-verified test sender). Works without owning a domain. For prod, swap `FROM_EMAIL` to `hello@<consumer-domain>` after DKIM/SPF/Return-Path CNAME setup — no LLC needed, just the domain.
- **Subject line emoji-free** for spam-filter friendliness.

**Compliance — flagged for ops awareness (CHANGELOG-tracked, also in launch checklist):**

- **Welcome email + agent SMS are dispatched independently.** Both run in parallel inside the same `after()` callback; neither gates on the other. Failure modes:
  - SMS skipped (DNC/suppression/Twilio error/A2P 10DLC pre-clearance) but email succeeds → user gets "your quote is on its way, an agent will call shortly" but agent never gets the lead → user thinks an agent is calling but no one will. Refund-bait at scale.
  - Email skipped/fails but SMS succeeds → agent gets the lead and calls; user is just missing the welcome email. Annoying, not a compliance issue.
  - Both fail → user gets `/api/leads` 200 (we already returned), no agent notification, no welcome email. Worst case for the user, no compliance issue (no false promise made via outbound channels).
  - Phase 1 acceptance: low volume, manual reconciliation possible. Long-term mitigations: gate email on SMS success (non-trivial coordination layer), or rephrase the welcome so it doesn't promise a call by name. Listed in launch checklist + Operations Runbook (Part 5 area, alongside missing-lead complaints).
- **STOP-via-text is wired; unsubscribe-via-reply is NOT.** The email body says "Reply STOP to any text or 'unsubscribe' here to opt out." STOP via SMS lands in `suppressions` via the Twilio webhook from the prior task. "Unsubscribe" via email reply is non-functional in Phase 1 — we don't process inbound email replies. Phase 1 workaround: monitor the from-address inbox manually; reply means manual `addSuppression` via Studio SQL editor.
- **CAN-SPAM physical address** isn't in the email body. Welcome is transactional (acknowledges a user action), so technically exempt — but include the address for safety once the LLC has a registered address. Launch-checklist item.

**Verification packet:**
- `pnpm lint` clean (one pre-existing RHF/React-Compiler warning, not new)
- `pnpm build` clean. Routes table unchanged (`/api/leads` is still the only intake route)
- Migration diagnostic: `lead_event_type` enum now includes `email_skipped_suppression`; types regenerated
- **Live email round-trip:** form-submitted lead with the developer's gmail received the welcome email at `simonovski132@gmail.com` (subject: "Your mortgage protection quote is on its way, Simon"); Resend API confirms `last_event: delivered`; `lead_events` shows three rows in the right order — `created` → `sms_sent` (Twilio SID `SM9b75...`, carrier-blocked at delivery per A2P 10DLC, expected) → `email_sent` (Resend id `32955f0c-...`), all within ~1.6 seconds of each other. Parallel dispatch confirmed by the timestamps (both completed within 0.3s of each other).
- **Speed-to-lead in dev:** ~840-890ms steady-state, ~1.59s on first compile. Above the plan's 500ms target but **not a regression** from this task — `after()` runs the dispatch outside the response path, so adding email dispatch doesn't affect response time. The dev-mode latency floor is the Macedonia → US-East Supabase + Upstash network RTT (~150-200ms each); production deploys to US-East should hit ~300-400ms.
- **Paranoid grep on `.next/static/`:** `RESEND_API_KEY` (name) absent; 20-char value prefix (silently checked) absent. Resend SDK doesn't leak.

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
