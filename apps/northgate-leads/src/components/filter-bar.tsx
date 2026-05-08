import Link from "next/link";
import { toggleParam, clearAll, type SearchParams } from "@/lib/url-params";

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

function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
        active
          ? "border-accent bg-accent text-white"
          : "border-border bg-background text-foreground-soft hover:bg-hover"
      }`}
    >
      {children}
    </Link>
  );
}

function Group({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </span>
      {children}
    </div>
  );
}

export function FilterBar({
  searchParams,
  role,
  agents,
}: {
  searchParams: SearchParams;
  role: "agent" | "admin" | "superadmin";
  agents?: AgentOption[];
}) {
  const current = (key: string) => {
    const v = searchParams[key];
    return Array.isArray(v) ? v[0] : v;
  };

  const hasAnyFilter = ["brand", "product", "temp", "since", "agent"].some(
    (k) => current(k),
  );

  const isAdmin = role === "admin" || role === "superadmin";

  return (
    <div className="border-b border-border bg-hover px-6 py-4">
      <div className="mx-auto max-w-7xl flex flex-col gap-3">
        <Group label="Brand">
          {BRAND_OPTIONS.map((o) => (
            <Chip
              key={o.value}
              href={toggleParam(searchParams, "brand", o.value)}
              active={current("brand") === o.value}
            >
              {o.label}
            </Chip>
          ))}
        </Group>
        <Group label="Product">
          {PRODUCT_OPTIONS.map((o) => (
            <Chip
              key={o.value}
              href={toggleParam(searchParams, "product", o.value)}
              active={current("product") === o.value}
            >
              {o.label}
            </Chip>
          ))}
        </Group>
        <Group label="Temperature">
          {TEMP_OPTIONS.map((o) => (
            <Chip
              key={o.value}
              href={toggleParam(searchParams, "temp", o.value)}
              active={current("temp") === o.value}
            >
              {o.label}
            </Chip>
          ))}
        </Group>
        <Group label="Created">
          {SINCE_OPTIONS.map((o) => (
            <Chip
              key={o.value}
              href={toggleParam(searchParams, "since", o.value)}
              active={current("since") === o.value}
            >
              {o.label}
            </Chip>
          ))}
        </Group>
        {isAdmin && agents && (
          <Group label="Agent">
            <Chip
              href={toggleParam(searchParams, "agent", "unassigned")}
              active={current("agent") === "unassigned"}
            >
              Unassigned
            </Chip>
            {agents.map((a) => (
              <Chip
                key={a.id}
                href={toggleParam(searchParams, "agent", a.id)}
                active={current("agent") === a.id}
              >
                {a.full_name}
              </Chip>
            ))}
          </Group>
        )}
        {hasAnyFilter && (
          <div>
            <Link
              href={clearAll(searchParams) || "/leads"}
              className="text-xs text-accent hover:text-accent-hover"
            >
              Clear all filters
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
