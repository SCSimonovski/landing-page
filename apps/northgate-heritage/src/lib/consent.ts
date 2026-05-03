// DRAFT — pending TCPA-experienced attorney review before launch.
// Source: docs/playbook/01_Strategy_and_Offer.md Part 4.3 (Northgate Protection
// equivalent) adapted for Heritage's final expense product.
// When attorney-approved, bump FORM_VERSION from "v1-draft" to "v1" — joint
// pass across both brands per AGENTS.md § 9.
// [BRAND NAME] and [opt-out email] are intentional inline markers; replaced
// once the LLC and email are set up. Until then, no real ads against this text.

export const FORM_VERSION = "v1-draft";

// Trailing substring the form's render layer strips and replaces with
// <Link> elements pointing at /privacy and /terms. Same convention as NP —
// keeps consent_log snapshots truthful while letting the form's rendered
// output have clickable links.
//
// Module-load assertion catches the failure mode where someone edits
// CONSENT_TEXT without updating LINKED_CONSENT_SUFFIX: the .replace() in the
// render layer would silently no-op, duplicating the trailing sentence.
export const LINKED_CONSENT_SUFFIX = " See our Privacy Policy and Terms.";

// Heritage CONSENT_TEXT diverges from NP's at the product mention only —
// "mortgage protection and related insurance products" → "final expense
// insurance and related insurance products". Otherwise byte-identical to
// NP's v1-draft. Each brand captures its own consent_log snapshot per
// submission, so the two CONSENT_TEXT constants stay independent.
export const CONSENT_TEXT =
  `By checking this box and clicking "Get my options," I am providing my electronic ` +
  `signature and express written consent for [BRAND NAME] and its licensed insurance ` +
  `agents to contact me at the phone number and email I provided, including by calls, ` +
  `pre-recorded messages, artificial voice, and text messages sent using an automatic ` +
  `telephone dialing system, for marketing purposes about final expense insurance and ` +
  `related insurance products. I understand that this consent is not required to make a ` +
  `purchase, that message and data rates may apply, and that I can revoke consent at any ` +
  `time by replying STOP to any text or by emailing [opt-out email].` +
  LINKED_CONSENT_SUFFIX;

if (!CONSENT_TEXT.endsWith(LINKED_CONSENT_SUFFIX)) {
  throw new Error(
    "CONSENT_TEXT no longer ends with LINKED_CONSENT_SUFFIX — update the form's render layer in src/components/lead-form.tsx to match the new trailing words.",
  );
}
