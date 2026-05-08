import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setParam, type SearchParams } from "@/lib/url-params";

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
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  if (totalPages <= 1) return null;

  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  const prevHref = setParam(searchParams, "page", String(Math.max(1, page - 1)));
  const nextHref = setParam(
    searchParams,
    "page",
    String(Math.min(totalPages, page + 1)),
  );

  const atFirst = page <= 1;
  const atLast = page >= totalPages;

  return (
    <div className="flex items-center justify-between border-t px-6 py-3 text-sm">
      <p className="text-muted-foreground">
        Showing <span className="font-medium text-foreground">{from}</span>–
        <span className="font-medium text-foreground">{to}</span> of{" "}
        <span className="font-medium text-foreground">{total}</span>
      </p>
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <Button
          asChild={!atFirst}
          variant="outline"
          size="sm"
          disabled={atFirst}
          aria-label="Previous page"
        >
          {atFirst ? (
            <span>
              <ChevronLeftIcon /> Prev
            </span>
          ) : (
            <Link href={prevHref}>
              <ChevronLeftIcon /> Prev
            </Link>
          )}
        </Button>
        <Button
          asChild={!atLast}
          variant="outline"
          size="sm"
          disabled={atLast}
          aria-label="Next page"
        >
          {atLast ? (
            <span>
              Next <ChevronRightIcon />
            </span>
          ) : (
            <Link href={nextHref}>
              Next <ChevronRightIcon />
            </Link>
          )}
        </Button>
      </div>
    </div>
  );
}
