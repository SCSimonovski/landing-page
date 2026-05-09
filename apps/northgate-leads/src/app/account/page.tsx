import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPlatformUser } from "@/lib/auth/get-platform-user";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProfileSection } from "./profile-section";
import { PasswordSection } from "./password-section";

export const dynamic = "force-dynamic";

// Account page. All roles see Email + Password sections; agents also see
// the Profile section (full_name + license_states). Profile section is
// server-side conditional (NOT CSS-hidden) — same pattern as the sidebar
// Users link in Plan 4. The update_agent_profile RPC also raises if a
// non-agent calls it (Plan 5 Decision #18).

export default async function AccountPage() {
  const platformUser = await getPlatformUser();
  if (!platformUser) redirect("/login?error=not_provisioned");
  if (!platformUser.active) redirect("/login?error=inactive");

  const supabase = await createSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  const email = authUser?.email ?? "";

  const isAgent = platformUser.role === "agent";

  // For agents: load own agents row (RLS scopes to own; service-role not
  // needed). Used to seed the ProfileSection form.
  let initialFullName = "";
  let initialLicenseStates: string[] = [];
  if (isAgent && platformUser.agentId) {
    const { data: agentRowRaw } = await supabase
      .from("agents")
      .select("full_name, license_states")
      .eq("id", platformUser.agentId)
      .maybeSingle();
    const agentRow = agentRowRaw as unknown as
      | { full_name: string; license_states: string[] }
      | null;
    initialFullName = agentRow?.full_name ?? "";
    initialLicenseStates = agentRow?.license_states ?? [];
  }

  return (
    <div className="px-6 py-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Account</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your profile and password.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sign-in info</CardTitle>
            <CardDescription>
              Read-only. Contact your administrator to change your email.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
            <span className="text-muted-foreground">Email</span>
            <span className="font-mono">{email}</span>
            <span className="text-muted-foreground">Role</span>
            <span>
              <Badge variant="outline">{platformUser.role}</Badge>
            </span>
          </CardContent>
        </Card>

        {isAgent && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Agent profile</CardTitle>
              <CardDescription>
                Your full name + the states you&apos;re licensed in. Visible
                to admins on the Users page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileSection
                initialFullName={initialFullName}
                initialLicenseStates={initialLicenseStates}
              />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Password</CardTitle>
            <CardDescription>
              Verify your current password, then set a new one.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PasswordSection email={email} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
