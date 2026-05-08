import { redirect } from "next/navigation";
import { getPlatformUser, type PlatformUser } from "./get-platform-user";

// Two helpers, separated by call-site:
//
//   requireAdmin() — for Server Component pages. On failure, calls
//   redirect() which throws NEXT_REDIRECT; Next converts it to a 307.
//   That's exactly what a page wants.
//
//   assertAdmin()  — for Server Actions. redirect()'s throw inside an
//   action becomes a 303 navigation response; the action's declared
//   return type never resolves and the calling RHF submit handler
//   hangs. assertAdmin throws a plain Error instead — the action's
//   try/catch turns it into { ok: false, error: "Forbidden" } and the
//   dialog renders the inline message. Defense-in-depth: never trust
//   that the client only renders the form for admins.

function isAdminRole(pu: PlatformUser | null): pu is PlatformUser {
  return Boolean(
    pu && pu.active && (pu.role === "admin" || pu.role === "superadmin"),
  );
}

export async function requireAdmin(): Promise<PlatformUser> {
  const pu = await getPlatformUser();
  if (!isAdminRole(pu)) {
    redirect("/leads?error=insufficient_role");
  }
  return pu;
}

export async function assertAdmin(): Promise<PlatformUser> {
  const pu = await getPlatformUser();
  if (!isAdminRole(pu)) {
    throw new Error("Forbidden");
  }
  return pu;
}
