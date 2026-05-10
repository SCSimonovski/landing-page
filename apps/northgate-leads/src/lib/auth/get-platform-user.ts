import { createSupabaseServerClient } from "@/lib/supabase/server";

export type PlatformUser = {
  id: string;
  role: "agent" | "admin" | "superadmin";
  active: boolean;
  agentId: string | null;
  fullName: string | null;
};

// Resolve the current authenticated user to their platform_users row + agent_id
// (if role=agent). Calls the SECURITY DEFINER function current_platform_user()
// — same one the RLS policies use, single source of truth for the email →
// role + agent_id mapping.
//
// full_name is fetched via a separate SELECT against platform_users. The
// RPC's return shape can't be expanded in-place (Postgres SQLSTATE 42P13
// rejects CREATE OR REPLACE FUNCTION when the table-return changes, and
// DROP CASCADE would torch ~10 RLS policies that depend on the function).
// Two queries instead of one — minor cost, no policy churn. The user's
// own platform_users SELECT policy from Plan 3 covers this read.
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

  const { data: nameRow } = await supabase
    .from("platform_users")
    .select("full_name")
    .eq("id", row.id)
    .maybeSingle();
  const fullName =
    (nameRow as { full_name: string | null } | null)?.full_name ?? null;

  return {
    id: row.id,
    role: row.role as PlatformUser["role"],
    active: row.active,
    agentId: row.agent_id ?? null,
    fullName,
  };
}
