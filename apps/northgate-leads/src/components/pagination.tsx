import Link from "next/link";
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
    <div className="flex items-center justify-between border-t border-border px-6 py-3 text-sm">
      <p className="text-muted">
        Showing <span className="font-medium text-foreground">{from}</span>–
        <span className="font-medium text-foreground">{to}</span> of{" "}
        <span className="font-medium text-foreground">{total}</span>
      </p>
      <div className="flex items-center gap-3 text-sm">
        <span className="text-muted">
          Page {page} of {totalPages}
        </span>
        {atFirst ? (
          <span className="px-3 py-1 rounded-md text-muted">← Prev</span>
        ) : (
          <Link
            href={prevHref}
            className="px-3 py-1 rounded-md text-foreground hover:bg-hover"
          >
            ← Prev
          </Link>
        )}
        {atLast ? (
          <span className="px-3 py-1 rounded-md text-muted">Next →</span>
        ) : (
          <Link
            href={nextHref}
            className="px-3 py-1 rounded-md text-foreground hover:bg-hover"
          >
            Next →
          </Link>
        )}
      </div>
    </div>
  );
}
