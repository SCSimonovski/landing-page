"use client";

import { useRouter } from "next/navigation";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  Badge,
  brandLabel,
  brandVariant,
  productLabel,
  productVariant,
  tempVariant,
} from "@/components/ui/badge";
import {
  LEAD_STATUS_BADGE_CLASS,
  LEAD_STATUS_LABEL,
  type LeadStatus,
} from "@/lib/leads/lead-status-options";
import { cn } from "@/lib/utils";
import { LeadRowCheckbox } from "@/components/lead-row-checkbox";

// Per-row client wrapper. Owns the click-to-detail navigation so the
// parent LeadTable stays a Server Component. Plan 5 Decision #22:
// onClick + router.push (NOT <TableRow asChild><Link>) — the asChild
// composition rule from Plan 4 forbids stacking shadcn primitives via
// Slot. tel:/mailto: cells stop propagation so the row click doesn't
// hijack the link.

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

function formatPhone(e164: string): string {
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

const stop = (e: React.MouseEvent) => e.stopPropagation();

export function LeadRow({
  lead,
  isAdmin,
}: {
  lead: LeadRowData;
  isAdmin: boolean;
}) {
  const router = useRouter();

  return (
    <TableRow
      onClick={() => router.push(`/leads/${lead.id}`)}
      className="cursor-pointer"
    >
      <LeadRowCheckbox leadId={lead.id} />
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
      <TableCell>
        <Badge className={cn(LEAD_STATUS_BADGE_CLASS[lead.status])}>
          {LEAD_STATUS_LABEL[lead.status]}
        </Badge>
      </TableCell>
      {isAdmin && (
        <TableCell className="whitespace-nowrap text-foreground">
          {lead.agent?.full_name ?? (
            <span className="text-muted-foreground italic">— unassigned —</span>
          )}
        </TableCell>
      )}
      <TableCell className="whitespace-nowrap text-foreground">
        {lead.first_name} {lead.last_name}
      </TableCell>
      <TableCell className="whitespace-nowrap font-mono text-xs">
        <a
          href={`tel:${lead.phone_e164}`}
          className="text-link hover:text-link-hover"
          onClick={stop}
        >
          {formatPhone(lead.phone_e164)}
        </a>
      </TableCell>
      <TableCell className="whitespace-nowrap text-xs">
        <a
          href={`mailto:${lead.email}`}
          className="text-link hover:text-link-hover"
          onClick={stop}
        >
          {lead.email}
        </a>
      </TableCell>
      <TableCell className="text-muted-foreground">{lead.state}</TableCell>
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
      <TableCell>
        {lead.on_dnc && (
          <Badge variant="dnc" title="On DNC registry">
            DNC
          </Badge>
        )}
      </TableCell>
    </TableRow>
  );
}
