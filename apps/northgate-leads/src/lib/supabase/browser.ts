import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@platform/shared/types/database";

// Browser-side Supabase client. Used in Client Components (e.g., the login
// form's signInWithOtp call). Cookies are managed by @supabase/ssr's
// browser-side adapter automatically.
export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
