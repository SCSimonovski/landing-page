"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
      const supabase = createSupabaseBrowserClient();

      // Short-circuit if a session already exists (React Strict Mode runs
      // effects twice in dev — first mount's exchange succeeded + cleared
      // the PKCE verifier; second mount's exchange would otherwise fail
      // with "verifier not found"). Also handles back-button + refresh
      // after a successful exchange.
      const {
        data: { session: existing },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (existing) {
        window.history.replaceState(null, "", window.location.pathname);
        setStatus({ kind: "ready" });
        return;
      }

      // PKCE flow (browser-client resetPasswordForEmail): ?code=... in query.
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (error) {
          setStatus({ kind: "error", message: error.message });
          return;
        }
        window.history.replaceState(null, "", window.location.pathname);
        setStatus({ kind: "ready" });
        return;
      }

      // Implicit flow fallback: #access_token=...&type=recovery in hash.
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
      <div className="w-full max-w-md px-6 py-16">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Verifying recovery link…</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status.kind === "error" && password === "") {
    return (
      <div className="w-full max-w-md px-6 py-16">
        <Card>
          <CardHeader>
            <CardTitle>Recovery link issue</CardTitle>
          </CardHeader>
          <CardContent>
            <p role="alert" className="text-sm text-destructive">
              {status.message}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md px-6 py-16">
      <Card>
        <CardHeader>
          <CardTitle>Reset your password</CardTitle>
          <CardDescription>
            Choose a new password (at least {MIN_LENGTH} characters).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={MIN_LENGTH}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={status.kind === "submitting"}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={MIN_LENGTH}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={status.kind === "submitting"}
              />
            </div>
            <Button
              type="submit"
              disabled={status.kind === "submitting" || !password || !confirm}
            >
              {status.kind === "submitting" ? "Saving…" : "Save new password"}
            </Button>
            {status.kind === "error" && (
              <p role="alert" className="text-sm text-destructive">
                {status.message}
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
