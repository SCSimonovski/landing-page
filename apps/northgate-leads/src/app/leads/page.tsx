import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPlatformUser } from "@/lib/auth/get-platform-user";
import { buildLeadsQuery, parseFilters } from "@/lib/leads-query";
import { LeadTable } from "@/components/lead-table";
import { FilterBar } from "@/components/filter-bar";
import { Pagination } from "@/components/pagination";

export const dynamic = "force-dynamic";

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

  return (
    <>
      <FilterBar
        searchParams={params}
        role={platformUser.role}
        agents={agentsForFilter}
      />
      <div className="mx-auto max-w-7xl">
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
    </>
  );
}
