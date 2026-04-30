-- New lead_event_type value for the welcome email dispatcher's skip path.
-- Set when the lead's phone or email is in suppressions at dispatch time
-- (the rare race where the intake-stage check passed but the lead got
-- suppressed before the after() callback fired).
--
-- 'email_sent' is already in the baseline enum (verified pre-flight; see
-- this task's CHANGELOG entry); only the skip variant needs adding.
-- No DNC variant for email — DNC is a phone-only registry.
--
-- Same pattern as the SMS skip values from 20260430003418.

alter type lead_event_type add value 'email_skipped_suppression';
