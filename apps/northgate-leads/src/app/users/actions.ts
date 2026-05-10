"use server";
import "server-only";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/auth/require-admin";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import {
  inviteSchema,
  type InviteInput,
  type InviteResult,
} from "./invite-schema";

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3002"
  ).replace(/\/$/, "");
}

function humanizeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

// Invite flow:
//   inviteUserByEmail (Supabase Auth Admin API) → platform_users insert
//   → agents insert (only when role=agent).
//
// Ordering rationale (Plan 4 Decision #9): inviteUserByEmail is the
// highest-failure-rate step (email delivery, rate limits, malformed
// address). Failing first means no DB writes need reversal. The user
// can't reach platform_users-dependent code paths until they receive
// the email + click the link + sign in (~30s+ window) — the writes
// have long committed by then.
//
// Cleanup branch (Plan 4 Decision #10): explicit reverse-order delete.
// agents.platform_user_id FK has NO ON DELETE CASCADE in the Plan 3
// migration, so the agents row must be deleted before the platform_users
// row. Never throw from cleanup; log every step with [invite-cleanup].
export async function inviteUser(input: InviteInput): Promise<InviteResult> {
  const parsed = inviteSchema.parse(input); // schema-only lowercases email

  const supabase = createSupabaseServiceRoleClient();

  let createdAuthUserId: string | null = null;
  let createdPlatformUserId: string | null = null;
  let createdAgentId: string | null = null;

  try {
    await assertAdmin();

    const { data: authData, error: inviteErr } =
      await supabase.auth.admin.inviteUserByEmail(parsed.email, {
        redirectTo: `${siteUrl()}/auth/setup-password`,
      });
    if (inviteErr || !authData?.user) {
      throw inviteErr ?? new Error("invite returned no user");
    }
    createdAuthUserId = authData.user.id;

    const { data: pu, error: puErr } = await supabase
      .from("platform_users")
      .insert({ email: parsed.email, role: parsed.role })
      .select("id")
      .single();
    if (puErr || !pu) {
      throw puErr ?? new Error("platform_users insert returned no row");
    }
    createdPlatformUserId = pu.id;

    if (parsed.role === "agent") {
      const { data: a, error: agErr } = await supabase
        .from("agents")
        .insert({
          platform_user_id: pu.id,
          full_name: parsed.full_name!,
          license_states: parsed.license_states!,
        })
        .select("id")
        .single();
      if (agErr || !a) {
        throw agErr ?? new Error("agents insert returned no row");
      }
      createdAgentId = a.id;
    }

    revalidatePath("/users");
    return { ok: true };
  } catch (err) {
    if (createdAgentId) {
      const { error } = await supabase
        .from("agents")
        .delete()
        .eq("id", createdAgentId);
      if (error) {
        console.error("[invite-cleanup] agents delete failed", {
          id: createdAgentId,
          error: error.message,
        });
      }
    }
    if (createdPlatformUserId) {
      const { error } = await supabase
        .from("platform_users")
        .delete()
        .eq("id", createdPlatformUserId);
      if (error) {
        console.error("[invite-cleanup] platform_users delete failed", {
          id: createdPlatformUserId,
          error: error.message,
        });
      }
    }
    if (createdAuthUserId) {
      const { error } = await supabase.auth.admin.deleteUser(createdAuthUserId);
      if (error) {
        console.error("[invite-cleanup] auth user delete failed", {
          id: createdAuthUserId,
          error: error.message,
        });
      }
    }
    return { ok: false, error: humanizeError(err) };
  }
}

// Resend the Supabase Auth invite email for a pending user. Works only
// while the user is still unconfirmed (email_confirmed_at is null) —
// inviteUserByEmail rejects already-confirmed users with "User already
// registered". We gate the UI to pending-only, so the rejection path
// only fires if someone races a confirm.
//
// platform_users + agents rows already exist for the pending user;
// this call only touches auth.users to mint a new link + re-send email.
export async function resendInvite(email: string): Promise<InviteResult> {
  try {
    await assertAdmin();
    const normalized = email.trim().toLowerCase();
    if (!normalized) return { ok: false, error: "Email is required." };
    const supabase = createSupabaseServiceRoleClient();
    const { error } = await supabase.auth.admin.inviteUserByEmail(normalized, {
      redirectTo: `${siteUrl()}/auth/setup-password`,
    });
    if (error) return { ok: false, error: humanizeError(error) };
    revalidatePath("/users");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: humanizeError(err) };
  }
}
