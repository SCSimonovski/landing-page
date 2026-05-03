// Placeholder for Plan 2b (apps/northgate-heritage scaffold). The dispatcher
// in welcome.ts routes here for product='final_expense' leads, but no such
// leads exist post-Plan-2a. Plan 2b will populate the actual FE template:
// "final expense quote" subject + body copy adapted from the MP template.

export function renderFinalExpenseWelcomeEmail(
  firstName: string,
  _siteUrl: string,
): { subject: string; text: string } {
  throw new Error(
    `renderFinalExpenseWelcomeEmail: lead for ${firstName} cannot be rendered yet. ` +
      `Plan 2b will populate this template when apps/northgate-heritage/ ships.`,
  );
}
