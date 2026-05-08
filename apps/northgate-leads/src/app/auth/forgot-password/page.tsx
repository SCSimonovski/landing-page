"use client";

import { useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "sent" }
  | { kind: "error"; message: string };

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus({ kind: "submitting" });

    const supabase = createSupabaseBrowserClient();
    const redirectTo = `${window.location.origin}/auth/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo },
    );

    if (error) {
      setStatus({ kind: "error", message: error.message });
      return;
    }
    setStatus({ kind: "sent" });
  }

  if (status.kind === "sent") {
    return (
      <div className="mx-auto max-w-md px-6 py-20">
        <h1 className="text-2xl font-semibold text-foreground mb-2">
          Check your email
        </h1>
        <p className="text-muted text-sm">
          If an account exists for <strong>{email}</strong>, we sent a
          password-reset link. The link expires after 1 hour.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm text-accent hover:text-accent-hover"
        >
          ← Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-6 py-20">
      <h1 className="text-2xl font-semibold text-foreground mb-2">
        Forgot password?
      </h1>
      <p className="text-muted text-sm mb-8">
        Enter your email and we&apos;ll send a password-reset link.
      </p>

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
          {status.kind === "submitting" ? "Sending…" : "Send reset link"}
        </button>
        {status.kind === "error" && (
          <p role="alert" className="text-sm text-red-600">
            {status.message}
          </p>
        )}
        <Link
          href="/login"
          className="text-sm text-accent hover:text-accent-hover"
        >
          ← Back to sign in
        </Link>
      </form>
    </div>
  );
}
