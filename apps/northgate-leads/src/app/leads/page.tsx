import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPlatformUser } from "@/lib/auth/get-platform-user";
import { buildLeadsQuery, parseFilters } from "@/lib/leads-query";
import { LeadTable } from "@/components/lead-table";
import { FilterBar } from "@/components/filter-bar";
import { Pagination } from "@/components/pagination";
import { LeadSelectionProvider } from "@/components/lead-selection-provider";
import { BulkActionBar } from "@/components/bulk-action-bar";

export const dynamic = "force-dynamic";

// Server Component — reads searchParams from page props (no useSearchParams,
// no Suspense boundary needed). Renders a small banner for the one error
// key whose redirect target is /leads (insufficient_role from requireAdmin).
const LEADS_ERROR_MESSAGES: Record<string, string> = {
  insufficient_role: "You don't have access to that page.",
};

export default async function LeadsPage({
  searchParams,
}: {
  // Next 16 App Router: searchParams is a Promise — must be awaited.
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = parseFilters(params);

  const platformUser = await getPlatformUser();
  if (!platformUser) {
    // Authenticated session exists (middleware would've redirected otherwise),
    // but no platform_users row → admin hasn't provisioned this user yet.
    // Sign them out so they don't loop on /leads.
    redirect("/login?error=not_provisioned");
  }
  if (!platformUser.active) {
    redirect("/login?error=inactive");
  }

  const supabase = await createSupabaseServerClient();

  // For admin/superadmin: load the agents list for the agent filter dropdown.
  // For agent role: skip (their UI doesn't show the agent filter).
  const isAdmin =
    platformUser.role === "admin" || platformUser.role === "superadmin";
  const agentsForFilter = isAdmin
    ? (await supabase.from("agents").select("id, full_name").order("full_name"))
        .data ?? []
    : undefined;

  const { data: leads, count, error } = await buildLeadsQuery(
    filters,
    platformUser.role,
    supabase,
  );

  if (error) {
    console.error("[leads] query failed", error.message);
    throw new Error("Failed to load leads. Please reload the page.");
  }

  const errorKey = (() => {
    const v = params.error;
    return Array.isArray(v) ? v[0] : v;
  })();
  const errorMsg = errorKey ? LEADS_ERROR_MESSAGES[errorKey] : null;

  // Compact projection of leads for the BulkActionBar — only the fields
  // it needs to compute the modal's diff (status + agent_id per id).
  const leadsForBulk = (
    leads as unknown as
      | Array<{ id: string; status: string; agent_id: string | null }>
      | null
      | undefined
  )?.map((l) => ({
    id: l.id,
    status: l.status as Parameters<typeof BulkActionBar>[0]["leads"][number]["status"],
    agent_id: l.agent_id,
  })) ?? [];

  return (
    <LeadSelectionProvider>
      <BulkActionBar
        isAdmin={isAdmin}
        agents={agentsForFilter ?? []}
        leads={leadsForBulk}
      />

      {errorMsg && (
        <div className="border-b bg-destructive/5 px-6 py-3">
          <div className="mx-auto max-w-7xl">
            <p
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {errorMsg}
            </p>
          </div>
        </div>
      )}
      <FilterBar
        searchParams={params}
        role={platformUser.role}
        agents={agentsForFilter}
      />
      <div className="mx-auto w-full min-w-0 max-w-7xl">
        <LeadTable
          leads={(leads ?? []) as unknown as Parameters<typeof LeadTable>[0]["leads"]}
          role={platformUser.role}
          searchParams={params}
        />
        <Pagination
          searchParams={params}
          page={filters.page}
          perPage={filters.perPage}
          total={count ?? 0}
        />
      </div>
    </LeadSelectionProvider>
  );
}
