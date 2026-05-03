// Welcome email body for mortgage_protection leads.
// Spec: docs/playbook/02_Technical_Reference.md Part 4.3.
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
export function renderMortgageProtectionWelcomeEmail(
  firstName: string,
  siteUrl: string,
): { subject: string; text: string } {
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
