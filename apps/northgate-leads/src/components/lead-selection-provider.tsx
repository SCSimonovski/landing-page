"use client";

import { createContext, useContext, useMemo, useState } from "react";

// Selection state for the leads table. Lives in client-side React state
// (NOT in URL — selection is ephemeral; persisting it across navigations
// is its own UX problem we're not solving in v1). Header checkbox selects
// only the visible page; cross-page selection is deferred.

type Ctx = {
  selected: Set<string>;
  toggle: (id: string) => void;
  isSelected: (id: string) => boolean;
  selectMany: (ids: string[]) => void;
  unselectMany: (ids: string[]) => void;
  clear: () => void;
  // Header checkbox helpers — operate on a list of IDs (the visible page).
  allOf: (ids: string[]) => boolean;
  someOf: (ids: string[]) => boolean;
};

const SelectionContext = createContext<Ctx | null>(null);

export function useLeadSelection(): Ctx {
  const ctx = useContext(SelectionContext);
  if (!ctx) {
    throw new Error(
      "useLeadSelection must be used within <LeadSelectionProvider>",
    );
  }
  return ctx;
}

export function LeadSelectionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const value = useMemo<Ctx>(() => {
    return {
      selected,
      toggle(id) {
        setSelected((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
      },
      isSelected(id) {
        return selected.has(id);
      },
      selectMany(ids) {
        setSelected((prev) => {
          const next = new Set(prev);
          for (const id of ids) next.add(id);
          return next;
        });
      },
      unselectMany(ids) {
        setSelected((prev) => {
          const next = new Set(prev);
          for (const id of ids) next.delete(id);
          return next;
        });
      },
      clear() {
        setSelected(new Set());
      },
      allOf(ids) {
        if (ids.length === 0) return false;
        return ids.every((id) => selected.has(id));
      },
      someOf(ids) {
        return ids.some((id) => selected.has(id));
      },
    };
  }, [selected]);

  return (
    <SelectionContext.Provider value={value}>
      {children}
    </SelectionContext.Provider>
  );
}
