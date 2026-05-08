// URL search-param helpers for the leads page filter UI.
//
// Filter chips are <Link>s — each chip's href is "current params, with this
// filter toggled." Combination cases (toggle temperature while brand is set;
// clear all but preserve per_page) are guaranteed-to-bug if the manipulation
// is inlined in the FilterBar JSX. Pure functions, vitest-tested.
//
// All functions take a Record<string, string | string[] | undefined> (the
// shape Next 16 awaitable searchParams resolves to) and return a string —
// the new query-string fragment ready to drop into <Link href={...}>.

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

// Toggle: set the param if absent OR currently a different value;
// clear it if it's the current value (so clicking "hot" twice clears
// the temp filter). Resets pagination to page 1 (the new filter set
// changes the result count; staying on page 5 of the old set is wrong).
export function toggleParam(
  params: SearchParams,
  key: string,
  value: string,
): string {
  const current = params[key];
  const isCurrent = current === value;
  const filtered = toEntries(params).filter(
    ([k]) => k !== key && k !== "page",
  );
  if (!isCurrent) filtered.push([key, value]);
  return build(filtered);
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

// Drop a single named param (preserving everything else).
export function clearParam(params: SearchParams, key: string): string {
  return build(toEntries(params).filter(([k]) => k !== key));
}

// Clear filters but keep UI preferences (per_page). Resets pagination.
export function clearAll(params: SearchParams): string {
  const perPage = params.per_page;
  if (perPage && typeof perPage === "string") {
    return build([["per_page", perPage]]);
  }
  return "";
}
