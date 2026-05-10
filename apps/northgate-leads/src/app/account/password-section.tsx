"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Two-step password change.
//   1. Verify current via signInWithPassword. Supabase replaces the
//      session cookies in-place — no sign-out cycle / no JWT loss for
//      the current page.
//   2. On success, updateUser({ password }).
//
// 8-char min matches the convention from setup-password / reset-password.

const MIN_LENGTH = 8;

type Status =
  | { kind: "idle" }
  | { kind: "verifying" }
  | { kind: "updating" }
  | { kind: "error"; message: string };

export function PasswordSection({ email }: { email: string }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < MIN_LENGTH) {
      setStatus({
        kind: "error",
        message: `New password must be at least ${MIN_LENGTH} characters.`,
      });
      return;
    }
    if (next !== confirm) {
      setStatus({ kind: "error", message: "New passwords don't match." });
      return;
    }
    if (next === current) {
      setStatus({
        kind: "error",
        message: "New password must differ from current password.",
      });
      return;
    }

    const supabase = createSupabaseBrowserClient();

    setStatus({ kind: "verifying" });
    const { error: verifyErr } = await supabase.auth.signInWithPassword({
      email,
      password: current,
    });
    if (verifyErr) {
      setStatus({
        kind: "error",
        message: "Current password is incorrect.",
      });
      return;
    }

    setStatus({ kind: "updating" });
    const { error: updateErr } = await supabase.auth.updateUser({
      password: next,
    });
    if (updateErr) {
      setStatus({ kind: "error", message: updateErr.message });
      return;
    }

    setStatus({ kind: "idle" });
    setCurrent("");
    setNext("");
    setConfirm("");
    toast.success("Password updated.");
  }

  const submitting = status.kind === "verifying" || status.kind === "updating";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="current-password">Current password</Label>
        <Input
          id="current-password"
          type="password"
          autoComplete="current-password"
          required
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          disabled={submitting}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="new-password">New password</Label>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={MIN_LENGTH}
          value={next}
          onChange={(e) => setNext(e.target.value)}
          disabled={submitting}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="confirm-password">Confirm new password</Label>
        <Input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={MIN_LENGTH}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          disabled={submitting}
        />
      </div>
      <Button
        type="submit"
        disabled={submitting || !current || !next || !confirm}
      >
        {status.kind === "verifying"
          ? "Verifying current password…"
          : status.kind === "updating"
            ? "Saving…"
            : "Update password"}
      </Button>
      {status.kind === "error" && (
        <p role="alert" className="text-sm text-destructive">
          {status.message}
        </p>
      )}
    </form>
  );
}
