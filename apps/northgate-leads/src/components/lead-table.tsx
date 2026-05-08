import Link from "next/link";
import { ArrowDownIcon, ArrowUpIcon, ArrowUpDownIcon } from "lucide-react";
import {
  Badge,
  brandLabel,
  brandVariant,
  productLabel,
  productVariant,
  tempVariant,
} from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
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

// Loose type — the actual rows come from the typed Supabase query but this
// component renders them generically for both agent + admin views.
type LeadRow = {
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
  details: Record<string, unknown> | null;
  on_dnc: boolean;
  agent_id: string | null;
  agent?: { id: string; full_name: string } | null;
};

function formatPhone(e164: string): string {
  // E.164 like +15555550199 → "(555) 555-0199"
  const m = e164.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  if (!m) return e164;
  return `(${m[1]}) ${m[2]}-${m[3]}`;
}

function formatCreated(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = new Date(iso);
  const month = d.toLocaleString("en-US", { month: "short" });
  const day = d.getDate();
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "p" : "a";
  h = h % 12 || 12;
  return `${month} ${day}, ${h}:${m}${ampm}`;
}

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

function renderDetails(
  product: string,
  details: Record<string, unknown> | null,
): string {
  if (!details) return "— no details —";
  if (product === "mortgage_protection") {
    const balance = details.mortgage_balance;
    const smoker = details.is_smoker;
    const homeowner = details.is_homeowner;
    if (
      typeof balance !== "number" ||
      typeof smoker !== "boolean" ||
      typeof homeowner !== "boolean"
    ) {
      return "— details malformed —";
    }
    const balK = `$${Math.round(balance / 1000)}k mortgage`;
    return `${balK} · ${smoker ? "smoker" : "non-smoker"} · ${homeowner ? "homeowner" : "non-homeowner"}`;
  }
  if (product === "final_expense") {
    const cov = details.desired_coverage;
    const smoker = details.is_smoker;
    const health = details.has_major_health_conditions;
    const ben = details.beneficiary_relationship;
    if (
      typeof cov !== "number" ||
      typeof smoker !== "boolean" ||
      typeof health !== "boolean" ||
      typeof ben !== "string"
    ) {
      return "— details malformed —";
    }
    return `$${Math.round(cov / 1000)}k coverage · ${ben} · ${health ? "MAJOR conditions" : "no major"} · ${smoker ? "smoker" : "non-smoker"}`;
  }
  return `— unknown product: ${product} —`;
}

export function LeadTable({
  leads,
  role,
  searchParams,
}: {
  leads: LeadRow[];
  role: "agent" | "admin" | "superadmin";
  searchParams: SearchParams;
}) {
  const isAdmin = role === "admin" || role === "superadmin";
  const hasAnyFilter =
    getMulti(searchParams, "brand").length > 0 ||
    getMulti(searchParams, "product").length > 0 ||
    getMulti(searchParams, "temp").length > 0 ||
    getMulti(searchParams, "agent").length > 0 ||
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

  // Sortable column header — clicking cycles asc → desc → cleared (default).
  // Pass current sort + dir down so SortHead doesn't re-read on every render.
  const sortCol = getSingle(searchParams, "sort");
  const sortDir = getSingle(searchParams, "dir");

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <SortHead column="created_at" searchParams={searchParams} sortCol={sortCol} sortDir={sortDir}>Created</SortHead>
            <TableHead>Brand</TableHead>
            <TableHead>Product</TableHead>
            <SortHead column="last_name" searchParams={searchParams} sortCol={sortCol} sortDir={sortDir}>Name</SortHead>
            <TableHead>Phone</TableHead>
            <TableHead>Email</TableHead>
            <SortHead column="state" searchParams={searchParams} sortCol={sortCol} sortDir={sortDir}>State</SortHead>
            <SortHead column="age" searchParams={searchParams} sortCol={sortCol} sortDir={sortDir}>Age</SortHead>
            <SortHead column="intent_score" searchParams={searchParams} sortCol={sortCol} sortDir={sortDir}>Score</SortHead>
            <TableHead>Details</TableHead>
            {isAdmin && <TableHead>Assigned</TableHead>}
            <TableHead>DNC</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <TableRow key={lead.id}>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {formatCreated(lead.created_at)}
              </TableCell>
              <TableCell>
                <Badge variant={brandVariant(lead.brand)}>
                  {brandLabel(lead.brand)}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={productVariant(lead.product)}>
                  {productLabel(lead.product)}
                </Badge>
              </TableCell>
              <TableCell className="whitespace-nowrap text-foreground">
                {lead.first_name} {lead.last_name}
              </TableCell>
              <TableCell className="whitespace-nowrap font-mono text-xs">
                <a
                  href={`tel:${lead.phone_e164}`}
                  className="text-link hover:text-link-hover"
                >
                  {formatPhone(lead.phone_e164)}
                </a>
              </TableCell>
              <TableCell className="whitespace-nowrap text-xs">
                <a
                  href={`mailto:${lead.email}`}
                  className="text-link hover:text-link-hover"
                >
                  {lead.email}
                </a>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {lead.state}
              </TableCell>
              <TableCell className="text-muted-foreground">{lead.age}</TableCell>
              <TableCell className="whitespace-nowrap font-mono text-xs">
                <span className="text-foreground">{lead.intent_score}</span>
                <span className="text-muted-foreground">/90 </span>
                <Badge variant={tempVariant(lead.temperature)}>
                  {lead.temperature}
                </Badge>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {renderDetails(lead.product, lead.details)}
              </TableCell>
              {isAdmin && (
                <TableCell className="whitespace-nowrap text-foreground">
                  {lead.agent?.full_name ?? (
                    <span className="text-muted-foreground italic">
                      — unassigned —
                    </span>
                  )}
                </TableCell>
              )}
              <TableCell>
                {lead.on_dnc && (
                  <Badge variant="dnc" title="On DNC registry">
                    DNC
                  </Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
