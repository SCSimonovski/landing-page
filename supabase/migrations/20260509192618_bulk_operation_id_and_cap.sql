-- Plan 5+ safety layer: bulk_operation_id + size cap on bulk RPCs.
--
-- Adds:
--   1. lead_events.bulk_operation_id (nullable uuid). NULL for individual
--      RPC writes (Plan 5's per-row pattern); populated by bulk RPCs going
--      forward — every event from one bulk call shares the same UUID.
--      Lets a future "view all events from this bulk operation" feature
--      group rows. Backfill is impossible (the grouping doesn't exist
--      after the fact), so the column has to be added before any future
--      caller would have wanted it.
--   2. CREATE OR REPLACE on both bulk RPCs to (a) generate a fresh UUID
--      per call, (b) stamp it on every event, (c) reject arrays over
--      BULK_MAX (100) — guards against the lock-holding scenario where a
--      500-lead bulk update queues concurrent /api/leads writers.
--
-- No mode parameter. Per architect call, the modal carries all safety
-- logic; RPC stays dumb (validate auth + size cap, generate
-- bulk_operation_id, apply, audit). Per-row no-op short-circuit
-- preserved (same semantics as Plan 5's bulk RPCs).

-- ============================================================
-- A. lead_events.bulk_operation_id
-- ============================================================
alter table lead_events
  add column bulk_operation_id uuid;

comment on column lead_events.bulk_operation_id is
  'UUID grouping all events written by a single bulk RPC call. NULL for '
  'events written by individual per-row RPCs (Plan 5) or by '
  'insert_lead_with_consent. Set by Plan 5+ bulk RPCs.';

-- ============================================================
-- B. bulk_assign_leads — replace with cap + bulk_operation_id
-- ============================================================
create or replace function public.bulk_assign_leads(
  p_lead_ids uuid[],
  p_new_agent_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user record;
  v_lead_id uuid;
  v_old_agent_id uuid;
  v_op_id uuid := gen_random_uuid();
  v_count int;
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

  v_count := coalesce(array_length(p_lead_ids, 1), 0);
  if v_count = 0 then
    return;
  end if;
  -- Hard cap: prevents a 500-lead bulk update from holding locks long
  -- enough to queue concurrent /api/leads writers. Operator gets a
  -- specific error and processes in batches.
  if v_count > 100 then
    raise exception 'bulk operations limited to 100 leads (got %)', v_count
      using errcode = '22023';
  end if;

  if p_new_agent_id is not null then
    if not exists (select 1 from agents where id = p_new_agent_id) then
      raise exception 'agent not found' using errcode = '22023';
    end if;
  end if;

  foreach v_lead_id in array p_lead_ids loop
    select agent_id into v_old_agent_id
      from leads where id = v_lead_id;
    if not found then
      raise exception 'lead % not found', v_lead_id using errcode = '42501';
    end if;

    -- Per-lead no-op short-circuit.
    if v_old_agent_id is not distinct from p_new_agent_id then
      continue;
    end if;

    update leads set agent_id = p_new_agent_id where id = v_lead_id;

    insert into lead_events (
      lead_id,
      event_type,
      event_data,
      actor_platform_user_id,
      bulk_operation_id
    ) values (
      v_lead_id,
      'assigned',
      jsonb_build_object(
        'old_agent_id', v_old_agent_id,
        'new_agent_id', p_new_agent_id
      ),
      v_user.id,
      v_op_id
    );
  end loop;
end;
$$;

comment on function public.bulk_assign_leads is
  'Bulk-assign multiple leads (admin/superadmin only). Atomic — any failure '
  'reverts the whole batch. All events written by one call share '
  'bulk_operation_id. Hard cap of 100 leads per call.';

-- ============================================================
-- C. bulk_update_lead_status — replace with cap + bulk_operation_id
-- ============================================================
create or replace function public.bulk_update_lead_status(
  p_lead_ids uuid[],
  p_new_status lead_status
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user record;
  v_lead_id uuid;
  v_old_status lead_status;
  v_lead_agent_id uuid;
  v_op_id uuid := gen_random_uuid();
  v_count int;
begin
  select id, role, active, agent_id
    into v_user
    from current_platform_user()
    where active;
  if not found then
    raise exception 'unauthenticated or inactive' using errcode = '42501';
  end if;

  v_count := coalesce(array_length(p_lead_ids, 1), 0);
  if v_count = 0 then
    return;
  end if;
  if v_count > 100 then
    raise exception 'bulk operations limited to 100 leads (got %)', v_count
      using errcode = '22023';
  end if;

  foreach v_lead_id in array p_lead_ids loop
    select status, agent_id into v_old_status, v_lead_agent_id
      from leads where id = v_lead_id;
    if not found then
      raise exception 'lead % not found', v_lead_id using errcode = '42501';
    end if;

    if v_user.role not in ('admin', 'superadmin')
       and v_lead_agent_id is distinct from v_user.agent_id then
      raise exception 'access denied for lead %', v_lead_id using errcode = '42501';
    end if;

    if v_old_status = p_new_status then
      continue;
    end if;

    update leads set status = p_new_status where id = v_lead_id;

    insert into lead_events (
      lead_id,
      event_type,
      event_data,
      actor_platform_user_id,
      bulk_operation_id
    ) values (
      v_lead_id,
      'status_change',
      jsonb_build_object('old', v_old_status, 'new', p_new_status),
      v_user.id,
      v_op_id
    );
  end loop;
end;
$$;

comment on function public.bulk_update_lead_status is
  'Bulk-update status for multiple leads. Agent: must own every lead in '
  'the batch (one foreign-lead in the array → whole batch reverts). '
  'Admin/superadmin: any leads. All events from one call share '
  'bulk_operation_id. Hard cap of 100 leads per call. Per-row no-op '
  'short-circuit preserved.';
