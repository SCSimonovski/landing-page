import "server-only";
import { createServiceRoleClient } from "./supabase-server";
import type { Database, Json } from "../types/database";

type LeadRow = Database["public"]["Tables"]["leads"]["Row"];

// Strongly-typed input for the insert_lead_with_consent RPC. The function
// signature in the migration takes a single jsonb payload; this type is the
// shape the route handler builds before serializing.
export type LeadInsertInput = {
  first_name: string;
  last_name: string;
  phone_e164: string;
  email: string;
  state: string;
  mortgage_balance: number;
  age: number;
  is_smoker: boolean;
  is_homeowner: boolean;
  best_time_to_call: "morning" | "afternoon" | "evening";
  intent_score: number;
  temperature: "hot" | "warm" | "cold";
  on_dnc: boolean;
  consent_text: string;
  form_version: string;
  ip_address: string;
  user_agent: string;
  page_url: string;
  utm_source?: string;
  utm_campaign?: string;
  utm_adset?: string;
  utm_creative?: string;
  fbclid?: string;
  fbc?: string;
  fbp?: string;
  landing_page_variant?: string;
};

export async function insertLeadWithConsent(
  input: LeadInsertInput,
): Promise<string> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.rpc("insert_lead_with_consent", {
    payload: input,
  });
  if (error) throw error;
  if (!data) throw new Error("insert_lead_with_consent returned no id");
  return data;
}

export async function isSuppressed(
  phone: string,
  email: string,
): Promise<boolean> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("suppressions")
    .select("id")
    .or(`phone_e164.eq.${phone},email.eq.${email}`)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}

export async function isOnDNC(phone: string): Promise<boolean> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("dnc_registry")
    .select("phone_e164")
    .eq("phone_e164", phone)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}

// 30-day phone dedup pre-flight check. Application-level only — the partial
// unique index from the playbook spec was dropped because now() is STABLE
// (see AGENTS.md § 6).
export async function findRecentDuplicate(
  phone: string,
): Promise<{ id: string } | null> {
  const supabase = createServiceRoleClient();
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const { data, error } = await supabase
    .from("leads")
    .select("id")
    .eq("phone_e164", phone)
    .gt("created_at", thirtyDaysAgo)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Audit row for a duplicate-within-30-days submission. Goes in lead_events
// (NOT consent_log — the original consent is still on file; we are not
// recording a new consent event).
export async function recordDuplicateAttempt(
  existingLeadId: string,
  attemptData: { [key: string]: Json | undefined },
): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("lead_events").insert({
    lead_id: existingLeadId,
    event_type: "duplicate_attempt",
    event_data: attemptData,
  });
  if (error) throw error;
}

// Fetch a lead by id. Used by the dispatcher to load the full row before
// formatting the agent SMS. Returns null if not found.
export async function getLeadById(id: string): Promise<LeadRow | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Audit row for a successful agent SMS dispatch. Twilio SID lets us
// cross-reference with Twilio's own message log if needed.
export async function recordSmsSent(
  leadId: string,
  sid: string,
): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("lead_events").insert({
    lead_id: leadId,
    event_type: "sms_sent",
    event_data: { sid },
  });
  if (error) throw error;
}

// Audit row for a skipped dispatch. Two reason values map to two enum
// values added in the add_sms_skip_event_types migration.
export async function recordSmsSkipped(
  leadId: string,
  reason: "dnc" | "suppression",
): Promise<void> {
  const supabase = createServiceRoleClient();
  const eventType =
    reason === "dnc" ? "sms_skipped_dnc" : "sms_skipped_suppression";
  const { error } = await supabase.from("lead_events").insert({
    lead_id: leadId,
    event_type: eventType,
    event_data: { skipped_at: new Date().toISOString() },
  });
  if (error) throw error;
}

// Audit row for a successful welcome email dispatch. Resend message id
// for cross-reference with Resend's dashboard.
export async function recordEmailSent(
  leadId: string,
  resendId: string,
): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("lead_events").insert({
    lead_id: leadId,
    event_type: "email_sent",
    event_data: { id: resendId },
  });
  if (error) throw error;
}

// Audit row for an email skipped at dispatch time. Only one variant for
// email — DNC is a phone-only registry, doesn't apply.
export async function recordEmailSkipped(leadId: string): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("lead_events").insert({
    lead_id: leadId,
    event_type: "email_skipped_suppression",
    event_data: { skipped_at: new Date().toISOString() },
  });
  if (error) throw error;
}
