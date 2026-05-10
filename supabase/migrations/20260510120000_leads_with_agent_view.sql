-- View: leads_with_agent
--
-- Flattens the lead → assigned-agent join so the platform's leads table
-- can sort by the agent's name as a native column. PostgREST has
-- documented limitations sorting on one-to-one embedded resources
-- (.order with referencedTable silently no-ops in some configurations),
-- so the leads-table read path uses this view instead of a `*,
-- agent:agents(...)` embed.
--
-- security_invoker = on (Postgres 15+): the view executes with the
-- caller's privileges and applies RLS on the underlying tables. So an
-- agent reading from leads_with_agent still only sees rows where their
-- own agent_id matches (existing leads SELECT policy from Plan 3) and
-- agents.full_name is exposed only via the agents row they're allowed
-- to see (which is their own row in agents). For admin/superadmin, RLS
-- on both tables grants full read.
--
-- Writes still go through `leads` (and the bulk RPCs); the view is
-- read-only by virtue of being a JOIN.

create view public.leads_with_agent
with (security_invoker = on) as
  select
    leads.*,
    agents.full_name as agent_full_name
  from public.leads
  left join public.agents on public.leads.agent_id = public.agents.id;

-- Match the grants on `leads` so PostgREST exposes the view to the
-- platform. Service role bypasses RLS via `security_invoker` semantics
-- but still needs the grant.
grant select on public.leads_with_agent to authenticated;
grant select on public.leads_with_agent to service_role;
