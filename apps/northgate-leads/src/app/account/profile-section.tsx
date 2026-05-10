"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LicenseStatesPicker } from "@/components/license-states-picker";

// Profile editor for agents. Updates own agents row via update_agent_profile
// RPC. Admin/superadmin don't get rendered this section (page-level conditional)
// AND the RPC raises 'no agent row for current user' if they call it (loud
// failure, defense-in-depth).

// Set-equality for the license_states array. Order can drift as the user
// unchecks/rechecks, so a positional compare would be wrong.
function sameStates(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((s) => set.has(s));
}

export function ProfileSection({
  initialFullName,
  initialLicenseStates,
}: {
  initialFullName: string;
  initialLicenseStates: string[];
}) {
  const [fullName, setFullName] = useState(initialFullName);
  const [licenseStates, setLicenseStates] = useState<string[]>(
    initialLicenseStates,
  );
  const [submitting, setSubmitting] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const dirty =
    fullName.trim() !== initialFullName.trim() ||
    !sameStates(licenseStates, initialLicenseStates);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Full name is required.");
      return;
    }
    if (licenseStates.length === 0) {
      toast.error("Pick at least one license state.");
      return;
    }
    setSubmitting(true);
    const supabase = createSupabaseBrowserClient();
    // Cast through `never` to defeat Supabase's rpc-args overload picking
    // the no-arg variant (same workaround used in get-platform-user.ts).
    const { error } = await supabase.rpc("update_agent_profile", {
      p_full_name: fullName.trim(),
      p_license_states: licenseStates,
    } as never);
    setSubmitting(false);
    if (error) {
      toast.error(`Profile update failed: ${error.message}`);
      return;
    }
    toast.success("Profile updated.");
    startTransition(() => router.refresh());
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="full-name">Full name</Label>
        <Input
          id="full-name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>License states</Label>
        <p className="text-xs text-muted-foreground">
          Pick every state you&apos;re licensed in.
        </p>
        <LicenseStatesPicker
          value={licenseStates}
          onChange={setLicenseStates}
          disabled={submitting}
        />
      </div>
      <Button type="submit" disabled={submitting || !dirty}>
        {submitting ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}
