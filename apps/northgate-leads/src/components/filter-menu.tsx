"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDownIcon, CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  toggleMultiParam,
  toggleParam,
  clearParam,
  type SearchParams,
} from "@/lib/url-params";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string };

// Per-category filter dropdown. Renders a button (with active-count badge
// when a value is set) and a popover with options. Multi-select uses
// checkboxes and toggles values in/out via toggleMultiParam; single-select
// uses a list with a check icon next to the active value and toggles via
// toggleParam.
//
// Each click is a router.push to the new URL — server re-renders the page
// with the updated filter set + the popover stays open. URL is the source
// of truth (matches Plan 3's URL-as-state pattern).
export function FilterMenu({
  label,
  paramKey,
  options,
  selected,
  mode,
  searchParams,
}: {
  label: string;
  paramKey: string;
  options: Option[];
  selected: string[]; // current values from URL (always normalized to array)
  mode: "multi" | "single";
  searchParams: SearchParams;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleToggle(value: string) {
    const newUrl =
      mode === "multi"
        ? toggleMultiParam(searchParams, paramKey, value)
        : toggleParam(searchParams, paramKey, value);
    startTransition(() => {
      router.push(`/leads${newUrl}`);
    });
  }

  function handleClear() {
    const newUrl = clearParam(searchParams, paramKey);
    startTransition(() => {
      router.push(`/leads${newUrl}`);
    });
  }

  const count = selected.length;
  const hasSelection = count > 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={hasSelection ? "secondary" : "outline"}
          size="sm"
          className={cn(
            "h-8 gap-1.5",
            pending && "opacity-70",
          )}
        >
          {label}
          {hasSelection && (
            <span className="ml-1 rounded-sm bg-primary px-1.5 text-[10px] font-medium text-primary-foreground">
              {count}
            </span>
          )}
          <ChevronDownIcon className="size-3.5 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1" align="start">
        <div className="max-h-72 overflow-y-auto py-1">
          {options.map((o) => {
            const active = selected.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => handleToggle(o.value)}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
                  "hover:bg-accent hover:text-accent-foreground",
                  active && "font-medium",
                )}
              >
                <span
                  className={cn(
                    "flex size-4 items-center justify-center rounded-sm border",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input",
                  )}
                >
                  {active && <CheckIcon className="size-3" strokeWidth={3} />}
                </span>
                <span className="flex-1 text-left">{o.label}</span>
              </button>
            );
          })}
        </div>
        {hasSelection && (
          <>
            <div className="my-1 h-px bg-border" />
            <button
              type="button"
              onClick={handleClear}
              className="flex w-full cursor-pointer items-center justify-center rounded-sm px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              Clear
            </button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
