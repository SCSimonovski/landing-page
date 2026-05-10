import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeftIcon } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPlatformUser } from "@/lib/auth/get-platform-user";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Badge,
  brandLabel,
  brandVariant,
  productLabel,
  productVariant,
  tempVariant,
} from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  LEAD_STATUS_BADGE_CLASS,
  LEAD_STATUS_LABEL,
  type LeadStatus,
} from "@/lib/leads/lead-status-options";
import { cn } from "@/lib/utils";
import { LeadStatusSelect } from "./lead-status-select";
import { LeadAssignSelect } from "./lead-assign-select";
import { LeadNotesEditor } from "./lead-notes-editor";

export const dynamic = "force-dynamic";

// Lead detail. Server Component. RLS scopes the lead query — if the user
// can't see this lead, the SELECT returns null and we 404. Same posture
// for consent_log + lead_events (role-aware policies from Plan 5).
//
// Activity timeline actor join: Supabase nested-select returns a single
// object when there's a unique constraint detected (agents.platform_user_id
// is UNIQUE per Plan 3 migration), but we normalize defensively in case
// the response shape varies (Plan 5 Decision #24).

type AgentNested = { id: string; full_name: string } | null;
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
  status: LeadStatus;
  notes: string | null;
  agent_id: string | null;
  agent: AgentNested | AgentNested[];
};

type ConsentRow = {
  id: string;
  brand: string;
  consent_text: string;
  form_version: string;
  page_url: string;
  ip_address: string | null;
  user_agent: string;
  created_at: string;
};

type ActorAgent = { full_name: string } | null;
type ActorRow = {
  email: string;
  agents: ActorAgent | ActorAgent[];
} | null;
type EventRow = {
  id: string;
  event_type: string;
  event_data: Record<string, unknown> | null;
  created_at: string;
  actor_platform_user_id: string | null;
  actor: ActorRow;
};

function unwrapNested<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function actorLabel(ev: EventRow): string {
  if (!ev.actor_platform_user_id) return "system";
  const actor = unwrapNested(ev.actor);
  if (!actor) return "(deleted user)";
  const agent = unwrapNested(actor.agents);
  return agent?.full_name ?? actor.email;
}

function eventCopy(ev: EventRow): string {
  const actor = actorLabel(ev);
  const data = ev.event_data ?? {};
  switch (ev.event_type) {
    case "created":
      return "Lead created";
    case "status_change": {
      const oldS = String(data.old ?? "?");
      const newS = String(data.new ?? "?");
      return `${actor}: status ${oldS} → ${newS}`;
    }
    case "assigned": {
      const oldId = data.old_agent_id;
      const newId = data.new_agent_id;
      const fmt = (v: unknown) => (v ? String(v).slice(0, 8) : "unassigned");
      return `${actor}: assigned to ${fmt(newId)} (was ${fmt(oldId)})`;
    }
    case "note_added":
      return `${actor}: edited the note`;
    case "sms_sent":
      return "SMS sent to agent";
    case "email_sent":
      return "Welcome email sent";
    case "capi_sent":
      return "Meta CAPI event sent";
    case "duplicate_attempt":
      return "Duplicate submission rejected";
    case "sms_skipped_dnc":
      return "SMS skipped (DNC)";
    case "sms_skipped_suppression":
      return "SMS skipped (suppression)";
    case "email_skipped_suppression":
      return "Welcome email skipped (suppression)";
    case "refund_requested":
      return `${actor}: refund requested`;
    default:
      return `${actor}: ${ev.event_type}`;
  }
}

function formatPhone(e164: string): string {
  const m = e164.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  if (!m) return e164;
  return `(${m[1]}) ${m[2]}-${m[3]}`;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const platformUser = await getPlatformUser();
  if (!platformUser || !platformUser.active) notFound();

  const supabase = await createSupabaseServerClient();

  const { data: leadRaw } = await supabase
    .from("leads")
    .select("*, agent:agents(id, full_name)")
    .eq("id", id)
    .maybeSingle();
  if (!leadRaw) notFound();
  const lead = leadRaw as unknown as LeadRow;
  const assignedAgent = unwrapNested(lead.agent);

  const isAdmin =
    platformUser.role === "admin" || platformUser.role === "superadmin";

  const { data: consentsRaw } = await supabase
    .from("consent_log")
    .select("*")
    .eq("lead_id", id)
    .order("created_at", { ascending: false });
  const consents = (consentsRaw as unknown as ConsentRow[] | null) ?? [];

  const { data: eventsRaw } = await supabase
    .from("lead_events")
    .select(
      "*, actor:platform_users!actor_platform_user_id(email, agents(full_name))",
    )
    .eq("lead_id", id)
    .order("created_at", { ascending: false });
  const events = (eventsRaw as unknown as EventRow[] | null) ?? [];

  // For admin/superadmin: load agents list for the AssignSelect dropdown.
  const { data: agentsList } = isAdmin
    ? await supabase.from("agents").select("id, full_name").order("full_name")
    : { data: null };

  return (
    <div className="px-6 py-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link href="/leads">
              <ChevronLeftIcon /> Back to leads
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-2xl">
                {lead.first_name} {lead.last_name}
              </CardTitle>
              <CardDescription>
                Created {formatTimestamp(lead.created_at)}
              </CardDescription>
            </div>
            <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end">
              <LeadStatusSelect leadId={lead.id} currentStatus={lead.status} />
              {isAdmin && agentsList && (
                <LeadAssignSelect
                  leadId={lead.id}
                  currentAgentId={lead.agent_id}
                  agents={agentsList}
                />
              )}
              {!isAdmin && assignedAgent && (
                <p className="text-xs text-muted-foreground">
                  Assigned: {assignedAgent.full_name}
                </p>
              )}
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div className="col-span-2 sm:col-span-1">
              <p className="text-muted-foreground text-xs">Phone</p>
              <a
                href={`tel:${lead.phone_e164}`}
                className="font-mono text-link hover:text-link-hover"
              >
                {formatPhone(lead.phone_e164)}
              </a>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <p className="text-muted-foreground text-xs">Email</p>
              <a
                href={`mailto:${lead.email}`}
                className="text-link hover:text-link-hover break-all"
              >
                {lead.email}
              </a>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">State</p>
              <p>{lead.state}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Age</p>
              <p>{lead.age}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Score / Temp</p>
              <p className="flex items-center gap-2">
                <span className="font-mono">{lead.intent_score} / 90</span>
                <Badge variant={tempVariant(lead.temperature)}>
                  {lead.temperature}
                </Badge>
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Brand · Product</p>
              <p className="flex items-center gap-2">
                <Badge variant={brandVariant(lead.brand)}>
                  {brandLabel(lead.brand)}
                </Badge>
                <Badge variant={productVariant(lead.product)}>
                  {productLabel(lead.product)}
                </Badge>
              </p>
            </div>
            {lead.on_dnc && (
              <div className="col-span-2">
                <Badge variant="dnc">On DNC registry</Badge>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Per-product details</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {renderDetails(lead.product, lead.details)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
            <CardDescription>
              Auto-saves as you type. Visible to admins, superadmins, and the
              assigned agent.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LeadNotesEditor leadId={lead.id} initial={lead.notes} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Compliance</CardTitle>
            <CardDescription>
              Captured at form submission. Immutable.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {consents.length === 0 ? (
              <p className="text-muted-foreground">
                No consent records found for this lead.
              </p>
            ) : (
              consents.map((c) => (
                <div key={c.id} className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground mb-1">
                    {formatTimestamp(c.created_at)} · {c.brand} · form{" "}
                    {c.form_version}
                  </p>
                  <p className="mb-2">{c.consent_text}</p>
                  <p className="text-xs text-muted-foreground break-all">
                    {c.page_url} · {c.ip_address ?? "no ip"} ·{" "}
                    {c.user_agent.slice(0, 80)}
                    {c.user_agent.length > 80 ? "…" : ""}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity</CardTitle>
            <CardDescription>
              Status changes, assignments, system events.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {events.length === 0 ? (
              <p className="text-muted-foreground">No activity yet.</p>
            ) : (
              events.map((ev) => (
                <div
                  key={ev.id}
                  className="flex flex-col gap-1 text-xs border-l-2 border-muted pl-3 sm:flex-row sm:items-baseline sm:gap-3"
                >
                  <span className="text-muted-foreground whitespace-nowrap">
                    {formatTimestamp(ev.created_at)}
                  </span>
                  <span
                    className={cn(
                      ev.event_type === "status_change" && "font-medium",
                      ev.event_type === "assigned" && "font-medium",
                    )}
                  >
                    {ev.event_type === "status_change" && ev.event_data ? (
                      <StatusChangeLine ev={ev} />
                    ) : (
                      eventCopy(ev)
                    )}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Renders status_change with badge pills inline so the visual diff stands out.
function StatusChangeLine({ ev }: { ev: EventRow }) {
  const actor = (() => {
    if (!ev.actor_platform_user_id) return "system";
    const actor = Array.isArray(ev.actor) ? ev.actor[0] : ev.actor;
    if (!actor) return "(deleted user)";
    const agent = Array.isArray(actor.agents) ? actor.agents[0] : actor.agents;
    return agent?.full_name ?? actor.email;
  })();
  const data = (ev.event_data ?? {}) as { old?: string; new?: string };
  const oldS = data.old as LeadStatus | undefined;
  const newS = data.new as LeadStatus | undefined;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span>{actor}: status</span>
      {oldS && (
        <Badge className={cn(LEAD_STATUS_BADGE_CLASS[oldS])}>
          {LEAD_STATUS_LABEL[oldS]}
        </Badge>
      )}
      <span>→</span>
      {newS && (
        <Badge className={cn(LEAD_STATUS_BADGE_CLASS[newS])}>
          {LEAD_STATUS_LABEL[newS]}
        </Badge>
      )}
    </span>
  );
}
