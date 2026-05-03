// Welcome email body for final_expense leads.
// Plan 2b (2026-05-03) populated this from Plan 2a's throw-placeholder.
// Mirrors mortgage_protection.ts structure — plain text only, similar
// length, FE-product framing.
//
// {firstName} is the only dynamic insertion. [BRAND NAME PLACEHOLDER] and
// [AGENT NAME PLACEHOLDER] follow the same convention as MP — visible in
// dev, replaced when the brand and team names exist.
//
// "Reply STOP to any text" is wired (Twilio STOP webhook — cross-brand
// suppression enforcement, see AGENTS.md § 6). The "or 'unsubscribe' here
// to opt out" instruction is NOT wired in Phase 1 — same asymmetry as MP,
// documented in CHANGELOG.
//
// CAN-SPAM physical mailing address still missing — same gate as MP
// (needs LLC registered address; tracked in AGENTS.md § 9 launch checklist).
export function renderFinalExpenseWelcomeEmail(
  firstName: string,
  siteUrl: string,
): { subject: string; text: string } {
  const subject = `Your final expense quote is on its way, ${firstName}`;
  const text = [
    `Hi ${firstName},`,
    "",
    "Thanks for requesting a final expense insurance quote.",
    "",
    "One of our licensed agents will call you shortly from a US number to talk through coverage",
    "options that fit your needs and budget. The call takes 10-15 minutes. There's no obligation,",
    "no pressure, and no medical exam required for an initial quote.",
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
