**NORTHGATE LEAD ENGINE**

**Operations Runbook**

*Phase 1 operations, feedback loops, TCPA operational details*

**Version 2.1 · May 2026 · Target market: United States**

**About this document**

The everyday playbook: how to operate the lead engine without a custom admin UI, how to track quality, what to do when things break, and what compliance routines need to run on schedule. This document will be updated frequently once the business is operating.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>VERSION 2.1 NOTE</strong></p>
<p>Adds operational rules for the multi-brand setup that landed in May 2026: the 5-place env-var update rule, cross-brand suppression and DNC enforcement semantics, the Twilio webhook attribution gap (one shared number, both brands), Heritage hero photography as firm SAC blocker before any paid Heritage ads, and the weekly mpl-dev junk lead volume check. The original Phase 1 operational rhythms in Parts 1–4 remain accurate — they apply per brand. No content from v1.0 is superseded.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

**Contents**

**Part 1** Operating Phase 1 without an admin UI

**Part 2** Daily, weekly, and ongoing rhythms

**Part 3** The agent feedback loop

**Part 4** Quality metrics and KPIs

**Part 5** TCPA operational details

**Part 6** Multi-brand operations (added v2.1)

**Part 7** When something breaks

**Part 8** Scaling triggers

**How to use this document**

This document is one of six reference documents that together describe the Northgate lead engine business. It is intended primarily as AI context — Claude (in the project) and Claude Code (during build) read these documents to maintain shared understanding across conversations.

The reference documents:

- **Strategy & Offer** — the why of the business: economics, positioning, agent pitch, decision log

- **Technical Reference** — the how of the system: architecture, landing page, form/API/DB, integrations, code refs

- **Build Plan** — the when of execution: Phase 1 sequence, Phase 2 roadmap, Meta Ads launch

- **Operations Runbook** — the daily/weekly operating playbook once leads are flowing

- **Competitive Research** — what other operators do, market benchmarks, channel comparisons

- **Channel Strategy** — acquisition channels, hybrid Meta + offline-data play, Phase 2+ second channels

Some content (notably TCPA, capacity model, unit economics) appears in more than one document at different levels of detail. This is intentional — each document should be self-contained for its audience.

Treat newer information from chat conversations as superseding older information here. The team will periodically update these documents to reflect decisions made in conversation.

**Part 1 — Operating Phase 1 without an admin UI**

**1.1 The principle**

Phase 1 ships with no custom admin dashboard. The team operates the lead engine using Supabase's built-in Studio table editor and direct communication with the agent. This is intentional — it saves at least a week of build work, and it ensures Phase 2 features are built based on observed pain rather than guessed pain.

Lead delivery itself is fully automated from day one. “Manual” here means “no fancy dashboard yet,” not “no automation.” Every speed-to-lead promise in the offer is mechanically guaranteed by the form handler — the agent gets an SMS within seconds of every submission, regardless of whether anyone is awake or checking the system.

**1.2 What's automated in Phase 1**

- Form submission → server-side validation, intent scoring, DB insert

- DB insert → SMS to agent (Twilio) within seconds

- DB insert → welcome email to lead (Resend)

- DB insert → Meta Conversions API event

- Inbound STOP → suppression list insert (Twilio webhook)

- Daily DNC registry refresh (cron)

**1.3 What's manual in Phase 1**

- Viewing leads — open Supabase Studio, navigate to leads table

- Updating status — agent texts outcomes; team clicks cells in Studio

- Refund decisions — agent texts “replace lead X”; team reviews

- Weekly invoicing — count delivered leads, send via normal payment tool

- Agent feedback collection — text/call once a week, ask what they think

**1.4 Why Supabase Studio is enough**

Supabase ships a full-featured table editor in their dashboard:

- Filter by any column (status, state, date, temperature, brand, product)

- Sort by any column

- Inline-edit cells — type new status, hit enter, persisted

- Export filtered rows to CSV

- Add multiple team members with different access levels

For 10–40 leads/week with one agent, this is genuinely sufficient. Ugly, but it works, and using it teaches exactly which views and shortcuts to build into the Phase 2 platform.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>RESIST THE TEMPTATION</strong></p>
<p>Phase 1 is exciting to build. The desire to add “just a small dashboard” is strong. Resist. The more time on UI before leads are flowing, the longer until the business validates.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

**Part 2 — Daily, weekly, and ongoing rhythms**

**2.1 Daily rhythm (15 minutes)**

- Check Meta Ads Manager for yesterday's CPL, spend, any ad disapprovals

- Open Supabase Studio; confirm overnight leads look normal (no spam spike, no broken data)

- Check Twilio logs for any failed SMS

- Check Vercel/Supabase logs for /api/leads errors

- If anything broke, fix it; if not, close the laptop

**2.2 Weekly rhythm (1 hour)**

- Review week's CPL trend; decide creative or audience changes

- Call or message the agent; review their leads; get specific feedback on quality

- Tune form/landing page based on agent feedback (e.g., “too many leads under 30 — narrow age”)

- Refund/replace any bad leads per pilot agreement

- Send weekly invoice; record metrics in a simple notes file

- **(Added v2.1)** Junk lead volume check on mpl-dev: filter leads table for honeypot triggers, MX-failed emails, suppressed-phone hits in last 7 days. Spike means bot protection is leaking or audience targeting wrong; act this week, not next.

**2.3 Per-lead handling**

**Each new lead (mostly automated)**

1.  Form submission triggers SMS to agent within 30 seconds (automated)

2.  Welcome email arrives in lead's inbox within 30 seconds (automated)

3.  Team receives a copy of the SMS or an email alert (set this up — useful for first weeks)

4.  If anything fails: check Supabase logs and Twilio console; fix and re-fire manually if needed

**Each agent feedback message (manual)**

5.  Agent texts: “Lead L0023 sold” or “L0019 disconnected, replace please”

6.  Open Supabase Studio, find row, update status field

7.  If refund: review intent score, contact info, consent_log entry. If valid claim, update status to refunded and queue replacement.

8.  Reply to agent confirming

**Weekly review (30 minutes)**

9.  Filter Supabase Studio: leads created in past 7 days

10. Count by status — sold, contacted, dead, refunded

11. Calculate week's revenue (sold × sale price)

12. Send invoice via normal payment tool

13. Pull Meta ad spend; compare to leads count → CPL

14. Text agent: “How was this week? Anything I should change?”

**2.4 Capacity tracking through the week**

With the capacity model (target 10, floor 6, ceiling 15), pace matters. A simple guide:

- **Wednesday:** should be at 50–60% of weekly target. If at 20%, address immediately, not at end of week.

- **Friday:** should be at 80%. If trending toward ceiling-breach, reduce ad budget for the weekend.

- **Sunday:** actuals reviewed. Below floor → make-good owed. Over ceiling → not delivered to agent.

Keep a running spreadsheet or simple text file: target, current count, days remaining, projected end-of-week.

**Part 3 — The agent feedback loop**

This is the most important operational process. Without it, you fly blind on quality. Make it dead simple — agents won't fill out complicated forms.

**3.1 Phase 1 implementation (manual, fine for one agent)**

- Agent texts the team with outcome per lead within 24 hours of call attempt

- Outcomes: reached / voicemail / not interested / appointment booked / sold / fake / duplicate / disconnected

- Team updates the lead's status, outcome, notes columns in Supabase Studio

- Once a week, summarize: how many of each outcome, any patterns

**3.2 Phase 2 implementation (automated, when scaling)**

- One-field-at-a-time form, accessible from a link in each SMS alert

- Fields: Lead ID (pre-filled from link), Outcome (dropdown), optional one-line note

- Data syncs to lead_events table

- Weekly quality report auto-generated

**3.3 What to look for**

- **Fake/duplicate rate over 5%:** bot protection is leaking, or audience is wrong

- **Disconnected rate over 10%:** phone validation too permissive, or ad attracting low-commitment clicks

- **Not interested rate over 60%:** copy/expectation mismatch — leads expect different product than agent sells

- **Appointment booking rate under 15%:** lead quality genuinely low, OR agent underperforming — compare to pre-pilot benchmark

**Part 4 — Quality metrics and KPIs**

| **Metric**                               | **Target**                | **What it means if off**                                               |
|------------------------------------------|---------------------------|------------------------------------------------------------------------|
| **Reach rate (answered within 3 tries)** | Above 60%                 | Phone validation or timing issue                                       |
| **Appointment rate (of reached)**        | Above 35%                 | Qualification weak or expectations mismatched                          |
| **Close rate (of appointments)**         | Above 20%                 | Mostly the agent, not you                                              |
| **Refund rate (of delivered leads)**     | Under 5%                  | Funnel leaking bad leads                                               |
| **CPL (cost per lead)**                  | \$35–\$50 working band    | Above \$50 sustained means lookalike not delivering. See Strategy 1.3. |
| **Week-over-week lead volume**           | Steady or up              | Ad fatigue or audience exhaustion                                      |
| **Capacity hit rate**                    | Target 10/wk consistently | Adjust ad budget toward target                                         |

**4.1 Where to track**

Phase 1: a simple Google Sheet or text file. Columns: week, leads delivered, ad spend, CPL, sold, refunded, revenue, profit. Update once weekly.

Phase 2 (later): build into the platform when it's worth the engineering time.

**Part 5 — TCPA operational details**

**Strategic vs operational:** TCPA strategy and consent language are in Strategy & Offer Part 4. This section covers the operational mechanics: DNC scrubbing, suppression handling, calling hours, retention.

**5.1 DNC (Do Not Call) scrubbing**

The National DNC Registry is administered by the FTC.

15. Subscribe at telemarketing.donotcall.gov; pay subscription fee (~\$60–\$100/year for small operations)

16. Download current list; update at least monthly

17. Before any call or text: check phone number is NOT on DNC. If it is, agent cannot contact.

18. Implementation: daily cron job downloads updated DNC file, ingests to dnc_registry table, checks new leads at insertion time

19. Flag DNC hits on the lead record — do not deliver to agent

Exception: explicit form consent supersedes DNC for your specific calls. But best practice (and a lawyer conversation) is to honor DNC anyway to avoid disputes.

**5.2 Internal suppression list**

Anyone who revokes consent (replies STOP, says “do not call me,” emails to opt out) goes on the suppression list immediately.

- suppressions table: phone_e164, email, reason, suppressed_at, source_brand

- Every new form submission checked against suppression list. Match → accept submission silently, do not notify agent.

- Honor suppression forever — no “cooling off” that un-suppresses someone

- **(Updated v2.1)** Suppression enforcement is global across all Northgate brands. A STOP from a Northgate Heritage SMS suppresses the user from any current or future Northgate brand. See Part 6.2 for full cross-brand semantics.

**5.3 Calling hours**

TCPA and state laws restrict calling times. Baseline: telemarketing only 8:00 AM to 9:00 PM in recipient's local time zone. Some states stricter.

- Infer recipient time zone from state (sufficient for TCPA)

- If a lead in Eastern time submits at 10pm their time, agent should call next morning — not immediately

- Display lead's local time zone prominently in the SMS alert

**5.4 Record retention**

Consent records: 5 years minimum (FTC TSR). Implementation:

- consent_log table is append-only; never UPDATE or DELETE

- If lead requests deletion, mark a flag rather than deleting consent record (legal obligation to retain proof)

- Lead PII can be deleted on request; consent receipt cannot

**5.5 Lead transfer to the agent**

When delivering a lead to the agent, you're transferring data under the consent the consumer gave.

- Consent language must name the entity calling (your brand and licensed agents)

- Written data-processing agreement with the agent: what they can do with the data, retention, their own DNC and revocation duties

- If a lead revokes consent after transfer, you and the agent must both stop contacting them; you can't rely on the agent alone

**Part 6 — Multi-brand operations**

**ADDED V2.1**

The Northgate lead engine operates multiple consumer-facing brands under one operating LLC (Strategy 1.5). Most operational rules in Parts 1–5 apply per brand identically. The rules in this section are the ones that change shape because there's more than one brand.

**6.1 The 5-place env-var update rule**

Adding a new env var or rotating a secret requires updates in five places:

20. Repo root .env.local (workspace-level shared values)

21. apps/northgate-protection/.env.local

22. apps/northgate-heritage/.env.local

23. Northgate Protection Vercel project dashboard (Settings → Environment Variables)

24. Northgate Heritage Vercel project dashboard (Settings → Environment Variables)

Most env vars are intentionally identical across all five locations (Supabase URL/keys, Twilio credentials, Resend key, Upstash credentials — these are shared infrastructure). Some are intentionally different per project:

- **NEXT_PUBLIC_SITE_URL** — different per brand. NP uses northgateprotection.vercel.app; Heritage uses northgateheritage.vercel.app.

- **HEALTH_CHECK_SECRET** — rotate fresh per project. Never reuse across brands; cross-brand secret reuse means a leak in one brand exposes the other.

- **AGENT_PHONE_NUMBER** — may differ if a different agent buys each brand's leads. Same value if same agent buys both.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>OPERATIONAL DISCIPLINE</strong></p>
<p>Vercel env-var changes do NOT auto-redeploy. After updating values in the dashboard, manually trigger a redeploy on the affected project. Order matters during rotations: update Vercel envs AFTER code is merged that uses the new value, OR rotate to a backwards-compatible value first if the rotation must precede the code change. Standard hygiene: keep a password manager entry per secret listing all 5 locations.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

The repo's pnpm verify-envs script catches drift between the three local .env.local files. It cannot detect Vercel-side drift; that's manual hygiene.

**6.2 Cross-brand suppression and DNC; per-(brand, product) dedup**

Suppression and DNC enforcement are global across all Northgate brands. 30-day phone deduplication is scoped per (brand, product). The split reflects what each rule actually protects:

- Suppressions protect the consumer's revocation. An opt-out from any brand's SMS is an opt-out from being contacted by the operator (the LLC), not by the marketing surface. Honoring it globally is the TCPA-defensive read.

- DNC scrubbing protects the operator from contacting numbers on the federal registry, full stop. A DNC hit blocks contact regardless of which brand surfaced the lead.

- Dedup protects the agent who's paying for the lead from being sold the same product intent twice. A cross-brand submission isn't a resubmission — it's a different product intent, often paid for by a different agent or for a different book of business. Treating it as a duplicate silently throws away the second ad spend and hides the new intent from the buying agent.

**Operational implications:**

- A user who submits the Northgate Protection form and later replies STOP to the SMS gets suppressed from the global suppressions list, and will be silently rejected if they later submit either the Northgate Heritage form or any future brand's form.

- DNC registry hits block contact regardless of which brand the lead came from.

- 30-day phone dedup is keyed on (phone, brand, product). Same phone + same brand + same product within 30 days = silently treated as a duplicate of the original lead (existing lead id returned, duplicate_attempt event written, no new row, no second notification to the agent). Same phone + different product within 30 days = a new lead, even within the same brand. Same phone + same product but different brand within 30 days = also a new lead — fresh ad spend, separate consent flow, separate attribution.

- Keying on (brand, product) rather than product alone future-proofs the rule along both axes: if either brand later runs more than one product, each product's 30-day window is independent within that brand; if two brands ever surface the same product, each brand's window is independent too.

- The suppressions table has an informational source_brand column (which brand triggered the original STOP). Enforcement does not consult this column — it's diagnostic only.

**6.3 Twilio webhook attribution gap**

Both Northgate brands share a single Twilio phone number (TWILIO_FROM_NUMBER) for outbound SMS. This is a deliberate choice: A2P 10DLC registration is paperwork-intensive (~2–6 weeks per number) and the second registration is deferred until volume justifies it. The trade-off is an attribution gap on inbound STOPs.

**How the attribution gap works:**

- All STOP replies hit the same Twilio webhook (currently configured on Northgate Protection's /api/twilio/incoming endpoint).

- The webhook records source_brand='northgate-protection' on the suppression row, regardless of which brand actually sent the SMS that triggered the STOP.

- The source_brand on suppressions is informational — enforcement is global anyway (Part 6.2), so the attribution doesn't affect what gets blocked.

- If accurate attribution is ever needed (e.g., for a TCPA dispute), the authoritative source is Twilio's API message log, which records the actual from-number, to-number, and timestamp of every message.

When Heritage commercializes and volume justifies a second 10DLC registration, the webhook is duplicated to Heritage's app and source_brand attribution becomes accurate. Until then, the gap stands and Twilio's logs are the source of truth for compliance disputes.

**6.4 Heritage hero photography — firm SAC blocker**

Northgate Heritage's landing page currently uses an AI-generated hero image (workshop scene with grandfather and grandchild). For engineering verification this is acceptable; for paid ad spend, it is not.

**The blocker:**

- Heritage cannot run paid Meta ads while the hero is AI-generated, because the Hearth visual direction was specified as expecting commissioned photography (a quality gate distinct from the AI-marketing-creative strategy in Strategy 6.1).

- This is a firm gate, not a watch-item: the equivalent gate for Northgate Protection (Meridian arch motif vs photography) is a watch-item we'd revise based on conversion data; Heritage's gate is set.

- Replacement requires either a real commissioned photo shoot or a high-quality stock photo licensed for use. The current AI image is a placeholder.

- Heritage local dev and preview URLs continue to use the placeholder. The blocker only applies to paid ad campaigns.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>OPERATIONAL REMINDER</strong></p>
<p>Before any Heritage Meta campaign launches, the team must have replaced the placeholder hero with commissioned or licensed photography matching the Hearth visual direction. AGENTS.md § 9 launch checklist tracks this as a hard gate.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

**6.5 Per-brand operational distinctions**

Most operations are brand-agnostic (the daily/weekly rhythms, the agent feedback loop, quality metrics). A few are explicitly per-brand:

| **Operation**                   | **Per-brand or shared?** | **Notes**                                                                                                                                                   |
|---------------------------------|--------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Lead delivery automation**    | Per-brand                | Each app has its own /api/leads route. Routing by brand+product happens in shared dispatcher modules (Tech Ref Part 2.4).                                   |
| **Agent SMS dispatch**          | Per-brand template       | MP LEAD prefix for NP, FE LEAD prefix for Heritage. Same Twilio number sends both.                                                                          |
| **Welcome email**               | Per-brand template       | Mortgage protection wording for NP, final expense wording for Heritage. Same Resend account, same sending domain (until Heritage gets its own from-domain). |
| **Consent text snapshot**       | Per-brand                | Each brand's CONSENT_TEXT is captured per submission in consent_log. Both brands currently at v1-draft pending attorney pass.                               |
| **Suppressions, DNC**           | Global (all brands)      | Cross-brand enforcement per Part 6.2.                                                                                                                       |
| **30-day phone dedup**          | Per (brand, product)     | Keyed on (phone, brand, product). Different product = new lead even within the same brand; different brand = new lead even for the same product. Per Part 6.2. |
| **Vercel deploy**               | Per-project              | Each brand has its own Vercel project. Env-var changes follow the 5-place rule (Part 6.1).                                                                  |
| **Pilot agreement and pricing** | Per-brand                | Each brand calibrates with its own buying agent, with its own pilot agreement and cost-plus margin negotiation.                                             |
| **Meta Pixel and CAPI**         | Per-brand                | Each brand will get its own Meta Pixel ID and CAPI access token when Meta integration lands. Currently empty in both Vercel projects.                       |

**Part 7 — When something breaks**

Common failure modes and first actions:

**7.1 Ads disapproved**

- Read rejection reason carefully; don't appeal immediately

- Fix the specific issue (usually copy or image), relaunch

- Multiple rejections in a week → account restrictions

**7.2 CPL suddenly doubles**

- Check ad frequency (creative fatigue) and audience saturation

- Rotate creatives; pause underperforming ad sets

- If still high after 48 hours, pause everything and review targeting

**7.3 Leads stop coming in**

- Check Pixel/CAPI in Events Manager — both events firing?

- Check Supabase connection — recent inserts?

- Check Vercel deployment — site live?

- Submit a test form yourself end-to-end

- Usually one of these is the culprit

**7.4 SMS not arriving**

- Check Twilio console for errors (A2P registration, account suspension, balance)

- Check the SMS watchdog cron is running and catching missed sends

- Verify AGENT_PHONE_NUMBER env var is correct E.164 in the affected brand's project

- Test by submitting a lead yourself

- **(Added v2.1)** If outbound SMS to US numbers is silently dropped at the carrier with error 30034, A2P 10DLC registration is incomplete. This is a known paperwork-blocked state until LLC is formed and the 10DLC application is submitted.

**7.5 Agent stops responding**

- Address immediately — single-agent pilots are fragile

- Don't wait a week to follow up

- Have a backup agent conversation active at all times for resilience

**7.6 Compliance issue (DNC complaint, unsubscribe complaint)**

- Pause relevant activity immediately

- Investigate: was consent properly captured? Was DNC checked?

- For STOP-related disputes: pull Twilio API message log for authoritative attribution (Part 6.3)

- Document the investigation

- Fix the root cause; resume only after fix is verified

- If serious, consult attorney before resuming

**7.7 Env-var drift between local and Vercel**

**ADDED V2.1**

- Symptom: code works locally but fails in production with “missing env” errors, OR a rotated secret only takes effect on one of the two brands

- Run pnpm verify-envs locally to confirm the three .env.local files are aligned

- Manually compare against both Vercel project dashboards (this is the gap verify-envs cannot catch)

- Use the password manager entry for the affected secret to confirm all 5 locations have the intended value

**Part 8 — Scaling triggers**

**8.1 When to scale ad spend**

After 4 weeks of stable operations with metrics in range:

- Propose increasing weekly volume with current agent (target 20-25/week, ceiling 25-30)

- Increase ad spend proportionally (~\$150-200/week additional)

- Continue stop/continue criteria checks at each scaling step

**8.2 When to add a second agent**

- Generating consistently above current agent's ceiling for 2+ weeks

- Current agent doesn't want more volume

- OR Phase 1 is operational and adding revenue capacity makes sense

Adding agent \#2 is the trigger to begin Phase 2 platform work — manual SMS-and-text-back doesn't scale to two.

**8.3 When to refresh creatives**

- Frequency above 3.0 in Meta Ads Manager

- CTR drops 30% from baseline

- CPL trending up week-over-week without explanation

- Plan: have new creative variants ready by week 6 — current ones will fatigue around week 6-8

**8.4 When to commercialize the second brand**

**ADDED V2.1**

Northgate Heritage exists today as engineering verification only. The decision to commercialize Heritage (allocate ad budget, sign a buying agent, run real campaigns) is gated on:

- Northgate Protection's \$2k Meta test has completed and produced healthy unit economics (Strategy 1.4 Scenario A)

- Heritage hero photography blocker is resolved (Part 6.4)

- Heritage A2P 10DLC paperwork either complete or volume justifies running on shared NP number under documented attribution gap (Part 6.3)

- A buying agent who sells final expense (different from NP's mortgage protection agent, OR same agent with FE appointment) is identified and the calibration pitch tested

Until those are in place, Heritage remains in engineering verification — the codebase is real, the landing page is real, but no money is being spent on it.

**8.5 When to add a third brand**

- At least one of the existing brands has produced 90+ days of stable, profitable operations

- A clear product fit and audience exists for the third brand (not speculative — backed by either competitive research or agent demand)

- The 5-place env-var rule becomes a 7-place rule and the team has bandwidth for that operational overhead

The architecture supports more brands without infrastructure changes (Strategy 1.5). The discipline against premature brand expansion is the same as the discipline against premature platform engineering: validate before scaling.

*End of Operations Runbook*