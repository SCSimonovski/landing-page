"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setParam, type SearchParams } from "@/lib/url-params";

const PER_PAGE_OPTIONS = [25, 50, 100, 200] as const;

// Set per_page and reset to page 1 (drops the page param entirely).
function perPageHref(params: SearchParams, perPage: number): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (k === "page" || k === "per_page" || v === undefined) continue;
    if (Array.isArray(v)) v.forEach((x) => search.append(k, x));
    else search.append(k, v);
  }
  search.set("per_page", String(perPage));
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

// Always shows first + last + a window of (current ± 1) with ellipses
// where there are gaps. Returns up to 7 entries.
function pageList(current: number, total: number): (number | "…")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages = new Set([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) out.push("…");
    out.push(sorted[i]);
  }
  return out;
}

type NavBtnProps = {
  disabled: boolean;
  href: string;
  variant?: "outline" | "ghost" | "default";
  size?: "sm" | "icon";
  className?: string;
  "aria-label"?: string;
  "aria-current"?: "page";
  children: React.ReactNode;
};

// Wraps shadcn Button + next/link with the disabled-vs-link branching.
// When disabled, renders a plain Button (no Link, no wrapping span — a
// wrapping span would force block-level SVGs onto their own line via the
// Tailwind preflight, breaking icon+text alignment).
function NavBtn({
  disabled,
  href,
  variant = "ghost",
  size = "sm",
  className,
  children,
  ...aria
}: NavBtnProps) {
  if (disabled) {
    return (
      <Button
        variant={variant}
        size={size}
        disabled
        className={className}
        {...aria}
      >
        {children}
      </Button>
    );
  }
  return (
    <Button asChild variant={variant} size={size} className={className} {...aria}>
      <Link href={href}>{children}</Link>
    </Button>
  );
}

export function Pagination({
  searchParams,
  page,
  perPage,
  total,
}: {
  searchParams: SearchParams;
  page: number;
  perPage: number;
  total: number;
}) {
  const router = useRouter();
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const atFirst = page <= 1;
  const atLast = page >= totalPages;

  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  const prevHref = setParam(searchParams, "page", String(Math.max(1, page - 1)));
  const nextHref = setParam(
    searchParams,
    "page",
    String(Math.min(totalPages, page + 1)),
  );
  const firstHref = setParam(searchParams, "page", "1");
  const lastHref = setParam(searchParams, "page", String(totalPages));

  const pages = useMemo(() => pageList(page, totalPages), [page, totalPages]);

  // Arrow keys for prev/next. Skipped when typing in form fields and
  // when modifiers are held (don't fight browser history shortcuts).
  useEffect(() => {
    if (totalPages <= 1) return;
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      const t = e.target as HTMLElement | null;
      if (
        t?.tagName === "INPUT" ||
        t?.tagName === "TEXTAREA" ||
        t?.tagName === "SELECT" ||
        t?.isContentEditable
      ) {
        return;
      }
      if (e.key === "ArrowLeft" && !atFirst) {
        e.preventDefault();
        router.push(`/leads${prevHref}`);
      } else if (e.key === "ArrowRight" && !atLast) {
        e.preventDefault();
        router.push(`/leads${nextHref}`);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, prevHref, nextHref, atFirst, atLast, totalPages]);

  if (total === 0) return null;

  return (
    <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex flex-wrap items-center justify-center gap-3 text-muted-foreground sm:justify-start">
        <p>
          Showing <span className="font-medium text-foreground">{from}</span>–
          <span className="font-medium text-foreground">{to}</span> of{" "}
          <span className="font-medium text-foreground">{total}</span>
        </p>
        <div className="flex items-center gap-2">
          <Select
            value={String(perPage)}
            onValueChange={(v) =>
              router.push(`/leads${perPageHref(searchParams, Number(v))}`)
            }
          >
            <SelectTrigger className="h-8 w-[4.5rem]" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PER_PAGE_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span>per page</span>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-1 sm:justify-start">
          <NavBtn
            disabled={atFirst}
            href={firstHref}
            size="icon"
            aria-label="First page"
            className="h-8 w-8"
          >
            <ChevronsLeftIcon />
          </NavBtn>
          <NavBtn
            disabled={atFirst}
            href={prevHref}
            variant="outline"
            aria-label="Previous page"
          >
            <ChevronLeftIcon />
            <span className="hidden sm:inline">Prev</span>
          </NavBtn>

          <div className="flex items-center gap-1">
            {pages.map((p, i) =>
              p === "…" ? (
                <span
                  key={`gap-${i}`}
                  className="px-1 text-muted-foreground"
                  aria-hidden="true"
                >
                  …
                </span>
              ) : (
                <NavBtn
                  key={p}
                  disabled={p === page}
                  href={setParam(searchParams, "page", String(p))}
                  variant={p === page ? "default" : "ghost"}
                  aria-current={p === page ? "page" : undefined}
                  aria-label={`Page ${p}`}
                  className="h-8 w-8 p-0 font-mono"
                >
                  {p}
                </NavBtn>
              ),
            )}
          </div>

          <NavBtn
            disabled={atLast}
            href={nextHref}
            variant="outline"
            aria-label="Next page"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRightIcon />
          </NavBtn>
          <NavBtn
            disabled={atLast}
            href={lastHref}
            size="icon"
            aria-label="Last page"
            className="h-8 w-8"
          >
            <ChevronsRightIcon />
          </NavBtn>
        </div>
      )}
    </div>
  );
}
