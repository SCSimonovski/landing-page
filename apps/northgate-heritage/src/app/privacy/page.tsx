import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Privacy Policy — [BRAND NAME PLACEHOLDER]",
  description: "Privacy policy for [BRAND NAME PLACEHOLDER] final expense lead service.",
};

// Placeholder text — pending TCPA-experienced attorney review before launch.
// Bracketed UPPERCASE markers (e.g. [BRAND NAME PLACEHOLDER], [RETENTION PERIOD]) indicate
// values an attorney must specify or a launch-checklist item must fill. Do not invent specifics.

export default function PrivacyPage() {
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
          Privacy{" "}
          <em className="font-serif italic font-normal text-accent-terracotta-deep">
            Policy.
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
              [BRAND NAME PLACEHOLDER] (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) operates a
              final-expense-insurance lead-generation service. We do not sell insurance. The service
              connects individuals who request a quote with a licensed insurance agent who will
              contact them. Operating entity and registered address: [LLC NAME — to be added on
              formation], [REGISTERED ADDRESS].
            </p>
          </section>

          <section>
            <h2 className="font-sans font-medium text-[22px] sm:text-[24px] tracking-[-0.015em]">
              2. Information we collect
            </h2>
            <p className="mt-3 text-[15.5px] leading-[1.65] text-muted">
              When you submit our form, we collect: your name, phone number, email address, US state
              of residence, age, smoker status, whether you have major health conditions, the
              relationship of your intended beneficiary, your desired coverage amount, and best time
              to call. We also automatically collect your IP address, user-agent string, the page URL
              where you submitted the form, and any referral parameters from advertising platforms
              (such as fbclid, utm_source, and related identifiers). We capture the exact consent text
              shown to you and the timestamp of your consent.
            </p>
          </section>

          <section>
            <h2 className="font-sans font-medium text-[22px] sm:text-[24px] tracking-[-0.015em]">
              3. How we use your information
            </h2>
            <p className="mt-3 text-[15.5px] leading-[1.65] text-muted">
              We use the information you provide to validate the submission, compute an internal
              quality score, and forward your contact details to one licensed insurance agent who is
              authorized to call or text you about final expense insurance options. We use the
              technical information for fraud prevention, compliance recordkeeping, and ad-platform
              attribution.
            </p>
          </section>

          <section>
            <h2 className="font-sans font-medium text-[22px] sm:text-[24px] tracking-[-0.015em]">
              4. Third parties we share with
            </h2>
            <p className="mt-3 text-[15.5px] leading-[1.65] text-muted">
              We share your contact information with the licensed insurance agent matched to your
              submission. We use the following service providers: [HOSTING PROVIDER PLACEHOLDER]
              (application hosting), Supabase (data processor for our database), Twilio (SMS
              delivery), and Resend (transactional email delivery). Each provider is contractually
              bound to handle your data only for the purposes described. We do not sell your
              information to data brokers or unrelated third parties.
              {/* When Meta CAPI ships, this list also adds: "and Meta Platforms (advertising
                  attribution via the Conversions API; user data is hashed with SHA-256 before
                  transmission)." That edit ships as a companion edit in the Meta CAPI plan. */}
            </p>
          </section>

          <section>
            <h2 className="font-sans font-medium text-[22px] sm:text-[24px] tracking-[-0.015em]">
              5. Your rights
            </h2>
            <p className="mt-3 text-[15.5px] leading-[1.65] text-muted">
              You may request access to, correction of, or deletion of your personal information at
              any time by contacting us at the address below. We will respond within [RESPONSE
              WINDOW — attorney to specify per applicable law]. You may also opt out of further
              contact at any time using the mechanisms in the next section.
            </p>
          </section>

          <section>
            <h2 className="font-sans font-medium text-[22px] sm:text-[24px] tracking-[-0.015em]">
              6. TCPA opt-out
            </h2>
            <p className="mt-3 text-[15.5px] leading-[1.65] text-muted">
              You can stop SMS messages by replying <strong className="text-foreground">STOP</strong>{" "}
              to any text message we send. To opt out of all contact, email us at the address
              below or reply &lsquo;unsubscribe&rsquo; to any email from us. We honor opt-out requests
              within the time frames required by applicable law.
            </p>
          </section>

          <section>
            <h2 className="font-sans font-medium text-[22px] sm:text-[24px] tracking-[-0.015em]">
              7. Do-Not-Call compliance
            </h2>
            <p className="mt-3 text-[15.5px] leading-[1.65] text-muted">
              Before forwarding your contact information to a licensed agent, we check your phone
              number against the FTC&apos;s Do-Not-Call registry. If your number is registered, we still
              maintain your consent record but flag the lead so the agent can decline to contact
              you, consistent with applicable law.
            </p>
          </section>

          <section>
            <h2 className="font-sans font-medium text-[22px] sm:text-[24px] tracking-[-0.015em]">
              8. California Privacy Notice
            </h2>
            <p className="mt-3 text-[15.5px] leading-[1.65] text-muted">
              If you are a California resident, the California Consumer Privacy Act (CCPA) gives you
              rights regarding personal information we collect. The categories of personal
              information we collect are described in section 2. We collect this information
              directly from you and (for technical fields) automatically when you visit our site.
              Business purposes: lead validation, agent matching, fraud prevention, ad attribution.
              We do not &ldquo;sell&rdquo; personal information as that term is defined under the CCPA.
              Contact information for California rights requests: see section 14. [CALIFORNIA
              PRIVACY NOTICE specifics — attorney to confirm against current CCPA requirements
              before launch.]
            </p>
          </section>

          <section>
            <h2 className="font-sans font-medium text-[22px] sm:text-[24px] tracking-[-0.015em]">
              9. Cookies and tracking technologies
            </h2>
            <p className="mt-3 text-[15.5px] leading-[1.65] text-muted">
              Our site uses cookies set by the Meta Pixel (when present) for advertising attribution.
              You can disable cookies in your browser settings. Disabling cookies does not prevent
              you from submitting the form.
            </p>
          </section>

          <section>
            <h2 className="font-sans font-medium text-[22px] sm:text-[24px] tracking-[-0.015em]">
              10. Data retention
            </h2>
            <p className="mt-3 text-[15.5px] leading-[1.65] text-muted">
              We retain your consent record for the period required by applicable law.
              [RETENTION PERIOD — attorney to specify; FTC TSR currently requires a minimum of 5
              years for consent records, but applicable laws may vary by jurisdiction.] We retain
              other information for as long as necessary to deliver the service and comply with
              legal obligations.
            </p>
          </section>

          <section>
            <h2 className="font-sans font-medium text-[22px] sm:text-[24px] tracking-[-0.015em]">
              11. Children&apos;s privacy
            </h2>
            <p className="mt-3 text-[15.5px] leading-[1.65] text-muted">
              Our service is not intended for individuals under 18. We do not knowingly collect
              personal information from minors.
            </p>
          </section>

          <section>
            <h2 className="font-sans font-medium text-[22px] sm:text-[24px] tracking-[-0.015em]">
              12. International transfers
            </h2>
            <p className="mt-3 text-[15.5px] leading-[1.65] text-muted">
              Our service is intended for US residents. Personal information you submit is processed
              and stored on servers located in the United States.
            </p>
          </section>

          <section>
            <h2 className="font-sans font-medium text-[22px] sm:text-[24px] tracking-[-0.015em]">
              13. Changes to this policy
            </h2>
            <p className="mt-3 text-[15.5px] leading-[1.65] text-muted">
              We may update this privacy policy from time to time. The &ldquo;Last updated&rdquo; date at the
              top reflects the most recent revision. We will not retroactively apply material changes
              to information collected under prior versions.
            </p>
          </section>

          <section>
            <h2 className="font-sans font-medium text-[22px] sm:text-[24px] tracking-[-0.015em]">
              14. Contact
            </h2>
            <p className="mt-3 text-[15.5px] leading-[1.65] text-muted">
              For privacy questions, requests, or opt-out: email [PRIVACY CONTACT EMAIL] or write to
              [LLC NAME], [REGISTERED ADDRESS].
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
