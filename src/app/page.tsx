import Image from "next/image";
import { LeadForm } from "@/components/lead-form";
import { SiteHeader } from "@/components/site-header";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-col">
        <section
          aria-labelledby="hero-heading"
          className="px-6 pt-12 pb-16 sm:pt-20 sm:pb-24 bg-background"
        >
          <div className="mx-auto grid max-w-6xl gap-10 sm:gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center">
            <div className="text-center lg:text-left">
              <h1
                id="hero-heading"
                className="font-serif text-4xl sm:text-5xl lg:text-6xl font-medium leading-tight tracking-tight text-foreground"
              >
                Keep Your Family In The Home You Built.
              </h1>
              <p className="mt-5 text-lg text-muted">
                A licensed agent in your state will follow up with options that
                fit your mortgage and your family.
              </p>
              <div className="mt-8">
                <a
                  href="#lead-form"
                  className="inline-flex min-h-11 items-center justify-center rounded-md bg-accent px-7 py-3 text-base font-medium text-background shadow-sm hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  Get my options
                </a>
              </div>
              <ul className="mt-6 flex flex-wrap justify-center lg:justify-start gap-x-3 gap-y-2 text-sm text-muted">
                <li>Licensed agents</li>
                <li aria-hidden="true">·</li>
                <li>No obligation</li>
                <li aria-hidden="true">·</li>
                <li>60 seconds</li>
              </ul>
            </div>

            {/* Hero image slot — Option C: architectural-detail aspect ratio.
                Placeholder treatment (cream gradient + arch motif from logo)
                renders without layout shift. Replace with `public/hero.jpg`
                before SAC submission — see CHANGELOG. */}
            <div
              aria-hidden="true"
              className="relative mx-auto w-full max-w-md aspect-square overflow-hidden rounded-lg border border-border bg-gradient-to-br from-background to-[#E6DCC4]"
            >
              <svg
                viewBox="0 0 48 62"
                className="absolute inset-0 m-auto h-3/5 w-auto opacity-15"
                aria-hidden="true"
              >
                <path
                  d="M 0,62 L 0,18 A 24,18 0 0 1 48,18 L 48,62 Z M 9,62 L 9,28 A 15,14 0 0 1 39,28 L 39,62 Z"
                  fill="#102841"
                  fillRule="evenodd"
                />
              </svg>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="how-it-works-heading"
          className="px-6 py-16 sm:py-20 border-t border-border bg-background"
        >
          <div className="mx-auto max-w-4xl">
            <h2
              id="how-it-works-heading"
              className="font-serif text-3xl font-medium text-center text-foreground"
            >
              How it works
            </h2>
            <ol className="mt-10 grid gap-8 sm:grid-cols-3">
              <li className="text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-foreground text-background text-lg font-semibold">
                  1
                </div>
                <p className="mt-4 text-base text-foreground">
                  Tell us about your mortgage.
                </p>
              </li>
              <li className="text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-foreground text-background text-lg font-semibold">
                  2
                </div>
                <p className="mt-4 text-base text-foreground">
                  We match you with a licensed agent in your state.
                </p>
              </li>
              <li className="text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-foreground text-background text-lg font-semibold">
                  3
                </div>
                <p className="mt-4 text-base text-foreground">
                  They reach out by phone or text shortly.
                </p>
              </li>
            </ol>
          </div>
        </section>

        <section
          id="lead-form"
          aria-labelledby="lead-form-heading"
          className="px-6 py-16 sm:py-20 border-t border-border bg-background"
        >
          <div className="mx-auto max-w-2xl">
            <h2
              id="lead-form-heading"
              className="font-serif text-3xl font-medium text-center text-foreground"
            >
              Start your quote
            </h2>
            <div className="mt-8">
              <LeadForm />
            </div>
          </div>
        </section>

        <section
          aria-labelledby="faq-heading"
          className="px-6 py-16 sm:py-20 border-t border-border bg-background"
        >
          <div className="mx-auto max-w-3xl">
            <h2
              id="faq-heading"
              className="font-serif text-3xl font-medium text-center text-foreground"
            >
              Frequently asked questions
            </h2>
            <div className="mt-10 divide-y divide-border border-y border-border">
              <details className="group py-5">
                <summary className="flex cursor-pointer items-center justify-between gap-4 font-serif text-lg font-medium text-foreground min-h-11">
                  Does this cost anything?
                  <span aria-hidden="true" className="text-muted group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <p className="mt-3 text-base text-muted">
                  Talking to a licensed agent about your options doesn&apos;t cost anything. If you decide to move forward, the agent will walk you through pricing for your specific situation.
                </p>
              </details>
              <details className="group py-5">
                <summary className="flex cursor-pointer items-center justify-between gap-4 font-serif text-lg font-medium text-foreground min-h-11">
                  Will I be pressured to buy?
                  <span aria-hidden="true" className="text-muted group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <p className="mt-3 text-base text-muted">
                  No. The agent&apos;s job is to give you options that fit your mortgage and your family. You&apos;re under no obligation.
                </p>
              </details>
              <details className="group py-5">
                <summary className="flex cursor-pointer items-center justify-between gap-4 font-serif text-lg font-medium text-foreground min-h-11">
                  What information do you share?
                  <span aria-hidden="true" className="text-muted group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <p className="mt-3 text-base text-muted">
                  Your details go to one licensed agent in your state. We don&apos;t sell your information to third parties or lead aggregators.
                </p>
              </details>
              <details className="group py-5">
                <summary className="flex cursor-pointer items-center justify-between gap-4 font-serif text-lg font-medium text-foreground min-h-11">
                  What if I want to opt out?
                  <span aria-hidden="true" className="text-muted group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <p className="mt-3 text-base text-muted">
                  Reply STOP to any text message, or ask the agent to add you to our do-not-contact list. We&apos;ll honor your request immediately.
                </p>
              </details>
              <details className="group py-5">
                <summary className="flex cursor-pointer items-center justify-between gap-4 font-serif text-lg font-medium text-foreground min-h-11">
                  Are agents licensed in my state?
                  <span aria-hidden="true" className="text-muted group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <p className="mt-3 text-base text-muted">
                  Yes. We only share your information with an agent licensed in your state. If your state isn&apos;t currently covered, we&apos;ll let you know and won&apos;t pass your details on.
                </p>
              </details>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-foreground text-background">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Image
                src="/northgate-logo.svg"
                alt="Northgate Protection"
                width={120}
                height={64}
                className="h-12 w-auto opacity-90 brightness-0 invert"
              />
            </div>
            <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <a href="/privacy" className="min-h-11 inline-flex items-center hover:underline">
                Privacy Policy
              </a>
              <a href="/terms" className="min-h-11 inline-flex items-center hover:underline">
                Terms
              </a>
              <a href="mailto:hello@northgateprotection.com" className="min-h-11 inline-flex items-center hover:underline">
                Contact
              </a>
            </nav>
          </div>
          <div className="mt-10 border-t border-background/20 pt-6 text-xs text-background/70 space-y-2">
            <p>Northgate Protection is operated by Northgate Lead Services LLC.</p>
            <p>
              California residents have additional privacy rights. See our{" "}
              <a href="/privacy" className="underline hover:text-background">
                Privacy Policy
              </a>{" "}
              for details.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
