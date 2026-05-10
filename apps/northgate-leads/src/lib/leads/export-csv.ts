import { brandLabel, productLabel } from "@/components/ui/badge";
import { LEAD_STATUS_LABEL, type LeadStatus } from "./lead-status-options";

// Shape the export needs from each lead. Joined `agent` may come back as
// an object or a 1-element array depending on whether Supabase detects
// the agents.platform_user_id unique constraint — handle both.
export type ExportLead = {
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
  status: string;
  notes: string | null;
  on_dnc: boolean;
  agent: { full_name: string } | { full_name: string }[] | null;
};

const HEADERS = [
  "Created",
  "Brand",
  "Product",
  "First name",
  "Last name",
  "Phone",
  "Email",
  "State",
  "Age",
  "Score",
  "Temperature",
  "Status",
  "Assigned agent",
  "Notes",
  "On DNC",
];

// RFC 4180-ish: wrap a value in double quotes if it contains a comma,
// newline, or quote; double any internal quotes.
function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// Local YYYY-MM-DD HH:MM. No tz suffix — the export is for human review,
// not a serialization format.
function formatLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function buildLeadCsv(leads: ExportLead[]): string {
  const rows = leads.map((l) => {
    const agent = Array.isArray(l.agent) ? l.agent[0] : l.agent;
    return [
      formatLocal(l.created_at),
      brandLabel(l.brand),
      productLabel(l.product),
      l.first_name,
      l.last_name,
      l.phone_e164,
      l.email,
      l.state,
      l.age,
      l.intent_score,
      l.temperature,
      LEAD_STATUS_LABEL[l.status as LeadStatus] ?? l.status,
      agent?.full_name ?? "",
      l.notes ?? "",
      l.on_dnc ? "Yes" : "No",
    ]
      .map(csvEscape)
      .join(",");
  });
  return [HEADERS.join(","), ...rows].join("\r\n");
}

export function exportFilename(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `leads-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.csv`;
}
