"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SearchIcon, XIcon } from "lucide-react";
import { US_STATES } from "@platform/shared/validation/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterMenu } from "@/components/filter-menu";
import { AddFilterButton } from "@/components/add-filter-button";
import {
  clearAll,
  clearParam,
  getMulti,
  getSingle,
  type SearchParams,
} from "@/lib/url-params";
import {
  LEAD_STATUS_LABEL,
  LEAD_STATUS_VALUES,
} from "@/lib/leads/lead-status-options";
import { cn } from "@/lib/utils";

const SEARCH_DEBOUNCE_MS = 300;

// Build href that sets ?q=value (or drops it when empty) and resets page=1.
function searchHref(params: SearchParams, q: string): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (k === "q" || k === "page" || v === undefined) continue;
    if (Array.isArray(v)) v.forEach((x) => search.append(k, x));
    else search.append(k, v);
  }
  const trimmed = q.trim();
  if (trimmed) search.set("q", trimmed);
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

function SearchInput({
  initial,
  onCommit,
  className,
}: {
  initial: string;
  onCommit: (q: string) => void;
  className?: string;
}) {
  const [value, setValue] = useState(initial);
  const [prevInitial, setPrevInitial] = useState(initial);

  // React-recommended "reset state when prop changes" pattern: detect the
  // external change during render rather than via useEffect, so e.g.
  // Reset all visibly clears the input without an extra paint.
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setValue(initial);
  }

  // Debounce: push the URL only when typing stops for SEARCH_DEBOUNCE_MS.
  useEffect(() => {
    if (value.trim() === initial.trim()) return;
    const t = setTimeout(() => onCommit(value), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [value, initial, onCommit]);

  return (
    <div className={cn("relative", className)}>
      <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search by name, email, phone…"
        className="h-9 pl-8 pr-8"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => setValue("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
        >
          <XIcon className="size-4" />
        </button>
      )}
    </div>
  );
}

const MAX_CHIP_NAMES = 3;

function summarize(
  allOptions: { value: string; label: string }[],
  selected: string[],
): string {
  if (selected.length === allOptions.length) return "All";
  if (selected.length <= MAX_CHIP_NAMES) {
    return selected
      .map((v) => allOptions.find((o) => o.value === v)?.label ?? v)
      .join(", ");
  }
  return `${selected.length} selected`;
}

type AgentOption = { id: string; full_name: string };

const BRAND_OPTIONS = [
  { value: "northgate-protection", label: "Northgate Protection" },
  { value: "northgate-heritage", label: "Northgate Heritage" },
];

const PRODUCT_OPTIONS = [
  { value: "mortgage_protection", label: "Mortgage protection" },
  { value: "final_expense", label: "Final expense" },
];

const TEMP_OPTIONS = [
  { value: "hot", label: "Hot" },
  { value: "warm", label: "Warm" },
  { value: "cold", label: "Cold" },
];

const SINCE_OPTIONS = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];

const STATUS_OPTIONS = LEAD_STATUS_VALUES.map((v) => ({
  value: v,
  label: LEAD_STATUS_LABEL[v],
}));

const STATE_OPTIONS = US_STATES.map((s) => ({ value: s, label: s }));

// Primary row (Status, Agent, Brand) is always visible. Overflow filters
// (Product, Temperature, Created, State) live behind "+ Filter" until
// the user picks a value or manually promotes one. Free-text search
// (?q=) coexists in the same row, right-aligned on desktop.
export function FilterBar({
  searchParams,
  role,
  agents,
}: {
  searchParams: SearchParams;
  role: "agent" | "admin" | "superadmin";
  agents?: AgentOption[];
}) {
  const isAdmin = role === "admin" || role === "superadmin";
  const router = useRouter();
  const qFromUrl = getSingle(searchParams, "q") ?? "";

  // Tracks overflow filters added via "+ Filter" before the user has
  // picked a value. Once a value lands in the URL, that check takes over.
  const [manuallyPromoted, setManuallyPromoted] = useState<Set<string>>(
    () => new Set(),
  );

  const brandsSelected = getMulti(searchParams, "brand");
  const productsSelected = getMulti(searchParams, "product");
  const tempsSelected = getMulti(searchParams, "temp");
  const statusesSelected = getMulti(searchParams, "status");
  const sinceSelected = getSingle(searchParams, "since");
  const agentsSelected = getMulti(searchParams, "agent");
  const statesSelected = getMulti(searchParams, "state");

  const productPromoted =
    productsSelected.length > 0 || manuallyPromoted.has("product");
  const tempPromoted =
    tempsSelected.length > 0 || manuallyPromoted.has("temp");
  const sincePromoted =
    Boolean(sinceSelected) || manuallyPromoted.has("since");
  const statePromoted =
    statesSelected.length > 0 || manuallyPromoted.has("state");

  const hasAnyFilter =
    brandsSelected.length > 0 ||
    productsSelected.length > 0 ||
    tempsSelected.length > 0 ||
    statusesSelected.length > 0 ||
    Boolean(sinceSelected) ||
    agentsSelected.length > 0 ||
    statesSelected.length > 0 ||
    qFromUrl.length > 0;

  const agentOptions: { value: string; label: string }[] = isAdmin && agents
    ? [
        { value: "unassigned", label: "— Unassigned —" },
        ...agents.map((a) => ({ value: a.id, label: a.full_name })),
      ]
    : [];

  const hiddenOverflow = [
    productPromoted ? null : { key: "product", label: "Product" },
    tempPromoted ? null : { key: "temp", label: "Temperature" },
    sincePromoted ? null : { key: "since", label: "Created" },
    statePromoted ? null : { key: "state", label: "State" },
  ].filter((x): x is { key: string; label: string } => x !== null);

  function handleAddFilter(key: string) {
    setManuallyPromoted((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }

  function handleChipClear(key: string) {
    setManuallyPromoted((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }

  type ActiveChip = { key: string; label: string; summary: string };
  const activeChips: ActiveChip[] = [
    statusesSelected.length > 0 && {
      key: "status",
      label: "Status",
      summary: summarize(STATUS_OPTIONS, statusesSelected),
    },
    isAdmin && agentsSelected.length > 0 && {
      key: "agent",
      label: "Agent",
      summary: summarize(agentOptions, agentsSelected),
    },
    brandsSelected.length > 0 && {
      key: "brand",
      label: "Brand",
      summary: summarize(BRAND_OPTIONS, brandsSelected),
    },
    productsSelected.length > 0 && {
      key: "product",
      label: "Product",
      summary: summarize(PRODUCT_OPTIONS, productsSelected),
    },
    tempsSelected.length > 0 && {
      key: "temp",
      label: "Temperature",
      summary: summarize(TEMP_OPTIONS, tempsSelected),
    },
    sinceSelected && {
      key: "since",
      label: "Created",
      summary:
        SINCE_OPTIONS.find((o) => o.value === sinceSelected)?.label ??
        sinceSelected,
    },
    statesSelected.length > 0 && {
      key: "state",
      label: "State",
      summary: summarize(STATE_OPTIONS, statesSelected),
    },
  ].filter((c): c is ActiveChip => Boolean(c));

  function commitSearch(q: string) {
    router.push(`/leads${searchHref(searchParams, q)}`);
  }

  return (
    <div className="border-b bg-card px-4 py-3 sm:px-6">
      <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            initial={qFromUrl}
            onCommit={commitSearch}
            className="order-first w-full sm:order-last sm:ml-auto sm:w-[320px]"
          />
          <FilterMenu
            label="Status"
            paramKey="status"
            options={STATUS_OPTIONS}
            selected={statusesSelected}
            mode="multi"
            searchParams={searchParams}
          />
          {isAdmin && agentOptions.length > 0 && (
            <FilterMenu
              label="Agent"
              paramKey="agent"
              options={agentOptions}
              selected={agentsSelected}
              mode="multi"
              searchParams={searchParams}
            />
          )}
          <FilterMenu
            label="Brand"
            paramKey="brand"
            options={BRAND_OPTIONS}
            selected={brandsSelected}
            mode="multi"
            searchParams={searchParams}
          />
          {productPromoted && (
            <FilterMenu
              label="Product"
              paramKey="product"
              options={PRODUCT_OPTIONS}
              selected={productsSelected}
              mode="multi"
              searchParams={searchParams}
            />
          )}
          {tempPromoted && (
            <FilterMenu
              label="Temperature"
              paramKey="temp"
              options={TEMP_OPTIONS}
              selected={tempsSelected}
              mode="multi"
              searchParams={searchParams}
            />
          )}
          {sincePromoted && (
            <FilterMenu
              label="Created"
              paramKey="since"
              options={SINCE_OPTIONS}
              selected={sinceSelected ? [sinceSelected] : []}
              mode="single"
              searchParams={searchParams}
            />
          )}
          {statePromoted && (
            <FilterMenu
              label="State"
              paramKey="state"
              options={STATE_OPTIONS}
              selected={statesSelected}
              mode="multi"
              searchParams={searchParams}
            />
          )}
          {hiddenOverflow.length > 0 && (
            <AddFilterButton options={hiddenOverflow} onSelect={handleAddFilter} />
          )}
        </div>
        {hasAnyFilter && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {activeChips.map((c) => (
              <span
                key={c.key}
                className="inline-flex items-center gap-1.5 rounded-md border bg-muted/60 px-2 py-1 text-xs"
              >
                <span className="font-medium text-foreground">{c.label}:</span>
                <span className="text-muted-foreground">{c.summary}</span>
                <Link
                  href={clearParam(searchParams, c.key) || "/leads"}
                  onClick={() => handleChipClear(c.key)}
                  aria-label={`Clear ${c.label} filter`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <XIcon className="size-3" />
                </Link>
              </span>
            ))}
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="ml-auto h-8"
              onClick={() => setManuallyPromoted(new Set())}
            >
              <Link href={clearAll(searchParams) || "/leads"}>Reset all</Link>
            </Button>
          </div>
        )}
    </div>
  );
}
