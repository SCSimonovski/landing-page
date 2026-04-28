import { createServiceRoleClient } from "@/lib/db/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
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
