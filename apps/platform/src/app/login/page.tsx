"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "sent" }
  | { kind: "error"; message: string };

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus({ kind: "submitting" });

    const supabase = createSupabaseBrowserClient();
    const next =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("next") ?? "/leads"
        : "/leads";
    const emailRedirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo, shouldCreateUser: false },
    });

    if (error) {
      setStatus({ kind: "error", message: error.message });
      return;
    }
    setStatus({ kind: "sent" });
  }

  return (
    <div className="mx-auto max-w-md px-6 py-20">
      <h1 className="text-2xl font-semibold text-foreground mb-2">Sign in</h1>
      <p className="text-muted text-sm mb-8">
        Enter your email and we&apos;ll send a sign-in link. Invite-only — if
        you haven&apos;t been invited yet, ask the operator.
      </p>

      {status.kind === "sent" ? (
        <div className="rounded-md border border-border bg-hover p-5 text-sm">
          <p className="font-medium text-foreground mb-1">Check your email</p>
          <p className="text-muted">
            We sent a sign-in link to <strong>{email}</strong>. Click it to
            continue. The link expires after 1 hour.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <label className="block text-sm font-medium text-foreground">
            Email
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full min-h-11 rounded-md border border-border bg-background px-3 text-base text-foreground"
              placeholder="you@example.com"
              disabled={status.kind === "submitting"}
            />
          </label>
          <button
            type="submit"
            disabled={status.kind === "submitting" || !email}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-accent px-5 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {status.kind === "submitting" ? "Sending..." : "Send sign-in link"}
          </button>
          {status.kind === "error" && (
            <p role="alert" className="text-sm text-red-600">
              {status.message}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
