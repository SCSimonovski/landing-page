import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@platform/shared/types/database";

// Loose Supabase client typing. `@supabase/ssr`'s createServerClient and
// `@supabase/supabase-js`'s SupabaseClient have different generic arities
// (the latter added a schema-name generic in v2.104+). Using `any` for the
// schema generic side-steps the mismatch.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<Database, "public", any>;

export type LeadFilters = {
  brand?: string;
  product?: string;
  temp?: "hot" | "warm" | "cold";
  since?: "7d" | "30d" | "90d";
  agent?: string; // agent.id, or "unassigned"
  page: number; // 1-indexed
  perPage: number;
};

export type LeadsQueryRole = "agent" | "admin" | "superadmin";

export const DEFAULT_PER_PAGE = 50;
export const MAX_PER_PAGE = 200;

// Parse search params from a Next 16 page.tsx into a typed filters object.
// Caps per_page to prevent runaway queries; clamps page to >= 1.
export function parseFilters(
  params: Record<string, string | string[] | undefined>,
): LeadFilters {
  const get = (k: string): string | undefined => {
    const v = params[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const pageRaw = parseInt(get("page") ?? "1", 10);
  const perPageRaw = parseInt(get("per_page") ?? String(DEFAULT_PER_PAGE), 10);
  return {
    brand: get("brand") || undefined,
    product: get("product") || undefined,
    temp: (get("temp") as LeadFilters["temp"]) || undefined,
    since: (get("since") as LeadFilters["since"]) || undefined,
    agent: get("agent") || undefined,
    page: Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1,
    perPage: Math.min(
      Math.max(Number.isFinite(perPageRaw) ? perPageRaw : DEFAULT_PER_PAGE, 1),
      MAX_PER_PAGE,
    ),
  };
}

// Map a `since` preset to the cutoff timestamp (ISO).
export function sinceToCutoff(since: LeadFilters["since"]): string | null {
  if (!since) return null;
  const days = since === "7d" ? 7 : since === "30d" ? 30 : 90;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

// Build the leads query for the platform's leads table.
//
// `role` controls whether to join `agents` (admin/superadmin get the assigned
// agent's full_name in the row); for agent role we skip the join (their leads
// are all theirs by definition; the join would be wasted).
//
// Returns the chained query (not awaited) so the caller awaits it. The query
// uses `count: 'exact'` so the response includes the total row count for
// pagination's "Showing X-Y of Z" line.
export function buildLeadsQuery(
  filters: LeadFilters,
  role: LeadsQueryRole,
  supabase: AnySupabaseClient,
) {
  // Admin/superadmin: join the assigned agent for the "Assigned" column.
  // Only one FK from leads to agents exists; alias to `agent` for cleaner
  // field naming on the row (singular makes the LeadTable cell read better).
  const select = role === "agent" ? "*" : "*, agent:agents(id, full_name)";

  let q = supabase
    .from("leads")
    .select(select, { count: "exact" })
    .order("created_at", { ascending: false });

  if (filters.brand) q = q.eq("brand", filters.brand);
  if (filters.product) q = q.eq("product", filters.product);
  if (filters.temp) q = q.eq("temperature", filters.temp);

  const cutoff = sinceToCutoff(filters.since);
  if (cutoff) q = q.gte("created_at", cutoff);

  // Agent filter is admin/superadmin-only at the UI level; if an agent
  // crafts the URL manually, RLS still scopes them to their own leads
  // (server-side enforcement). The `unassigned` sentinel maps to NULL.
  if (filters.agent && (role === "admin" || role === "superadmin")) {
    if (filters.agent === "unassigned") {
      q = q.is("agent_id", null);
    } else {
      q = q.eq("agent_id", filters.agent);
    }
  }

  const from = (filters.page - 1) * filters.perPage;
  const to = from + filters.perPage - 1;
  return q.range(from, to);
}
