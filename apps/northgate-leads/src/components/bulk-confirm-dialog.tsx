"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangleIcon } from "lucide-react";
import {
  LEAD_STATUS_BADGE_CLASS,
  LEAD_STATUS_LABEL,
  isStatusRegression,
  type LeadStatus,
} from "@/lib/leads/lead-status-options";
import { cn } from "@/lib/utils";

// Two confirm shapes (same component, different content).
//
// "status" mode:
//   Triggered when selected leads have mixed current statuses (i.e., not
//   all already in target). Shows breakdown per current status. If any
//   selected lead is in a state "later in the funnel" than target,
//   shows a distinct regression warning.
//   Two buttons:
//     - Primary: "Apply where it changes" → submits with the safe ID set
//       (excludes regressions + excludes no-ops). Default action.
//     - Secondary: "Apply to all (incl. N downgrades)" → submits with the
//       full ID set (still excludes no-ops; the RPC short-circuits those
//       anyway). Only shown when there ARE regressions to surface.
//
// "assign" mode:
//   Triggered when any selected lead has a non-null current agent_id
//   different from target. Shows breakdown per current agent. Single
//   primary button "Reassign all N" — assign-overwrite is the actual
//   intent of bulk assign per architect guidance, no skip-mode needed.

export type BulkConfirmStatus = {
  kind: "status";
  newStatus: LeadStatus;
  // Per-status counts of CURRENT state across the selection.
  counts: Map<LeadStatus, number>;
  // Lead IDs that would change, split by whether the change is a forward
  // move or a regression. The "safe" set is forwards only; the "all" set
  // is forwards + regressions (no-ops are pre-filtered).
  safeIds: string[];
  regressionIds: string[];
};

export type BulkConfirmAssign = {
  kind: "assign";
  newAgentId: string | null;
  newAgentLabel: string;
  // Map from current agent label → count. "" key = unassigned.
  counts: Map<string, number>;
  // IDs to send (everything except no-ops where current === target).
  applyIds: string[];
};

export type BulkConfirmInput = BulkConfirmStatus | BulkConfirmAssign;

export function BulkConfirmDialog({
  open,
  onOpenChange,
  input,
  onConfirm,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  input: BulkConfirmInput | null;
  onConfirm: (ids: string[]) => Promise<void> | void;
  submitting: boolean;
}) {
  if (!input) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:!max-w-2xl">
        {input.kind === "status" ? (
          <StatusBody
            input={input}
            onConfirm={onConfirm}
            onCancel={() => onOpenChange(false)}
            submitting={submitting}
          />
        ) : (
          <AssignBody
            input={input}
            onConfirm={onConfirm}
            onCancel={() => onOpenChange(false)}
            submitting={submitting}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatusBody({
  input,
  onConfirm,
  onCancel,
  submitting,
}: {
  input: BulkConfirmStatus;
  onConfirm: (ids: string[]) => Promise<void> | void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const totalChange = input.safeIds.length + input.regressionIds.length;
  const hasRegressions = input.regressionIds.length > 0;
  const newLabel = LEAD_STATUS_LABEL[input.newStatus];

  return (
    <>
      <DialogHeader className="text-left">
        <DialogTitle className="text-base sm:text-lg">
          Set {newLabel} on {totalChange} lead
          {totalChange === 1 ? "" : "s"}?
        </DialogTitle>
        <DialogDescription asChild>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground mb-1">Current status:</p>
              <ul className="space-y-1">
                {Array.from(input.counts.entries())
                  // Skipped rows always last; otherwise sort by count desc.
                  .sort(([sa, na], [sb, nb]) => {
                    const aSkip = sa === input.newStatus;
                    const bSkip = sb === input.newStatus;
                    if (aSkip !== bSkip) return aSkip ? 1 : -1;
                    return nb - na;
                  })
                  .map(([s, n]) => {
                    const isNoOp = s === input.newStatus;
                    const isReg =
                      !isNoOp && isStatusRegression(s, input.newStatus);
                    return (
                      <li
                        key={s}
                        className={cn(
                          "flex items-center gap-2",
                          isNoOp && "opacity-50",
                        )}
                      >
                        <Badge className={cn(LEAD_STATUS_BADGE_CLASS[s])}>
                          {LEAD_STATUS_LABEL[s]}
                        </Badge>
                        <span className="text-muted-foreground">·</span>
                        <span className="font-mono text-xs">
                          {n} lead{n === 1 ? "" : "s"}
                        </span>
                        {isNoOp && (
                          <span className="text-muted-foreground italic text-xs">
                            (will skip)
                          </span>
                        )}
                        {isReg && (
                          <span className="text-destructive italic text-xs">
                            (would regress)
                          </span>
                        )}
                      </li>
                    );
                  })}
              </ul>
            </div>
            {hasRegressions && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3">
                <AlertTriangleIcon className="size-4 shrink-0 text-destructive" />
                <p className="text-destructive text-sm">
                  {input.regressionIds.length} lead
                  {input.regressionIds.length === 1 ? "" : "s"} would move{" "}
                  <strong>backward</strong> in the sales funnel
                  (e.g., appointment → contacted). Default action skips these.
                </p>
              </div>
            )}
          </div>
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button
          variant="outline"
          onClick={() => onCancel()}
          disabled={submitting}
        >
          Cancel
        </Button>
        {hasRegressions && (
          <Button
            variant="outline"
            onClick={() =>
              onConfirm([...input.safeIds, ...input.regressionIds])
            }
            disabled={submitting}
          >
            {input.safeIds.length + input.regressionIds.length === 1
              ? "Apply"
              : "Apply to all"}
          </Button>
        )}
        {input.safeIds.length > 0 && (
          <Button
            onClick={() => onConfirm(input.safeIds)}
            disabled={submitting}
          >
            {submitting
              ? "Applying…"
              : hasRegressions
                ? "Skip downgrades"
                : "Apply"}
          </Button>
        )}
      </DialogFooter>
    </>
  );
}

function AssignBody({
  input,
  onConfirm,
  onCancel,
  submitting,
}: {
  input: BulkConfirmAssign;
  onConfirm: (ids: string[]) => Promise<void> | void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const total = input.applyIds.length;
  // Count of leads being pulled from a non-target, non-null agent — i.e.,
  // taken from another agent's pipeline. Excludes "Unassigned" + the target.
  const pulledCount = Array.from(input.counts.entries())
    .filter(([label]) => label !== input.newAgentLabel && label !== "Unassigned")
    .reduce((acc, [, n]) => acc + n, 0);

  return (
    <>
      <DialogHeader className="text-left">
        <DialogTitle className="text-base sm:text-lg pr-4">
          Reassign {total} lead{total === 1 ? "" : "s"} to {input.newAgentLabel}?
        </DialogTitle>
        <DialogDescription asChild>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground mb-1">Currently assigned to:</p>
              <ul className="space-y-1">
                {Array.from(input.counts.entries())
                  // Skipped rows always last; otherwise sort by count desc.
                  .sort(([la, na], [lb, nb]) => {
                    const aSkip = la === input.newAgentLabel;
                    const bSkip = lb === input.newAgentLabel;
                    if (aSkip !== bSkip) return aSkip ? 1 : -1;
                    return nb - na;
                  })
                  .map(([label, n]) => {
                    const isNoOp = label === input.newAgentLabel;
                    return (
                      <li
                        key={label}
                        className={cn(
                          "flex items-center gap-2",
                          isNoOp && "opacity-50",
                        )}
                      >
                        <span className="font-medium">{label}</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {n} lead{n === 1 ? "" : "s"}
                        </span>
                        {isNoOp && (
                          <span className="text-muted-foreground italic text-xs">
                            (will skip)
                          </span>
                        )}
                      </li>
                    );
                  })}
              </ul>
            </div>
            {pulledCount > 0 && (
              <div className="flex items-center gap-2 rounded-md border border-yellow-500/40 bg-yellow-400/15 p-3">
                <AlertTriangleIcon className="size-4 shrink-0 text-yellow-700" />
                <p className="text-yellow-900 text-sm">
                  {`${pulledCount} lead${pulledCount === 1 ? "" : "s"} will be pulled from their current agents. They'll lose access immediately on save.`}
                </p>
              </div>
            )}
          </div>
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button
          variant="outline"
          onClick={() => onCancel()}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button
          onClick={() => onConfirm(input.applyIds)}
          disabled={submitting || total === 0}
        >
          {submitting
            ? "Reassigning…"
            : total === 1
              ? "Reassign"
              : "Reassign all"}
        </Button>
      </DialogFooter>
    </>
  );
}
