import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Terms of Service — [BRAND NAME PLACEHOLDER]",
  description: "Terms of service for [BRAND NAME PLACEHOLDER] final expense lead service.",
};

// Placeholder text — pending TCPA-experienced attorney review before launch.
// Bracketed UPPERCASE markers indicate values an attorney must specify.

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-14 sm:py-20">
        <div
          role="alert"
          className="mb-10 rounded-2xl border border-accent-terracotta/30 bg-background-card p-5 text-sm text-foreground-soft"
        >
          <strong className="text-accent-terracotta">DRAFT — pending TCPA-experienced attorney review.</strong>{" "}
          Not legal advice. The text below is structurally complete placeholder content; specifics in
          [BRACKETED MARKERS] must be filled by counsel before launch.
        </div>

        <h1 className="font-sans font-medium text-[40px] sm:text-[56px] leading-[1.0] tracking-[-0.035em] text-foreground">
          Terms of{" "}
          <em className="font-serif italic font-normal text-accent-terracotta-deep">
            Service.
          </em>
        </h1>
        <p className="mt-3 text-sm text-muted">
          Last updated: [DRAFT — attorney review pending]
        </p>

        <div className="mt-10 space-y-9 text-foreground">
          <section>
            <h2 className="font-sans font-medium text-[22px] sm:text-[24px] tracking-[-0.015em]">
              1. Who we are
            </h2>
            <p className="mt-3 text-[15.5px] leading-[1.65] text-muted">
              [BRAND NAME PLACEHOLDER] (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) is operated by [LLC NAME — to be
              added on formation], with registered address [REGISTERED ADDRESS]. By using our
              website or submitting our form, you agree to these terms.
            </p>
          </section>

          <section>
            <h2 className="font-sans font-medium text-[22px] sm:text-[24px] tracking-[-0.015em]">
              2. Service description
            </h2>
            <p className="mt-3 text-[15.5px] leading-[1.65] text-muted">
              We operate a lead-generation service. We collect information from US residents
              interested in final expense insurance and forward that information to one licensed
              insurance agent who is authorized to contact you.{" "}
              <strong className="text-foreground">
                We do not sell insurance, do not offer insurance products, and do not provide insurance advice.
              </strong>{" "}
              Any quote, policy, or recommendation comes from the licensed agent we connect you with.
            </p>
          </section>

          <section>
            <h2 className="font-sans font-medium text-[22px] sm:text-[24px] tracking-[-0.015em]">
              3. Acceptable use
            </h2>
            <p className="mt-3 text-[15.5px] leading-[1.65] text-muted">
              By submitting our form, you agree not to: submit information about another person
              without their permission; submit false, misleading, or fictitious information; use
              automated tools to submit the form; or interfere with the operation of the site.
            </p>
          </section>

          <section>
            <h2 className="font-sans font-medium text-[22px] sm:text-[24px] tracking-[-0.015em]">
              4. User representations
            </h2>
            <p className="mt-3 text-[15.5px] leading-[1.65] text-muted">
              By submitting our form you represent that: you are at least 50 years old, you are a
              US resident, and the information you provide is accurate and refers to yourself. Your
              consent to be contacted is captured separately via the consent checkbox at the time
              of submission; this section does not duplicate or modify that consent.
            </p>
          </section>

          <section>
            <h2 className="font-sans font-medium text-[22px] sm:text-[24px] tracking-[-0.015em]">
              5. Disclaimer of warranties
            </h2>
            <p className="mt-3 text-[15.5px] leading-[1.65] text-muted">
              The service is provided &ldquo;as is&rdquo; and &ldquo;as available.&rdquo; We make no warranties or
              representations regarding the accuracy, reliability, or availability of the service or
              of any information received from the licensed agent. [Attorney to expand per
              applicable state law.]
            </p>
          </section>

          <section>
            <h2 className="font-sans font-medium text-[22px] sm:text-[24px] tracking-[-0.015em]">
              6. Limitation of liability
            </h2>
            <p className="mt-3 text-[15.5px] leading-[1.65] text-muted">
              To the maximum extent permitted by law, our total liability for any claim arising out
              of or related to the service is limited to [LIABILITY CAP — attorney to specify].
              We are not liable for indirect, incidental, special, consequential, or punitive
              damages.
            </p>
          </section>

          <section>
            <h2 className="font-sans font-medium text-[22px] sm:text-[24px] tracking-[-0.015em]">
              7. Indemnification
            </h2>
            <p className="mt-3 text-[15.5px] leading-[1.65] text-muted">
              You agree to indemnify and hold us harmless from any claim arising out of your
              violation of these terms, your misuse of the service, or your violation of applicable
              law.
            </p>
          </section>

          <section>
            <h2 className="font-sans font-medium text-[22px] sm:text-[24px] tracking-[-0.015em]">
              8. Governing law
            </h2>
            <p className="mt-3 text-[15.5px] leading-[1.65] text-muted">
              These terms are governed by the laws of [STATE PLACEHOLDER — depends on LLC state of
              formation], without regard to conflict-of-law principles.
            </p>
          </section>

          <section>
            <h2 className="font-sans font-medium text-[22px] sm:text-[24px] tracking-[-0.015em]">
              9. Dispute resolution
            </h2>
            <p className="mt-3 text-[15.5px] leading-[1.65] text-muted">
              Any dispute arising out of or related to these terms or the service will be resolved
              as follows: [DISPUTE RESOLUTION — attorney to specify forum, jurisdiction, and
              whether arbitration is appropriate for our consumer-facing context, including any
              jury-trial waiver and class-action provisions. Note: mandatory arbitration in
              consumer contracts has growing pushback from state AGs and consumer-protection
              case law; this should be a deliberate strategic choice, not a default.]
            </p>
          </section>

          <section>
            <h2 className="font-sans font-medium text-[22px] sm:text-[24px] tracking-[-0.015em]">
              10. Changes to these terms
            </h2>
            <p className="mt-3 text-[15.5px] leading-[1.65] text-muted">
              We may update these terms from time to time. The &ldquo;Last updated&rdquo; date at the top
              reflects the most recent revision. Continued use of the service after a revision
              constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="font-sans font-medium text-[22px] sm:text-[24px] tracking-[-0.015em]">
              11. Privacy
            </h2>
            <p className="mt-3 text-[15.5px] leading-[1.65] text-muted">
              Our handling of personal information is described in our{" "}
              <Link href="/privacy" className="underline hover:text-foreground">
                Privacy Policy
              </Link>
              , which is incorporated into these terms by reference.
            </p>
          </section>

          <section>
            <h2 className="font-sans font-medium text-[22px] sm:text-[24px] tracking-[-0.015em]">
              12. Contact
            </h2>
            <p className="mt-3 text-[15.5px] leading-[1.65] text-muted">
              For questions about these terms: email [LEGAL CONTACT EMAIL] or write to [LLC NAME],
              [REGISTERED ADDRESS].
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
