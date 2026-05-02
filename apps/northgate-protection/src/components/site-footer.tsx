import Image from "next/image";

export function SiteFooter() {
  return (
    <footer className="bg-accent text-background-card px-6 py-12 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-7 sm:flex-row sm:items-start sm:justify-between border-b border-background-card/10 pb-7">
          <div>
            <Image
              src="/northgate-logo-horizontal-dark.svg"
              alt="Northgate Protection"
              width={360}
              height={80}
              className="h-12 w-auto"
            />
            <p className="text-[13px] leading-[1.65] mt-4 opacity-70 max-w-[420px]">
              A small service that connects homeowners with licensed insurance agents.
            </p>
          </div>
          <nav
            aria-label="Footer"
            className="flex gap-5 sm:gap-7 text-[13.5px] font-medium"
          >
            <a
              href="/privacy"
              className="opacity-85 hover:opacity-100 min-h-11 inline-flex items-center"
            >
              Privacy
            </a>
            <a
              href="/terms"
              className="opacity-85 hover:opacity-100 min-h-11 inline-flex items-center"
            >
              Terms
            </a>
            <a
              href="mailto:hello@northgateprotection.com"
              className="opacity-85 hover:opacity-100 min-h-11 inline-flex items-center"
            >
              Contact
            </a>
          </nav>
        </div>
        <div className="mt-6 space-y-1.5 text-xs leading-[1.7] opacity-55 max-w-[640px]">
          <p>Northgate Protection is operated by Northgate Lead Services LLC.</p>
          <p>
            California residents have additional privacy rights. See our{" "}
            <a href="/privacy" className="underline hover:opacity-100">
              Privacy Policy
            </a>{" "}
            for details.
          </p>
        </div>
      </div>
    </footer>
  );
}
