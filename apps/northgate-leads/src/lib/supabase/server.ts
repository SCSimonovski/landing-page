import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@platform/shared/types/database";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

// Server-side Supabase client for Server Components, Server Actions, and
// Route Handlers. Reads cookies via Next's request scope.
//
// `setAll` may throw in pure Server Components (only Server Actions and
// Route Handlers can set cookies); the catch is intentional — middleware
// already refreshed the session, so missing the set here is a no-op.
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components can't set cookies; middleware handles refresh.
          }
        },
      },
    },
  );
}
