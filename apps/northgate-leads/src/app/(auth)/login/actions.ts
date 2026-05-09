"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type LoginActionState = { error: string | null };

// Reject non-internal `?next=` targets so the post-login redirect can't
// be hijacked off-site (open-redirect → phishing). Protocol-relative
// "//host" and the "/\host" backslash variant are normalized to "//"
// by some browsers, so both are out.
function safeNext(raw: string): string {
  if (!raw.startsWith("/")) return "/leads";
  if (raw.startsWith("//") || raw.startsWith("/\\")) return "/leads";
  return raw;
}

export async function loginAction(
  _prev: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? ""));

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Generic message — don't leak account existence vs wrong password.
    console.warn("[login] signInWithPassword failed", {
      code: error.code,
      status: error.status,
    });
    return { error: "Invalid email or password." };
  }

  redirect(next);
}
