"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Active/inactive toggle for /users. Calls set_platform_user_active RPC.
// Self-toggle and admin-deactivating-superadmin both blocked at the RPC
// layer; this component disables the Switch with a tooltip for the cases
// it can detect client-side (self), letting the RPC be the source of
// truth on the cross-role check (admin → superadmin).

export function UsersActiveToggle({
  targetUserId,
  targetEmail,
  targetRole,
  initialActive,
  isSelf,
  callerRole,
}: {
  targetUserId: string;
  targetEmail: string;
  targetRole: string;
  initialActive: boolean;
  isSelf: boolean;
  callerRole: "agent" | "admin" | "superadmin";
}) {
  const [optimistic, setOptimistic] = useState(initialActive);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const adminCantTouchSuperadmin =
    callerRole === "admin" && targetRole === "superadmin";
  const disabled = pending || isSelf || adminCantTouchSuperadmin;

  const tooltipText = isSelf
    ? "You can't deactivate your own account"
    : adminCantTouchSuperadmin
      ? "Admins can't deactivate superadmins"
      : null;

  async function handleChange(checked: boolean) {
    const previous = optimistic;
    setOptimistic(checked);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.rpc("set_platform_user_active", {
      p_target_user_id: targetUserId,
      p_new_active: checked,
    } as never);

    if (error) {
      setOptimistic(previous);
      toast.error(error.message);
      return;
    }
    toast.success(
      `${targetEmail} ${checked ? "activated" : "deactivated"}.`,
    );
    startTransition(() => router.refresh());
  }

  const switchEl = (
    <Switch
      checked={optimistic}
      onCheckedChange={handleChange}
      disabled={disabled}
      aria-label={`Toggle active for ${targetEmail}`}
    />
  );

  if (!tooltipText) return switchEl;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-block">{switchEl}</span>
        </TooltipTrigger>
        <TooltipContent>{tooltipText}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
