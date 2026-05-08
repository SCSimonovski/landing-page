"use client";

import { useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
      <div className="w-full max-w-md px-6 py-16">
        <Card>
          <CardHeader>
            <CardTitle>Check your email</CardTitle>
            <CardDescription>
              If an account exists for <strong>{email}</strong>, we sent a
              password-reset link. The link expires after 1 hour.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild variant="link" size="sm" className="px-0">
              <Link href="/login">← Back to sign in</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md px-6 py-16">
      <Card>
        <CardHeader>
          <CardTitle>Forgot password?</CardTitle>
          <CardDescription>
            Enter your email and we&apos;ll send a password-reset link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={status.kind === "submitting"}
              />
            </div>
            <Button type="submit" disabled={status.kind === "submitting" || !email}>
              {status.kind === "submitting" ? "Sending…" : "Send reset link"}
            </Button>
            {status.kind === "error" && (
              <p role="alert" className="text-sm text-destructive">
                {status.message}
              </p>
            )}
          </form>
        </CardContent>
        <CardFooter>
          <Button asChild variant="link" size="sm" className="px-0">
            <Link href="/login">← Back to sign in</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
