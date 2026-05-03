import { HeritageHero } from "@/components/heritage-hero";
import { LeadForm } from "@/components/lead-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

// Compliance checkpoint per playbook 02 § 2.3 — copy below has been
// reviewed against the forbidden list:
//   ✓ No specific dollar amounts in marketing copy (coverage range stays
//     in the form fieldset, not the hero or chips)
//   ✓ No fabricated testimonials
//   ✓ No fear imagery (hospital beds, funerals, crying children)
//   ✓ No false urgency ("limited time," "before it's too late," etc.)
//   ✓ No "guaranteed approval" or eligibility claims
//   ✓ No specific premium quotes
// FE products attract these tropes; this page intentionally stays in the
// "calm, plain-language, family-warmth" register that Hearth direction
// is built around.
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
    detail: "Six short questions. Coverage, age, state, the basics.",
    bg: "bg-accent-burgundy",
  },
  {
    title: "We match you with an agent",
    detail: "A licensed agent in your state — not a call center.",
    bg: "bg-accent-gold",
  },
  {
    title: "They reach out",
    detail: "By phone or text, at the time you said worked best.",
    bg: "bg-accent",
  },
];

function Checkmark() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 12 12"
      aria-hidden="true"
      className="flex-shrink-0"
    >
      <path
        d="M2.5 6.5 L5 9 L9.5 3.5"
        stroke="#5C2D26"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-col">
        {/* HERO */}
        <section
          aria-labelledby="hero-heading"
          className="relative px-6 pt-7 pb-16 sm:pt-24 sm:pb-28"
        >
          <div className="relative mx-auto max-w-6xl grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:items-center">
            <div className="max-w-[640px]">
              <div className="inline-flex items-center gap-2.5 rounded-full bg-background-card border border-border px-3.5 py-2 text-[12.5px] font-medium text-accent-burgundy-deep mb-6 sm:mb-8">
                <span
                  aria-hidden="true"
                  className="inline-block h-1.5 w-1.5 rounded-full bg-accent-gold"
                />
                An independent service for families
              </div>

              <h1
                id="hero-heading"
                className="font-sans font-medium text-[44px] sm:text-[80px] leading-[1.0] tracking-[-0.04em] text-foreground"
              >
                Take care of
                <br />
                what comes
                <br />
                <em className="font-serif italic font-normal text-accent-burgundy-deep tracking-[-0.025em]">
                  next.
                </em>
              </h1>

              <p className="mt-5 sm:mt-8 text-[17px] sm:text-[21px] leading-[1.5] tracking-[-0.005em] text-foreground-soft max-w-[520px]">
                We&apos;re a small service that connects families with one licensed insurance agent in their state. We don&apos;t sell policies. We don&apos;t keep your information. We don&apos;t pretend to be the agent.
              </p>

              <div className="mt-7 sm:mt-10 flex flex-wrap items-center gap-3.5">
                <a
                  href="#lead-form"
                  className="inline-flex min-h-[52px] items-center gap-2.5 rounded-full bg-accent px-7 py-4 text-[15.5px] font-medium tracking-[-0.005em] text-background-card hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  Start my quote
                  <span
                    aria-hidden="true"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent-gold text-[13px] text-background-card"
                  >
                    →
                  </span>
                </a>
                <span className="text-[13.5px] text-muted">
                  About 60 seconds · No obligation
                </span>
              </div>

              <ul className="mt-8 sm:mt-12 flex flex-wrap gap-2 sm:gap-2.5">
                {CHIPS.map((chip) => (
                  <li
                    key={chip}
                    className="inline-flex items-center gap-2 rounded-full bg-background-card border border-border px-3.5 py-2 text-[13px] font-medium tracking-[-0.005em] text-foreground-soft"
                  >
                    <Checkmark />
                    {chip}
                  </li>
                ))}
              </ul>
            </div>

            <div className="hidden lg:block">
              <HeritageHero />
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section
          id="how"
          aria-labelledby="how-heading"
          className="bg-background-deep px-6 py-16 sm:py-28"
        >
          <div className="mx-auto max-w-6xl grid gap-8 lg:grid-cols-[1fr_2fr] lg:gap-20 lg:items-start">
            <div>
              <p className="text-[12.5px] font-medium tracking-[0.06em] uppercase text-accent-burgundy-deep mb-4">
                How it works
              </p>
              <h2
                id="how-heading"
                className="font-sans font-medium text-[34px] sm:text-[48px] leading-[1.0] tracking-[-0.03em] text-foreground"
              >
                Three steps,{" "}
                <em className="font-serif italic font-normal text-accent-burgundy-deep">
                  that&apos;s it.
                </em>
              </h2>
            </div>
            <ol className="flex flex-col gap-5">
              {STEPS.map((step, i) => (
                <li
                  key={step.title}
                  className="flex items-start gap-4 sm:gap-6 rounded-[1.125rem] border border-border bg-background-card p-6 sm:p-7"
                >
                  <div
                    className={`flex h-11 w-11 sm:h-14 sm:w-14 flex-shrink-0 items-center justify-center rounded-full ${step.bg} text-background-card font-serif italic font-normal text-xl sm:text-2xl`}
                  >
                    {i + 1}
                  </div>
                  <div>
                    <p className="font-medium text-[19px] sm:text-[22px] tracking-[-0.015em] text-foreground mb-2">
                      {step.title}
                    </p>
                    <p className="text-[14.5px] leading-[1.6] text-muted">
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
          className="px-6 py-16 sm:py-28"
        >
          <div className="mx-auto max-w-6xl grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-20 lg:items-center">
            <div>
              <p className="text-[12.5px] font-medium tracking-[0.06em] uppercase text-accent-burgundy-deep mb-4">
                Start your quote
              </p>
              <h2
                id="form-heading"
                className="font-sans font-medium text-[36px] sm:text-[56px] leading-[1.0] tracking-[-0.035em] text-foreground mb-5"
              >
                Six questions.
                <br />
                <em className="font-serif italic font-normal text-accent-burgundy-deep">
                  One agent.
                </em>
              </h2>
              <p className="text-[16.5px] leading-[1.55] text-muted max-w-[380px]">
                Tell us a few basics about your situation. We&apos;ll match you with one licensed agent in your state — no aggregators, no third parties.
              </p>
            </div>
            <LeadForm />
          </div>
        </section>

        {/* PROMISES */}
        <section
          aria-labelledby="promises-heading"
          className="bg-foreground text-background-card px-6 py-16 sm:py-28"
        >
          <div className="mx-auto max-w-6xl">
            <p className="text-[12.5px] font-medium tracking-[0.06em] uppercase text-accent-gold mb-4">
              What you can count on
            </p>
            <h2
              id="promises-heading"
              className="font-sans font-medium text-[32px] sm:text-[48px] leading-[1.05] tracking-[-0.03em] mb-9 sm:mb-14 max-w-[720px]"
            >
              The promises — and what we{" "}
              <em className="font-serif italic font-normal text-accent-gold">
                won&apos;t
              </em>{" "}
              do.
            </h2>
            <ul role="list" className="grid gap-3.5 sm:gap-5 sm:grid-cols-3">
              {PROMISES.map((p, i) => (
                <li
                  key={p.title}
                  className="rounded-[1.125rem] border border-background-card/10 bg-background-card/[0.05] p-6 sm:p-7"
                >
                  <p className="text-[11px] uppercase tracking-[0.08em] text-background-card/50 mb-3.5">
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  <p className="font-medium text-[19px] sm:text-[21px] tracking-[-0.015em] mb-2.5 leading-[1.2]">
                    {p.title}
                  </p>
                  <p className="text-[14px] leading-[1.55] text-background-card/75">
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
          className="bg-background-deep px-6 py-16 sm:py-28"
        >
          <div className="mx-auto max-w-[880px]">
            <p className="text-[12.5px] font-medium tracking-[0.06em] uppercase text-accent-burgundy-deep mb-4">
              Frequently asked
            </p>
            <h2
              id="faq-heading"
              className="font-sans font-medium text-[32px] sm:text-[44px] leading-[1.05] tracking-[-0.03em] text-foreground mb-7 sm:mb-10"
            >
              Common questions.
            </h2>
            <div className="flex flex-col gap-2.5">
              {FAQ.map((item, i) => (
                <details
                  key={item.q}
                  open={i === 0}
                  className="group rounded-[0.875rem] border border-border bg-background-card p-5 sm:p-6"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-4 list-none min-h-11">
                    <span className="font-medium text-[16px] sm:text-[18px] tracking-[-0.01em] text-foreground">
                      {item.q}
                    </span>
                    <span
                      aria-hidden="true"
                      className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-background text-accent-burgundy-deep text-sm transition-transform group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3.5 text-[14.5px] leading-[1.65] text-muted max-w-[720px]">
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
