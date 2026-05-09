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

// Assignment dropdown for the detail page. Admin/superadmin only — the
// page renders this conditionally; the assign_lead RPC also rejects
// non-admin callers (defense in depth).
//
// "unassigned" sentinel maps to NULL on the RPC side. Select needs a
// non-empty string to work, so we use the literal string and convert
// at the call site.

const UNASSIGNED = "__unassigned__";

export function LeadAssignSelect({
  leadId,
  currentAgentId,
  agents,
}: {
  leadId: string;
  currentAgentId: string | null;
  agents: { id: string; full_name: string }[];
}) {
  const [optimistic, setOptimistic] = useState<string>(
    currentAgentId ?? UNASSIGNED,
  );
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function handleChange(next: string) {
    if (next === optimistic) return;
    const previous = optimistic;
    setOptimistic(next);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.rpc("assign_lead", {
      p_lead_id: leadId,
      p_new_agent_id: next === UNASSIGNED ? null : next,
    } as never);

    if (error) {
      setOptimistic(previous);
      toast.error(`Assignment failed: ${error.message}`);
      return;
    }

    const targetLabel =
      next === UNASSIGNED
        ? "Unassigned"
        : (agents.find((a) => a.id === next)?.full_name ?? "agent");
    toast.success(`Assigned to ${targetLabel}`);
    startTransition(() => router.refresh());
  }

  return (
    <Select value={optimistic} onValueChange={handleChange} disabled={pending}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Pick an agent" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={UNASSIGNED}>
          <span className="text-muted-foreground italic">Unassigned</span>
        </SelectItem>
        {agents.map((a) => (
          <SelectItem key={a.id} value={a.id}>
            {a.full_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
