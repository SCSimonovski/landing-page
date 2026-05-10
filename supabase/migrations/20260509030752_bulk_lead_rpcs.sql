-- Plan 5 polish: bulk RPCs for the leads table.
--
-- Two new SECURITY DEFINER functions, same shape as Plan 5's per-row RPCs
-- but operating on an array of lead_ids inside a single transaction:
--   - bulk_assign_leads (admin/superadmin only)
--   - bulk_update_lead_status (agent on own leads OR admin/superadmin)
--
-- Atomic per call: any per-lead failure (auth, missing row, etc.) raises
-- and the whole batch reverts. Per-lead no-op short-circuit (skip writes
-- when value unchanged) so a 50-lead "mark all contacted" doesn't fan
-- out 50 events for the ones already contacted.
--
-- Verification: scripts/test-platform-rls.ts extended.

-- ============================================================
-- bulk_assign_leads — admin/superadmin only
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

  if array_length(p_lead_ids, 1) is null then
    return; -- empty input → no-op
  end if;

  -- Validate target agent_id (NULL = unassign, allowed).
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
      lead_id, event_type, event_data, actor_platform_user_id
    ) values (
      v_lead_id,
      'assigned',
      jsonb_build_object(
        'old_agent_id', v_old_agent_id,
        'new_agent_id', p_new_agent_id,
        'bulk', true
      ),
      v_user.id
    );
  end loop;
end;
$$;

grant execute on function public.bulk_assign_leads(uuid[], uuid) to authenticated;

comment on function public.bulk_assign_leads is
  'Bulk-assign multiple leads to one agent (or unassign if p_new_agent_id is '
  'NULL). Admin/superadmin only. Atomic — any failure reverts the whole '
  'batch. event_data.bulk=true marks the assigned event as part of a batch '
  'for future timeline collapsing.';

-- ============================================================
-- bulk_update_lead_status — agent on own leads OR admin/superadmin
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
begin
  select id, role, active, agent_id
    into v_user
    from current_platform_user()
    where active;
  if not found then
    raise exception 'unauthenticated or inactive' using errcode = '42501';
  end if;

  if array_length(p_lead_ids, 1) is null then
    return; -- empty input → no-op
  end if;

  foreach v_lead_id in array p_lead_ids loop
    select status, agent_id into v_old_status, v_lead_agent_id
      from leads where id = v_lead_id;
    if not found then
      raise exception 'lead % not found', v_lead_id using errcode = '42501';
    end if;

    -- Per-lead authorization: agent must own each lead in the batch.
    if v_user.role not in ('admin', 'superadmin')
       and v_lead_agent_id is distinct from v_user.agent_id then
      raise exception 'access denied for lead %', v_lead_id using errcode = '42501';
    end if;

    if v_old_status = p_new_status then
      continue;
    end if;

    update leads set status = p_new_status where id = v_lead_id;

    insert into lead_events (
      lead_id, event_type, event_data, actor_platform_user_id
    ) values (
      v_lead_id,
      'status_change',
      jsonb_build_object('old', v_old_status, 'new', p_new_status, 'bulk', true),
      v_user.id
    );
  end loop;
end;
$$;

grant execute on function public.bulk_update_lead_status(uuid[], lead_status) to authenticated;

comment on function public.bulk_update_lead_status is
  'Bulk-update status for multiple leads. Agent: must own every lead in '
  'the batch (one foreign-lead in the array → whole batch reverts). '
  'Admin/superadmin: any leads. event_data.bulk=true marks the status_change '
  'event as part of a batch.';
