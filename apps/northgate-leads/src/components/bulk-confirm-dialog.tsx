"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        {input.kind === "status" ? (
          <StatusBody input={input} onConfirm={onConfirm} submitting={submitting} />
        ) : (
          <AssignBody input={input} onConfirm={onConfirm} submitting={submitting} />
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}

function StatusBody({
  input,
  onConfirm,
  submitting,
}: {
  input: BulkConfirmStatus;
  onConfirm: (ids: string[]) => Promise<void> | void;
  submitting: boolean;
}) {
  const totalChange = input.safeIds.length + input.regressionIds.length;
  const hasRegressions = input.regressionIds.length > 0;
  const noOpCount = Array.from(input.counts.entries())
    .filter(([s]) => s === input.newStatus)
    .reduce((acc, [, n]) => acc + n, 0);
  const newLabel = LEAD_STATUS_LABEL[input.newStatus];

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>
          Set status → {newLabel} on {totalChange} lead
          {totalChange === 1 ? "" : "s"}?
        </AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground mb-1">Current status:</p>
              <ul className="space-y-1">
                {Array.from(input.counts.entries())
                  .sort((a, b) => b[1] - a[1])
                  .map(([s, n]) => (
                    <li key={s} className="flex items-center gap-2">
                      <Badge className={cn(LEAD_STATUS_BADGE_CLASS[s])}>
                        {LEAD_STATUS_LABEL[s]}
                      </Badge>
                      <span>
                        {n} lead{n === 1 ? "" : "s"}
                        {s === input.newStatus && (
                          <span className="text-muted-foreground italic ml-1">
                            (already in target — will skip)
                          </span>
                        )}
                        {s !== input.newStatus &&
                          isStatusRegression(s, input.newStatus) && (
                            <span className="text-destructive italic ml-1">
                              (would regress)
                            </span>
                          )}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
            {hasRegressions && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3">
                <AlertTriangleIcon className="size-4 shrink-0 text-destructive mt-0.5" />
                <p className="text-destructive text-sm">
                  {input.regressionIds.length} lead
                  {input.regressionIds.length === 1 ? "" : "s"} would move{" "}
                  <strong>backward</strong> in the sales funnel
                  (e.g., appointment → contacted). Default action skips these.
                </p>
              </div>
            )}
            {noOpCount > 0 && (
              <p className="text-xs text-muted-foreground">
                {noOpCount} lead{noOpCount === 1 ? "" : "s"} already in{" "}
                {newLabel} — will skip in either case (no-op).
              </p>
            )}
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter className="flex-col sm:flex-row gap-2">
        <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
        {hasRegressions && (
          <Button
            variant="outline"
            onClick={() =>
              onConfirm([...input.safeIds, ...input.regressionIds])
            }
            disabled={submitting}
          >
            Apply to all{" "}
            {input.safeIds.length + input.regressionIds.length} (incl.{" "}
            {input.regressionIds.length} downgrade
            {input.regressionIds.length === 1 ? "" : "s"})
          </Button>
        )}
        <AlertDialogAction
          onClick={() => onConfirm(input.safeIds)}
          disabled={submitting || input.safeIds.length === 0}
        >
          {submitting
            ? "Applying…"
            : hasRegressions
              ? `Apply to ${input.safeIds.length} (skip downgrades)`
              : `Apply to ${input.safeIds.length}`}
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  );
}

function AssignBody({
  input,
  onConfirm,
  submitting,
}: {
  input: BulkConfirmAssign;
  onConfirm: (ids: string[]) => Promise<void> | void;
  submitting: boolean;
}) {
  const total = input.applyIds.length;
  const noOpCount = (input.counts.get(input.newAgentLabel) ?? 0);

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>
          Reassign {total} lead{total === 1 ? "" : "s"} → {input.newAgentLabel}?
        </AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground mb-1">Currently assigned to:</p>
              <ul className="space-y-1">
                {Array.from(input.counts.entries())
                  .sort((a, b) => b[1] - a[1])
                  .map(([label, n]) => (
                    <li key={label} className="flex items-center gap-2">
                      <span className="font-medium">{label}</span>
                      <span className="text-muted-foreground">
                        {n} lead{n === 1 ? "" : "s"}
                        {label === input.newAgentLabel && (
                          <span className="italic ml-1">
                            (no-op — already with target)
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
            {noOpCount > 0 && (
              <p className="text-xs text-muted-foreground">
                {noOpCount} lead{noOpCount === 1 ? "" : "s"} already with{" "}
                {input.newAgentLabel} — will skip (no-op).
              </p>
            )}
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
        <AlertDialogAction
          onClick={() => onConfirm(input.applyIds)}
          disabled={submitting || total === 0}
        >
          {submitting ? "Reassigning…" : `Reassign all ${total}`}
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  );
}
