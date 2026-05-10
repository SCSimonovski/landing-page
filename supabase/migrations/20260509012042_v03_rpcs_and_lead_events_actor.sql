-- Plan 5 (Northgate Leads v0.3): row-scoped writes via SECURITY DEFINER RPCs.
--
-- Per the architect-approved plan at .claude/plans/...as-dazzling-bumblebee.md.
--
-- Architectural lock-in: the platform's authenticated role gets ZERO direct
-- INSERT/UPDATE/DELETE grants on leads / platform_users / agents / consent_log
-- / lead_events. All row-scoped writes flow through SECURITY DEFINER RPCs
-- (this migration adds 5). RLS handles row-scoping; RPCs handle column-scoping
-- + atomic audit + role authorization. Plan 3's current_platform_user() is the
-- foundation; this migration extends the pattern.
--
-- Verification per AGENTS.md § 6: scripts/test-platform-rls.ts is extended
-- with ~15 new assertions covering all 5 RPCs + the new consent_log /
-- lead_events SELECT policies + an anti-grant test (agent .from('leads')
-- .update(...) → permission denied).
--
-- ROLLBACK PROCEDURE (if post-migration verification fails):
--   1. revoke execute on functions: update_lead_status, update_lead_notes,
--      assign_lead, set_platform_user_active, update_agent_profile from
--      authenticated;
--   2. drop function public.update_lead_status, update_lead_notes,
--      assign_lead, set_platform_user_active, update_agent_profile;
--   3. drop policy "consent_log_select_role_scoped" on consent_log;
--      drop policy "lead_events_select_role_scoped" on lead_events;
--   4. revoke select on consent_log, lead_events from authenticated;
--   5. alter table lead_events drop column actor_platform_user_id;
--   6. The 'assigned' enum value can't be removed without recreating the
--      enum (Postgres doesn't support drop value). Leave it; harmless.

-- ============================================================
-- A. lead_events.actor_platform_user_id — audit trail of who set what
-- ============================================================
-- Nullable: pre-Plan-5 'created' events written by insert_lead_with_consent
-- have no actor (system-generated). New RPC writes set actor to the caller's
-- platform_users.id.

alter table lead_events
  add column actor_platform_user_id uuid references platform_users(id);

comment on column lead_events.actor_platform_user_id is
  'Who triggered this event. NULL for system events (e.g., the ''created'' event '
  'written by insert_lead_with_consent at lead intake). Set by Plan 5 RPCs '
  '(update_lead_status, update_lead_notes, assign_lead).';

-- ============================================================
-- B. lead_event_type enum: add 'assigned' value
-- ============================================================
-- assign_lead RPC writes events of this type. 'if not exists' makes the
-- migration idempotent. Postgres requires enum-value additions to commit
-- before use in the SAME transaction in some configurations — Supabase's
-- migration runner handles this fine, but if it ever complains, split this
-- one-line ALTER into its own migration file.

alter type lead_event_type add value if not exists 'assigned';

-- ============================================================
-- C. SECURITY DEFINER RPCs — row-scoped writes
-- ============================================================
-- All five follow the same shape:
--   1. Resolve current user via current_platform_user() (rejects if no row
--      or active=false).
--   2. Authorize (varies per RPC — see comments).
--   3. Validate input.
--   4. Atomic update + lead_events insert (where applicable).
--   5. Raise specific exception on failure (errcode 42501 = access denied,
--      22023 = invalid input).
--
-- All set search_path = public (load-bearing protection against search-path
-- injection per AGENTS.md § 6).

-- ------------------------------------------------------------
-- C.1 update_lead_status — agent on own lead OR admin/superadmin
-- ------------------------------------------------------------
create or replace function public.update_lead_status(
  p_lead_id uuid,
  p_new_status lead_status
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user record;
  v_old_status lead_status;
begin
  -- Resolve caller. current_platform_user() returns at most one row.
  select id, role, active, agent_id
    into v_user
    from current_platform_user()
    where active;
  if not found then
    raise exception 'unauthenticated or inactive' using errcode = '42501';
  end if;

  -- Lookup with row-level authorization. If the caller can't see this lead
  -- (RLS would filter them out anyway, but SECURITY DEFINER bypasses RLS,
  -- so we replicate the policy here), the SELECT returns no rows.
  select status into v_old_status
    from leads
    where id = p_lead_id
      and (
        v_user.role in ('admin', 'superadmin')
        or agent_id = v_user.agent_id
      );
  if not found then
    raise exception 'lead not found or access denied' using errcode = '42501';
  end if;

  -- No-op short-circuit (Decision #23).
  if v_old_status = p_new_status then
    return;
  end if;

  update leads set status = p_new_status where id = p_lead_id;

  insert into lead_events (lead_id, event_type, event_data, actor_platform_user_id)
  values (
    p_lead_id,
    'status_change',
    jsonb_build_object('old', v_old_status, 'new', p_new_status),
    v_user.id
  );
end;
$$;

grant execute on function public.update_lead_status(uuid, lead_status) to authenticated;

comment on function public.update_lead_status is
  'Update a lead''s status. Agent can update own assigned leads; admin/superadmin '
  'can update any. Writes a status_change event with actor_platform_user_id set. '
  'No-op when status unchanged.';

-- ------------------------------------------------------------
-- C.2 update_lead_notes — agent on own lead OR admin/superadmin
-- ------------------------------------------------------------
-- Soft-truncate at 1000 chars (Decision #6) — agents pasting from a CRM
-- shouldn't lose data to a hard reject. Toast warning lives on the client
-- side; the RPC silently truncates so the DB always matches what the user
-- intended (modulo the cap).

create or replace function public.update_lead_notes(
  p_lead_id uuid,
  p_notes text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user record;
  v_old_notes text;
  v_new_notes text;
begin
  select id, role, active, agent_id
    into v_user
    from current_platform_user()
    where active;
  if not found then
    raise exception 'unauthenticated or inactive' using errcode = '42501';
  end if;

  select notes into v_old_notes
    from leads
    where id = p_lead_id
      and (
        v_user.role in ('admin', 'superadmin')
        or agent_id = v_user.agent_id
      );
  if not found then
    raise exception 'lead not found or access denied' using errcode = '42501';
  end if;

  -- Soft-truncate at 1000 chars.
  v_new_notes := left(coalesce(p_notes, ''), 1000);

  -- No-op short-circuit (treat NULL old vs empty new as same).
  if coalesce(v_old_notes, '') = v_new_notes then
    return;
  end if;

  update leads set notes = v_new_notes where id = p_lead_id;

  insert into lead_events (lead_id, event_type, event_data, actor_platform_user_id)
  values (
    p_lead_id,
    'note_added',
    jsonb_build_object('note', v_new_notes),
    v_user.id
  );
end;
$$;

grant execute on function public.update_lead_notes(uuid, text) to authenticated;

comment on function public.update_lead_notes is
  'Update a lead''s notes (free-form text, soft-truncated at 1000 chars). Agent '
  'can update own assigned leads; admin/superadmin can update any. Writes a '
  'note_added event with actor_platform_user_id set. No-op when unchanged.';

-- ------------------------------------------------------------
-- C.3 assign_lead — admin/superadmin only
-- ------------------------------------------------------------
-- p_new_agent_id may be NULL (unassign). No-op when current matches.

create or replace function public.assign_lead(
  p_lead_id uuid,
  p_new_agent_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user record;
  v_old_agent_id uuid;
begin
  select id, role, active
    into v_user
    from current_platform_user()
    where active;
  if not found then
    raise exception 'unauthenticated or inactive' using errcode = '42501';
  end if;

  if v_user.role not in ('admin', 'superadmin') then
    raise exception 'admin or superadmin required' using errcode = '42501';
  end if;

  select agent_id into v_old_agent_id
    from leads
    where id = p_lead_id;
  if not found then
    raise exception 'lead not found' using errcode = '42501';
  end if;

  if v_old_agent_id is not distinct from p_new_agent_id then
    return;
  end if;

  -- Validate new_agent_id refers to an existing agents row (or is NULL).
  if p_new_agent_id is not null then
    if not exists (select 1 from agents where id = p_new_agent_id) then
      raise exception 'agent not found' using errcode = '22023';
    end if;
  end if;

  update leads set agent_id = p_new_agent_id where id = p_lead_id;

  insert into lead_events (lead_id, event_type, event_data, actor_platform_user_id)
  values (
    p_lead_id,
    'assigned',
    jsonb_build_object(
      'old_agent_id', v_old_agent_id,
      'new_agent_id', p_new_agent_id
    ),
    v_user.id
  );
end;
$$;

grant execute on function public.assign_lead(uuid, uuid) to authenticated;

comment on function public.assign_lead is
  'Assign or reassign a lead to an agent (admin/superadmin only). p_new_agent_id '
  'may be NULL to unassign. Writes an assigned event with actor_platform_user_id '
  'set. No-op when assignment unchanged.';

-- ------------------------------------------------------------
-- C.4 set_platform_user_active — admin/superadmin only
-- ------------------------------------------------------------
-- Refuses self-deactivation (UX protection: don't let an operator lock
-- themselves out by accident).
--
-- Refuses admin deactivating a superadmin (Decision #7) — first place
-- admin diverges from superadmin per Plan 3 Decision #3. Otherwise admin
-- tier becomes secretly equivalent to superadmin via the deactivation
-- backdoor. Superadmin-on-superadmin is allowed.

create or replace function public.set_platform_user_active(
  p_target_user_id uuid,
  p_new_active boolean
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user record;
  v_target_role text;
begin
  select id, role, active
    into v_user
    from current_platform_user()
    where active;
  if not found then
    raise exception 'unauthenticated or inactive' using errcode = '42501';
  end if;

  if v_user.role not in ('admin', 'superadmin') then
    raise exception 'admin or superadmin required' using errcode = '42501';
  end if;

  if p_target_user_id = v_user.id then
    raise exception 'cannot deactivate yourself' using errcode = '22023';
  end if;

  select role into v_target_role
    from platform_users
    where id = p_target_user_id;
  if not found then
    raise exception 'target user not found' using errcode = '22023';
  end if;

  -- First admin/superadmin divergence (Plan 3 Decision #3).
  if v_user.role = 'admin' and v_target_role = 'superadmin' then
    raise exception 'admin cannot deactivate superadmin' using errcode = '42501';
  end if;

  update platform_users set active = p_new_active where id = p_target_user_id;
end;
$$;

grant execute on function public.set_platform_user_active(uuid, boolean) to authenticated;

comment on function public.set_platform_user_active is
  'Toggle a platform_user''s active flag (admin/superadmin only). Refuses '
  'self-deactivation. Refuses admin-deactivating-superadmin (first '
  'admin/superadmin divergence per Plan 3 Decision #3); '
  'superadmin-on-superadmin is allowed.';

-- ------------------------------------------------------------
-- C.5 update_agent_profile — caller's own agent row only
-- ------------------------------------------------------------
-- Loud failure if caller has no agent row (admin/superadmin) — UI-side
-- gating is convenience, not security. Caller must be role='agent' to
-- have an agents row at all.

create or replace function public.update_agent_profile(
  p_full_name text,
  p_license_states text[]
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user record;
begin
  select id, role, active, agent_id
    into v_user
    from current_platform_user()
    where active;
  if not found then
    raise exception 'unauthenticated or inactive' using errcode = '42501';
  end if;

  if v_user.agent_id is null then
    raise exception 'no agent row for current user' using errcode = '42501';
  end if;

  -- Validation.
  if p_full_name is null or length(trim(p_full_name)) = 0 then
    raise exception 'full_name required' using errcode = '22023';
  end if;
  if p_license_states is null or array_length(p_license_states, 1) is null then
    raise exception 'license_states must be non-empty' using errcode = '22023';
  end if;
  -- Each value must be a valid 2-letter US state code. Cheap regex check;
  -- canonical list lives in @platform/shared/validation/common.ts on the
  -- client side. Defense-in-depth.
  if exists (
    select 1 from unnest(p_license_states) as s
    where s !~ '^[A-Z]{2}$'
  ) then
    raise exception 'license_states contains invalid value' using errcode = '22023';
  end if;

  update agents
    set full_name = trim(p_full_name),
        license_states = p_license_states
    where id = v_user.agent_id;
end;
$$;

grant execute on function public.update_agent_profile(text, text[]) to authenticated;

comment on function public.update_agent_profile is
  'Update the caller''s own agent profile (full_name + license_states). Caller '
  'must have an agents row (role=agent). Loud failure for admin/superadmin '
  '(no agent row) — UI hides the section but RPC defends in depth.';

-- ============================================================
-- D. SELECT grants + role-aware RLS on consent_log + lead_events
-- ============================================================
-- Required for the lead detail page to render the Compliance card +
-- Activity timeline. Admin/superadmin sees all; agent sees rows for their
-- own leads (joined via leads.agent_id).
--
-- Writes still locked at the grants layer — no INSERT/UPDATE/DELETE for
-- authenticated. RPCs and insert_lead_with_consent (service-role) are the
-- only write paths.

grant select on table public.consent_log to authenticated;
grant select on table public.lead_events to authenticated;

create policy "consent_log_select_role_scoped"
  on consent_log for select
  to authenticated
  using (
    (select role from current_platform_user() where active) in ('admin', 'superadmin')
    or exists (
      select 1 from leads
      where leads.id = consent_log.lead_id
        and leads.agent_id = (select agent_id from current_platform_user() where active)
    )
  );

create policy "lead_events_select_role_scoped"
  on lead_events for select
  to authenticated
  using (
    (select role from current_platform_user() where active) in ('admin', 'superadmin')
    or exists (
      select 1 from leads
      where leads.id = lead_events.lead_id
        and leads.agent_id = (select agent_id from current_platform_user() where active)
    )
  );

-- ============================================================
-- E. Anti-grant posture (no statements; just documentation)
-- ============================================================
-- Plan 5 explicitly does NOT add UPDATE/INSERT/DELETE grants on leads /
-- platform_users / agents / consent_log / lead_events for `authenticated`.
-- All writes flow through:
--   - insert_lead_with_consent (service-role; consumer-app /api/leads only)
--   - update_lead_status, update_lead_notes, assign_lead,
--     set_platform_user_active, update_agent_profile (this migration; runs
--     SECURITY DEFINER, bypasses RLS internally for the writes)
-- An authenticated agent making `.from('leads').update(...)` from the
-- browser console gets `permission denied for table leads` — verified by
-- assertion #22 in scripts/test-platform-rls.ts.
