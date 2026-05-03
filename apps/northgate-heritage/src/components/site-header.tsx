import Image from "next/image";
import Link from "next/link";

export function SiteHeader() {
  return (
    <>
      <div className="bg-foreground text-background-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-1.5 sm:py-2 text-[6px] sm:text-[8px] font-medium tracking-[0.16em] uppercase">
          <span>Form NH-1 · Final Expense Inquiry</span>
          <span className="hidden sm:inline opacity-65">
            TCPA-compliant intake · Licensed insurance agents
          </span>
        </div>
      </div>

      <header className="sticky top-0 z-30 h-16 sm:h-20 bg-background/95 backdrop-blur-sm shadow-[0_1px_3px_rgba(42,31,24,0.06)]">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            aria-label="Northgate Heritage home"
            className="block flex-shrink-0"
          >
            <Image
              src="/heritage-logo-horizontal-light.svg"
              alt="Northgate Heritage"
              width={360}
              height={80}
              priority
              className="h-14 w-auto sm:h-16"
            />
          </Link>

          <nav
            aria-label="Primary"
            className="hidden sm:flex items-center gap-7 text-sm font-medium"
          >
            <Link
              href="/#how"
              className="text-foreground-soft hover:text-foreground min-h-11 inline-flex items-center"
            >
              How it works
            </Link>
            <Link
              href="/#faq"
              className="text-foreground-soft hover:text-foreground min-h-11 inline-flex items-center"
            >
              FAQ
            </Link>
            <Link
              href="/#lead-form"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 py-2 text-sm font-medium text-background-card hover:bg-accent-hover"
            >
              Start my quote
              <span aria-hidden="true">→</span>
            </Link>
          </nav>

          <span className="sm:hidden whitespace-nowrap text-[10px] font-medium tracking-[0.04em] uppercase text-accent-burgundy-deep">
            Final Expense
          </span>
        </div>
      </header>
    </>
  );
}
