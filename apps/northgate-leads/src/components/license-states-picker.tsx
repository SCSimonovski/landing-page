"use client";

import { US_STATES, US_STATE_NAMES } from "@platform/shared/validation/common";
import { Checkbox } from "@/components/ui/checkbox";

// Reusable 50-state checkbox grid. Used by:
//   - InviteUserDialog (admin invites a new agent)
//   - /account ProfileSection (agent updates own license_states)
//
// Props mirror RHF's onChange + value contract so RHF Form fields can wire
// directly. value is the current array of state codes; onChange is called
// with the new array on every toggle.

export function LicenseStatesPicker({
  value,
  onChange,
  disabled,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 rounded-md border p-3 max-h-72 overflow-y-auto">
      {US_STATES.map((s) => {
        const selected = value.includes(s);
        return (
          <label
            key={s}
            className="flex items-center gap-2 text-sm cursor-pointer"
          >
            <Checkbox
              checked={selected}
              disabled={disabled}
              onCheckedChange={(checked) => {
                if (checked) {
                  onChange([...value, s]);
                } else {
                  onChange(value.filter((x) => x !== s));
                }
              }}
            />
            <span className="font-mono text-xs text-muted-foreground w-6">
              {s}
            </span>
            <span className="truncate">{US_STATE_NAMES[s]}</span>
          </label>
        );
      })}
    </div>
  );
}
