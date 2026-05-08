import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Public routes — no auth required. Everything else redirects to /login
// when no session.
// /auth/setup-password and /auth/reset-password handle their own auth via
// the URL hash fragment from invite/recovery emails — middleware can't
// see the fragment, and these pages need to render before they have a
// session. /auth/forgot-password is the public "send reset link" form.
const PUBLIC_PATHS = [
  "/login",
  "/auth/callback",
  "/auth/signout",
  "/auth/setup-password",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/api/health",
];

// Pure entry-point pages — if the user is already signed in, send them
// to the dashboard instead of letting them sit on the form.
// (setup/reset-password stay accessible while authed because they're
// often visited mid-flow after the page itself sets the session via
// the URL fragment / ?code= exchange.)
const REDIRECT_IF_AUTHED = ["/login", "/auth/forgot-password"];

function isPublic(path: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => path === p || path.startsWith(p + "/"),
  );
}

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const path = request.nextUrl.pathname;

  if (user && REDIRECT_IF_AUTHED.includes(path)) {
    const url = request.nextUrl.clone();
    url.pathname = "/leads";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (!user && !isPublic(path)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  // Match everything except Next internals + static assets.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.svg$|.*\\.png$|.*\\.jpg$|.*\\.webp$).*)",
  ],
};
