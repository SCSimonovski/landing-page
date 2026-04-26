Mortgage Protection Lead Engine

**Build Plan**

*Phase 1 sequence, Phase 2 roadmap, Meta Ads launch*

v1.0 \| April 2026

Target market: United States

**About this document**

The when of execution: what to build in what order, when to launch ads, when to graduate from Phase 1 to Phase 2. This document is most useful pre-launch and during the first weeks of operation. After Phase 1 stabilizes, sections become historical context.

# Contents

Part 1 — Phase 1 build plan: weeks 1-4

Part 2 — Meta Ads setup and the \$2,000 test

Part 3 — Phase 2 platform roadmap

Part 4 — What NOT to build

# How to use this document

This document is one of four reference documents that together describe the Mortgage Protection Lead Engine business. It is intended primarily as AI context — Claude (in the project) and Claude Code (during build) read these documents to maintain shared understanding across conversations.

The four documents:

- **Strategy & Offer —** the why of the business: economics, positioning, agent pitch, decision log

- **Technical Reference —** the how of the system: architecture, landing page, form/API/DB, integrations, code refs

- **Build Plan —** the when of execution: Phase 1 sequence, Phase 2 roadmap, Meta Ads launch

- **Operations Runbook —** the daily/weekly operating playbook once leads are flowing

Some content (notably TCPA, capacity model, unit economics) appears in more than one document at different levels of detail. This is intentional — each document should be self-contained for its audience.

Treat newer information from chat conversations as superseding older information here. The team will periodically update these documents to reflect decisions made in conversation.

# Part 1 — Phase 1 build plan: weeks 1-4

Goal of Phase 1: a live consumer-facing landing page on its own domain, with automated lead delivery to one agent. Operated using Supabase Studio as the admin interface (see Operations Runbook). Estimated 4 weeks of part-time work split across the team.

## Week 1 — Domain, infrastructure, skeleton

### Setup

- Register both domains: consumer brand and platform brand. 2-year registration, WHOIS privacy on both.

- Set up Google Workspace or Fastmail on the consumer domain; create admin@, hello@, role addresses

- Configure SPF, DKIM, DMARC on consumer domain (also on platform domain — set up once now)

- Create Supabase project; run initial SQL migrations for leads, consent_log, agents, lead_events, suppressions, dnc_registry

- Enable RLS on all tables; write initial policies (server-only writes for Phase 1)

### Bootstrap

- Create Next.js app on consumer domain with TypeScript and Tailwind

- Set up Vercel project; link to git repo; verify domain

- Add Supabase client (server + browser); verify connection

- Build landing page skeleton — HTML structure, basic styles, placeholder content

- Deploy to Vercel; verify the site loads on mobile

## Week 2 — Form, API, notifications

### Form + API

- Build multi-step form (field list in Technical Reference Part 3.1) as client component

- Client-side validation, progressive disclosure, mobile-optimized

- Write /api/leads endpoint: validation, honeypot, intent scoring, DB insert, consent_log insert

- Wrap insert in transaction; insert lead_events row for 'created'

- Basic error handling; return success/error responses

### Notifications

- Set up Twilio account; register A2P 10DLC; buy a phone number

- Integrate Twilio SDK in the form handler; send SMS on successful lead

- Set up Resend account; verify the consumer domain

- Write welcome email template; integrate Resend in the handler

### Copy and legal

- Write final landing page copy (headline, sub, FAQs, footer)

- Draft privacy policy and ToS (or generate with Termly); publish on /privacy and /terms

- End-to-end test: submit form on mobile, verify SMS arrives within 30 seconds, welcome email lands, DB record exists

## Week 3 — Meta tracking and compliance

### Meta integration

- Set up Meta Business Manager, Facebook Page, Pixel, CAPI dataset

- Verify both consumer domain and platform domain in Business Manager

- Install Pixel on landing page (next/script in layout)

- Implement CAPI Lead event in form handler with event_id deduplication

- Verify both events in Meta Test Events; confirm dedup working

### Compliance

- Subscribe to National DNC Registry

- Build DNC ingest job (daily cron): download list, upsert to dnc_registry table

- Implement DNC check in form handler; flag matched leads, skip SMS

- Build suppression handling: accept STOP replies via Twilio webhook; insert to suppressions

- Legal review: have attorney review consent language, privacy policy, terms

## Week 4 — Testing, agent pitch, soft launch

### Final hardening

- End-to-end testing: real submissions on real devices, verify all paths

- Set up error alerting (Vercel notifications to email or Slack)

- Set up the SMS watchdog cron

- Verify Supabase Studio access for the team

### Agent pitch

- Pitch the agent using the pilot proposal (Strategy & Offer Part 5)

- Negotiate terms: target 10/week (floor 6, ceiling 15), \$40/lead, 4-week pilot, refund + make-good

- Get signed pilot agreement; insert agent record in DB

### Launch

- Prepare ad creatives (3 variations per ad set)

- Configure Meta campaign (Leads objective, 2-3 ad sets, \$75/day each)

- Launch on low daily budget (\$50/day) for first 24 hours — sanity check

- Scale to full \$140-150/day once first real leads flow through

## Week 5+ — Operate and learn

- Daily check-ins (15 min) — see Operations Runbook

- Weekly review with agent — see Operations Runbook

- Evaluate against stop/continue criteria after \$2,000 spent (~day 14)

- If continuing: raise volume, add lookalike audience, track CPL trend

- If stopping: postmortem

- Phase 2 work begins in the background — but only after Phase 1 is genuinely operational

# Part 2 — Meta Ads setup and the \$2,000 test

## 2.1 Account structure

1.  Create Meta Business Manager

2.  Create ad account, Facebook Page (real page with real content), Pixel, CAPI dataset

3.  Add team members as admins; keep separate from personal Facebook profiles

4.  Link payment method; start with low daily cap (\$150/day) to avoid surprise billing

5.  Submit Business Verification for meaningful spend; unverified accounts get spending caps

**Protect the account:** Meta bans happen and are hard to appeal. Use a dedicated Facebook profile (not your primary) as admin. Enable 2FA. Never manage ads from a VPN or while traveling abroad — both look like account compromise.

## 2.2 Special ad categories

Meta classifies Credit, Employment, Housing, Social Issues, and Elections as Special Ad Categories with restricted targeting. Life insurance, including mortgage protection, is generally NOT in these categories — but verify before launch:

- Check current Meta Special Ad Categories docs at launch time

- If reclassified into Credit or Housing, granular targeting is lost — adjust the campaign plan

- Even if not Special Ad Category, insurance ads face stricter content review

## 2.3 Campaign structure for the \$2,000 test

- Single campaign. Objective: Leads.

- Budget: \$2,000 total over 14 days = ~\$143/day

- Split into 3 ad sets, each ~\$48/day

| **Ad set**          | **Audience**                                                | **Rationale**                       |
|---------------------|-------------------------------------------------------------|-------------------------------------|
| Broad               | US, age 30–60, homeowner interests                          | Algorithm prefers broad; often wins |
| Interest            | Above + interests in mortgages, home buying, life insurance | Tighter signal; may convert higher  |
| Lookalike (week 2+) | 1% LAL from past lead data (need 100+ leads)                | Only viable after first week        |

Week 1 with no lead data: run Broad and Interest only (\$75/day each). Week 2 onward: add Lookalike.

## 2.4 Creatives

3 creatives per ad set, mixing formats so the algorithm can pick winners.

- **Static image —** Real US family photo, benefit-led headline overlay. Text under 20% of image.

- **Short video —** 15-second vertical (9:16) with captions. Concept: homeowner walking into their house, voiceover about protection. End with soft CTA card.

- **Carousel —** 3-4 cards showing how it works. Simple illustrations.

### What NOT to do in creatives

- No stock-photo families — looks fake, converts poorly, Meta flags

- No specific dollar amounts — compliance landmine

- No fear imagery (hospital beds, funerals, crying children) — will be rejected

- No false urgency — policy violation

- No medical/health imagery — triggers additional review

## 2.5 Pixel and CAPI verification before launch

6.  Install Meta Pixel on landing page

7.  Verify PageView and Lead events fire in Test Events

8.  Submit a test form; confirm Lead arrives via both Pixel and CAPI; "Deduplicated" appears

9.  Once events verify, remove META_TEST_EVENT_CODE env var and launch

## 2.6 Budget allocation over 14 days

| **Day(s)** | **Action**                                             | **Spent so far** |
|------------|--------------------------------------------------------|------------------|
| 1–2        | Launch, monitor for approval, let algorithm start      | \$300            |
| 3–5        | First kill decisions: pause worst-performing creatives | \$750            |
| 6–7        | If lookalike viable with new data, add it              | \$1,000          |
| 8–10       | Scale toward winning ad set, reduce losers             | \$1,400          |
| 11–14      | Stability period — avoid changes, gather data          | \$2,000          |

**Do not change things daily:** Meta's algorithm needs ~3 days of stable spend per ad set to learn. Daily changes reset learning and waste money. Make changes in discrete windows — day 3, day 5, day 10.

## 2.7 Metrics to watch

- CPL: target under \$25. Acceptable up to \$30 in week 1.

- CTR: target above 1.5%. Below 1% = creative is weak.

- Landing page view rate (views ÷ clicks): target above 85%

- Form completion rate (submissions ÷ views): target above 15%

- Frequency: above 3.0 = creative fatigue. Rotate creatives.

# Part 3 — Phase 2 platform roadmap

## 3.1 Goal of Phase 2

Phase 2 produces an agent-facing platform on a separate domain. Agents log in, see their assigned leads, mark outcomes, request refunds, and (eventually) self-onboard. Same Supabase as Phase 1, with RLS enforcing per-agent isolation.

Phase 2 has no fixed deadline. It runs as a background project alongside Phase 1 operations. Build incrementally based on observed needs.

## 3.2 When Phase 2 begins

Phase 2 work starts when at least one is true:

- Manual status updates in Supabase Studio exceed 30 minutes per week

- The agent specifically asks to log in and update statuses themselves

- A second agent enters the picture and the manual model doesn't scale

- 30+ days of stable Phase 1 operations with consistent revenue

## 3.3 Build philosophy

- **Agent-driven priorities.** Build features the agent has explicitly asked for. Don't build what you imagine might be useful.

- **Incremental, not big-bang.** Each version ships when it adds value. v0.1 is a lead list with status updates — that's it. v0.2 adds the next thing.

- **Same Supabase, separate Next.js app.** Run as a second Vercel project on the platform domain. Both apps point at the same database. RLS enforces who sees what.

- **Build well, not fast.** No deadline pressure. Refactor when structure feels off. This is the place to enjoy work.

## 3.4 Versioned roadmap

### v0.1 — Agent self-service status updates

Trigger: agent asks for it, OR \> 30 min/week on manual updates.

- Magic link login for agents (Supabase Auth)

- List view: agent's assigned leads, newest first, key fields

- Click a lead → detail view with status dropdown and notes textarea

- Save updates the lead row (RLS enforces own-leads-only)

- Mobile-friendly — agent uses from phone

Most valuable feature in the whole roadmap because it removes manual work from both sides.

### v0.2 — Refund/replacement workflow

Trigger: refunds frequent enough that text-based handling is annoying.

- "Request refund" button on each lead detail page

- Reason dropdown (disconnected / duplicate / fake / off-criteria)

- Sets status to 'refund_requested'; team reviews

- Approval triggers credit toward next batch invoice

### v0.3 — Search, filters, basic counts

Trigger: lead volume per agent makes the simple list unwieldy.

- Search by name or phone

- Filter by status, date range

- Top strip: this week's lead count, status breakdown

### v0.4 — Invoicing and payment

Trigger: weekly manual invoicing gets old.

- Auto-generated weekly invoice (leads delivered minus refunds)

- Stripe or similar for direct payment

- Payment history visible to agent

### v0.5 — Agent self-signup and onboarding

Trigger: talking to agent \#3 and manual onboarding is friction.

- Public sign-up form for prospective agents

- Information capture: name, license states, license numbers, contact

- Manual approval; on approval, agent gets access

- Optional: lead preferences (states wanted, max volume per week)

### v1.0 — Real platform

Trigger: 5+ active agents, multiple consumer brands feeding the platform.

- Multi-agent lead routing (round-robin, preferences, exclusivity rules)

- Per-agent analytics (close rate, avg policy value, week-over-week)

- Operator dashboard for the team

- API for advanced agents who want programmatic access

## 3.5 What never to build

- Microservices, queues, separate auth services — Next.js + Supabase scales fine

- Mobile apps — mobile-friendly web is enough

- Real-time chat with agents — text or email is fine

- Marketplace features — you are the supplier

- Anything that smells like "build a CRM" — agents have CRMs; you feed them leads

**Phase 2 discipline:** The platform tempts over-engineering because it's enjoyable to build. Discipline: every feature must be tied to a specific agent request or specific operational pain you've felt. If you can't name the agent or the friction, don't build it yet.

# Part 4 — What NOT to build during Phase 1

These features are deliberately deferred to Phase 2 or beyond. Resist the temptation; ship the lead engine first.

- Custom admin dashboard — Supabase Studio is the admin UI for Phase 1

- Agent self-service login — agent texts outcomes; team updates Supabase manually

- Multi-agent routing logic — there's one agent

- Lead nurture sequences beyond the welcome email — focus on reach rate first

- Charts, attribution dashboards, cohort analysis — manual numbers are fine

- Automated refund processing — manual review of flagged leads is sufficient

- Mobile app, Slack integration, calendar booking — distractions

Reasoning: every hour spent on UI before leads are flowing is an hour the business hasn't validated. The lead engine is the test of whether the model works. Everything else is premature.

*— End of Build Plan —*
