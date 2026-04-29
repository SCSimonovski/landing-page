-- Schema additions for the Phase 1 lead intake (form + /api/leads).
--
-- Two changes:
--   1. New 'duplicate_attempt' value on the lead_event_type enum, used by
--      /api/leads when the 30-day phone dedup pre-flight check fires. The
--      audit row goes in lead_events; consent_log stays unpolluted (the
--      original consent is still on file).
--   2. New on_dnc boolean on leads. Set at insert time when the phone is
--      on the DNC registry. The flag is informational only — the agent
--      dispatcher (next plan) re-queries dnc_registry at dispatch time
--      because the DNC list updates daily; relying on the column would
--      silently violate DNC for leads inserted before a DNC update.
--
-- ALTER TYPE ... ADD VALUE works inside a transaction on PG 12+ as long as
-- the new value isn't used in the same transaction. We don't use it here.

alter type lead_event_type add value 'duplicate_attempt';

alter table leads add column on_dnc boolean not null default false;
