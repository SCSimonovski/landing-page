"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { resendInvite } from "./actions";

export function ResendInviteButton({ email }: { email: string }) {
  const [pending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);

  function handleClick() {
    setSubmitting(true);
    startTransition(async () => {
      const result = await resendInvite(email);
      setSubmitting(false);
      if (result.ok) {
        toast.success(`Invite re-sent to ${email}`);
      } else {
        toast.error(`Resend failed: ${result.error}`);
      }
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      disabled={pending || submitting}
      className="h-6 px-2 text-xs text-amber-700 hover:text-amber-900"
    >
      {submitting ? "Sending…" : "Resend"}
    </Button>
  );
}
