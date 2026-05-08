"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-md px-6 py-20 text-center">
      <h1 className="text-2xl font-semibold text-foreground mb-3">
        Something went wrong
      </h1>
      <p className="text-muted mb-6">
        An unexpected error occurred. Try reloading the page.
      </p>
      <button
        type="button"
        onClick={reset}
        className="inline-flex min-h-11 items-center rounded-md bg-accent px-5 py-2 text-sm font-medium text-white hover:bg-accent-hover"
      >
        Try again
      </button>
    </div>
  );
}
