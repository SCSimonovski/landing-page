Mortgage Protection Lead Engine

**Strategy & Offer**

*Business model, positioning, agent pitch, decision log*

v1.0 \| April 2026

Target market: United States

**About this document**

The strategic foundation: what the business is, why it works, what we sell, what we charge, how we pitch the buyer, and the major decisions we've made along the way. This document changes rarely — only when a strategic decision is revised.

# Contents

Part 1 — Business model and unit economics

Part 2 — The offer and positioning

Part 3 — Pricing and the pilot proposal

Part 4 — TCPA compliance overview

Part 5 — Agent pitch and pilot agreement

Part 6 — Decision log

# How to use this document

This document is one of four reference documents that together describe the Mortgage Protection Lead Engine business. It is intended primarily as AI context — Claude (in the project) and Claude Code (during build) read these documents to maintain shared understanding across conversations.

The four documents:

- **Strategy & Offer —** the why of the business: economics, positioning, agent pitch, decision log

- **Technical Reference —** the how of the system: architecture, landing page, form/API/DB, integrations, code refs

- **Build Plan —** the when of execution: Phase 1 sequence, Phase 2 roadmap, Meta Ads launch

- **Operations Runbook —** the daily/weekly operating playbook once leads are flowing

Some content (notably TCPA, capacity model, unit economics) appears in more than one document at different levels of detail. This is intentional — each document should be self-contained for its audience.

Treat newer information from chat conversations as superseding older information here. The team will periodically update these documents to reflect decisions made in conversation.

# Part 1 — Business model and unit economics

## 1.1 What the business actually is

The business is an attention-arbitrage operation. We buy attention from Meta at one price, convert a fraction of it into qualified conversation requests, and sell those requests to a licensed insurance agent at a higher price. The business does not sell insurance; it does not require an insurance license. The product is a phone number attached to a real US homeowner who has just expressed interest in mortgage protection and has consented to be contacted.

The competitive advantage over incumbent lead aggregators is not price — it is freshness and exclusivity. Existing suppliers in this space are frequently criticized for reselling leads that were previously sold as "exclusive," and for delivering leads days after capture rather than minutes. Both of those gaps are addressable by a small, disciplined operation.

## 1.2 Real unit economics

These are the working numbers for the first pilot. They should be revisited after the first 50 real leads.

| **Metric**                     | **Working number**                 | **Notes**                                                     |
|--------------------------------|------------------------------------|---------------------------------------------------------------|
| Sale price per lead (to agent) | \$40                               | Matches incumbent pricing; justified by exclusivity guarantee |
| Target Cost Per Lead (CPL)     | Under \$25                         | Industry range for Meta Ads in this niche: \$15–\$30          |
| Gross margin per lead          | \$15–\$25                          | Sale price minus CPL                                          |
| Starting volume                | Target 10/wk (floor 6, ceiling 15) | Capacity model — see Part 2.4 for full structure              |
| Gross weekly revenue (start)   | \$400                              | 10 leads × \$40                                               |
| Weekly ad spend (at \$20 CPL)  | \$200                              | 10 leads × \$20                                               |
| Weekly gross profit            | ~\$200                             | Before operational costs                                      |
| Monthly gross profit at start  | ~\$800–\$1,000                     | With one agent                                                |

This is small money at the start. It is not meant to replace income — it is meant to prove the unit economics. Once CPL is stable under \$25 and the agent reports satisfaction with quality, the plan is to scale to 30+ leads/week with the same agent and/or add a second agent. At 40 leads/week with \$20 CPL, monthly profit crosses \$3,000+ per agent, and adding agents is nearly free (the funnel scales; only Twilio and email costs grow linearly with volume).

## 1.3 The \$2,000 test: success and failure criteria

The \$2,000 test budget will produce roughly 80–130 leads at \$15–\$25 CPL. That is enough data to validate or invalidate three things:

- **Meta approval —** Will Meta actually allow these ads to run? In the insurance space, 10–15% of new accounts get flagged on first launch. This costs only time to find out.

- **Cost per lead —** Is the CPL actually under \$25? If it lands at \$40+, the model breaks — leads would sell at break-even with no room for error.

- **Lead quality —** When the agent calls the leads, are they real, reachable, and qualified? This is the only thing that matters for agent retention.

### Continue criteria (after \$2,000 spent)

- CPL landed under \$25, AND

- At least 60% of leads reachable by phone within 3 attempts, AND

- Agent willing to commit to ongoing capacity (target 10/week or higher) going forward

### Stop criteria

- CPL over \$35 with no trend toward improvement — the math doesn't work

- Under 40% of leads reachable — quality problem in the targeting or form

- Agent declines to continue — whether because of quality or any other reason

**Stop-loss discipline:** Decide these criteria before launch. Write them down somewhere visible. When the money starts flowing out, emotions cloud judgment — pre-committed criteria protect you from both giving up too early and throwing good money after bad.

# Part 2 — The offer and positioning

## 2.1 The competitive landscape

The incumbent lead suppliers your agent (and others) currently buy from are your reference point. Understanding what they do and where they fail is the entire basis for your offer.

What incumbent suppliers do: operate lead generation platforms selling "fresh" and "aged" mortgage protection leads to US agents. Pricing for fresh exclusive leads sits in the \$25–\$80 range, with \$40 being a common middle. Volume is high; the same platform typically serves many agents simultaneously.

### The industry's trust gap

Where most incumbent suppliers fail — and this complaint is documented across industry forums, not isolated to any one supplier — is exclusivity that isn't really exclusive. Leads sold as "exclusive" frequently turn out to have been worked by other agents, suggesting undisclosed resale after a cooling period. Industry forum veterans openly state that most vendors resell their "exclusive" leads 6–12 months after the original sale.

This trust gap is industry-wide. It's a structural pattern caused by the economics of scale: when you have hundreds of agents to serve and a fixed lead supply, reselling "old" exclusive leads is the easiest margin lever to pull. Agents have learned to expect it. The fact that they're still buying anyway only means they don't have a better alternative.

Your structural advantage: you are small. You're not running a marketplace serving hundreds of agents — you're running a focused operation for one agent (eventually a few). You don't have the structural pressure that drives resale. You control the entire pipeline. You can prove exclusivity because you're the only one with access to the data.

## 2.2 The offer — exclusivity is the headline, everything else is evidence

Most lead suppliers list four or five features of equal weight: exclusive, fresh, verified, refundable, etc. This dilutes the message. The reality is that exclusivity matters far more than the others — because it's the one the industry consistently fails on, and the one agents have learned to discount when they hear it.

Your offer is structured accordingly. One headline promise. Three supporting commitments that exist to make the headline credible.

### The headline promise: Genuinely Exclusive (And Provable)

Every lead delivered to the agent is sold to nobody else, ever. Not after 6 months. Not after 12. Not in an "aged" tier. Not at all. This is enforced through three mechanisms — and the agent can verify each one:

- Contractual: the pilot agreement states it explicitly, with no carve-outs

- Operational: the lead's agent_id field in the database is permanent — once assigned, never reassignable. Platform code enforces this at the database level.

- Auditable: the agent can request a record at any time showing exactly when each lead was created, when it was delivered to them, and confirmation that no other agent_id has ever been associated with it

This is the angle that addresses the documented industry trust gap. Other suppliers also claim exclusivity. Your differentiator is that you can demonstrate it on demand.

### Supporting commitment 1: Fresh delivery (within 2 minutes)

SLA: the lead is delivered to the agent within 2 minutes of form submission, with a timestamp the agent can verify. Technically trivial via direct SMS. Speed signals freshness; freshness reinforces exclusivity (a lead delivered in 2 minutes hasn't been worked by anyone else).

### Supporting commitment 2: Verified data (real person, real consent)

Every lead passes basic validation before reaching the agent:

- Phone number validated server-side and normalized to E.164 format

- Email format validated, MX record checked, disposable-email domains rejected

- Honeypot and submission-timing checks rule out obvious bots

- TCPA consent language, exact text, timestamp, IP address, and user-agent captured and stored immutably

If the agent ever has a TCPA question or compliance concern, you have the receipt. This protects them as much as you.

### Supporting commitment 3: Refundable (your risk, not theirs)

If a lead is disconnected, duplicate, fake, or fails the qualifying criteria (age, mortgage range, state), you refund or replace it within 48 hours. The agent doesn't take quality risk — you do.

This commitment is operationally cheap (most leads are valid) and rhetorically valuable: it tells the agent you're so confident in your quality that you'll bet your margin on it.

# Part 3 — Pricing and the pilot proposal

## 3.1 Pricing

Match \$40/lead. Don't undercut. Reasoning:

- \$40 is solidly in the middle of the documented exclusive-lead pricing range (\$25–\$80). Pricing here signals "normal market quality with a credibility advantage" — not premium, not budget, not suspicious.

- Undercutting signals lower quality. In lead-gen, buyers assume you get what you pay for, and underpricing exclusivity makes the exclusivity claim itself look fake.

- Matching market price while offering provable exclusivity is a stronger pitch than lower price with the same unverifiable claims everyone else makes.

- \$40 is what the agent is already paying. You're not asking them to budget more — you're offering them provably better leads at the same price.

- Margin at \$40/lead (\$15–\$25 gross) supports operational cost of verification and refunds. At \$30/lead, it doesn't.

**Why not charge more:** Two reasons not to price at \$50 or \$60. First, you're new — no track record yet justifies premium pricing. Second, the goal in the pilot phase is to remove every reason for the agent to say no, not to maximize per-lead margin. After 90 days of proven exclusivity, raising prices is on the table.

## 3.2 The pilot proposal

Propose a structured pilot rather than an open-ended relationship. This reduces the agent's risk and gives a clear framework for feedback. The structure uses a capacity model with a target, a floor, and a ceiling — designed to handle the natural variability of paid acquisition without breaking the relationship.

### Why not just "10 leads/week"

A flat "10/week" commitment fails in both directions. Some weeks you may generate 6 (Meta paused ads, holiday week, creative fatigue). Other weeks you may generate 25 (winning creative breakout). A flat commitment turns the first case into a contract violation and the second case into wasted leads or broken exclusivity. The capacity model handles both.

### The capacity model

| **Term**        | **Value**                 | **What it means**                                 |
|-----------------|---------------------------|---------------------------------------------------|
| Weekly target   | 10 leads                  | What you aim to deliver in a normal week          |
| Weekly floor    | 6 leads                   | Below this, you owe a make-good                   |
| Weekly ceiling  | 15 leads                  | Agent's maximum — leads beyond this are paused    |
| Price           | \$40/lead                 | Billed only on actual leads delivered             |
| Billing cadence | Weekly, in arrears        | Friday invoice for that week's deliveries         |
| Exclusivity     | Per-lead, enforced by you | Each delivered lead goes to nobody else, ever     |
| Delivery window | Real-time, Mon–Sun        | Leads delivered as generated, within 2 minutes    |
| Pilot duration  | 4 weeks                   | Then renegotiate based on close rate and capacity |

### Under-delivery handling (below 6/week floor)

If a week ends below the floor, you owe the agent a make-good. Their choice of:

- Credit toward the next week's invoice (\$40 per lead missing below 6)

- Cash refund of the same amount

- Free leads delivered the following week (over and above that week's normal flow)

Communicate proactively — by Thursday, if you can see you'll fall short, text the agent before they ask. Honest under-delivery with proactive make-good preserves the relationship; silent under-delivery destroys it.

### Over-delivery handling (above 15/week ceiling)

If you generate beyond ceiling, leads at \#16+ for that week do NOT go to the agent. Your options, in order of preference:

1.  Pause ad spend before hitting the ceiling. Each Friday, look at the week's pace. If trending toward 18+, reduce daily ad budget for the weekend.

2.  Hold and roll forward — but only briefly. Cold leads (over 24 hours old) lose most of their value. Better to refund the ad spend than ship a stale lead and break the freshness promise.

3.  Renegotiate capacity upward. "We've been generating 18-22/week. Want to take all of them at the same \$40?"

4.  Bring on a second agent. The platform domain is registered for exactly this scenario.

Under no circumstances do you secretly resell exclusivity-promised leads to a second buyer. This is the single fastest way to destroy the business — agents talk to each other.

### Other key terms

- Refund/replacement: any lead that is disconnected, duplicate, fake, or outside qualifying criteria gets refunded within 48 hours of agent's claim

- Feedback: agent provides a one-line outcome per lead (reached / voicemail / not interested / appointment / sold) within 7 days of delivery

- Exit: either party can end the pilot with one week's notice; you bill only for leads already delivered

- Renegotiation: at the end of week 4, both parties review numbers and decide whether to continue, change capacity, or end

## 3.3 Operational rules of thumb

Principles that fall out of the capacity model:

- **Do not generate leads you can't sell.** If demand is capped at 15/week, ad spend should be sized to produce roughly that. Generating excess leads costs money and tempts toward exclusivity violations.

- **Daily lead pace is your north star.** By Wednesday, you should be at ~50-60% of weekly target. By Friday, ~80%. Track this in a simple spreadsheet.

- **Communicate before the agent asks.** Slow week? Text Thursday. Hot week? Text Monday. Agents accept variability if they trust your communication.

- **Aging is a hidden cost.** Every hour a lead waits to be called reduces close rate by ~5-10%. The 2-minute SLA isn't marketing — it's the operational requirement that makes leads worth \$40.

# Part 4 — TCPA compliance overview

**Strategic vs operational:** This document covers TCPA at a strategic level — what it is, why it shapes the offer, what you commit to. The operational details (DNC scrubbing, suppression workflows, calling hours, retention timers) live in the Operations Runbook.

**Not legal advice:** TCPA liability is serious — statutory damages of \$500-\$1,500 per call, and plaintiff law firms actively hunt these cases. Before launching, have a TCPA-experienced attorney review the consent language, privacy policy, landing page, and data-handling practices.

## 4.1 Why TCPA matters strategically

The TCPA governs how US consumers can be contacted by phone for marketing. The agent calling the lead is making a TCPA-governed marketing call, and you — as the party who collected the consent — are responsible for having captured that consent legally.

This shapes the offer in three ways:

- Verified consent capture is part of what you sell — it protects the agent from compliance liability

- The form must capture explicit consent, not pre-checked, with provable receipt (timestamp, IP, exact wording)

- Lead transfer to the agent is governed by what the consumer consented to — your consent language must name the parties who will contact them

## 4.2 Key facts as of April 2026

- **The 1:1 consent rule was struck down.** In January 2025, the 11th Circuit vacated the FCC's "one-to-one" consent rule. The FCC formally repealed it in August 2025. The pre-2023 "prior express written consent" (PEWC) standard applies. You do not need separate consent per seller.

- **Revocation rules tightened.** As of April 11, 2025, consumers can revoke consent by any reasonable means (text, email, voice). Businesses must honor revocation within 10 business days.

- **DNC Registry applies to texts too.** Since 2023, text messages to numbers on the National DNC Registry are treated like calls. You must scrub before calling and before texting.

- **Record retention: 5 years.** Under the FTC Telemarketing Sales Rule, retain consent records for at least 5 years from the date of consent.

## 4.3 Consent language (starting point)

Have an attorney adapt this to the specific business and target states. The checkbox is required and must not be pre-checked.

By checking this box and clicking "Get My Quote," I am providing

my electronic signature and express written consent for \[BRAND

NAME\] and its licensed insurance agents to contact me at the

phone number and email I provided, including by calls, pre-

recorded messages, artificial voice, and text messages sent

using an automatic telephone dialing system, for marketing

purposes about mortgage protection and related insurance

products. I understand that this consent is not required to

make a purchase, that message and data rates may apply, and

that I can revoke consent at any time by replying STOP to any

text or by emailing \[opt-out email\]. See our Privacy Policy

\[link\] and Terms \[link\].

## 4.4 What you commit to capturing

On every form submission, the consent_log table receives an immutable record of:

- Exact consent text the user saw and agreed to (full snapshot, not a reference)

- Form version (so language changes don't lose historical proof)

- Timestamp (server time, UTC)

- IP address

- User agent string

- URL of the page where consent was given

- Indicator that the checkbox was NOT pre-checked

This receipt is part of the verified-data commitment. Operational details on how it's captured and stored: Technical Reference. Operational details on DNC scrubbing, suppression list, calling hours: Operations Runbook.

# Part 5 — Agent pitch and pilot agreement

## 5.1 The pitch conversation

Whoever on the team handles the agent relationship will have this conversation. The goal is not to sound like a salesperson — the agent deals with salespeople daily. The goal is to sound like a peer solving a real problem they have.

### Opening

"You mentioned the leads you've been buying hadn't been great — the last batch felt worked over. We've been building something specifically to solve that problem. Can I walk you through it in 10 minutes?"

### The pitch — lead with exclusivity, support with evidence

Open with the headline. Spend most of the time on it. The other three commitments come up only after the agent's interest is engaged on exclusivity — they're proof points, not a feature list.

### Headline (spend the most time here)

"Every lead we deliver to you is exclusive — and I mean really exclusive. Sold to nobody else, ever. Not after 6 months, not in an aged tier, not reused for any reason. I know that's what most suppliers say, and I know agents in this industry have been burned on that promise more than once. So here's how I make it provable: each lead in our database has your agent_id permanently attached. Not transferable. I can show you the database structure. You can ask me at any time for an audit log — when each lead was created, when it was delivered to you, and confirmation that no other agent has ever been associated with it. That's the deal."

### Supporting commitments (briefly, as evidence)

5.  Fresh — "You'll get an SMS with the lead's details within 2 minutes of them submitting the form. I'll show you the timestamp on every one. A 2-minute-old lead hasn't been worked by anyone else — that's part of why exclusivity actually means something with us."

6.  Verified — "Phones are validated, emails are MX-checked, bot submissions are filtered. We capture IP, user agent, and the exact TCPA consent the lead agreed to — if you ever have a compliance question, we have the receipt."

7.  Refundable — "If a lead is disconnected, duplicate, fake, or doesn't qualify, we replace it free within 48 hours. That's our risk to take, not yours."

### The numbers

"We're proposing a 4-week pilot with a capacity model — target 10 leads per week, but with a floor of 6 (below that, we owe you a credit) and a ceiling of 15 (we don't flood you). Price is \$40 per lead, billed weekly for leads actually delivered, not promised. Either of us can end it with a week's notice. After 4 weeks, we look at your close rate and your capacity needs, and decide whether to keep going, raise the ceiling, or end."

### The objection handling

- **"Why a target instead of a guaranteed number?" —** "Paid acquisition has natural variance. The target is what we aim for; the floor is your protection if we miss; the ceiling is your protection from being flooded. You only pay for what we actually deliver."

- **"What if you can't even hit 6?" —** "Then we owe you a make-good — credit, refund, or extra leads next week, your choice. And we'd be in conversation with you well before Friday so you're not guessing."

- **"My current supplier charges the same — why switch?" —** "Same price, better product. If after 4 weeks your close rate is the same or worse, you're out nothing — go back to them."

- **"I need more than 15 leads/week." —** "Understood. Let's start with 15 as the pilot ceiling and see how the close rate holds. If you're closing well at week 3, we raise the ceiling to 25 for month 2."

- **"What if you generate 30 in a week?" —** "Anything past 15 doesn't go to you — we either reduce ad spend, find a second buyer (who would never get any of YOUR leads), or eat the ad cost. Your exclusivity on every lead we send you is permanent."

- **"What happens if I don't close the leads?" —** "That's between you and them. Our guarantee is on lead validity — real person, consented, valid contact info, fresh delivery. We can't guarantee they buy."

## 5.2 The pilot agreement (one-page template)

This is not a legal document — have an attorney draft the real version. But something like this works to get agreement:

LEAD SUPPLY PILOT AGREEMENT

Between: \[Your Brand LLC\] ("Supplier")

And: \[Agent Name / Agency\] ("Agent")

Date: \[date\]

1\. TERM. Four weeks from \[start date\], terminable by either

party with one week's written notice.

2\. CAPACITY MODEL. Supplier will deliver leads under the

following weekly capacity structure:

\- Target: 10 qualified leads per week

\- Floor: 6 leads per week (see Section 3 for make-good)

\- Ceiling: 15 leads per week (Supplier will not deliver

more than this; Agent is not obligated to buy more)

3\. PRICE & BILLING. \$40 per lead actually delivered. Billed

weekly in arrears. Payment due within 3 business days of

invoice. No payment is owed for leads not delivered.

4\. UNDER-DELIVERY MAKE-GOOD. If fewer than 6 leads are

delivered in a given week, Supplier owes Agent, at Agent's

choice: (a) credit of \$40 toward the following week's

invoice for each lead missing below 6; (b) cash refund of

the same amount; or (c) free additional leads in the

following week.

5\. OVER-DELIVERY HANDLING. If Supplier generates leads

beyond the weekly ceiling, those leads will not be

delivered to Agent and will not be sold or transferred

to any third party.

6\. EXCLUSIVITY. Each lead delivered to Agent will not be

sold or delivered to any other buyer, ever. Supplier

will maintain records demonstrating this.

7\. LEAD CRITERIA. Each lead will:

\- Be a US homeowner between the ages of 25 and 65

\- Have a mortgage balance between \$50,000 and \$2,000,000

\- Have provided TCPA-compliant express written consent

\- Have a validated US phone number

\- Be delivered within 2 minutes of form submission

8\. REFUND / REPLACEMENT. Supplier will refund or replace,

at no charge, leads that are disconnected, duplicate,

fake, off-criteria, or where the contact requests not to

be contacted before or during the first call attempt.

Replacement must be requested within 7 days of delivery.

9\. FEEDBACK. Agent will provide a one-line outcome per lead

within 7 days of delivery.

10\. DATA HANDLING. Agent will use the lead data solely for

marketing mortgage protection products to the lead;

honor opt-outs within 10 business days; scrub against

the National DNC Registry before calling; not transfer

or resell lead data to any third party.

11\. CONFIDENTIALITY. Both parties agree to keep the terms

of this pilot confidential.

12\. RENEGOTIATION. At the end of the four-week pilot, both

parties review delivery, close rate, and capacity needs.

13\. GOVERNING LAW. \[Your state\].

# Part 6 — Decision log

This section records the major strategic decisions made during planning, with the reasoning. When AI tools (Claude, Claude Code) load this document, this is the fastest path to understanding the team's choices. When the team revisits a question later, this is the record of why the answer was what it was.

Format: short, dated, with a one-line reason. Add new entries as decisions are made; mark superseded entries with a strikethrough or a note rather than deleting them.

| **Decision**             | **Choice**                                            | **Reason**                                                                                        |
|--------------------------|-------------------------------------------------------|---------------------------------------------------------------------------------------------------|
| Target market            | United States only (initially)                        | Team has US connections; one potential US agent; TCPA easier to operate than multi-jurisdiction   |
| Pricing                  | \$40/lead                                             | Matches market rate; undercutting would weaken the exclusivity claim; supports operational margin |
| Pricing strategy         | Match, don't undercut                                 | Lower price implies lower quality; the offer wins on terms (exclusivity), not price               |
| Offer headline           | Provable exclusivity                                  | Industry-wide trust gap on this; everyone claims it, almost nobody proves it                      |
| Capacity model           | Target 10 / floor 6 / ceiling 15                      | Handles natural variance in paid acquisition without breaking the relationship                    |
| Pilot duration           | 4 weeks                                               | Long enough to validate; short enough to be reversible; clear renegotiation point                 |
| Test ad budget           | \$2,000                                               | Enough to give Meta's algorithm learning data; bounded loss if model fails                        |
| Tech stack — landing/API | Next.js on Vercel                                     | Team familiarity; API routes colocated; preview deploys for A/B                                   |
| Tech stack — database    | Supabase (Postgres)                                   | Team has used it; auth + RLS + dashboard built in                                                 |
| Tech stack — SMS         | Twilio                                                | Mature US coverage; A2P 10DLC support; simple SDK                                                 |
| Tech stack — email       | Resend                                                | Better deliverability than Gmail SMTP; clean DX; free tier fits scale                             |
| Architecture — domains   | Two domains                                           | Audience clarity; portfolio risk management; multi-brand optionality; SEO separation              |
| Build phasing            | Phase 1 lead engine, Phase 2 platform                 | Validate before scaling; avoid premature platform engineering                                     |
| Phase 1 admin tooling    | Supabase Studio (no custom UI)                        | 10 leads/week doesn't justify a dashboard; resist the temptation                                  |
| Phase 2 cadence          | Gradual, no time pressure                             | Background project; runs alongside operations; agent-driven priorities                            |
| Ad strategy              | Landing page (not Meta Instant Forms)                 | Higher quality leads, better consent capture, better support for exclusivity story                |
| Lead form length         | 10–11 fields with progressive disclosure              | Enough to qualify; tight enough to convert; reduces abandonment vs all-at-once                    |
| Bot protection           | Honeypot + timing + rate limit                        | Catches 99% of bots; no CAPTCHA friction                                                          |
| TCPA approach            | PEWC standard (1:1 consent rule struck down Jan 2025) | Current law; requires explicit unchecked consent + immutable receipt                              |
| Backup brand domain      | Don't pre-register; document runbook instead          | Domain registration is instant; pre-registering offers minimal benefit                            |

*— End of Strategy & Offer —*
