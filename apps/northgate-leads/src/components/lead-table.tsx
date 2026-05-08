import Link from "next/link";
import { Badge, brandVariant, productVariant, tempVariant } from "./badge";
import { clearAll, type SearchParams } from "@/lib/url-params";

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

function renderDetails(product: string, details: Record<string, unknown> | null): string {
  if (!details) return "— no details —";
  if (product === "mortgage_protection") {
    const balance = details.mortgage_balance;
    const smoker = details.is_smoker;
    const homeowner = details.is_homeowner;
    if (typeof balance !== "number" || typeof smoker !== "boolean" || typeof homeowner !== "boolean") {
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
  const hasAnyFilter = ["brand", "product", "temp", "since", "agent"].some(
    (k) => {
      const v = searchParams[k];
      return Array.isArray(v) ? v.length > 0 : Boolean(v);
    },
  );

  if (leads.length === 0) {
    return (
      <div className="px-6 py-16 text-center">
        {hasAnyFilter ? (
          <>
            <p className="text-foreground mb-2">No leads match these filters.</p>
            <Link
              href={clearAll(searchParams) || "/leads"}
              className="text-sm text-accent hover:text-accent-hover"
            >
              Clear filters
            </Link>
          </>
        ) : (
          <p className="text-muted">
            No leads yet. New leads will appear here as soon as they&apos;re submitted.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-hover text-left text-[11px] font-semibold uppercase tracking-wider text-muted">
          <tr>
            <th className="px-3 py-2 font-semibold">Created</th>
            <th className="px-3 py-2 font-semibold">Brand</th>
            <th className="px-3 py-2 font-semibold">Product</th>
            <th className="px-3 py-2 font-semibold">Name</th>
            <th className="px-3 py-2 font-semibold">Phone</th>
            <th className="px-3 py-2 font-semibold">Email</th>
            <th className="px-3 py-2 font-semibold">State</th>
            <th className="px-3 py-2 font-semibold">Age</th>
            <th className="px-3 py-2 font-semibold">Score</th>
            <th className="px-3 py-2 font-semibold">Details</th>
            {isAdmin && <th className="px-3 py-2 font-semibold">Assigned</th>}
            <th className="px-3 py-2 font-semibold">DNC</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr
              key={lead.id}
              className="border-t border-border hover:bg-hover"
            >
              <td className="px-3 py-2 whitespace-nowrap text-muted">
                {formatCreated(lead.created_at)}
              </td>
              <td className="px-3 py-2">
                <Badge variant={brandVariant(lead.brand)} />
              </td>
              <td className="px-3 py-2">
                <Badge variant={productVariant(lead.product)} />
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-foreground">
                {lead.first_name} {lead.last_name}
              </td>
              <td className="px-3 py-2 whitespace-nowrap font-mono text-xs">
                <a
                  href={`tel:${lead.phone_e164}`}
                  className="text-accent hover:text-accent-hover"
                >
                  {formatPhone(lead.phone_e164)}
                </a>
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-xs">
                <a
                  href={`mailto:${lead.email}`}
                  className="text-accent hover:text-accent-hover"
                >
                  {lead.email}
                </a>
              </td>
              <td className="px-3 py-2 text-muted">{lead.state}</td>
              <td className="px-3 py-2 text-muted">{lead.age}</td>
              <td className="px-3 py-2 whitespace-nowrap font-mono text-xs">
                <span className="text-foreground">{lead.intent_score}</span>
                <span className="text-muted">/90 </span>
                <Badge variant={tempVariant(lead.temperature)} />
              </td>
              <td className="px-3 py-2 text-xs text-muted">
                {renderDetails(lead.product, lead.details)}
              </td>
              {isAdmin && (
                <td className="px-3 py-2 whitespace-nowrap text-foreground">
                  {lead.agent?.full_name ?? (
                    <span className="text-muted italic">— unassigned —</span>
                  )}
                </td>
              )}
              <td className="px-3 py-2">
                {lead.on_dnc && (
                  <span
                    title="On DNC registry"
                    className="inline-block h-2 w-2 rounded-full bg-red-600"
                  />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
