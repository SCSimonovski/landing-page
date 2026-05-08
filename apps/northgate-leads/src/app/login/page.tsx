"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "error"; message: string };

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setStatus({ kind: "submitting" });

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      setStatus({ kind: "error", message: error.message });
      return;
    }

    const next =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("next") ?? "/leads"
        : "/leads";
    router.push(next);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md px-6 py-20">
      <h1 className="text-2xl font-semibold text-foreground mb-2">Sign in</h1>
      <p className="text-muted text-sm mb-8">
        Use the password you set up via your invitation link. Invite-only — if
        you haven&apos;t been invited yet, ask the operator.
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
        <label className="block text-sm font-medium text-foreground">
          Password
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-2 w-full min-h-11 rounded-md border border-border bg-background px-3 text-base text-foreground"
            disabled={status.kind === "submitting"}
          />
        </label>
        <button
          type="submit"
          disabled={status.kind === "submitting" || !email || !password}
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-accent px-5 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {status.kind === "submitting" ? "Signing in..." : "Sign in"}
        </button>
        {status.kind === "error" && (
          <p role="alert" className="text-sm text-red-600">
            {status.message}
          </p>
        )}
        <Link
          href="/auth/forgot-password"
          className="text-sm text-accent hover:text-accent-hover"
        >
          Forgot password?
        </Link>
      </form>
    </div>
  );
}
