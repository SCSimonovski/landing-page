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
  BulkConfirmDialog,
  type BulkConfirmInput,
} from "@/components/bulk-confirm-dialog";
import {
  LEAD_STATUS_LABEL,
  LEAD_STATUS_VALUES,
  isStatusRegression,
  type LeadStatus,
} from "@/lib/leads/lead-status-options";

// Sticky action bar at the top of the leads view. Renders only when
// selection is non-empty.
//
// Plan 5.5 safety pattern: the RPC stays dumb (validates auth + cap,
// generates bulk_operation_id, applies, audits). The modal (BulkConfirmDialog)
// carries all safety logic — breakdown, regression warnings, default vs
// override choice. This module decides only:
//   1. Whether to OPEN the modal at all (homogeneous → submit immediately;
//      heterogeneous-with-overwrite → modal).
//   2. Which IDs the modal's confirm button should send to the RPC.

const UNASSIGNED = "__unassigned__";
// Empty string is Radix Select's sentinel for "no selection" — only value
// that triggers the placeholder.
const PLACEHOLDER = "";

export type SelectionLead = {
  id: string;
  status: LeadStatus;
  agent_id: string | null;
};

export function BulkActionBar({
  isAdmin,
  agents,
  leads,
}: {
  isAdmin: boolean;
  agents: { id: string; full_name: string }[];
  leads: SelectionLead[];
}) {
  const { selected, clear } = useLeadSelection();
  const [pending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [assignValue, setAssignValue] = useState<string>(PLACEHOLDER);
  const [statusValue, setStatusValue] = useState<string>(PLACEHOLDER);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState<BulkConfirmInput | null>(
    null,
  );
  // The submit handler used by the dialog — set when we open the dialog.
  const [confirmSubmit, setConfirmSubmit] = useState<
    ((ids: string[]) => Promise<void>) | null
  >(null);
  const router = useRouter();

  if (selected.size === 0) return null;
  const selectedLeads = leads.filter((l) => selected.has(l.id));
  const count = selectedLeads.length;

  // ---------------------------------------------------------------------------
  // Status action
  // ---------------------------------------------------------------------------
  async function applyStatus(ids: string[], newStatus: LeadStatus) {
    setSubmitting(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.rpc("bulk_update_lead_status", {
      p_lead_ids: ids,
      p_new_status: newStatus,
    } as never);
    setSubmitting(false);
    setStatusValue(PLACEHOLDER);
    setConfirmOpen(false);
    if (error) {
      toast.error(`Bulk status update failed: ${error.message}`);
      return;
    }
    toast.success(
      `Set ${ids.length} lead${ids.length === 1 ? "" : "s"} → ${LEAD_STATUS_LABEL[newStatus]}`,
    );
    clear();
    startTransition(() => router.refresh());
  }

  function handleStatusChange(next: string) {
    if (next === PLACEHOLDER) return;
    const newStatus = next as LeadStatus;
    setStatusValue(newStatus);

    // Partition: no-ops (already in target), forward changes (safe),
    // regressions (backward in funnel).
    const noOpIds: string[] = [];
    const safeIds: string[] = [];
    const regressionIds: string[] = [];
    const counts = new Map<LeadStatus, number>();
    for (const l of selectedLeads) {
      counts.set(l.status, (counts.get(l.status) ?? 0) + 1);
      if (l.status === newStatus) {
        noOpIds.push(l.id);
      } else if (isStatusRegression(l.status, newStatus)) {
        regressionIds.push(l.id);
      } else {
        safeIds.push(l.id);
      }
    }

    // Trigger: "modal-on-overwrite" — open dialog if ANY selected lead
    // has a current status different from target (i.e., the RPC would
    // actually change something, which is the case the user wants to
    // see). Homogeneous-already-target → just toast no-op.
    const wouldChange = safeIds.length + regressionIds.length;
    if (wouldChange === 0) {
      toast.info(
        `All ${count} selected leads already have status ${LEAD_STATUS_LABEL[newStatus]}.`,
      );
      setStatusValue(PLACEHOLDER);
      return;
    }

    // Open modal — let the user pick safe-only or all.
    setConfirmInput({
      kind: "status",
      newStatus,
      counts,
      safeIds,
      regressionIds,
    });
    setConfirmSubmit(() => (ids: string[]) => applyStatus(ids, newStatus));
    setConfirmOpen(true);
  }

  // ---------------------------------------------------------------------------
  // Assign action
  // ---------------------------------------------------------------------------
  async function applyAssign(ids: string[], newAgentId: string | null) {
    setSubmitting(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.rpc("bulk_assign_leads", {
      p_lead_ids: ids,
      p_new_agent_id: newAgentId,
    } as never);
    setSubmitting(false);
    setAssignValue(PLACEHOLDER);
    setConfirmOpen(false);
    if (error) {
      toast.error(`Bulk assign failed: ${error.message}`);
      return;
    }
    const targetLabel =
      newAgentId === null
        ? "Unassigned"
        : (agents.find((a) => a.id === newAgentId)?.full_name ?? "agent");
    toast.success(
      `Assigned ${ids.length} lead${ids.length === 1 ? "" : "s"} → ${targetLabel}`,
    );
    clear();
    startTransition(() => router.refresh());
  }

  function handleAssignChange(next: string) {
    if (next === PLACEHOLDER) return;
    setAssignValue(next);
    const newAgentId = next === UNASSIGNED ? null : next;
    const targetLabel =
      newAgentId === null
        ? "Unassigned"
        : (agents.find((a) => a.id === newAgentId)?.full_name ?? "agent");

    // Partition by current agent. Counts keyed by display label.
    const labelOf = (id: string | null): string =>
      id === null
        ? "Unassigned"
        : (agents.find((a) => a.id === id)?.full_name ?? "Unknown agent");
    const applyIds: string[] = [];
    const counts = new Map<string, number>();
    let wouldOverwriteAssigned = false;
    for (const l of selectedLeads) {
      const label = labelOf(l.agent_id);
      counts.set(label, (counts.get(label) ?? 0) + 1);
      if (l.agent_id !== newAgentId) {
        applyIds.push(l.id);
        if (l.agent_id !== null && l.agent_id !== newAgentId) {
          wouldOverwriteAssigned = true;
        }
      }
    }

    if (applyIds.length === 0) {
      toast.info(
        `All ${count} selected leads already assigned to ${targetLabel}.`,
      );
      setAssignValue(PLACEHOLDER);
      return;
    }

    // Trigger: open modal when at least one selected lead is currently
    // assigned to a non-null agent that's NOT the target (i.e., the
    // action would overwrite an existing assignment). Homogeneous
    // unassigned → fresh assignment; submit immediately.
    if (!wouldOverwriteAssigned) {
      void applyAssign(applyIds, newAgentId);
      return;
    }

    setConfirmInput({
      kind: "assign",
      newAgentId,
      newAgentLabel: targetLabel,
      counts,
      applyIds,
    });
    setConfirmSubmit(() => (ids: string[]) => applyAssign(ids, newAgentId));
    setConfirmOpen(true);
  }

  // Reset selects when dialog closes via cancel/escape.
  function handleDialogOpenChange(open: boolean) {
    setConfirmOpen(open);
    if (!open) {
      setStatusValue(PLACEHOLDER);
      setAssignValue(PLACEHOLDER);
      setConfirmInput(null);
      setConfirmSubmit(null);
    }
  }

  const disabled = pending || submitting;

  return (
    <>
      <div className="sticky top-0 z-20 border-b bg-card px-6 py-3 shadow-sm">
        <div className="mx-auto max-w-7xl flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium">
            {count} lead{count === 1 ? "" : "s"} selected
          </span>
          <div className="flex flex-wrap items-center gap-2 ml-auto">
            {isAdmin && (
              <Select
                value={assignValue}
                onValueChange={handleAssignChange}
                disabled={disabled}
              >
                <SelectTrigger className="h-8 w-[180px]">
                  <SelectValue placeholder="Assign to agent…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED}>
                    <span className="text-muted-foreground italic">
                      — Unassign —
                    </span>
                  </SelectItem>
                  {agents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select
              value={statusValue}
              onValueChange={handleStatusChange}
              disabled={disabled}
            >
              <SelectTrigger className="h-8 w-[160px]">
                <SelectValue placeholder="Set status…" />
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
      <BulkConfirmDialog
        open={confirmOpen}
        onOpenChange={handleDialogOpenChange}
        input={confirmInput}
        onConfirm={async (ids) => {
          if (confirmSubmit) await confirmSubmit(ids);
        }}
        submitting={submitting}
      />
    </>
  );
}
