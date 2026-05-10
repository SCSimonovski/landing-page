import "server-only";
import { getEmailTransport } from "./transport";
import {
  getLeadById,
  isSuppressed,
  recordEmailSent,
  recordEmailSkipped,
} from "../db/leads";
import type { Database } from "../types/database";
import { renderMortgageProtectionWelcomeEmail } from "./templates/mortgage_protection";
import { renderFinalExpenseWelcomeEmail } from "./templates/final_expense";

type LeadRow = Database["public"]["Tables"]["leads"]["Row"];

// Body-rendering dispatcher — routes to per-product templates by lead.product.
// Same pattern as the SMS dispatcher in twilio/messages.ts.
function renderWelcomeEmail(
  lead: LeadRow,
  siteUrl: string,
): { subject: string; text: string } {
  switch (lead.product) {
    case "mortgage_protection":
      return renderMortgageProtectionWelcomeEmail(lead.first_name, siteUrl);
    case "final_expense":
      return renderFinalExpenseWelcomeEmail(lead.first_name, siteUrl);
    default:
      throw new Error(
        `renderWelcomeEmail: lead ${lead.id} has unknown product='${lead.product}'.`,
      );
  }
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

    const { subject, text } = renderWelcomeEmail(lead, siteUrl);
    const transport = getEmailTransport();
    const { id, error } = await transport.send({
      from: process.env.FROM_EMAIL!,
      to: lead.email,
      subject,
      text,
    });

    if (error) {
      console.error(`[email] lead=${leadId} send_error name=${error.name}`);
      return;
    }
    if (!id) {
      console.error(`[email] lead=${leadId} send_no_id`);
      return;
    }

    await recordEmailSent(leadId, id);
    console.log(`[email] lead=${leadId} sent id=${id}`);
  } catch (err) {
    const e = err as { code?: string | number };
    console.error(`[email] lead=${leadId} error code=${e.code ?? "unknown"}`);
  }
}
