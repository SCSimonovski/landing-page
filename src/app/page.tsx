export default function Home() {
  return (
    <>
      <main className="flex flex-col">
        <section
          aria-labelledby="hero-heading"
          className="px-6 py-16 sm:py-24 bg-background"
        >
          <div className="mx-auto max-w-3xl text-center">
            <h1
              id="hero-heading"
              className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground"
            >
              [HEADLINE PLACEHOLDER]
            </h1>
            <p className="mt-5 text-lg text-muted">
              Tell us about your mortgage. A licensed agent will follow up with
              options personalized for you.
            </p>
            <div className="mt-8">
              <a
                href="#lead-form"
                className="inline-flex min-h-11 items-center justify-center rounded-md bg-accent px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Get my options
              </a>
            </div>
            <ul className="mt-6 flex flex-col sm:flex-row sm:justify-center gap-2 sm:gap-6 text-sm text-muted">
              <li>Licensed agents</li>
              <li className="hidden sm:block" aria-hidden="true">·</li>
              <li>No obligation</li>
              <li className="hidden sm:block" aria-hidden="true">·</li>
              <li>Takes 60 seconds</li>
            </ul>
          </div>
        </section>

        <section
          aria-labelledby="how-it-works-heading"
          className="px-6 py-16 sm:py-20 border-t border-border bg-background"
        >
          <div className="mx-auto max-w-4xl">
            <h2
              id="how-it-works-heading"
              className="text-3xl font-bold text-center text-foreground"
            >
              How it works
            </h2>
            <ol className="mt-10 grid gap-8 sm:grid-cols-3">
              <li className="text-center">
                <div className="mx-auto flex min-h-11 min-w-11 items-center justify-center rounded-full bg-accent text-white text-lg font-semibold">
                  1
                </div>
                <p className="mt-4 text-base text-foreground">
                  Tell us about your mortgage.
                </p>
              </li>
              <li className="text-center">
                <div className="mx-auto flex min-h-11 min-w-11 items-center justify-center rounded-full bg-accent text-white text-lg font-semibold">
                  2
                </div>
                <p className="mt-4 text-base text-foreground">
                  We match you with a licensed agent in your state.
                </p>
              </li>
              <li className="text-center">
                <div className="mx-auto flex min-h-11 min-w-11 items-center justify-center rounded-full bg-accent text-white text-lg font-semibold">
                  3
                </div>
                <p className="mt-4 text-base text-foreground">
                  They&apos;ll reach out by phone or text shortly.
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
              className="text-3xl font-bold text-center text-foreground"
            >
              Get started
            </h2>
            <div className="mt-8 rounded-lg border border-dashed border-border p-10 text-center text-muted">
              <p className="text-base">
                Form coming in the Week 2 task (form + /api/leads).
              </p>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="social-proof-heading"
          className="px-6 py-16 sm:py-20 border-t border-border bg-background"
        >
          <div className="mx-auto max-w-4xl">
            <h2
              id="social-proof-heading"
              className="text-3xl font-bold text-center text-foreground"
            >
              What homeowners are saying
            </h2>
            <p className="mt-8 text-center text-muted">
              [Real testimonials needed before launch]
            </p>
          </div>
        </section>

        <section
          aria-labelledby="faq-heading"
          className="px-6 py-16 sm:py-20 border-t border-border bg-background"
        >
          <div className="mx-auto max-w-3xl">
            <h2
              id="faq-heading"
              className="text-3xl font-bold text-center text-foreground"
            >
              Frequently asked questions
            </h2>
            <div className="mt-10 divide-y divide-border border-y border-border">
              <details className="group py-5">
                <summary className="flex cursor-pointer items-center justify-between gap-4 text-base font-medium text-foreground min-h-11">
                  Does this cost anything?
                  <span aria-hidden="true" className="text-muted group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <p className="mt-3 text-base text-muted">
                  [Placeholder answer — finalize during Week 2 copy task.]
                </p>
              </details>
              <details className="group py-5">
                <summary className="flex cursor-pointer items-center justify-between gap-4 text-base font-medium text-foreground min-h-11">
                  Will I be pressured to buy?
                  <span aria-hidden="true" className="text-muted group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <p className="mt-3 text-base text-muted">
                  [Placeholder answer — finalize during Week 2 copy task.]
                </p>
              </details>
              <details className="group py-5">
                <summary className="flex cursor-pointer items-center justify-between gap-4 text-base font-medium text-foreground min-h-11">
                  What information do you share?
                  <span aria-hidden="true" className="text-muted group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <p className="mt-3 text-base text-muted">
                  [Placeholder answer — finalize during Week 2 copy task.]
                </p>
              </details>
              <details className="group py-5">
                <summary className="flex cursor-pointer items-center justify-between gap-4 text-base font-medium text-foreground min-h-11">
                  What if I want to opt out?
                  <span aria-hidden="true" className="text-muted group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <p className="mt-3 text-base text-muted">
                  [Placeholder answer — finalize during Week 2 copy task.]
                </p>
              </details>
              <details className="group py-5">
                <summary className="flex cursor-pointer items-center justify-between gap-4 text-base font-medium text-foreground min-h-11">
                  Are agents licensed in my state?
                  <span aria-hidden="true" className="text-muted group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <p className="mt-3 text-base text-muted">
                  [Placeholder answer — finalize during Week 2 copy task.]
                </p>
              </details>
            </div>
          </div>
        </section>
      </main>

      <footer className="px-6 py-10 border-t border-border bg-background">
        <div className="mx-auto max-w-4xl text-sm text-muted">
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 justify-center">
            <a href="/privacy" className="hover:text-foreground min-h-11 inline-flex items-center">
              Privacy policy
            </a>
            <a href="/terms" className="hover:text-foreground min-h-11 inline-flex items-center">
              Terms
            </a>
            <a href="mailto:hello@example.com" className="hover:text-foreground min-h-11 inline-flex items-center">
              Contact
            </a>
          </nav>
          <p className="mt-6 text-center">[Company legal name placeholder]</p>
          <p className="mt-2 text-center text-xs">
            California Privacy Notice: [Placeholder — full disclosure to be added in the Week 2 privacy policy task.]
          </p>
        </div>
      </footer>
    </>
  );
}
