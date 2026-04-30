-- Two new lead_event_type values for the agent SMS dispatcher's skip paths.
-- Set at dispatch time when the lead's phone hits DNC or suppressions.
--
-- Why event rows for skips (not just console logs): refund disputes and
-- compliance audits months later need the answer to "did we attempt
-- dispatch for this lead?" — Vercel logs rotate, lead_events is queryable
-- forever. Same pattern as the duplicate_attempt value from the prior task.
--
-- ALTER TYPE ... ADD VALUE works in a transaction on PG 12+ as long as
-- the new value isn't used in the same transaction. We don't use them here.

alter type lead_event_type add value 'sms_skipped_dnc';
alter type lead_event_type add value 'sms_skipped_suppression';
