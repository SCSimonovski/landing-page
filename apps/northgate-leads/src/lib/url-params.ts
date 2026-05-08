// URL search-param helpers for the leads page filter UI.
//
// Filter chips push to URL — each click is a navigation. Pure functions,
// vitest-tested. All functions take a Record<string, string | string[] | undefined>
// (the shape Next 16 awaitable searchParams resolves to) and return a
// string — the new query-string fragment ready to drop into router.push or
// <Link href={...}>.
//
// Multi-value support (Plan 4 v0.2 update): brand / product / temp / agent
// can hold multiple values via repeated keys (?brand=x&brand=y). `since`
// stays single-value (a date range is one window, not several).

export type SearchParams = Record<string, string | string[] | undefined>;

function toEntries(params: SearchParams): Array<[string, string]> {
  const entries: Array<[string, string]> = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) entries.push([key, v]);
    } else {
      entries.push([key, value]);
    }
  }
  return entries;
}

function build(entries: Array<[string, string]>): string {
  if (entries.length === 0) return "";
  const search = new URLSearchParams(entries);
  return `?${search.toString()}`;
}

// Single-value toggle: set the param if absent OR currently a different
// value; clear it if it's the current value (so clicking the active
// option twice clears it). Resets pagination to page 1. Used for `since`.
export function toggleParam(
  params: SearchParams,
  key: string,
  value: string,
): string {
  const current = params[key];
  const currentSingle = Array.isArray(current) ? current[0] : current;
  const isCurrent = currentSingle === value;
  const filtered = toEntries(params).filter(
    ([k]) => k !== key && k !== "page",
  );
  if (!isCurrent) filtered.push([key, value]);
  return build(filtered);
}

// Multi-value toggle: add the value if absent, remove if present. Used
// for brand / product / temp / agent. Resets pagination to page 1.
export function toggleMultiParam(
  params: SearchParams,
  key: string,
  value: string,
): string {
  const entries = toEntries(params).filter(([k]) => k !== "page");
  const existingForKey = entries
    .filter(([k]) => k === key)
    .map(([, v]) => v);
  const isSelected = existingForKey.includes(value);
  const newForKey = isSelected
    ? existingForKey.filter((v) => v !== value)
    : [...existingForKey, value];
  const others = entries.filter(([k]) => k !== key);
  return build([
    ...others,
    ...newForKey.map((v) => [key, v] as [string, string]),
  ]);
}

// Set unconditionally. Used for pagination — clicking page 3 always sets
// page=3, regardless of what page is currently selected.
export function setParam(
  params: SearchParams,
  key: string,
  value: string,
): string {
  const filtered = toEntries(params).filter(([k]) => k !== key);
  filtered.push([key, value]);
  return build(filtered);
}

// Drop a single named param entirely (preserving everything else).
// Used by FilterMenu's "clear this filter" action.
export function clearParam(params: SearchParams, key: string): string {
  const filtered = toEntries(params).filter(([k]) => k !== key && k !== "page");
  return build(filtered);
}

// Clear filters but keep UI preferences (per_page). Resets pagination.
export function clearAll(params: SearchParams): string {
  const perPage = params.per_page;
  if (perPage && typeof perPage === "string") {
    return build([["per_page", perPage]]);
  }
  return "";
}

// Read a multi-value param as a string[]. Handles undefined/string/string[]
// uniformly so callers don't need to remember to normalize.
export function getMulti(params: SearchParams, key: string): string[] {
  const v = params[key];
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

// Read a single-value param. If the param appears multiple times in the
// URL, returns the first value.
export function getSingle(params: SearchParams, key: string): string | undefined {
  const v = params[key];
  return Array.isArray(v) ? v[0] : v;
}

// Sort cycle for clickable table column headers. Three-state per column:
//   none  → asc
//   asc   → desc
//   desc  → clear (back to default sort)
// Different column → reset to asc on the new column.
// Resets pagination on every sort change.
export function cycleSort(params: SearchParams, column: string): string {
  const currentSort = getSingle(params, "sort");
  const currentDir = getSingle(params, "dir");

  let newSort: string | null;
  let newDir: string | null;
  if (currentSort !== column) {
    newSort = column;
    newDir = "asc";
  } else if (currentDir === "asc") {
    newSort = column;
    newDir = "desc";
  } else {
    newSort = null;
    newDir = null;
  }

  const entries = toEntries(params).filter(
    ([k]) => k !== "sort" && k !== "dir" && k !== "page",
  );
  if (newSort) entries.push(["sort", newSort]);
  if (newDir) entries.push(["dir", newDir]);
  return build(entries);
}
