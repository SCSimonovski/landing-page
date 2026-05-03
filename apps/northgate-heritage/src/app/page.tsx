import { HeritageHero } from "@/components/heritage-hero";
import { LeadForm } from "@/components/lead-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

// Compliance checkpoint per playbook 02 § 2.3 — copy reviewed against the
// forbidden list:
//   ✓ No specific dollar amounts in marketing copy
//   ✓ No fabricated testimonials
//   ✓ No fear imagery (hospital beds, funerals, crying children)
//   ✓ No false urgency
//   ✓ No "guaranteed approval" claims
//   ✓ No specific premium quotes
const CHIPS = [
  "Licensed agents",
  "No obligation",
  "One agent, not many",
  "Opt out anytime",
];

const PROMISES = [
  {
    title: "No cost to talk",
    detail: "There's no charge for the conversation with the agent.",
  },
  {
    title: "No obligation",
    detail: "You're never required to buy anything.",
  },
  {
    title: "Licensed in your state",
    detail: "We only match you with an agent licensed where you live.",
  },
  {
    title: "One agent, not many",
    detail: "Your information goes to a single agent — not sold to third parties.",
  },
  {
    title: "About 60 seconds",
    detail: "The form is six short questions.",
  },
  {
    title: "Opt out anytime",
    detail: "Reply STOP or ask the agent to remove you.",
  },
];

const FAQ = [
  {
    q: "What is final expense insurance?",
    a: "It's a smaller life insurance policy designed to cover end-of-life costs — funeral, burial, and any final medical bills — so your family isn't left with the expense. Coverage amounts are typically smaller than traditional life insurance.",
  },
  {
    q: "Does this cost anything?",
    a: "Talking to a licensed agent about your options doesn't cost anything. If you decide to move forward, the agent will walk you through pricing for your specific situation.",
  },
  {
    q: "Will I be pressured to buy?",
    a: "No. The agent's job is to give you options that fit your family's needs. You're under no obligation.",
  },
  {
    q: "Do I need a medical exam?",
    a: "Not for an initial quote. Many final expense policies don't require a medical exam at all — the agent will explain what's available based on your answers.",
  },
  {
    q: "What information do you share?",
    a: "Your details go to one licensed agent in your state. We don't sell your information to third parties or lead aggregators.",
  },
  {
    q: "What if I want to opt out?",
    a: "Reply STOP to any text message, or ask the agent to add you to our do-not-contact list. We'll honor your request immediately.",
  },
  {
    q: "Are agents licensed in my state?",
    a: "Yes. We only share your information with an agent licensed in your state. If your state isn't currently covered, we'll let you know and won't pass your details on.",
  },
];

const STEPS = [
  {
    title: "Tell us a few basics",
    detail: "Six short questions. Coverage, age, beneficiary, the basics.",
  },
  {
    title: "We match you with an agent",
    detail: "A licensed agent in your state — not a call center.",
  },
  {
    title: "They reach out",
    detail: "By phone or text, at the time you said worked best.",
  },
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-col">
        {/* HERO — on lg+ fills the viewport minus the top compliance band
            (~28px) + sticky header (h-20 = 80px) so the section + header
            together equal 100vh exactly. lg:flex + items-center handles
            vertical centering of the content. */}
        <section
          aria-labelledby="hero-heading"
          className="px-6 pt-10 pb-20 sm:pt-20 sm:pb-28 lg:flex lg:items-center lg:min-h-[calc(100vh-108px)]"
        >
          <div className="mx-auto w-full max-w-6xl grid gap-12 lg:grid-cols-[1.15fr_1fr] lg:gap-16 lg:items-center">
            <div className="max-w-[560px]">
              <p className="flex items-center gap-3 text-[12px] font-medium tracking-[0.16em] uppercase text-foreground mb-7 sm:mb-9">
                <span aria-hidden="true" className="inline-block h-px w-7 bg-accent-terracotta" />
                <span className="">Final Expense · For Families</span>
              </p>

              <h1
                id="hero-heading"
                className="font-serif font-normal text-[48px] sm:text-[80px] leading-[1.0] tracking-[-0.02em] text-foreground"
              >
                What you leave
                <br />
                them,{" "}
                <em className="italic font-normal text-accent-terracotta">
                  settled.
                </em>
              </h1>

              <p className="mt-6 sm:mt-8 text-[16.5px] sm:text-[18px] leading-[1.55] tracking-[-0.005em] text-foreground-soft max-w-[460px]">
                Coverage that takes care of the bills your family shouldn&apos;t have to. We connect you with one licensed agent in your state — they explain the options, you decide.
              </p>

              <div className="mt-7 sm:mt-9 flex flex-wrap items-center gap-4">
                <a
                  href="#lead-form"
                  className="inline-flex min-h-[52px] items-center gap-2.5 rounded-full bg-accent-terracotta px-7 py-4 text-[15px] font-medium tracking-[-0.005em] text-background-card hover:bg-accent-terracotta-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-terracotta"
                >
                  Start my quote
                  <span aria-hidden="true">→</span>
                </a>
                <span className="text-[13px] text-muted">
                  About 60 seconds · No obligation
                </span>
              </div>

              <div className="mt-10 sm:mt-14 border-t border-border pt-6">
                <ul className="flex flex-wrap gap-x-6 gap-y-2.5 text-[13px] font-medium text-foreground-soft">
                  {CHIPS.map((chip) => (
                    <li key={chip} className="inline-flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="inline-block h-1.5 w-1.5 rounded-full bg-accent-terracotta"
                      />
                      {chip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="relative pb-10 sm:pb-0 sm:pl-4">
              <HeritageHero />
            </div>
          </div>
        </section>

        {/* HOW IT WORKS — dark navy band */}
        <section
          id="how"
          aria-labelledby="how-heading"
          className="bg-background-deep text-background-card px-6 py-20 sm:py-28"
        >
          <div className="mx-auto max-w-6xl grid gap-12 lg:grid-cols-[1fr_1.6fr] lg:gap-20 lg:items-start">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-accent-terracotta mb-4">
                How it works
              </p>
              <h2
                id="how-heading"
                className="font-serif font-normal text-[40px] sm:text-[56px] leading-[1.0] tracking-[-0.02em]"
              >
                Three steps.
                <br />
                <em className="italic font-normal text-accent-terracotta">
                  That&apos;s all.
                </em>
              </h2>
            </div>
            <ol className="flex flex-col">
              {STEPS.map((step, i) => (
                <li
                  key={step.title}
                  className="grid grid-cols-[auto_1fr] gap-x-6 sm:gap-x-10 items-baseline border-b border-background-card/12 last:border-b-0 py-7 sm:py-8 first:pt-0"
                >
                  <span
                    aria-hidden="true"
                    className="font-serif italic font-normal text-[28px] sm:text-[34px] leading-none text-accent-terracotta"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="font-sans font-medium text-[19px] sm:text-[22px] tracking-[-0.015em] mb-1.5">
                      {step.title}
                    </p>
                    <p className="text-[14px] sm:text-[15px] leading-[1.55] text-background-card/70">
                      {step.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* FORM */}
        <section
          id="lead-form"
          aria-labelledby="form-heading"
          className="px-6 py-20 sm:py-28"
        >
          <div className="mx-auto max-w-6xl grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-20 lg:items-center">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-accent-terracotta mb-4">
                Start your quote
              </p>
              <h2
                id="form-heading"
                className="font-serif font-normal text-[40px] sm:text-[56px] leading-[1.0] tracking-[-0.02em] text-foreground mb-5"
              >
                Six questions.
                <br />
                <em className="italic font-normal text-accent-terracotta">
                  One agent.
                </em>
              </h2>
              <p className="text-[16px] leading-[1.55] text-foreground-soft max-w-[400px]">
                Tell us a few basics about your situation. We&apos;ll match you with one licensed agent in your state — no aggregators, no third parties.
              </p>
            </div>
            <LeadForm />
          </div>
        </section>

        {/* PROMISES — dark navy band */}
        <section
          aria-labelledby="promises-heading"
          className="bg-background-deep text-background-card px-6 py-20 sm:py-28"
        >
          <div className="mx-auto max-w-6xl">
            <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-accent-terracotta mb-4">
              What you can count on
            </p>
            <h2
              id="promises-heading"
              className="font-serif font-normal text-[36px] sm:text-[52px] leading-[1.0] tracking-[-0.02em] mb-10 sm:mb-14 max-w-[760px]"
            >
              The promises — and what we{" "}
              <em className="italic font-normal text-accent-terracotta">
                won&apos;t
              </em>{" "}
              do.
            </h2>
            <ul role="list" className="grid gap-6 sm:gap-x-10 sm:gap-y-9 sm:grid-cols-3">
              {PROMISES.map((p, i) => (
                <li key={p.title} className="border-t border-background-card/15 pt-5">
                  <p className="font-serif italic font-normal text-[18px] text-accent-terracotta mb-3">
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  <p className="font-sans font-medium text-[19px] sm:text-[20px] tracking-[-0.015em] mb-2">
                    {p.title}
                  </p>
                  <p className="text-[14px] leading-[1.6] text-background-card/72">
                    {p.detail}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* FAQ */}
        <section
          id="faq"
          aria-labelledby="faq-heading"
          className="px-6 py-20 sm:py-28"
        >
          <div className="mx-auto max-w-[880px]">
            <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-accent-terracotta mb-4">
              Frequently asked
            </p>
            <h2
              id="faq-heading"
              className="font-serif font-normal text-[36px] sm:text-[48px] leading-[1.0] tracking-[-0.02em] text-foreground mb-9 sm:mb-12"
            >
              Common questions.
            </h2>
            <div className="flex flex-col">
              {FAQ.map((item, i) => (
                <details
                  key={item.q}
                  open={i === 0}
                  className="group border-b border-border py-5 last:border-b-0"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-4 list-none min-h-11">
                    <span className="font-sans font-medium text-[16px] sm:text-[18px] tracking-[-0.01em] text-foreground">
                      {item.q}
                    </span>
                    <span
                      aria-hidden="true"
                      className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center text-accent-terracotta text-lg transition-transform group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-[14.5px] leading-[1.65] text-muted max-w-[720px]">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
