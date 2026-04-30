import { createServiceRoleClient } from "@/lib/db/supabase-server";
import { checkHealthRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Rate limit BEFORE the header check so attackers probing the endpoint
  // brute-force-style get cut off cheaply. Lenient cap (10/IP/hour)
  // accommodates legitimate uptime-monitor polling. 429 (not 404) when
  // the limit fires — by that point the attacker has already gotten 10
  // 404s confirming the route exists, so hiding behind 404 buys nothing.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "0.0.0.0";
  const rl = await checkHealthRateLimit(ip);
  if (!rl.ok) return new Response("rate limited", { status: 429 });

  if (req.headers.get("x-health-secret") !== process.env.HEALTH_CHECK_SECRET) {
    return new Response("Not found", { status: 404 });
  }
  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase.from("agents").select("id").limit(0);
    if (error) throw error;
    return Response.json({ ok: true });
  } catch {
    return new Response(JSON.stringify({ ok: false }), {
      status: 503,
      headers: { "content-type": "application/json" },
    });
  }
}
