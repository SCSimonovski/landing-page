**MORTGAGE PROTECTION LEAD ENGINE**

**Strategy & Offer**

*Business model, positioning, agent pitch, decision log*

**Version 2.1 · May 2026 · Target market: United States**

**About this document**

The strategic foundation: what the business is, why it works, what we sell, what we charge, how we pitch the buyer, and the major decisions we have made along the way. This document changes rarely — only when a strategic decision is revised.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>VERSION 2.0 NOTE</strong></p>
<p>This was a substantive rewrite of the v1.0 playbook, made April 2026 after competitive research surfaced two material problems: (1) realistic Meta CPL benchmarks for financial services are $50–$80, well above the $20–$25 v1.0 assumed, which broke the unit economics at the planned $40 sale price; (2) the agent relationship is more usefully understood as a research partnership than as a customer relationship in Phase 1. The pricing model, agent pitch, pilot structure, and stop/continue criteria all changed as a result. The decision log in Part 6 records what changed and why; v1.0 lines that were superseded are noted there with the reasoning, not deleted.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>VERSION 2.1 NOTE</strong></p>
<p>Adds brand-family structure (Part 1.5), cross-brand consent semantics (Part 4.3), and three decision-log rows (Part 6.1) reflecting strategic decisions made between v2.0 and May 2026: the commitment to a multi-brand model under one operating LLC, the scaffolding of Northgate Heritage as a second consumer brand for engineering verification, and the commitment to AI-generated marketing as the primary creative production path. No content from v2.0 is superseded — these are additive. The unit economics, pricing model, and pilot agreement in v2.0 still apply to Northgate Protection's calibration; Heritage's economics will be set independently when Heritage commercializes.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

**How this fits with the other documents.** Companion to Technical Reference (02), Build Plan (03), Operations Runbook (04), Competitive Research (05), and Channel Strategy (06). When this document and another disagree on a strategic question, this document is canonical. When chat conversations supersede this document, treat the chat as canonical pending an update here.

**Contents**

**Part 1** Business model and unit economics

**Part 2** The offer and positioning

**Part 3** Pricing and the pilot proposal

**Part 4** TCPA compliance overview

**Part 5** Agent pitch and pilot agreement

**Part 6** Decision log

**How to use this document**

This document is one of six reference documents that together describe the Mortgage Protection Lead Engine business. It is intended primarily as AI context — Claude (in the project) and Claude Code (during build) read these documents to maintain shared understanding across conversations.

The reference documents:

- **Strategy & Offer** — the why of the business: economics, positioning, agent pitch, decision log

- **Technical Reference** — the how of the system: architecture, landing page, form/API/DB, integrations, code refs

- **Build Plan** — the when of execution: Phase 1 sequence, Phase 2 roadmap, Meta Ads launch

- **Operations Runbook** — the daily/weekly operating playbook once leads are flowing

- **Competitive Research** — what other operators do, market benchmarks, channel comparisons

- **Channel Strategy** — acquisition channels, hybrid Meta + offline-data play, Phase 2+ second channels

Some content (notably TCPA, capacity model, unit economics) appears in more than one document at different levels of detail. This is intentional — each document should be self-contained for its audience.

Treat newer information from chat conversations as superseding older information here. The team will periodically update these documents to reflect decisions made in conversation.

**Part 1 — Business model and unit economics**

**1.1 What the business actually is**

The eventual business is an attention-arbitrage operation. We buy attention from Meta at one price, convert a fraction of it into qualified conversation requests, and sell those requests to licensed insurance agents at a higher price. We do not sell insurance; we do not require an insurance license. The product is a phone number attached to a real US homeowner who has just expressed interest in mortgage protection and has consented to be contacted.

**Phase 1 is not the eventual business.** Phase 1 is a calibration period with a single agent who functions as a research partner, not a customer in the conventional sense. We do not yet know our real cost per lead on Meta in this niche. We do not yet know what our leads are actually worth to a working agent who calls them. Until those two numbers are known, we cannot price the product properly, cannot recruit additional agents with credible economics, and cannot decide whether to scale or shut down. Phase 1 exists to discover those numbers.

The structure of Phase 1 follows from this. We charge the first agent at near-cost. He pays roughly what we pay Meta plus a small operational margin. In exchange, he provides honest feedback on lead quality, structured outcome data per lead, and his judgment of what those leads are actually worth in the market. The first agent is not how we make money. He is how we learn what to charge agents two, three, and four — and how we build the credibility (real outcomes data, audit logs, a real working relationship) that lets us recruit them.

This is a stronger position than it first appears. Most lead suppliers entering this market guess at a price, charge it, and discover too late whether their leads are worth that price or not. We are choosing to learn the answer before we commit to a price. The cost is low Phase 1 profit. The benefit is calibrated pricing for everything that comes after, and an agent relationship built on honesty rather than on a margin we extract from him before we have proven we deserve it.

**1.2 Real unit economics**

These are the working numbers for the first pilot. They have been re-baselined from v1.0 against multiple Meta CPL benchmark sources covered in Competitive Research Part 8. They should be revisited after the first 50 real leads.

| **Metric**                                        | **Working number**                 | **Notes**                                                                                                                                                                              |
|---------------------------------------------------|------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Realistic CPL band (Meta, financial services)** | \$35–\$50                          | Per WordStream, SuperAds (\$58.70), LeadSync, Focus Digital. Stretch goal \$30 with disciplined targeting and the lookalike seed strategy in Channel Strategy (06).                    |
| **Sale price to agent (Phase 1)**                 | CPL + margin                       | Margin amount is a negotiation point with the agent (see 3.1). Working assumption: small enough to keep us roughly break-even, large enough to cover refunds and operational cost.     |
| **Expected gross margin per lead (Phase 1)**      | Near zero                          | By design. Phase 1 is for calibration, not profit. See 1.1.                                                                                                                            |
| **Starting volume**                               | Target 10/wk (floor 6, ceiling 15) | Capacity model unchanged from v1.0. See Part 3.2.                                                                                                                                      |
| **Weekly ad spend (at \$40 CPL)**                 | ~\$400                             | 10 leads × \$40. Higher than v1.0's \$200 assumption because CPL was re-baselined.                                                                                                     |
| **Phase 1 monthly profit**                        | Approximately break-even           | Deliberate. Profit comes from agents two and three, not from the calibration agent.                                                                                                    |
| **Eventual business at scale (3+ agents)**        | \$15–\$25 margin/lead              | Conditional on a \$20–\$25 gap between agent-reported lead value and CPL. Achievable whether CPL settles at \$35 or \$65 — what matters is value being meaningfully above it. See 1.4. |

The number that determines whether the business works is not Phase 1 monthly profit (we have committed it to be near zero) but the value-to-CPL gap that Phase 1 reveals. If the agent reports \$20–\$25 of value above CPL, post-calibration unit economics work and the business scales linearly with new agents. If the gap is materially smaller, we are in Scenario B (see 1.4). The absolute CPL number affects how easy agent \#2 is to recruit, but does not by itself determine viability.

**1.3 The \$2,000 test: success and failure criteria**

The \$2,000 test budget will produce roughly 40–60 leads at the re-baselined \$35–\$50 CPL band. (V1.0 estimated 80–130 leads; the lower number reflects honest CPL expectations.) That is enough data to validate or invalidate three things, in this order of importance:

**1. Lead quality.** When the agent calls these leads, are they real, reachable, and qualified? This is what we are paying \$2,000 to learn. Everything else is secondary.

**2. The agent's judgment of value.** After he has worked the leads, what does he say they are worth? Not what we hope they are worth — what he, with his close-rate data and his prior supplier comparison, judges them to be worth. This is the pricing intelligence the calibration is for.

**3. CPL stability.** Did Meta let our ads run? Did CPL settle in the working band? Did one ad set dramatically out- or under-perform? This data feeds the lookalike scaling decision in Channel Strategy.

Stop/continue criterion is gap-based, not CPL-based. If after \$2,000 the agent reports leads are worth meaningfully more than CPL (on the order of \$20+ above), we continue and scale. If the gap is small or zero, we stop and reassess regardless of how good or bad CPL itself looks.

**1.4 What the business looks like after Phase 1**

Two scenarios at end of calibration; the data will tell us which we are in.

**Scenario A — gap is healthy (\$20+ above CPL).** Agent reports leads are worth, e.g., \$60 in his hands and CPL has settled at \$40. We have a viable per-lead margin of \$15–\$25 once we move past calibration pricing. We can recruit agent \#2 at, say, \$55/lead with credible data. Each new agent is roughly linear gross margin growth. Phase 2 work begins.

**Scenario B — gap is small or negative.** Agent reports leads are worth \$40 in his hands and CPL is \$40. Or worse, \$35 against \$45 CPL. There is no margin to extract. Options narrow: try harder on conversion (form, copy, audience targeting), try a different acquisition channel (Channel Strategy Part 5), or accept that this niche+channel combination doesn't carry enough margin and pivot. The honest answer for Scenario B is that we close the experiment and apply what we learned to the next attempt — there's no version of this where we power through and it works.

**1.5 Brand structure**

**ADDED V2.1**

The lead engine operates multiple consumer-facing brands under a single operating LLC. Each brand is a distinct landing page (its own domain, copy, qualifying questions, visual identity) running on shared backend infrastructure (one Supabase project, one Twilio account, one Resend account, one suppressions list with cross-brand enforcement).

**Active brands as of v2.1:**

- **Northgate Protection** (mortgage protection) — first brand, currently in dev-environment posture at northgateprotection.vercel.app. The \$2,000 Meta test calibration described in Part 1.3 runs against this brand. All Phase 1 unit economics in Part 1.2 refer to Northgate Protection specifically.

- **Northgate Heritage** (final expense) — second brand, scaffolded as engineering verification of the multi-brand architecture. Live at northgateheritage.vercel.app. Not yet commercial — no ad spend, no paid agent relationship. Decision to commercialize is downstream of Northgate Protection's calibration outcome.

**Cross-brand operational rules.** Suppressions and DNC scrubbing are globally enforced. A user who STOPs from any brand's SMS is suppressed from receiving messages from all brands, and a DNC registry hit blocks contact regardless of which brand surfaced the lead. This is the legally cleanest interpretation of TCPA opt-out semantics under one operating entity.

30-day phone deduplication is scoped per (brand, product), not globally. The same phone number can generate one paid lead per (brand, product) per 30 days; the same person submitting to mortgage protection on Monday and final expense on Wednesday produces two distinct leads, each routed to the agent buying that product. Globally-scoped dedup would silently discard the second submission and waste the ad spend that generated it. See Operations Runbook Part 6.2 for the operational detail.

**Per-brand pricing and unit economics.** The cost-plus calibration model in Part 3.1 applies to whichever brand is in calibration. If both brands eventually run Meta campaigns, each brand calibrates independently with its own buying agent. Heritage's per-product unit economics remain unset until Heritage commercializes.

Future brands slot into the same workspace structure without infrastructure changes. The brand-family naming pattern (Northgate Something) signals shared parent identity to consumers who encounter both brands.

**Part 2 — The offer and positioning**

**2.1 The Phase 1 agent relationship**

The Phase 1 agent is positioned as a research partner. The headline framing is calibration, not sales. We are not extracting margin from him; we are learning from him. This frame governs every other decision — pricing model, refund posture, capacity targets, communication cadence. Operations Runbook (04) Part 2.2 captures the day-to-day cadence; the strategic implication is that we should expect to spend real time on the relationship, not just on the technology.

**2.2 The offer — calibration honesty first, exclusivity second**

V1.0 led the offer with provable exclusivity, treating freshness, verification, and refunds as supporting evidence. That structure remains correct for Phase 2 onward, when we are recruiting new agents who do not yet know us. For Phase 1, the offer is structured differently because we are not selling a finished product to a customer — we are inviting an agent into a calibration partnership.

**The Phase 1 offer to the calibration agent**

**The headline.** Near-cost pricing during a four-week calibration period. The agent pays roughly what the leads cost us to generate, plus a small operational margin to cover refunds and infrastructure. We are not trying to make money on him in this window. We are trying to learn what our leads are actually worth.

**What we ask in return.** Honest, structured feedback. Outcome per lead within 7 days. A 30-minute structured pricing conversation at the end of week 4 (and ideally monthly thereafter). His judgment, with data, of what these leads would be worth on the open market.

**Why this is the right pitch.** An experienced agent has heard every variant of “our exclusive leads are different” and has learned to discount it on first contact. He has not heard “we are not trying to make money on you, we are trying to learn what our leads are worth.” This sounds different because it is different. It removes the standard sales-pitch defense most agents bring to a first conversation.

**The supporting commitments**

*Still apply, but now as proof points within the calibration frame.*

**◆ Provable exclusivity.** Every lead delivered to the agent is sold to nobody else, ever. Not after 6 months. Not after 12. Not in an aged tier. Enforced contractually (pilot agreement), operationally (permanent agent_id in the database), and auditably (on-demand audit log). This is what we will eventually charge market price for once Phase 1 has proven we can deliver it. During calibration, the agent gets it without paying premium for it — part of his consideration for partnering with us early.

**◆ Fresh delivery (within 2 minutes).** SLA: lead delivered to agent within 2 minutes of form submission, with timestamp. Technically trivial via direct SMS. Speed signals freshness; freshness reinforces exclusivity (a 2-minute-old lead has not been worked by anyone else).

**◆ Verified data.** Phone validated and normalized to E.164. Email format validated, MX record checked, disposable domains rejected. Honeypot and timing checks rule out obvious bots. TCPA consent text, timestamp, IP, and user agent captured immutably. If the agent ever has a compliance question, we have the receipt. This protects him as much as it does us.

**◆ Refundable.** If a lead is disconnected, duplicate, fake, or fails qualifying criteria (age, mortgage range, state), we refund or replace within 48 hours. Operationally cheap; rhetorically valuable. Tells the agent we are confident enough in our quality to bet our (already thin) margin on it.

**Part 3 — Pricing and the pilot proposal**

**3.1 Pricing**

**Phase 1 pricing model: cost-plus during calibration.** Sale price to the agent equals our actual cost per lead in the prior week, plus a small operational margin. The margin amount is the most important number in the pilot agreement and is a deliberate negotiation point with the agent, not a number we set unilaterally.

**Why cost-plus, not market-matching**

V1.0 priced at \$40 to match the market. The reasoning was sound — undercutting signals lower quality, premium pricing has no track record to back it, \$40 is what the agent already pays his incumbent. But the reasoning was built on a CPL assumption (\$20–\$25) that turned out to be aspirational. At realistic CPL (\$35–\$50), \$40 sale price gives us either zero margin or negative margin. The model breaks.

Cost-plus solves this and has independent strategic merit:

- **It is honest.** We do not yet know what our leads are worth. Setting a market price implies we do. Cost-plus admits we do not, and proposes to find out together with the agent.

- **It is robust to CPL variance.** If CPL is \$30 in week 2 and \$50 in week 3, the agent pays \$35 then \$55 (assuming a \$5 margin example). Our exposure stays bounded. No week is catastrophic.

- **It removes the agent's sticker-shock objection.** “You pay what we pay, plus a little” is easier to accept than “we matched market price.” The agent does not feel he is being priced as a customer; he feels he is being treated as a partner.

- **It produces the data we need.** The conversation “what are these leads worth to you” is forced, not avoided. After 4 weeks of data, the agent has a basis for a real answer. We use his answer to price agents two and three.

**The margin amount**

Open negotiation point. Both parties have a defensible position; the right answer comes from the conversation.

**Our position.** \$5 floor or 15% of CPL, whichever is greater. Reasoning: covers our refund exposure (~10% of leads at break-even), covers infrastructure cost (~\$1/lead allocation), leaves a small per-lead operational margin to fund the calibration overhead.

**Likely agent counter.** Flat margin (e.g., \$3–\$5) regardless of CPL, on the grounds that he is taking the risk of working leads at unknown quality. Defensible. The flat-margin counter is acceptable; the value of cost-plus is the structure, not the margin amount.

**3.2 Capacity model**

Target 10 leads/week. Floor 6 (under-delivery triggers make-good per pilot agreement section 5). Ceiling 15 (we don't flood the agent; over-delivery beyond ceiling is dropped, not sold to anyone else, ever).

Weeks run Monday 00:00 through Sunday 23:59 in agent's local time zone. Capacity is measured in leads delivered, not leads generated; rejected/duplicate leads do not count toward floor.

**Part 4 — TCPA compliance overview**

Strategic-level overview. Operational details on capture and storage: Technical Reference (02). Operational details on DNC scrubbing, suppression list, calling hours: Operations Runbook (04).

**4.1 Why TCPA matters strategically**

TCPA violations are individually damaging (\$500–\$1,500 per call, statutory) and class-action explosive. Plaintiff law firms actively scan for non-compliant patterns. A single sloppy week can produce more legal exposure than a year of margin can absorb. This is why TCPA compliance is foundational to the entire business model, not a bolt-on.

**4.2 The PEWC standard**

After the FCC's 2025 1:1 rule was struck down, the legal standard reverted to Prior Express Written Consent (PEWC). Operationally this means:

- Explicit consent — clearly worded, unambiguous about what the consumer is agreeing to.

- Written form — checkbox or signature, captured electronically with audit trail.

- Unchecked by default — no pre-checked consent boxes, ever.

- Specific to the contact method — consent to be called and texted at the number provided, by the entity collecting the lead and by their named partners.

- Immutable receipt — full consent text, timestamp, IP, user agent stored in append-only consent_log table per Technical Reference Part 5.

**4.3 Cross-brand consent semantics**

**ADDED V2.1**

Each brand maintains its own CONSENT_TEXT specific to its product (“mortgage protection” vs “final expense”). When a user submits a form, the consent_log row records the exact text shown to that user, the brand they were on, and all the standard timestamp/IP/user-agent metadata. The consent record is brand-specific.

Suppression enforcement, however, is global. A user who STOPs from a Northgate Heritage SMS is suppressed from receiving messages from any current or future brand under the same operating LLC. This is the cleanest TCPA-defensive interpretation: the consumer is opting out of being contacted by the operator, not by the marketing surface. Operations Runbook (04) covers the cross-brand suppression operational rules.

**Part 5 — Agent pitch and pilot agreement**

**5.1 The pitch conversation**

The team member handling the agent relationship will have this conversation. The goal is not to sound like a salesperson — the agent deals with salespeople daily. The goal is to sound like a peer making him an unusual offer.

**Opening**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>OPENING LINE</strong></p>
<p>“You mentioned the leads you've been buying haven't been great — the last batch felt worked over. We've been building something specifically to solve that problem. But honestly, what I want to propose isn't what most lead suppliers come at you with. Can I walk you through it in 10 minutes?”</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

**The pitch — lead with the calibration framing**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>THE HEADLINE (SPEND THE MOST TIME HERE)</strong></p>
<p>“I'm not trying to make money on you in this pilot. I'm trying to figure out what these leads are actually worth, and you're the person who can tell me. Here's the deal: I charge you what these leads cost me to generate plus a small margin to cover refunds and infrastructure — we negotiate the exact margin, but it's small. In exchange, you tell me honestly how they perform, and at the end of 4 weeks we have a real conversation about what they're worth. Then we figure out a long-term price together based on data, not on what I guessed.”</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

**Why this disarms the standard sales-pitch defense.** The agent has heard “our exclusive leads are different” a hundred times. He has never heard “I don't know what to charge you, help me figure it out.” This is more honest than the offers he is used to, and the honesty is the wedge.

**Then the supporting commitments**

*Briefly — as evidence the calibration is worth his time.*

**◆ Provable exclusivity.** “Every lead I send you is sold to nobody else, ever. Not after 6 months, not in an aged tier, not reused. I know that's what every supplier says — here's how I make it provable: each lead has your agent_id permanently attached in the database. You can ask for an audit log any time showing it has never been associated with any other agent.”

**◆ Fresh delivery.** “You get an SMS within 2 minutes of submission, with timestamp. A 2-minute-old lead has not been worked by anyone else — that's why exclusivity actually means something with us.”

**◆ Verified data.** “Phones validated, emails MX-checked, bots filtered. We capture IP, user agent, exact TCPA consent. If you ever have a compliance question, we have the receipt.”

**◆ Refundable.** “If a lead is disconnected, duplicate, fake, or doesn't qualify, we replace free within 48 hours. That's our risk to take, not yours.”

**The numbers**

“4-week calibration pilot. Capacity is target 10 leads per week, with a floor of 6 (below that, we owe you a credit) and a ceiling of 15 (we don't flood you). Pricing is cost-plus: I charge you my actual CPL plus a small margin we agree on. End of week 4 we have a structured pricing conversation based on what you've actually closed.”

**Common objections and responses**

**“Why are you doing this if there's no margin?”** “Honestly, because I need the data more than I need the margin right now. If your leads close at the rate I think they will, I have a real business and can recruit other agents on the back of your numbers. If they don't close, I'd rather find out from you in 4 weeks than spend 6 months pretending the model works.”

**“What if the leads don't close at all?”** “Then we both stop and you've lost only 4 weeks. The pilot agreement lets either of us walk away with a week's notice. But that's also part of why I want this pilot. If they're not closing, I want to know whether it's the leads (my problem) or the pitch (your call). The pricing conversation at end of week 4 is partly about figuring that out.”

**“This sounds like I'm doing you a favor.”** “Kind of, yeah. You are. In return I'm charging you near my cost, giving you provably exclusive leads no one else gets, refunding anything bad, and telling you exactly what they cost me to make. After 4 weeks you'll know whether they're worth more or less than you're paying now — either way you win.”

**5.2 The pilot agreement (one-page template)**

This is not a legal document — have an attorney draft the real version. But something like this works to get agreement:

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p>CALIBRATION PILOT AGREEMENT</p>
<p>Between: [Your Brand LLC] ("Supplier")</p>
<p>And: [Agent Name / Agency] ("Agent")</p>
<p>Date: [date]</p>
<p>1. NATURE OF PILOT. This is a calibration pilot intended to</p>
<p>establish fair pricing for an ongoing lead supply</p>
<p>relationship. Supplier is offering near-cost pricing in</p>
<p>exchange for honest performance feedback. Both parties</p>
<p>acknowledge that final pricing terms are deliberately</p>
<p>deferred to the end of the pilot period.</p>
<p>2. TERM. Four weeks from [start date], terminable by either</p>
<p>party with one week's written notice.</p>
<p>3. CAPACITY MODEL.</p>
<p>- Target: 10 qualified leads per week</p>
<p>- Floor: 6 leads per week (see Section 5 for make-good)</p>
<p>- Ceiling: 15 leads per week</p>
<p>4. PRICE &amp; BILLING. Cost-plus pricing as follows:</p>
<p>- Base: Supplier's actual cost per lead (CPL) for that</p>
<p>calendar week, calculated as ad spend / leads delivered.</p>
<p>- Margin: [TO BE NEGOTIATED — e.g., max($5, 15% of CPL)]</p>
<p>Sale price = Base + Margin, applied per lead. Invoice</p>
<p>issued Friday for that week's deliveries.</p>
<p>5. UNDER-DELIVERY MAKE-GOOD. If fewer than 6 leads are</p>
<p>delivered in a week, Supplier owes Agent: (a) credit,</p>
<p>(b) refund, or (c) free additional leads next week.</p>
<p>6. OVER-DELIVERY HANDLING. Leads beyond ceiling are not</p>
<p>delivered to Agent and are not sold to any third party.</p>
<p>7. EXCLUSIVITY. Each lead delivered to Agent will not be</p>
<p>sold or delivered to any other buyer, ever.</p>
<p>8. LEAD CRITERIA. US homeowners, age 18-75, mortgage</p>
<p>balance $50k-$2M, TCPA-compliant consent.</p>
<p>9. REFUND/REPLACEMENT. Replace within 48 hours any lead</p>
<p>that is: disconnected, duplicate, fake, or off-criteria.</p>
<p>10. OUTCOME REPORTING. Agent provides outcome status per</p>
<p>lead within 7 days: contacted, appointment, sold, dead.</p>
<p>11. PRICING REVIEW. Structured conversation at end of</p>
<p>week 4 to establish market-rate ongoing supply price.</p>
<p>Signed: __________________ __________________</p>
<p>Supplier Agent</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

**Part 6 — Decision log**

**6.1 Active decisions**

Decisions currently in force. Maintained as a table for at-a-glance review during planning.

| **Decision**                                   | **Choice**                                                                                                                       | **Reasoning**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
|------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Pricing strategy (Phase 1)**                 | Cost-plus during calibration                                                                                                     | We do not yet know what our leads are worth; market-matching pretends we do. Cost-plus admits the unknown and produces pricing data. Survives CPL variance without margin collapse.                                                                                                                                                                                                                                                                                                                                                                              |
| **Calibration window**                         | 4 weeks (negotiable to 6)                                                                                                        | Long enough for outcomes to mature; short enough to bound exposure if leads are bad.                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Pricing model post-calibration**             | Market-matching once gap is known                                                                                                | Once we know what leads are worth, we charge market price. Reverses for Phase 2 onward when recruiting agents 2+.                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Offer headline (Phase 1)**                   | Calibration honesty first                                                                                                        | Wedge against agents who have heard “exclusive” pitched at them a hundred times. Provable exclusivity becomes the headline for Phase 2 agent recruitment.                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Offer headline (Phase 2+)**                  | Provable exclusivity                                                                                                             | Industry-wide trust gap; everyone claims it, almost nobody proves it. The wedge once we have calibration data and a reference agent.                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Capacity model**                             | Target 10 / floor 6 / ceiling 15                                                                                                 | Handles natural variance in paid acquisition without breaking the relationship.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Test ad budget**                             | \$2,000                                                                                                                          | Enough to give Meta's algorithm learning data; bounded loss if model fails. Produces ~40–60 leads at re-baselined CPL.                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Tech stack — landing/API**                   | Next.js on Vercel                                                                                                                | Team familiarity; API routes colocated; preview deploys.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Tech stack — database**                      | Supabase (Postgres)                                                                                                              | Auth + RLS + dashboard built in.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Tech stack — SMS**                           | Twilio                                                                                                                           | Mature US coverage; A2P 10DLC support.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Tech stack — email**                         | Resend                                                                                                                           | Better deliverability than Gmail SMTP.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Architecture — domains**                     | Two domains (consumer + platform)                                                                                                | Audience clarity; portfolio risk management; multi-brand optionality.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Build phasing**                              | Phase 1 lead engine, Phase 2 platform                                                                                            | Validate before scaling; avoid premature platform engineering.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Phase 1 admin tooling**                      | Supabase Studio (no custom UI)                                                                                                   | 10 leads/week does not justify a dashboard.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Ad strategy**                                | Landing page (not Meta Instant Forms)                                                                                            | Higher quality leads, better consent capture, supports exclusivity story.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Audience seeding**                           | Aged mortgage filings list as Meta lookalike seed                                                                                | Meta cannot target recent mortgage filers directly. Aged seed list teaches Meta the pattern.                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Pre-launch SAC gate**                        | Required                                                                                                                         | Mortgage protection ads may be classified as Special Ad Category, which would gut targeting and break unit economics.                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **TCPA approach**                              | PEWC standard                                                                                                                    | Current law after 2025 1:1 rule strikedown. Requires explicit unchecked consent + immutable receipt.                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Use of purchased data**                      | Meta lookalike seeding only; no direct outreach                                                                                  | TCPA prohibits phone outreach without consent. Email destroys deliverability. Direct mail is the only legal direct-outreach channel.                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Brand structure (added v2.1)**               | Northgate brand family with multiple consumer-facing product lines under one operating LLC                                       | Audience overlap between mortgage protection (homeowners 30-65) and final expense (50-75) is real; same agent profile sells both. Brand family lets us share infrastructure (Supabase, Twilio, Resend, attorney engagement) while presenting product-specific landing pages.                                                                                                                                                                                                                                                                                     |
| **Second brand identity (added v2.1)**         | Northgate Heritage (final expense), parallel naming to Northgate Protection. Engineering verification only — not yet commercial. | Validates multi-brand workspace structure with a real second app rather than a stub. Final expense pairs with mortgage protection in the target agent's book of business. Commercial commitment for Heritage is downstream of NP's \$2k Meta test outcome.                                                                                                                                                                                                                                                                                                       |
| **Marketing creative production (added v2.1)** | AI-generated imagery and video as primary ad creative path                                                                       | Direct-response testing requires creative variant volume that traditional photo/video production cannot deliver at \$2k test budget. Meta requires AI-disclosure label since March 2026; small grey “AI Info” tag, roughly neutral CTR/conversion impact in available data with possible slight downside in older audience segments. C2PA-compliant tools (Adobe Firefly, DALL-E) preferred for automated disclosure. Real photography not categorically excluded — commissioned for specific cases (e.g., Heritage's Hearth visual direction for hero imagery). |

**6.2 Superseded decisions (kept for the record)**

Decisions that were active in v1.0 of this document but were revised. Kept here so the reasoning trail is preserved.

| **Decision**                   | **v1.0 choice**                 | **v2.0 choice**                       | **Why changed**                                                                                    |
|--------------------------------|---------------------------------|---------------------------------------|----------------------------------------------------------------------------------------------------|
| **Pricing strategy (Phase 1)** | Match market at \$40            | Cost-plus during 4-week calibration   | CPL re-baseline showed \$40 sale at \$40 CPL = zero margin. Cost-plus is honest about the unknown. |
| **CPL working assumption**     | \$20–\$25 target, stop at \$35+ | \$35–\$50 working band, stop at \$70+ | v1.0 assumption was below realistic Meta financial-services benchmarks.                            |
| **Phase 1 profit target**      | \$800–\$1,000/month             | Approximately break-even              | At realistic CPL, target was unachievable without extracting margin from the calibration agent.    |
| **Offer headline (Phase 1)**   | Provable exclusivity            | Calibration honesty                   | Calibration framing matches what Phase 1 actually is. Exclusivity moves to Phase 2+.               |

*End of Strategy & Offer*