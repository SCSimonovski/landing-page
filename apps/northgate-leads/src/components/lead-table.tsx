import Link from "next/link";
import { ArrowDownIcon, ArrowUpIcon, ArrowUpDownIcon } from "lucide-react";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  clearAll,
  cycleSort,
  getMulti,
  getSingle,
  type SearchParams,
} from "@/lib/url-params";
import { cn } from "@/lib/utils";
import { LeadRow } from "@/components/lead-row";
import { LeadHeaderCheckbox } from "@/components/lead-header-checkbox";
import type { LeadStatus } from "@/lib/leads/lead-status-options";

// Server Component. Renders the table chrome (headers + sortable links +
// empty state). Each row is a LeadRow client component (handles
// click-to-detail navigation per Plan 5 Decision #22).

type LeadRowData = {
  id: string;
  created_at: string;
  brand: string;
  product: string;
  first_name: string;
  last_name: string;
  phone_e164: string;
  email: string;
  state: string;
  age: number;
  intent_score: number;
  temperature: string;
  status: LeadStatus;
  details: Record<string, unknown> | null;
  on_dnc: boolean;
  agent_id: string | null;
  agent?: { id: string; full_name: string } | null;
};

// Sortable column header. Lives at module scope (React 19 lints inner
// component declarations as "components created during render").
function SortHead({
  column,
  children,
  searchParams,
  sortCol,
  sortDir,
}: {
  column: string;
  children: React.ReactNode;
  searchParams: SearchParams;
  sortCol: string | undefined;
  sortDir: string | undefined;
}) {
  const isActive = sortCol === column;
  const Icon = !isActive
    ? ArrowUpDownIcon
    : sortDir === "asc"
      ? ArrowUpIcon
      : ArrowDownIcon;
  return (
    <TableHead>
      <Link
        href={`/leads${cycleSort(searchParams, column)}`}
        className={cn(
          "inline-flex items-center gap-1 hover:text-foreground transition-colors",
          isActive && "text-foreground font-medium",
        )}
      >
        {children}
        <Icon
          className={cn("size-3", isActive ? "opacity-100" : "opacity-30")}
        />
      </Link>
    </TableHead>
  );
}

export function LeadTable({
  leads,
  role,
  searchParams,
}: {
  leads: LeadRowData[];
  role: "agent" | "admin" | "superadmin";
  searchParams: SearchParams;
}) {
  const isAdmin = role === "admin" || role === "superadmin";
  const hasAnyFilter =
    getMulti(searchParams, "brand").length > 0 ||
    getMulti(searchParams, "product").length > 0 ||
    getMulti(searchParams, "temp").length > 0 ||
    getMulti(searchParams, "agent").length > 0 ||
    getMulti(searchParams, "status").length > 0 ||
    Boolean(getSingle(searchParams, "since"));

  if (leads.length === 0) {
    return (
      <div className="px-6 py-16 text-center">
        {hasAnyFilter ? (
          <>
            <p className="text-foreground mb-2">No leads match these filters.</p>
            <Button asChild variant="link" size="sm">
              <Link href={clearAll(searchParams) || "/leads"}>
                Clear filters
              </Link>
            </Button>
          </>
        ) : (
          <p className="text-muted-foreground">
            No leads yet. New leads will appear here as soon as they&apos;re
            submitted.
          </p>
        )}
      </div>
    );
  }

  const sortCol = getSingle(searchParams, "sort");
  const sortDir = getSingle(searchParams, "dir");
  const visibleIds = leads.map((l) => l.id);

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <LeadHeaderCheckbox visibleIds={visibleIds} />
            <SortHead column="created_at" searchParams={searchParams} sortCol={sortCol} sortDir={sortDir}>Created</SortHead>
            <TableHead>Brand</TableHead>
            <TableHead>Product</TableHead>
            <SortHead column="status" searchParams={searchParams} sortCol={sortCol} sortDir={sortDir}>Status</SortHead>
            {isAdmin && (
              <SortHead column="assigned_agent_name" searchParams={searchParams} sortCol={sortCol} sortDir={sortDir}>Assigned</SortHead>
            )}
            <SortHead column="last_name" searchParams={searchParams} sortCol={sortCol} sortDir={sortDir}>Name</SortHead>
            <TableHead>Phone</TableHead>
            <TableHead>Email</TableHead>
            <SortHead column="state" searchParams={searchParams} sortCol={sortCol} sortDir={sortDir}>State</SortHead>
            <SortHead column="age" searchParams={searchParams} sortCol={sortCol} sortDir={sortDir}>Age</SortHead>
            <SortHead column="intent_score" searchParams={searchParams} sortCol={sortCol} sortDir={sortDir}>Score</SortHead>
            <TableHead>Details</TableHead>
            <TableHead>DNC</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <LeadRow key={lead.id} lead={lead} isAdmin={isAdmin} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
