"use client";

import { Suspense, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
import { loginAction, type LoginActionState } from "./actions";

const ERROR_MESSAGES: Record<string, string> = {
  not_provisioned:
    "Your account hasn't been set up yet. Ask your administrator to invite you.",
  inactive:
    "Your account is currently inactive. Contact your administrator.",
  insufficient_role: "You don't have access to that page.",
};

// useSearchParams must sit inside a Suspense boundary in Next 16.
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

function NextHidden() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/leads";
  return <input type="hidden" name="next" value={next} />;
}

const initialState: LoginActionState = { error: null };

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialState,
  );

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
          <form action={formAction} className="mt-4 flex flex-col gap-4">
            <Suspense fallback={null}>
              <NextHidden />
            </Suspense>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                disabled={isPending}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                disabled={isPending}
              />
            </div>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Signing in..." : "Sign in"}
            </Button>
            {state.error && (
              <p role="alert" className="text-sm text-destructive">
                {state.error}
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
