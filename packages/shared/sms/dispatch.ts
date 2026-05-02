import "server-only";
import { getTwilioClient } from "../twilio/client";
import { formatAgentSMS } from "../twilio/messages";
import {
  getLeadById,
  isOnDNC,
  isSuppressed,
  recordSmsSent,
  recordSmsSkipped,
} from "../db/leads";

// Send the new-lead SMS to the agent. Called via after() from /api/leads
// so it runs after the response is queued — does not block speed-to-lead.
//
// Re-queries DNC and suppressions at dispatch time (rule from AGENTS.md § 6:
// the on_dnc column on leads is informational only; the FTC list updates
// daily, so a lead inserted Monday with on_dnc=false could be on DNC by
// Wednesday). Skips with a queryable lead_events row, NOT just a console
// log — refund disputes and compliance audits need the paper trail.
//
// Errors are caught and logged with no PII (lead id only). Throws would
// surface in Vercel logs but not in the user-visible response.
export async function sendAgentSMS(leadId: string): Promise<void> {
  try {
    const lead = await getLeadById(leadId);
    if (!lead) {
      console.error(`[dispatch] lead=${leadId} not_found`);
      return;
    }

    if (await isOnDNC(lead.phone_e164)) {
      await recordSmsSkipped(leadId, "dnc");
      console.log(`[dispatch] lead=${leadId} skip=dnc`);
      return;
    }

    if (await isSuppressed(lead.phone_e164, lead.email)) {
      await recordSmsSkipped(leadId, "suppression");
      console.log(`[dispatch] lead=${leadId} skip=suppression`);
      return;
    }

    const body = formatAgentSMS(lead);
    const client = getTwilioClient();
    const msg = await client.messages.create({
      from: process.env.TWILIO_FROM_NUMBER!,
      to: process.env.AGENT_PHONE_NUMBER!,
      body,
    });

    await recordSmsSent(leadId, msg.sid);
    console.log(`[dispatch] lead=${leadId} sent sid=${msg.sid}`);
  } catch (err) {
    const e = err as { code?: string | number };
    console.error(`[dispatch] lead=${leadId} error code=${e.code ?? "unknown"}`);
    // Per AGENTS.md § 6: notification failures must NOT surface as
    // user-visible errors. We've already returned 200 for the lead intake
    // by the time this runs; just log and move on. SMS watchdog (Part 4.5)
    // is a launch-checklist gap that would catch silent drops.
  }
}
