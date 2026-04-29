-- insert_lead_with_consent — atomic three-table insert for the /api/leads route.
--
-- Inserts a single lead, its consent_log row, and a lead_events('created')
-- row in one implicit transaction. Returns the new lead id. If any of the
-- three inserts fails, all three roll back — that's the audit-trail
-- guarantee: a lead never exists without a matching consent record.
--
-- SECURITY INVOKER: runs with the caller's privileges. The caller is
-- service_role (called via supabase.rpc from the service role client).
-- service_role bypasses RLS and has the necessary INSERT grants per
-- 20260426202626_grant_service_role.sql.
--
-- The function takes a single jsonb payload to keep the signature small
-- and forward-compatible. The handler in src/app/api/leads/route.ts is
-- responsible for shaping the payload correctly.

create function insert_lead_with_consent(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  new_lead_id uuid;
begin
  insert into leads (
    first_name, last_name, phone_e164, email, state,
    mortgage_balance, age, is_smoker, is_homeowner,
    best_time_to_call, intent_score, temperature, on_dnc,
    utm_source, utm_campaign, utm_adset, utm_creative,
    fbclid, fbc, fbp, landing_page_variant
  )
  values (
    payload->>'first_name',
    payload->>'last_name',
    payload->>'phone_e164',
    payload->>'email',
    payload->>'state',
    (payload->>'mortgage_balance')::integer,
    (payload->>'age')::integer,
    (payload->>'is_smoker')::boolean,
    (payload->>'is_homeowner')::boolean,
    (payload->>'best_time_to_call')::time_of_day,
    (payload->>'intent_score')::integer,
    (payload->>'temperature')::lead_temperature,
    coalesce((payload->>'on_dnc')::boolean, false),
    payload->>'utm_source',
    payload->>'utm_campaign',
    payload->>'utm_adset',
    payload->>'utm_creative',
    payload->>'fbclid',
    payload->>'fbc',
    payload->>'fbp',
    payload->>'landing_page_variant'
  )
  returning id into new_lead_id;

  insert into consent_log (
    lead_id, consent_text, form_version, ip_address, user_agent, page_url
  )
  values (
    new_lead_id,
    payload->>'consent_text',
    payload->>'form_version',
    (payload->>'ip_address')::inet,
    payload->>'user_agent',
    payload->>'page_url'
  );

  insert into lead_events (lead_id, event_type, event_data)
  values (
    new_lead_id,
    'created',
    jsonb_build_object(
      'intent_score', payload->'intent_score',
      'temperature', payload->>'temperature',
      'on_dnc', coalesce((payload->>'on_dnc')::boolean, false)
    )
  );

  return new_lead_id;
end;
$$;

grant execute on function insert_lead_with_consent(jsonb) to service_role;
