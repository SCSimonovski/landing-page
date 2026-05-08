import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Root: signed-in users → /leads. Unauthenticated users → middleware
// already redirected to /login before this ran. The redirect here is
// belt-and-suspenders for the signed-in case.
export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  redirect(user ? "/leads" : "/login");
}
