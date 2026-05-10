"use client";

import { useEffect, useRef } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { TableHead } from "@/components/ui/table";
import { useLeadSelection } from "@/components/lead-selection-provider";

// Header checkbox: selects/clears all VISIBLE rows on the current page.
// Cross-page selection is not in scope (would need persistence across
// navigations + a "select all 247 matching leads" UX hint).
//
// Three states: all visible selected (checked), some selected
// (indeterminate, native input only), none selected (unchecked).

export function LeadHeaderCheckbox({ visibleIds }: { visibleIds: string[] }) {
  const { allOf, someOf, selectMany, unselectMany } = useLeadSelection();
  const allChecked = allOf(visibleIds);
  const someChecked = someOf(visibleIds);
  const indeterminate = someChecked && !allChecked;

  // Radix Checkbox supports an "indeterminate" value via boolean | "indeterminate".
  // Pass it as the controlled value when the page is partially selected.
  const value: boolean | "indeterminate" = allChecked
    ? true
    : indeterminate
      ? "indeterminate"
      : false;

  // Clear focus ring noise when nothing visible (degenerate case).
  const triggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (visibleIds.length === 0) triggerRef.current?.blur();
  }, [visibleIds.length]);

  return (
    <TableHead className="sm:sticky sm:left-0 sm:z-20 sm:bg-card !px-3">
      <Checkbox
        ref={triggerRef}
        checked={value}
        onCheckedChange={() => {
          if (allChecked) unselectMany(visibleIds);
          else selectMany(visibleIds);
        }}
        disabled={visibleIds.length === 0}
        aria-label="Select all visible leads"
      />
    </TableHead>
  );
}
