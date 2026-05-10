"use server";

import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ForgotPasswordState = {
  status: "idle" | "sent" | "error";
  email?: string;
  message?: string;
};

async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  if (host) return `${proto}://${host}`;
  return (
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3002"
  ).replace(/\/$/, "");
}

export async function forgotPasswordAction(
  _prev: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email) {
    return { status: "error", message: "Email is required." };
  }

  const supabase = await createSupabaseServerClient();
  const redirectTo = `${await siteOrigin()}/auth/reset-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  return { status: "sent", email };
}
