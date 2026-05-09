"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { XIcon } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLeadSelection } from "@/components/lead-selection-provider";
import {
  LEAD_STATUS_LABEL,
  LEAD_STATUS_VALUES,
  type LeadStatus,
} from "@/lib/leads/lead-status-options";

// Sticky action bar at the top of the leads view. Renders only when
// selection is non-empty. Two actions in v1:
//   - Assign to agent (admin/superadmin only) — calls bulk_assign_leads
//   - Set status (all roles, RPC enforces own-lead constraint per agent)
// Designed so future actions (Mark DNC, bulk delete, etc.) drop in as
// additional buttons next to the existing two.

const UNASSIGNED = "__unassigned__";
const PLACEHOLDER = "__placeholder__";

export function BulkActionBar({
  isAdmin,
  agents,
}: {
  isAdmin: boolean;
  agents: { id: string; full_name: string }[];
}) {
  const { selected, clear } = useLeadSelection();
  const [pending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [assignValue, setAssignValue] = useState<string>(PLACEHOLDER);
  const [statusValue, setStatusValue] = useState<string>(PLACEHOLDER);
  const router = useRouter();

  if (selected.size === 0) return null;
  const ids = Array.from(selected);
  const count = ids.length;

  async function handleAssign(next: string) {
    if (next === PLACEHOLDER) return;
    setSubmitting(true);
    setAssignValue(next);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.rpc("bulk_assign_leads", {
      p_lead_ids: ids,
      p_new_agent_id: next === UNASSIGNED ? null : next,
    } as never);
    setSubmitting(false);
    setAssignValue(PLACEHOLDER);
    if (error) {
      toast.error(`Bulk assign failed: ${error.message}`);
      return;
    }
    const targetLabel =
      next === UNASSIGNED
        ? "Unassigned"
        : (agents.find((a) => a.id === next)?.full_name ?? "agent");
    toast.success(`Assigned ${count} lead${count === 1 ? "" : "s"} → ${targetLabel}`);
    clear();
    startTransition(() => router.refresh());
  }

  async function handleStatus(next: string) {
    if (next === PLACEHOLDER) return;
    const newStatus = next as LeadStatus;
    setSubmitting(true);
    setStatusValue(newStatus);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.rpc("bulk_update_lead_status", {
      p_lead_ids: ids,
      p_new_status: newStatus,
    } as never);
    setSubmitting(false);
    setStatusValue(PLACEHOLDER);
    if (error) {
      toast.error(`Bulk status update failed: ${error.message}`);
      return;
    }
    toast.success(
      `Set ${count} lead${count === 1 ? "" : "s"} → ${LEAD_STATUS_LABEL[newStatus]}`,
    );
    clear();
    startTransition(() => router.refresh());
  }

  const disabled = pending || submitting;

  return (
    <div className="sticky top-0 z-20 border-b bg-card px-6 py-3 shadow-sm">
      <div className="mx-auto max-w-7xl flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium">
          {count} lead{count === 1 ? "" : "s"} selected
        </span>
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          {isAdmin && (
            <Select value={assignValue} onValueChange={handleAssign} disabled={disabled}>
              <SelectTrigger className="h-8 w-[180px]">
                <SelectValue placeholder="Assign to agent…">
                  {assignValue === PLACEHOLDER
                    ? undefined
                    : assignValue === UNASSIGNED
                      ? "Unassigning…"
                      : `Assigning to ${agents.find((a) => a.id === assignValue)?.full_name ?? "…"}`}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED}>
                  <span className="text-muted-foreground italic">— Unassign —</span>
                </SelectItem>
                {agents.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={statusValue} onValueChange={handleStatus} disabled={disabled}>
            <SelectTrigger className="h-8 w-[160px]">
              <SelectValue placeholder="Set status…">
                {statusValue === PLACEHOLDER
                  ? undefined
                  : `Setting → ${LEAD_STATUS_LABEL[statusValue as LeadStatus]}`}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {LEAD_STATUS_VALUES.map((s) => (
                <SelectItem key={s} value={s}>
                  {LEAD_STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="sm"
            onClick={clear}
            disabled={disabled}
            className="h-8"
          >
            <XIcon className="size-3.5" /> Clear
          </Button>
        </div>
      </div>
    </div>
  );
}
