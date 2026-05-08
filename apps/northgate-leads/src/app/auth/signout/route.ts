import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Sign out + redirect to /login. POST so it can't be triggered by accident
// via a link or prefetch.
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(`${request.nextUrl.origin}/login`, {
    status: 303, // See Other — POST → GET on the redirect target
  });
}
