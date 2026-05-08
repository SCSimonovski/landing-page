"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

// Lands here from a Supabase password-recovery email. Same hash-fragment
// pattern as setup-password, but expects type=recovery.

type Status =
  | { kind: "verifying" }
  | { kind: "ready" }
  | { kind: "submitting" }
  | { kind: "error"; message: string };

const MIN_LENGTH = 8;

export default function ResetPasswordPage() {
  const [status, setStatus] = useState<Status>({ kind: "verifying" });
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    async function verify() {
      const hash = window.location.hash.slice(1);
      const params = new URLSearchParams(hash);
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      const type = params.get("type");

      if (!accessToken || !refreshToken) {
        if (!cancelled)
          setStatus({
            kind: "error",
            message:
              "Missing recovery token. Use the link from your password-reset email.",
          });
        return;
      }
      if (type !== "recovery") {
        if (!cancelled)
          setStatus({
            kind: "error",
            message: `Unexpected link type: ${type}. This page is for password-reset links only.`,
          });
        return;
      }

      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (cancelled) return;
      if (error) {
        setStatus({ kind: "error", message: error.message });
        return;
      }
      window.history.replaceState(null, "", window.location.pathname);
      setStatus({ kind: "ready" });
    }
    verify();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < MIN_LENGTH) {
      setStatus({
        kind: "error",
        message: `Password must be at least ${MIN_LENGTH} characters.`,
      });
      return;
    }
    if (password !== confirm) {
      setStatus({ kind: "error", message: "Passwords don't match." });
      return;
    }
    setStatus({ kind: "submitting" });

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setStatus({ kind: "error", message: error.message });
      return;
    }
    router.push("/leads");
    router.refresh();
  }

  if (status.kind === "verifying") {
    return (
      <div className="mx-auto max-w-md px-6 py-20">
        <p className="text-muted">Verifying recovery link…</p>
      </div>
    );
  }

  if (status.kind === "error" && password === "") {
    return (
      <div className="mx-auto max-w-md px-6 py-20">
        <h1 className="text-2xl font-semibold text-foreground mb-2">
          Recovery link issue
        </h1>
        <p role="alert" className="text-sm text-red-600">
          {status.message}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-6 py-20">
      <h1 className="text-2xl font-semibold text-foreground mb-2">
        Reset your password
      </h1>
      <p className="text-muted text-sm mb-8">
        Choose a new password (at least {MIN_LENGTH} characters).
      </p>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <label className="block text-sm font-medium text-foreground">
          New password
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={MIN_LENGTH}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-2 w-full min-h-11 rounded-md border border-border bg-background px-3 text-base text-foreground"
            disabled={status.kind === "submitting"}
          />
        </label>
        <label className="block text-sm font-medium text-foreground">
          Confirm password
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={MIN_LENGTH}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="mt-2 w-full min-h-11 rounded-md border border-border bg-background px-3 text-base text-foreground"
            disabled={status.kind === "submitting"}
          />
        </label>
        <button
          type="submit"
          disabled={status.kind === "submitting" || !password || !confirm}
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-accent px-5 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {status.kind === "submitting" ? "Saving…" : "Save new password"}
        </button>
        {status.kind === "error" && (
          <p role="alert" className="text-sm text-red-600">
            {status.message}
          </p>
        )}
      </form>
    </div>
  );
}
