Mortgage Protection Lead Engine

**Operations Runbook**

*Phase 1 operations, feedback loops, TCPA operational details*

v1.0 \| April 2026

Target market: United States

**About this document**

The everyday playbook: how to operate the lead engine without a custom admin UI, how to track quality, what to do when things break, and what compliance routines need to run on schedule. This document will be updated frequently once the business is operating.

# Contents

Part 1 — Operating Phase 1 without an admin UI

Part 2 — Daily, weekly, and ongoing rhythms

Part 3 — The agent feedback loop

Part 4 — Quality metrics and KPIs

Part 5 — TCPA operational details

Part 6 — When something breaks

Part 7 — Scaling triggers

# How to use this document

This document is one of four reference documents that together describe the Mortgage Protection Lead Engine business. It is intended primarily as AI context — Claude (in the project) and Claude Code (during build) read these documents to maintain shared understanding across conversations.

The four documents:

- **Strategy & Offer —** the why of the business: economics, positioning, agent pitch, decision log

- **Technical Reference —** the how of the system: architecture, landing page, form/API/DB, integrations, code refs

- **Build Plan —** the when of execution: Phase 1 sequence, Phase 2 roadmap, Meta Ads launch

- **Operations Runbook —** the daily/weekly operating playbook once leads are flowing

Some content (notably TCPA, capacity model, unit economics) appears in more than one document at different levels of detail. This is intentional — each document should be self-contained for its audience.

Treat newer information from chat conversations as superseding older information here. The team will periodically update these documents to reflect decisions made in conversation.

# Part 1 — Operating Phase 1 without an admin UI

## 1.1 The principle

Phase 1 ships with no custom admin dashboard. The team operates the lead engine using Supabase's built-in Studio table editor and direct communication with the agent. This is intentional — it saves at least a week of build work, and it ensures Phase 2 features are built based on observed pain rather than guessed pain.

Lead delivery itself is fully automated from day one. "Manual" here means "no fancy dashboard yet," not "no automation." Every speed-to-lead promise in the offer is mechanically guaranteed by the form handler — the agent gets an SMS within seconds of every submission, regardless of whether anyone is awake or checking the system.

## 1.2 What's automated in Phase 1

- Form submission → server-side validation, intent scoring, DB insert

- DB insert → SMS to agent (Twilio) within seconds

- DB insert → welcome email to lead (Resend)

- DB insert → Meta Conversions API event

- Inbound STOP → suppression list insert (Twilio webhook)

- Daily DNC registry refresh (cron)

## 1.3 What's manual in Phase 1

- Viewing leads — open Supabase Studio, navigate to leads table

- Updating status — agent texts outcomes; team clicks cells in Studio

- Refund decisions — agent texts "replace lead X"; team reviews

- Weekly invoicing — count delivered leads, send via normal payment tool

- Agent feedback collection — text/call once a week, ask what they think

## 1.4 Why Supabase Studio is enough

Supabase ships a full-featured table editor in their dashboard:

- Filter by any column (status, state, date, temperature)

- Sort by any column

- Inline-edit cells — type new status, hit enter, persisted

- Export filtered rows to CSV

- Add multiple team members with different access levels

For 10–40 leads/week with one agent, this is genuinely sufficient. Ugly, but it works, and using it teaches exactly which views and shortcuts to build into the Phase 2 platform.

**Resist the temptation:** Phase 1 is exciting to build. The desire to add "just a small dashboard" is strong. Resist. The more time on UI before leads are flowing, the longer until the business validates.

# Part 2 — Daily, weekly, and ongoing rhythms

## 2.1 Daily rhythm (15 minutes)

- Check Meta Ads Manager for yesterday's CPL, spend, any ad disapprovals

- Open Supabase Studio; confirm overnight leads look normal (no spam spike, no broken data)

- Check Twilio logs for any failed SMS

- Check Vercel/Supabase logs for /api/leads errors

- If anything broke, fix it; if not, close the laptop

## 2.2 Weekly rhythm (1 hour)

- Review week's CPL trend; decide creative or audience changes

- Call or message the agent; review their leads; get specific feedback on quality

- Tune form/landing page based on agent feedback (e.g., "too many leads under 30 — narrow age")

- Refund/replace any bad leads per pilot agreement

- Send weekly invoice; record metrics in a simple notes file

## 2.3 Per-lead handling

### Each new lead (mostly automated)

1.  Form submission triggers SMS to agent within 30 seconds (automated)

2.  Welcome email arrives in lead's inbox within 30 seconds (automated)

3.  Team receives a copy of the SMS or an email alert (set this up — useful for first weeks)

4.  If anything fails: check Supabase logs and Twilio console; fix and re-fire manually if needed

### Each agent feedback message (manual)

5.  Agent texts: "Lead L0023 sold" or "L0019 disconnected, replace please"

6.  Open Supabase Studio, find row, update status field

7.  If refund: review intent score, contact info, consent_log entry. If valid claim, update status to refunded and queue replacement.

8.  Reply to agent confirming

### Weekly review (30 minutes)

9.  Filter Supabase Studio: leads created in past 7 days

10. Count by status — sold, contacted, dead, refunded

11. Calculate week's revenue (sold × \$40)

12. Send invoice via normal payment tool

13. Pull Meta ad spend; compare to leads count → CPL

14. Text agent: "How was this week? Anything I should change?"

## 2.4 Capacity tracking through the week

With the capacity model (target 10, floor 6, ceiling 15), pace matters. A simple guide:

- Wednesday: should be at 50–60% of weekly target. If at 20%, address immediately, not at end of week.

- Friday: should be at 80%. If trending toward ceiling-breach, reduce ad budget for the weekend.

- Sunday: actuals reviewed. Below floor → make-good owed. Over ceiling → not delivered to agent.

Keep a running spreadsheet or simple text file: target, current count, days remaining, projected end-of-week.

# Part 3 — The agent feedback loop

This is the most important operational process. Without it, you fly blind on quality. Make it dead simple — agents won't fill out complicated forms.

## 3.1 Phase 1 implementation (manual, fine for one agent)

- Agent texts the team with outcome per lead within 24 hours of call attempt

- Outcomes: reached / voicemail / not interested / appointment booked / sold / fake / duplicate / disconnected

- Team updates the lead's status, outcome, notes columns in Supabase Studio

- Once a week, summarize: how many of each outcome, any patterns

## 3.2 Phase 2 implementation (automated, when scaling)

- One-field-at-a-time form, accessible from a link in each SMS alert

- Fields: Lead ID (pre-filled from link), Outcome (dropdown), optional one-line note

- Data syncs to lead_events table

- Weekly quality report auto-generated

## 3.3 What to look for

- Fake/duplicate rate over 5%: bot protection is leaking, or audience is wrong

- Disconnected rate over 10%: phone validation too permissive, or ad attracting low-commitment clicks

- Not interested rate over 60%: copy/expectation mismatch — leads expect different product than agent sells

- Appointment booking rate under 15%: lead quality genuinely low, OR agent underperforming — compare to pre-pilot benchmark

# Part 4 — Quality metrics and KPIs

| **Metric**                           | **Target**                | **What it means if off**                      |
|--------------------------------------|---------------------------|-----------------------------------------------|
| Reach rate (answered within 3 tries) | Above 60%                 | Phone validation or timing issue              |
| Appointment rate (of reached)        | Above 35%                 | Qualification weak or expectations mismatched |
| Close rate (of appointments)         | Above 20%                 | Mostly the agent, not you                     |
| Refund rate (of delivered leads)     | Under 5%                  | Funnel leaking bad leads                      |
| CPL (cost per lead)                  | Under \$25                | Ads creative or targeting issue               |
| Week-over-week lead volume           | Steady or up              | Ad fatigue or audience exhaustion             |
| Capacity hit rate                    | Target 10/wk consistently | Adjust ad budget toward target                |

## 4.1 Where to track

Phase 1: a simple Google Sheet or text file. Columns: week, leads delivered, ad spend, CPL, sold, refunded, revenue, profit. Update once weekly.

Phase 2 (later): build into the platform when it's worth the engineering time.

# Part 5 — TCPA operational details

**Strategic vs operational:** TCPA strategy and consent language are in Strategy & Offer Part 4. This section covers the operational mechanics: DNC scrubbing, suppression handling, calling hours, retention.

## 5.1 DNC (Do Not Call) scrubbing

The National DNC Registry is administered by the FTC.

15. Subscribe at telemarketing.donotcall.gov; pay subscription fee (~\$60–\$100/year for small operations)

16. Download current list; update at least monthly

17. Before any call or text: check phone number is NOT on DNC. If it is, agent cannot contact.

18. Implementation: daily cron job downloads updated DNC file, ingests to dnc_registry table, checks new leads at insertion time

19. Flag DNC hits on the lead record — do not deliver to agent

Exception: explicit form consent supersedes DNC for your specific calls. But best practice (and a lawyer conversation) is to honor DNC anyway to avoid disputes.

## 5.2 Internal suppression list

Anyone who revokes consent (replies STOP, says "do not call me," emails to opt out) goes on the suppression list immediately.

- suppressions table: phone_e164, email, reason, suppressed_at

- Every new form submission checked against suppression list. Match → accept submission silently, do not notify agent.

- Honor suppression forever — no "cooling off" that un-suppresses someone

## 5.3 Calling hours

TCPA and state laws restrict calling times. Baseline: telemarketing only 8:00 AM to 9:00 PM in recipient's local time zone. Some states stricter.

- Infer recipient time zone from state (sufficient for TCPA)

- If a lead in Eastern time submits at 10pm their time, agent should call next morning — not immediately

- Display lead's local time zone prominently in the SMS alert

## 5.4 Record retention

Consent records: 5 years minimum (FTC TSR). Implementation:

- consent_log table is append-only; never UPDATE or DELETE

- If lead requests deletion, mark a flag rather than deleting consent record (legal obligation to retain proof)

- Lead PII can be deleted on request; consent receipt cannot

## 5.5 Lead transfer to the agent

When delivering a lead to the agent, you're transferring data under the consent the consumer gave.

- Consent language must name the entity calling (your brand and licensed agents)

- Written data-processing agreement with the agent: what they can do with the data, retention, their own DNC and revocation duties

- If a lead revokes consent after transfer, you and the agent must both stop contacting them; you can't rely on the agent alone

# Part 6 — When something breaks

Common failure modes and first actions:

## 6.1 Ads disapproved

- Read rejection reason carefully; don't appeal immediately

- Fix the specific issue (usually copy or image), relaunch

- Multiple rejections in a week → account restrictions

## 6.2 CPL suddenly doubles

- Check ad frequency (creative fatigue) and audience saturation

- Rotate creatives; pause underperforming ad sets

- If still high after 48 hours, pause everything and review targeting

## 6.3 Leads stop coming in

- Check Pixel/CAPI in Events Manager — both events firing?

- Check Supabase connection — recent inserts?

- Check Vercel deployment — site live?

- Submit a test form yourself end-to-end

- Usually one of these is the culprit

## 6.4 SMS not arriving

- Check Twilio console for errors (A2P registration, account suspension, balance)

- Check the SMS watchdog cron is running and catching missed sends

- Verify AGENT_PHONE_NUMBER env var is correct E.164

- Test by submitting a lead yourself

## 6.5 Agent stops responding

- Address immediately — single-agent pilots are fragile

- Don't wait a week to follow up

- Have a backup agent conversation active at all times for resilience

## 6.6 Compliance issue (DNC complaint, unsubscribe complaint)

- Pause relevant activity immediately

- Investigate: was consent properly captured? Was DNC checked?

- Document the investigation

- Fix the root cause; resume only after fix is verified

- If serious, consult attorney before resuming

# Part 7 — Scaling triggers

## 7.1 When to scale ad spend

After 4 weeks of stable operations with metrics in range:

- Propose increasing weekly volume with current agent (target 20-25/week, ceiling 25-30)

- Increase ad spend proportionally (~\$150-200/week additional)

- Continue stop/continue criteria checks at each scaling step

## 7.2 When to add a second agent

- Generating consistently above current agent's ceiling for 2+ weeks

- Current agent doesn't want more volume

- OR Phase 1 is operational and adding revenue capacity makes sense

Adding agent \#2 is the trigger to begin Phase 2 platform work — manual SMS-and-text-back doesn't scale to two.

## 7.3 When to refresh creatives

- Frequency above 3.0 in Meta Ads Manager

- CTR drops 30% from baseline

- CPL trending up week-over-week without explanation

- Plan: have new creative variants ready by week 6 — current ones will fatigue around week 6-8

## 7.4 When to add a second brand

- Current brand at scale (\$5k+/month spend with stable CPL)

- OR current brand under threat of Meta ban

- OR identifying a different consumer segment that needs different messaging

Second brand is a separate landing page and ad account, but feeds the same Supabase and same agent platform.

*— End of Operations Runbook —*
