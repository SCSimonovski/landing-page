import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@platform/shared/types/database";
import { getMulti, getSingle, type SearchParams } from "./url-params";
import {
  isLeadStatus,
  type LeadStatus,
} from "./leads/lead-status-options";

// Loose Supabase client typing. `@supabase/ssr`'s createServerClient and
// `@supabase/supabase-js`'s SupabaseClient have different generic arities
// (the latter added a schema-name generic in v2.104+). Using `any` for the
// schema generic side-steps the mismatch.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<Database, "public", any>;

export type SortColumn =
  | "created_at"
  | "last_name"
  | "state"
  | "age"
  | "intent_score"
  | "status"
  | "assigned_agent_name";
export type SortDir = "asc" | "desc";

export type LeadFilters = {
  // Multi-value: empty array means "no filter on this dimension".
  brands: string[];
  products: string[];
  temps: Array<"hot" | "warm" | "cold">;
  agents: string[]; // agent.id values, OR the literal "unassigned"
  statuses: LeadStatus[];
  // Single-value:
  since?: "7d" | "30d" | "90d";
  // User-controllable sort. undefined = default (created_at desc).
  sort?: SortColumn;
  dir: SortDir; // defaults to "desc"
  page: number; // 1-indexed
  perPage: number;
};

export type LeadsQueryRole = "agent" | "admin" | "superadmin";

export const DEFAULT_PER_PAGE = 50;
export const MAX_PER_PAGE = 200;

const TEMP_VALUES = new Set(["hot", "warm", "cold"]);
const SINCE_VALUES = new Set(["7d", "30d", "90d"]);

// Whitelist of columns the sort URL param will accept. Keeps malicious /
// typo'd values from reaching Supabase's .order() and surfacing as confusing
// "column does not exist" errors. Brand / product / temperature are filters,
// not useful sort dimensions; phone / email alphabetical sort is weird;
// details is JSONB.
//
// `assigned_agent_name` is a special case in buildLeadsQuery: it sorts by
// the joined agents.full_name column via Supabase's `foreignTable` option.
const SORT_COLUMNS = new Set<SortColumn>([
  "created_at",
  "last_name",
  "state",
  "age",
  "intent_score",
  "status",
  "assigned_agent_name",
]);

// Parse search params from a Next 16 page.tsx into a typed filters object.
// Caps per_page to prevent runaway queries; clamps page to >= 1. Multi-value
// dimensions tolerate either ?brand=x or ?brand=x&brand=y.
export function parseFilters(params: SearchParams): LeadFilters {
  const pageRaw = parseInt(getSingle(params, "page") ?? "1", 10);
  const perPageRaw = parseInt(
    getSingle(params, "per_page") ?? String(DEFAULT_PER_PAGE),
    10,
  );

  const since = getSingle(params, "since");
  const sinceTyped = since && SINCE_VALUES.has(since)
    ? (since as LeadFilters["since"])
    : undefined;

  const temps = getMulti(params, "temp").filter((t) =>
    TEMP_VALUES.has(t),
  ) as LeadFilters["temps"];

  const sortRaw = getSingle(params, "sort");
  const sort = sortRaw && SORT_COLUMNS.has(sortRaw as SortColumn)
    ? (sortRaw as SortColumn)
    : undefined;
  const dirRaw = getSingle(params, "dir");
  const dir: SortDir = dirRaw === "asc" ? "asc" : "desc";

  const statuses = getMulti(params, "status").filter((s) =>
    isLeadStatus(s),
  ) as LeadStatus[];

  return {
    brands: getMulti(params, "brand"),
    products: getMulti(params, "product"),
    temps,
    agents: getMulti(params, "agent"),
    statuses,
    since: sinceTyped,
    sort,
    dir,
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

  // Default sort: created_at desc. User-controllable sort overrides via
  // ?sort=<column>&dir=<asc|desc>; the column is whitelisted in
  // parseFilters so .order() never sees an arbitrary string.
  //
  // assigned_agent_name is the foreign-table special case — sorts by the
  // joined agents.full_name via Supabase's `foreignTable` option. Skipped
  // for agent role (their leads are all theirs; agent join not selected).
  const ascending = filters.dir === "asc";
  let q = supabase.from("leads").select(select, { count: "exact" });

  if (
    filters.sort === "assigned_agent_name" &&
    role !== "agent"
  ) {
    q = q.order("full_name", { foreignTable: "agent", ascending });
  } else {
    const sortCol = filters.sort ?? "created_at";
    // Skip the assigned_agent_name case for agent role; fall back to default.
    const safeCol =
      sortCol === "assigned_agent_name" ? "created_at" : sortCol;
    q = q.order(safeCol, { ascending });
  }

  // Multi-value filters use .in(). Single value works too (Supabase handles
  // a 1-element array fine). Empty array = no filter applied.
  if (filters.brands.length > 0) q = q.in("brand", filters.brands);
  if (filters.products.length > 0) q = q.in("product", filters.products);
  if (filters.temps.length > 0) q = q.in("temperature", filters.temps);
  if (filters.statuses.length > 0) q = q.in("status", filters.statuses);

  const cutoff = sinceToCutoff(filters.since);
  if (cutoff) q = q.gte("created_at", cutoff);

  // Agent filter is admin/superadmin-only at the UI level; if an agent
  // crafts the URL manually, RLS still scopes them to their own leads
  // (server-side enforcement). The "unassigned" sentinel maps to NULL —
  // mixing "unassigned" with concrete agent ids in the same filter is
  // supported via .or() (`agent_id is null OR agent_id in (...)`).
  if (
    filters.agents.length > 0 &&
    (role === "admin" || role === "superadmin")
  ) {
    const concrete = filters.agents.filter((a) => a !== "unassigned");
    const includesUnassigned = filters.agents.includes("unassigned");
    if (includesUnassigned && concrete.length > 0) {
      q = q.or(`agent_id.is.null,agent_id.in.(${concrete.join(",")})`);
    } else if (includesUnassigned) {
      q = q.is("agent_id", null);
    } else {
      q = q.in("agent_id", concrete);
    }
  }

  const from = (filters.page - 1) * filters.perPage;
  const to = from + filters.perPage - 1;
  return q.range(from, to);
}
