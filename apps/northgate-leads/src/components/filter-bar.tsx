import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FilterMenu } from "@/components/filter-menu";
import { clearAll, getMulti, getSingle, type SearchParams } from "@/lib/url-params";
import {
  LEAD_STATUS_LABEL,
  LEAD_STATUS_VALUES,
} from "@/lib/leads/lead-status-options";

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

// Server Component. Composes per-category FilterMenu dropdowns +
// "Reset all" link. Each FilterMenu handles its own URL navigation
// internally (client component); FilterBar reads the current state
// from searchParams to render selected counts on the buttons.
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

  const brandsSelected = getMulti(searchParams, "brand");
  const productsSelected = getMulti(searchParams, "product");
  const tempsSelected = getMulti(searchParams, "temp");
  const statusesSelected = getMulti(searchParams, "status");
  const sinceSelected = getSingle(searchParams, "since");
  const agentsSelected = getMulti(searchParams, "agent");

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

  return (
    <div className="border-b bg-card px-6 py-3">
      <div className="mx-auto max-w-7xl flex flex-wrap items-center gap-2">
        <FilterMenu
          label="Brand"
          paramKey="brand"
          options={BRAND_OPTIONS}
          selected={brandsSelected}
          mode="multi"
          searchParams={searchParams}
        />
        <FilterMenu
          label="Product"
          paramKey="product"
          options={PRODUCT_OPTIONS}
          selected={productsSelected}
          mode="multi"
          searchParams={searchParams}
        />
        <FilterMenu
          label="Status"
          paramKey="status"
          options={STATUS_OPTIONS}
          selected={statusesSelected}
          mode="multi"
          searchParams={searchParams}
        />
        <FilterMenu
          label="Temperature"
          paramKey="temp"
          options={TEMP_OPTIONS}
          selected={tempsSelected}
          mode="multi"
          searchParams={searchParams}
        />
        <FilterMenu
          label="Created"
          paramKey="since"
          options={SINCE_OPTIONS}
          selected={sinceSelected ? [sinceSelected] : []}
          mode="single"
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
        {hasAnyFilter && (
          <Button asChild variant="ghost" size="sm" className="h-8 ml-auto">
            <Link href={clearAll(searchParams) || "/leads"}>
              Reset all
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
