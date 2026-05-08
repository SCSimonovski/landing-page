import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@platform/shared/types/database";

// Service-role Supabase client. Bypasses RLS — only for server-side
// admin operations (auth.admin.* + table mutations gated by app-level
// role checks like assertAdmin). Never import from a Client Component
// or any file that runs in the browser; "server-only" enforces this.
//
// No cookie wiring (service role doesn't represent a user session).
export function createSupabaseServiceRoleClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
