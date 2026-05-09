"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  LEAD_STATUS_BADGE_CLASS,
  LEAD_STATUS_LABEL,
  LEAD_STATUS_VALUES,
  type LeadStatus,
} from "@/lib/leads/lead-status-options";

// Status dropdown for the detail page. Calls update_lead_status RPC.
// On success → toast + router.refresh() so the activity timeline +
// leads.status reflect the change. On failure → revert + inline-via-toast
// error message.

export function LeadStatusSelect({
  leadId,
  currentStatus,
}: {
  leadId: string;
  currentStatus: LeadStatus;
}) {
  const [optimistic, setOptimistic] = useState<LeadStatus>(currentStatus);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function handleChange(next: string) {
    const newStatus = next as LeadStatus;
    if (newStatus === optimistic) return; // no-op
    const previous = optimistic;
    setOptimistic(newStatus);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.rpc("update_lead_status", {
      p_lead_id: leadId,
      p_new_status: newStatus,
    } as never);

    if (error) {
      setOptimistic(previous); // revert
      toast.error(`Status update failed: ${error.message}`);
      return;
    }

    toast.success(`Status → ${LEAD_STATUS_LABEL[newStatus]}`);
    startTransition(() => router.refresh());
  }

  // <SelectValue> stays a leaf (sr-only here so Radix can keep its
  // accessibility contract); we render the visible badge ourselves inside
  // the trigger. React 19 throws "Cannot use a ref ... if that element
  // also sets children" when you put custom children inside SelectValue.
  return (
    <Select value={optimistic} onValueChange={handleChange} disabled={pending}>
      <SelectTrigger className="w-[180px]">
        <Badge className={cn(LEAD_STATUS_BADGE_CLASS[optimistic])}>
          {LEAD_STATUS_LABEL[optimistic]}
        </Badge>
        <SelectValue className="sr-only" />
      </SelectTrigger>
      <SelectContent>
        {LEAD_STATUS_VALUES.map((s) => (
          <SelectItem key={s} value={s}>
            <Badge className={cn(LEAD_STATUS_BADGE_CLASS[s])}>
              {LEAD_STATUS_LABEL[s]}
            </Badge>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
