"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
  | { kind: "error"; message: string };

// Map error param keys (set by /leads/page.tsx redirects + by requireAdmin)
// to user-facing copy. Keep the key set narrow — anything else is ignored.
const ERROR_MESSAGES: Record<string, string> = {
  not_provisioned:
    "Your account hasn't been set up yet. Ask your administrator to invite you.",
  inactive:
    "Your account is currently inactive. Contact your administrator.",
  insufficient_role: "You don't have access to that page.",
};

// Reads ?error=... from the URL. Lives in its own subcomponent so it can
// be wrapped in Suspense — Next 16 errors at build time if useSearchParams
// is called outside a Suspense boundary on a route it tries to statically
// render.
function LoginErrorBanner() {
  const params = useSearchParams();
  const key = params.get("error");
  const msg = key ? ERROR_MESSAGES[key] : null;
  if (!msg) return null;
  return (
    <div
      role="alert"
      className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      {msg}
    </div>
  );
}

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
    <div className="w-full max-w-md px-6 py-16">
      <Card>
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            Use the password you set up via your invitation link. Invite-only —
            if you haven&apos;t been invited yet, ask the operator.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={null}>
            <LoginErrorBanner />
          </Suspense>
          <form
            onSubmit={onSubmit}
            noValidate
            className="mt-4 flex flex-col gap-4"
          >
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
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={status.kind === "submitting"}
              />
            </div>
            <Button
              type="submit"
              disabled={status.kind === "submitting" || !email || !password}
            >
              {status.kind === "submitting" ? "Signing in..." : "Sign in"}
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
            <Link href="/auth/forgot-password">Forgot password?</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
