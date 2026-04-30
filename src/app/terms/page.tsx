import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — [BRAND NAME PLACEHOLDER]",
  description: "Terms of service for [BRAND NAME PLACEHOLDER] mortgage protection lead service.",
};

// Placeholder text — pending TCPA-experienced attorney review before launch.
// Bracketed UPPERCASE markers indicate values an attorney must specify.

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <div
        role="alert"
        className="mb-8 rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-sm text-foreground"
      >
        <strong>DRAFT — pending TCPA-experienced attorney review.</strong> Not legal advice. The
        text below is structurally complete placeholder content; specifics in [BRACKETED MARKERS]
        must be filled by counsel before launch.
      </div>

      <h1 className="text-3xl font-bold text-foreground">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted">
        Last updated: [DRAFT — attorney review pending]
      </p>

      <div className="mt-8 space-y-8 text-base text-foreground">
        <section>
          <h2 className="text-xl font-semibold">1. Who we are</h2>
          <p className="mt-2 text-muted">
            [BRAND NAME PLACEHOLDER] (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) is operated by [LLC NAME — to be
            added on formation], with registered address [REGISTERED ADDRESS]. By using our
            website or submitting our form, you agree to these terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">2. Service description</h2>
          <p className="mt-2 text-muted">
            We operate a lead-generation service. We collect information from US homeowners
            interested in mortgage protection insurance and forward that information to one
            licensed insurance agent who is authorized to contact you. <strong>We do not sell
            insurance, do not offer insurance products, and do not provide insurance advice.</strong> Any
            quote, policy, or recommendation comes from the licensed agent we connect you with.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">3. Acceptable use</h2>
          <p className="mt-2 text-muted">
            By submitting our form, you agree not to: submit information about another person
            without their permission; submit false, misleading, or fictitious information; use
            automated tools to submit the form; or interfere with the operation of the site.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">4. User representations</h2>
          <p className="mt-2 text-muted">
            By submitting our form you represent that: you are at least 18 years old, you are a
            US resident and homeowner, and the information you provide is accurate and refers to
            yourself. Your consent to be contacted is captured separately via the consent
            checkbox at the time of submission; this section does not duplicate or modify that
            consent.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">5. Disclaimer of warranties</h2>
          <p className="mt-2 text-muted">
            The service is provided &ldquo;as is&rdquo; and &ldquo;as available.&rdquo; We make no warranties or
            representations regarding the accuracy, reliability, or availability of the service or
            of any information received from the licensed agent. [Attorney to expand per
            applicable state law.]
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">6. Limitation of liability</h2>
          <p className="mt-2 text-muted">
            To the maximum extent permitted by law, our total liability for any claim arising out
            of or related to the service is limited to [LIABILITY CAP — attorney to specify].
            We are not liable for indirect, incidental, special, consequential, or punitive
            damages.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">7. Indemnification</h2>
          <p className="mt-2 text-muted">
            You agree to indemnify and hold us harmless from any claim arising out of your
            violation of these terms, your misuse of the service, or your violation of applicable
            law.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">8. Governing law</h2>
          <p className="mt-2 text-muted">
            These terms are governed by the laws of [STATE PLACEHOLDER — depends on LLC state of
            formation], without regard to conflict-of-law principles.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">9. Dispute resolution</h2>
          <p className="mt-2 text-muted">
            Any dispute arising out of or related to these terms or the service will be resolved
            as follows: [DISPUTE RESOLUTION — attorney to specify forum, jurisdiction, and
            whether arbitration is appropriate for our consumer-facing context, including any
            jury-trial waiver and class-action provisions. Note: mandatory arbitration in
            consumer contracts has growing pushback from state AGs and consumer-protection
            case law; this should be a deliberate strategic choice, not a default.]
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">10. Changes to these terms</h2>
          <p className="mt-2 text-muted">
            We may update these terms from time to time. The &ldquo;Last updated&rdquo; date at the top
            reflects the most recent revision. Continued use of the service after a revision
            constitutes acceptance of the new terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">11. Privacy</h2>
          <p className="mt-2 text-muted">
            Our handling of personal information is described in our{" "}
            <Link href="/privacy" className="underline hover:text-foreground">
              Privacy Policy
            </Link>
            , which is incorporated into these terms by reference.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">12. Contact</h2>
          <p className="mt-2 text-muted">
            For questions about these terms: email [LEGAL CONTACT EMAIL] or write to [LLC NAME],
            [REGISTERED ADDRESS].
          </p>
        </section>
      </div>
    </main>
  );
}
