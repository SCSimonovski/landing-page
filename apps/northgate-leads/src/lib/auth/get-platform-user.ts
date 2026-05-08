import { createSupabaseServerClient } from "@/lib/supabase/server";

export type PlatformUser = {
  id: string;
  role: "agent" | "admin" | "superadmin";
  active: boolean;
  agentId: string | null;
};

// Resolve the current authenticated user to their platform_users row + agent_id
// (if role=agent). Calls the SECURITY DEFINER function current_platform_user()
// — same one the RLS policies use, single source of truth for the email →
// role + agent_id mapping.
//
type CurrentPlatformUserRow = {
  id: string;
  role: string;
  active: boolean;
  agent_id: string | null;
};

// Returns null if no session or no matching platform_users row.
//
// Note: Supabase's generated rpc() typing collapses to `never` for
// table-returning functions with `Args: never`. Cast through `unknown` to
// the generated row shape (matches packages/shared/types/database.ts).
export async function getPlatformUser(): Promise<PlatformUser | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("current_platform_user");
  const rows = data as unknown as CurrentPlatformUserRow[] | null;
  if (error || !rows || rows.length === 0) return null;
  const row = rows[0]!;
  return {
    id: row.id,
    role: row.role as PlatformUser["role"],
    active: row.active,
    agentId: row.agent_id ?? null,
  };
}
