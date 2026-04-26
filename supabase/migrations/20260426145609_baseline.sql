-- Baseline schema for Phase 1 (mortgage protection lead engine).
-- Schema spec: docs/playbook/02_Technical_Reference.md Part 5.
-- RLS spec:    docs/playbook/02_Technical_Reference.md Part 3.5.
--
-- Three deviations from the playbook spec, recorded in AGENTS.md and CHANGELOG:
--   1. leads_phone_recent_uniq partial unique index NOT created
--      (now() is STABLE; partial-index predicates require IMMUTABLE).
--      30-day phone dedup moves to the /api/leads handler.
--   2. FK indexes added on consent_log.lead_id and lead_events.lead_id.
--   3. Explicit revoke update,delete on consent_log from non-service roles.

-- ============================================================
-- Extensions and enums
-- ============================================================

create extension if not exists "uuid-ossp";

create type lead_status as enum (
  'new', 'contacted', 'appointment', 'sold', 'dead', 'refunded'
);

create type lead_temperature as enum ('hot', 'warm', 'cold');

create type lead_event_type as enum (
  'created', 'sms_sent', 'email_sent', 'capi_sent',
  'status_change', 'note_added', 'refund_requested'
);

create type time_of_day as enum ('morning', 'afternoon', 'evening');

-- ============================================================
-- agents
-- ============================================================

create table agents (
  id uuid primary key default uuid_generate_v4(),
  email text not null unique,
  full_name text not null,
  license_states text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table agents enable row level security;

create policy "agents_select_own"
  on agents for select
  using (auth.jwt() ->> 'email' = email);

-- ============================================================
-- leads
-- ============================================================

create table leads (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  first_name text not null,
  last_name text not null,
  phone_e164 text not null,
  email text not null,
  state char(2) not null,
  mortgage_balance integer not null check (mortgage_balance between 50000 and 2000000),
  age integer not null check (age between 18 and 75),
  is_smoker boolean not null,
  is_homeowner boolean not null,
  best_time_to_call time_of_day not null,
  intent_score integer not null,
  temperature lead_temperature not null,
  status lead_status not null default 'new',
  agent_id uuid references agents(id),
  first_contact_at timestamptz,
  outcome text,
  policy_value integer,
  notes text,
  utm_source text,
  utm_campaign text,
  utm_adset text,
  utm_creative text,
  fbclid text,
  fbc text,
  fbp text,
  landing_page_variant text
);

create index leads_phone_e164_idx on leads (phone_e164);
create index leads_status_idx on leads (status);
create index leads_agent_id_idx on leads (agent_id);
create index leads_created_at_idx on leads (created_at desc);

alter table leads enable row level security;

create policy "leads_select_agent"
  on leads for select
  using (
    agent_id in (
      select id from agents where email = auth.jwt() ->> 'email'
    )
  );

create policy "leads_update_agent"
  on leads for update
  using (
    agent_id in (
      select id from agents where email = auth.jwt() ->> 'email'
    )
  );

-- ============================================================
-- consent_log
--
-- Append-only by compliance design (TCPA audit trail). RLS default-deny
-- handles non-service roles, but we also explicitly revoke update/delete
-- so a future permissive policy added by mistake cannot enable mutation.
-- Service role still bypasses RLS — the discipline that no code path
-- mutates consent_log is enforced in application code, not the DB.
-- ============================================================

create table consent_log (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid not null references leads(id),
  created_at timestamptz not null default now(),
  consent_text text not null,
  form_version text not null,
  ip_address inet not null,
  user_agent text not null,
  page_url text not null
);

create index consent_log_lead_id_idx on consent_log (lead_id);

alter table consent_log enable row level security;

revoke update, delete on consent_log from authenticated, anon, public;

comment on table consent_log is
  'Append-only TCPA consent audit trail. UPDATE and DELETE revoked from authenticated/anon/public; '
  'service role bypasses RLS but app code must never mutate this table. See AGENTS.md § 6.';

-- ============================================================
-- lead_events
-- ============================================================

create table lead_events (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid not null references leads(id),
  event_type lead_event_type not null,
  event_data jsonb,
  created_at timestamptz not null default now()
);

create index lead_events_lead_id_idx on lead_events (lead_id);

alter table lead_events enable row level security;

-- ============================================================
-- suppressions
-- ============================================================

create table suppressions (
  id uuid primary key default uuid_generate_v4(),
  phone_e164 text,
  email text,
  reason text not null,
  suppressed_at timestamptz not null default now(),
  check (phone_e164 is not null or email is not null)
);

create index suppressions_phone_e164_idx on suppressions (phone_e164);
create index suppressions_email_idx on suppressions (email);

alter table suppressions enable row level security;

-- ============================================================
-- dnc_registry
-- ============================================================

create table dnc_registry (
  phone_e164 text primary key,
  updated_at timestamptz not null default now()
);

alter table dnc_registry enable row level security;
