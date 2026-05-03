-- Multi-brand schema migration: add brand + product + details JSONB.
--
-- Per Plan 1 at .claude/plans/reviewing-the-plan-as-dazzling-bumblebee.md.
--
-- Adds brand + product (text discriminators) + details (JSONB per-product
-- qualifying data) to leads. Adds brand to consent_log. Adds informational
-- source_brand to suppressions. Migrates Northgate's three mortgage-protection
-- columns (mortgage_balance, is_smoker, is_homeowner) into the new details
-- JSONB. Backfills existing rows with brand='northgate-protection',
-- product='mortgage_protection', and reshaped details. Rewrites the
-- insert_lead_with_consent RPC for the new payload shape.
--
-- THIS MIGRATION CROSSES A ONE-WAY DOOR at the DROP COLUMN block. After
-- those columns are dropped, rollback requires either:
--   (a) restoring leads from scratch/pre-migration-backup.sql (taken before
--       this migration applied — see Plan 1 Step 2.5), OR
--   (b) re-creating the columns and back-extracting from details JSONB while
--       it still exists.
--
-- ROLLBACK PROCEDURE (if post-migration parity verification fails):
--   1. alter table leads drop column brand, drop column product, drop column details;
--   2. alter table leads add column mortgage_balance integer,
--                       add column is_smoker boolean,
--                       add column is_homeowner boolean;
--   3. update leads set
--        mortgage_balance = (details->>'mortgage_balance')::int,
--        is_smoker = (details->>'is_smoker')::boolean,
--        is_homeowner = (details->>'is_homeowner')::boolean
--      -- (only works if a backup snapshot of details still exists; if the
--      -- column was dropped without backup, restore from pre-migration-backup.sql)
--   4. alter table leads alter column mortgage_balance set not null,
--                       alter column is_smoker set not null,
--                       alter column is_homeowner set not null;
--   5. alter table consent_log drop column brand;
--   6. alter table suppressions drop column source_brand;
--   7. drop index leads_brand_product_idx;
--   8. drop function insert_lead_with_consent(jsonb);
--   9. restore old RPC body from supabase/migrations/20260429114549_lead_insert_function.sql

-- =============================================================================
-- A. leads: add brand + product + details, backfill, drop old columns
-- =============================================================================

-- A.1: Add new columns nullable (additive, reversible up to A.4)
alter table leads
  add column brand text,
  add column product text,
  add column details jsonb;

-- A.2: Backfill existing rows. All current rows are Northgate mortgage
-- protection (only brand/product that exists pre-migration).
update leads set
  brand = 'northgate-protection',
  product = 'mortgage_protection',
  details = jsonb_build_object(
    'mortgage_balance', mortgage_balance,
    'is_smoker', is_smoker,
    'is_homeowner', is_homeowner
  )
where brand is null;

-- A.3: Lock NOT NULL on the new columns
alter table leads
  alter column brand set not null,
  alter column product set not null,
  alter column details set not null;

-- A.4: ONE-WAY DOOR — drop the migrated columns. Past this point, rollback
-- requires the procedure documented in the header comment block.
alter table leads
  drop column mortgage_balance,
  drop column is_smoker,
  drop column is_homeowner;

-- A.5: Composite index on (brand, product) for cross-brand queries.
-- Per Plan 1 Decision #10, lead_events does NOT carry brand directly;
-- cross-brand event queries join via lead_events INNER JOIN leads ON ...
-- WHERE leads.brand = '...' — this index makes that efficient.
create index leads_brand_product_idx on leads(brand, product);

-- =============================================================================
-- B. consent_log: add brand, backfill, lock NOT NULL
-- =============================================================================

alter table consent_log add column brand text;

update consent_log set brand = 'northgate-protection' where brand is null;

alter table consent_log alter column brand set not null;

-- =============================================================================
-- C. suppressions: add informational source_brand (nullable, no backfill)
-- =============================================================================

-- Pre-migration suppression rows legitimately have null source_brand (the
-- brand context wasn't tracked then). New suppressions populate it via the
-- addSuppression() helper update in app code. Enforcement (isSuppressed query)
-- stays cross-brand and ignores this column.
alter table suppressions add column source_brand text;

-- =============================================================================
-- D. Rewrite insert_lead_with_consent RPC for the new payload shape
-- =============================================================================

drop function if exists insert_lead_with_consent(jsonb);

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
    age, best_time_to_call, intent_score, temperature, on_dnc,
    brand, product, details,
    utm_source, utm_campaign, utm_adset, utm_creative,
    fbclid, fbc, fbp, landing_page_variant
  )
  values (
    payload->>'first_name',
    payload->>'last_name',
    payload->>'phone_e164',
    payload->>'email',
    payload->>'state',
    (payload->>'age')::integer,
    (payload->>'best_time_to_call')::time_of_day,
    (payload->>'intent_score')::integer,
    (payload->>'temperature')::lead_temperature,
    coalesce((payload->>'on_dnc')::boolean, false),
    payload->>'brand',
    payload->>'product',
    -- Note: -> (not ->>) keeps details as jsonb instead of converting to text
    payload->'details',
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
    lead_id, consent_text, form_version, ip_address, user_agent, page_url, brand
  )
  values (
    new_lead_id,
    payload->>'consent_text',
    payload->>'form_version',
    (payload->>'ip_address')::inet,
    payload->>'user_agent',
    payload->>'page_url',
    payload->>'brand'
  );

  insert into lead_events (lead_id, event_type, event_data)
  values (
    new_lead_id,
    'created',
    -- brand + product added to event_data for downstream debugging.
    -- Pre-migration shape was {on_dnc, temperature, intent_score} —
    -- post-migration adds brand + product. This is the "modulo new fields"
    -- additive part the architect called out for parity verification.
    jsonb_build_object(
      'intent_score', payload->'intent_score',
      'temperature', payload->>'temperature',
      'on_dnc', coalesce((payload->>'on_dnc')::boolean, false),
      'brand', payload->>'brand',
      'product', payload->>'product'
    )
  );

  return new_lead_id;
end;
$$;

grant execute on function insert_lead_with_consent(jsonb) to service_role;
