import "server-only";
import { createServiceRoleClient } from "./supabase-server";

// Add a row to suppressions, idempotent on phone_e164. The pre-check avoids
// duplicate rows from double-STOP / app-retry / fat-finger; same code-level
// pattern as findRecentDuplicate for the lead-dedup case (no DB unique
// constraint — keeps the table flexible and avoids a migration just for this).
export async function addSuppression(input: {
  phone_e164: string;
  reason: string;
}): Promise<void> {
  const supabase = createServiceRoleClient();

  const { data: existing, error: selectErr } = await supabase
    .from("suppressions")
    .select("id")
    .eq("phone_e164", input.phone_e164)
    .limit(1)
    .maybeSingle();
  if (selectErr) throw selectErr;
  if (existing) return;

  const { error: insertErr } = await supabase.from("suppressions").insert({
    phone_e164: input.phone_e164,
    reason: input.reason,
  });
  if (insertErr) throw insertErr;
}
