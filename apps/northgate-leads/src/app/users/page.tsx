import { requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InviteUserDialog } from "@/components/invite-user-dialog";
import { UsersActiveToggle } from "./active-toggle";

export const dynamic = "force-dynamic";

type AgentNested = { full_name: string; license_states: string[] } | null;
type Row = {
  id: string;
  email: string;
  role: string;
  active: boolean;
  created_at: string;
  agents: AgentNested;
  // Accepted = the user clicked the invite link and set a password
  // (Supabase Auth marks email_confirmed_at on first password set).
  // null = invite still pending, never signed in.
  acceptedAt: string | null;
};

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const day = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (day < 1) return "today";
  if (day === 1) return "yesterday";
  if (day < 30) return `${day}d ago`;
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function UsersPage() {
  const caller = await requireAdmin();
  const supabase = await createSupabaseServerClient();

  // platform_users is the principal table; agents joins in for the
  // role=agent rows so we can show full_name + license_states inline.
  // The FK is one-to-one (agents.platform_user_id unique), so the
  // nested select returns a single object (or null) per row.
  const { data, error } = await supabase
    .from("platform_users")
    .select("id, email, role, active, created_at, agents(full_name, license_states)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[users] query failed", error.message);
    throw new Error("Failed to load users. Please reload the page.");
  }

  // Auth state: which users have actually accepted the invite vs are
  // still pending. platform_users.active is an ADMIN toggle ("can sign
  // in / see leads"), not a "completed onboarding" signal — those are
  // different things and conflating them is what makes a freshly-invited
  // user look fully onboarded.
  //
  // Supabase Auth marks `email_confirmed_at` when the user sets a
  // password via the invite link. Use that as the canonical "accepted"
  // signal. Service-role client required (auth.admin.* surface).
  //
  // listUsers default page size is 50; v0.2 user counts are tiny so we
  // don't paginate. Revisit if user count ever crosses ~50.
  const adminClient = createSupabaseServiceRoleClient();
  const { data: authData, error: authErr } =
    await adminClient.auth.admin.listUsers({ perPage: 200 });
  if (authErr) {
    console.error("[users] auth.admin.listUsers failed", authErr.message);
  }
  const acceptedByEmail = new Map<string, string | null>();
  for (const u of authData?.users ?? []) {
    if (u.email) {
      acceptedByEmail.set(u.email.toLowerCase(), u.email_confirmed_at ?? null);
    }
  }

  // Supabase's generated types collapse the nested join return type to
  // `never` in some cases; the runtime shape is what we care about.
  // Cast through unknown (same pattern as get-platform-user.ts handles
  // the rpc() typing).
  type RawRow = {
    id: string;
    email: string;
    role: string;
    active: boolean;
    created_at: string;
    agents: AgentNested | AgentNested[] | null;
  };
  const raw = (data as unknown as RawRow[] | null) ?? [];
  const rows: Row[] = raw.map((r) => ({
    id: r.id,
    email: r.email,
    role: r.role,
    active: r.active,
    created_at: r.created_at,
    agents: Array.isArray(r.agents) ? (r.agents[0] ?? null) : (r.agents ?? null),
    acceptedAt: acceptedByEmail.get(r.email) ?? null,
  }));

  return (
    <div className="px-6 py-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Users</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Everyone with access to Northgate Leads — agents and operators.
            </p>
          </div>
          <InviteUserDialog />
        </div>

        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Full name</TableHead>
                <TableHead>License states</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                    No users yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((u) => {
                  const pending = u.acceptedAt === null;
                  // Three states: Inactive (admin disabled) > Pending invite
                  // (Auth never confirmed) > Active (signed in at least once).
                  // Inactive wins over pending — disabling someone mid-invite
                  // shouldn't show them as "still onboarding."
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="text-foreground">{u.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{u.role}</Badge>
                      </TableCell>
                      <TableCell>
                        {!u.active ? (
                          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                            <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                            Inactive
                          </span>
                        ) : pending ? (
                          <span className="inline-flex items-center gap-1.5 text-sm text-amber-700">
                            <span className="h-2 w-2 rounded-full bg-amber-500" />
                            Pending invite
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
                            <span className="h-2 w-2 rounded-full bg-green-500" />
                            Active
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <UsersActiveToggle
                          targetUserId={u.id}
                          targetEmail={u.email}
                          targetRole={u.role}
                          initialActive={u.active}
                          isSelf={u.id === caller.id}
                          callerRole={caller.role}
                        />
                      </TableCell>
                      <TableCell className="text-foreground">
                        {u.agents?.full_name ?? (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-foreground font-mono text-xs">
                        {u.agents?.license_states?.length
                          ? u.agents.license_states.join(", ")
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {pending ? "Invited " : "Joined "}
                        {formatRelative(u.acceptedAt ?? u.created_at)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
