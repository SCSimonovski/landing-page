"use client";

import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type AddFilterOption = { key: string; label: string };

export function AddFilterButton({
  options,
  onSelect,
}: {
  options: AddFilterOption[];
  onSelect: (key: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 border-dashed"
        >
          <PlusIcon className="size-3.5" /> Filter
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-[calc(100vw-1.5rem)] max-w-[14rem] sm:w-44"
      >
        {options.map((o) => (
          <DropdownMenuItem key={o.key} onSelect={() => onSelect(o.key)}>
            {o.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
