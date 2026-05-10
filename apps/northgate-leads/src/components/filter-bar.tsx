"use client";

import { useState } from "react";
import Link from "next/link";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
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

// Primary row (Status, Agent, Brand) is always visible. Overflow filters
// (Product, Temperature, Created) live behind "+ Filter" until the user
// either picks a value (URL keeps it visible) or manually promotes one.
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

  const productPromoted =
    productsSelected.length > 0 || manuallyPromoted.has("product");
  const tempPromoted =
    tempsSelected.length > 0 || manuallyPromoted.has("temp");
  const sincePromoted =
    Boolean(sinceSelected) || manuallyPromoted.has("since");

  const hasAnyFilter =
    brandsSelected.length > 0 ||
    productsSelected.length > 0 ||
    tempsSelected.length > 0 ||
    statusesSelected.length > 0 ||
    Boolean(sinceSelected) ||
    agentsSelected.length > 0;

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
  ].filter((c): c is ActiveChip => Boolean(c));

  return (
    <div className="border-b bg-card px-4 py-3 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center gap-2">
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

        {hiddenOverflow.length > 0 && (
          <AddFilterButton options={hiddenOverflow} onSelect={handleAddFilter} />
        )}

        {hasAnyFilter && (
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="ml-auto h-8"
            onClick={() => setManuallyPromoted(new Set())}
          >
            <Link href={clearAll(searchParams) || "/leads"}>Reset all</Link>
          </Button>
        )}
        </div>
        {activeChips.length > 0 && (
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
          </div>
        )}
      </div>
    </div>
  );
}
