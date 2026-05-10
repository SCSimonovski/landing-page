import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@platform/shared/types/database";
import { US_STATES } from "@platform/shared/validation/common";
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
  states: string[]; // US state codes, whitelisted against US_STATES
  q?: string; // free-text search across name / email / phone
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
// `assigned_agent_name` maps to the `leads_with_agent` view's flat
// `agent_full_name` column (see buildLeadsQuery).
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

  // Whitelist against US_STATES so a hand-crafted ?state=ZZ doesn't reach
  // the DB query as a confusing no-results filter.
  const stateAllowed = new Set<string>(US_STATES);
  const states = getMulti(params, "state").filter((s) => stateAllowed.has(s));

  // Free-text search. Trimmed, capped at 80 chars so a paste-bomb can't
  // become a giant ILIKE pattern.
  const qRaw = getSingle(params, "q")?.trim() ?? "";
  const q = qRaw.length > 0 ? qRaw.slice(0, 80) : undefined;

  return {
    brands: getMulti(params, "brand"),
    products: getMulti(params, "product"),
    temps,
    agents: getMulti(params, "agent"),
    statuses,
    states,
    q,
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

// Build the leads read query. Reads from `leads_with_agent`, a
// security_invoker=on view that flattens leads + agents and exposes
// `agent_full_name` as a native column (so .order() works on it
// without PostgREST's one-to-one embed-sort quirks). RLS is inherited
// from `leads` and `agents`. `count: 'exact'` for pagination totals.
export function buildLeadsQuery(
  filters: LeadFilters,
  role: LeadsQueryRole,
  supabase: AnySupabaseClient,
) {
  // Default sort: created_at desc. User-controllable sort overrides via
  // ?sort=<column>&dir=<asc|desc>; the column is whitelisted in
  // parseFilters so .order() never sees an arbitrary string.
  //
  // assigned_agent_name maps to the view's flat `agent_full_name` column.
  // Unassigned leads (agent_full_name null) cluster last via nullsFirst:false.
  const ascending = filters.dir === "asc";
  let q = supabase.from("leads_with_agent").select("*", { count: "exact" });

  if (filters.sort === "assigned_agent_name") {
    if (role === "agent") {
      // Agent's leads are all theirs by definition; no useful sort to do.
      q = q.order("created_at", { ascending: false });
    } else {
      q = q.order("agent_full_name", { ascending, nullsFirst: false });
    }
  } else {
    const sortCol = filters.sort ?? "created_at";
    q = q.order(sortCol, { ascending });
  }

  // Multi-value filters use .in(). Single value works too (Supabase handles
  // a 1-element array fine). Empty array = no filter applied.
  if (filters.brands.length > 0) q = q.in("brand", filters.brands);
  if (filters.products.length > 0) q = q.in("product", filters.products);
  if (filters.temps.length > 0) q = q.in("temperature", filters.temps);
  if (filters.statuses.length > 0) q = q.in("status", filters.statuses);
  if (filters.states.length > 0) q = q.in("state", filters.states);

  // Free-text search. Strip characters that have meaning in Supabase's .or()
  // grammar (commas, parens, quotes, backslashes) and ILIKE wildcards
  // (% and _) so user input can't break the query string or unintentionally
  // wildcard. Phone gets a digits-only sub-search so any phone format the
  // user types matches the E.164 stored value.
  if (filters.q) {
    const safe = filters.q.replace(/[,()'"\\%_]/g, "").trim();
    const digits = filters.q.replace(/\D/g, "");
    const orParts: string[] = [];
    if (safe) {
      orParts.push(`first_name.ilike.%${safe}%`);
      orParts.push(`last_name.ilike.%${safe}%`);
      orParts.push(`email.ilike.%${safe}%`);
    }
    if (digits) orParts.push(`phone_e164.ilike.%${digits}%`);
    if (orParts.length > 0) q = q.or(orParts.join(","));
  }

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
