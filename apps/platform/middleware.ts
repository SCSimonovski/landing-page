import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Public routes — no auth required. Everything else redirects to /login
// when no session.
const PUBLIC_PATHS = [
  "/login",
  "/auth/callback",
  "/auth/signout",
  "/api/health",
];

function isPublic(path: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => path === p || path.startsWith(p + "/"),
  );
}

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const path = request.nextUrl.pathname;

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
