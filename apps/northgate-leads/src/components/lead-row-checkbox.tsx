"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { TableCell } from "@/components/ui/table";
import { useLeadSelection } from "@/components/lead-selection-provider";

// Per-row checkbox cell (admin/superadmin only — caller renders or skips).
// Click stops propagation so it doesn't trigger the row's onClick (which
// navigates to /leads/[id]).

const stop = (e: React.MouseEvent) => e.stopPropagation();

export function LeadRowCheckbox({ leadId }: { leadId: string }) {
  const { isSelected, toggle } = useLeadSelection();
  return (
    <TableCell
      onClick={stop}
      className="sm:sticky sm:left-0 sm:z-10 sm:bg-inherit !px-3"
    >
      <Checkbox
        checked={isSelected(leadId)}
        onCheckedChange={() => toggle(leadId)}
        aria-label="Select lead"
      />
    </TableCell>
  );
}
