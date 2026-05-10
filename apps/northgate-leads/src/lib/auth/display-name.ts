// Display-name fallback helpers. Centralized per the Plan 5b architect
// review (#3) so the convention lives in one place — if the fallback rule
// changes (e.g., "click to add name" affordance for missing values),
// callers don't need to be re-walked.
//
// Two flavors:
//   displayName(user)       — personal contexts (sidebar footer, "Assigned: …"
//                             pill, activity timeline actor). Falls back to
//                             email so the user always sees *something*.
//   displayNameOrDash(user) — tabular contexts (Users page Full name column).
//                             Falls back to em-dash so an empty name reads as
//                             a clear gap, not a duplicated email column.

type NamedUser = {
  full_name?: string | null;
  email?: string | null;
};

export function displayName(user: NamedUser): string {
  const trimmed = user.full_name?.trim();
  if (trimmed) return trimmed;
  return user.email?.trim() || "";
}

export function displayNameOrDash(user: { full_name?: string | null }): string {
  const trimmed = user.full_name?.trim();
  return trimmed || "—";
}
