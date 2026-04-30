import "server-only";
import { getResendClient } from "@/lib/resend/client";
import {
  getLeadById,
  isSuppressed,
  recordEmailSent,
  recordEmailSkipped,
} from "@/lib/db/leads";

// Welcome email per docs/playbook/02_Technical_Reference.md Part 4.3.
// Plain text only — higher inbox placement, no rendering surprises.
//
// {firstName} is the only dynamic insertion. [BRAND NAME PLACEHOLDER] and
// [AGENT NAME PLACEHOLDER] follow the same convention as the H1 marker
// and consent text — visible in dev, replaced when the brand and team
// names exist.
//
// "Reply STOP to any text" is wired (Twilio STOP webhook). The
// "or 'unsubscribe' here to opt out" instruction is NOT wired in Phase 1
// — we don't process inbound email replies. Asymmetry documented in the
// task CHANGELOG.
function renderWelcomeEmail(firstName: string, siteUrl: string): {
  subject: string;
  text: string;
} {
  const subject = `Your mortgage protection quote is on its way, ${firstName}`;
  const text = [
    `Hi ${firstName},`,
    "",
    "Thanks for requesting a mortgage protection quote.",
    "",
    "One of our licensed agents will call you shortly from a US number to talk through options",
    "tailored to your mortgage. The call takes 10-15 minutes. There's no obligation, no pressure,",
    "and no medical exam required for an initial quote.",
    "",
    "If you'd prefer a different time, just reply to this email.",
    "",
    "Talk soon,",
    "[AGENT NAME PLACEHOLDER]",
    "[BRAND NAME PLACEHOLDER]",
    "",
    "---",
    `Privacy policy: ${siteUrl}/privacy`,
    "Reply STOP to any text or 'unsubscribe' here to opt out.",
  ].join("\n");
  return { subject, text };
}

// Send the welcome email to a lead. Called in parallel with sendAgentSMS
// from the after() callback in /api/leads. Re-queries suppressions at
// dispatch time (mirrors SMS dispatch pattern) — the rare race where the
// intake-stage check passed but the lead got suppressed in the gap.
//
// Errors are caught and logged with no PII (lead id only). Independent
// from SMS dispatch — see CHANGELOG for the failure-mode breakdown.
export async function sendWelcomeEmail(leadId: string): Promise<void> {
  try {
    const lead = await getLeadById(leadId);
    if (!lead) {
      console.error(`[email] lead=${leadId} not_found`);
      return;
    }

    if (await isSuppressed(lead.phone_e164, lead.email)) {
      await recordEmailSkipped(leadId);
      console.log(`[email] lead=${leadId} skip=suppression`);
      return;
    }

    // Defense-in-depth: if NEXT_PUBLIC_SITE_URL is unset/blank, the privacy
    // link in the body would render as "undefined/privacy". Fail loud
    // (skip + log) rather than ship a broken email.
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!siteUrl) {
      console.error(`[email] lead=${leadId} skip=missing_site_url`);
      return;
    }

    const { subject, text } = renderWelcomeEmail(lead.first_name, siteUrl);
    const resend = getResendClient();
    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL!,
      to: lead.email,
      subject,
      text,
    });

    if (error) {
      console.error(`[email] lead=${leadId} send_error name=${error.name}`);
      return;
    }
    if (!data?.id) {
      console.error(`[email] lead=${leadId} send_no_id`);
      return;
    }

    await recordEmailSent(leadId, data.id);
    console.log(`[email] lead=${leadId} sent id=${data.id}`);
  } catch (err) {
    const e = err as { code?: string | number };
    console.error(`[email] lead=${leadId} error code=${e.code ?? "unknown"}`);
  }
}
