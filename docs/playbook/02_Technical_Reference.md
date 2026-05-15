Mortgage Protection Lead Engine

**Technical Reference**

*Architecture, landing page, form/API/DB, integrations, code refs*

v1.0  |  April 2026

Target market: United States

**About this document**

The how of the system: what we build, with what tools, in what shape. This document is the source of truth for technical decisions and the input context for Claude Code during implementation. It changes as we build and learn.

# Contents

Part 1 — System architecture (two-domain, two-phase)

Part 2 — Landing page

Part 3 — Form, API, database, and consent capture

Part 4 — Notifications, automation, and ad attribution

Part 5 — Code references and SQL schema

# How to use this document

This document is one of four reference documents that together describe the Mortgage Protection Lead Engine business. It is intended primarily as AI context — Claude (in the project) and Claude Code (during build) read these documents to maintain shared understanding across conversations.

The four documents:

- **Strategy & Offer — **the why of the business: economics, positioning, agent pitch, decision log
- **Technical Reference — **the how of the system: architecture, landing page, form/API/DB, integrations, code refs
- **Build Plan — **the when of execution: Phase 1 sequence, Phase 2 roadmap, Meta Ads launch
- **Operations Runbook — **the daily/weekly operating playbook once leads are flowing
  Some content (notably TCPA, capacity model, unit economics) appears in more than one document at different levels of detail. This is intentional — each document should be self-contained for its audience.

Treat newer information from chat conversations as superseding older information here. The team will periodically update these documents to reflect decisions made in conversation.

# Part 1 — System architecture (two-domain, two-phase)

## 1.0 The shape of the business

The business has two surfaces facing two different audiences:

- **Consumer surface — **the landing page that converts Meta ad traffic into lead submissions. Audience: homeowners. Goal: capture qualified leads and consent.
- **Agent surface — **the platform where buying agents log in, see their leads, mark outcomes, request refunds, and (eventually) self-onboard. Audience: licensed insurance agents. Goal: deliver leads efficiently and scale to many agents.
  These two surfaces live on separate domains and (eventually) become separate Next.js applications sharing one Supabase database.

### Phase 1 vs Phase 2

|  | **Phase 1 (now)** | **Phase 2 (gradual, after Phase 1 ships)** |
|---|---|---|
| Domain | Consumer brand domain | Platform domain |
| What ships | Landing page + form + automated lead delivery | Agent login → see own leads → mark outcomes → expand |
| Admin tooling | Supabase Studio table editor | Custom Next.js app with auth, RLS, proper UI |
| Hosting | Single Next.js app on Vercel | Second Next.js app on Vercel, same Supabase |
| Goal | Validate unit economics, prove agent will buy | Scale to multiple agents, reduce manual ops |
| Time pressure | High — needed before any revenue | Low — built when bandwidth allows |

## 1.1 Why two domains

- **Audience clarity — **Consumer marketing copy and B2B platform copy break each other if mixed on one site. The consumer must never see the words "lead generation" or anything implying their data will be sold.
- **Portfolio risk management — **Meta bans happen. If the consumer brand gets blocked at the domain level, the agent platform on a separate domain is unaffected.
- **Multi-brand optionality — **A future second consumer brand can feed into the same agent platform without architectural change.
- **SEO and search-trust — **Consumers searching for the consumer brand see a consumer-facing site; agents see a B2B platform.
- **Compliance separation — **The consumer brand collects consent. The platform delivers leads. Cleaner audit/disclosure boundaries.

## 1.2 What to register and when

Both domains registered together, even though Phase 2 won't be built for weeks or months. Domain age improves Meta's trust slightly and protects against name-squatters.

- **Consumer brand — **Neutral, trust-flavored, sounds like a financial services brand. Avoid anything that names lead generation, marketing, or ads.
- **Platform brand — **Different name, different identity. Should not give away the link to the consumer brand.
  Park the platform domain on a simple holding page. Configure SPF, DKIM, DMARC records on it now. Verify it in Meta Business Manager. Forget about it until Phase 2.

## 1.3 Continuity and risk

| **Block type** | **What happens** | **Recovery** |
|---|---|---|
| Meta ad account ban | Can't run ads; site still works | Appeal (30–50% success); use backup ad account |
| Meta domain ban | Nobody can advertise to your domain on Meta | Difficult — usually means abandoning the domain |
| Registrar takedown | Domain offline globally | Days to fix, sometimes never |
| Vercel suspension | Site offline until redeployed elsewhere | Hours — redeploy to another host |

### Defenses

- **Keep code, data, and integrations under operating LLC, not the consumer brand. **Twilio, Resend, Supabase, code repo — all owned by the operating company. Consumer brand is just a domain + landing page + ad account; everything else is portable.
- **Have a backup-brand runbook, not a backup domain. **Domain registration is instant. What matters is having a written plan: if the primary consumer brand goes down, register a new neutral-trust name, configure DNS and auth records, swap env vars, stand up a clone within 24-48 hours.
- **Keep the platform domain separate from the consumer brand. **If consumer goes down, agent platform survives. Data, agent relationships, revenue infrastructure stay intact.
- **Keep the landing page squeaky clean. **Most domain bans are earned through repeat policy violations — fake testimonials, specific price claims, fear imagery, prohibited language.
- **Use a dedicated Facebook profile as ad account admin. **If Meta bans the admin profile, the personal Facebook is unaffected.

## 1.4 Technical pipeline

```
PHASE 1 — Lead engine (consumer domain)
 
Meta Ad (Facebook/Instagram)
```

↓  (click)

```
Landing Page  (Next.js on Vercel — consumer domain)
```

↓  (form submit, POST /api/leads)

```
Form API route
```

├──→ Validate  (zod schema, regex, honeypot, timing)

├──→ Enrich    (IP geo, user agent parse)

├──→ Insert    (Supabase Postgres: leads + consent_log)

├──→ Notify    (Twilio SMS → agent, Resend email → lead)

└──→ Track     (Meta Conversions API → Lead event)

```
 
Operator (team)
```

↓ logs in via supabase.com dashboard

```
Supabase Studio (built-in table editor — no UI to build)
 
 
PHASE 2 — Agent platform (platform domain, future)
 
Agent
```

↓

```
Platform App  (Next.js on Vercel — platform domain)
```

↓ Supabase Auth (magic link)

```
Supabase  (RLS: agent sees own leads only)
```

↑ same database as Phase 1

## 1.5 Tech stack rationale

| **Component** | **Choice** | **Alternative** | **Why this choice** |
|---|---|---|---|
| Landing page | Next.js on Vercel | Astro | API routes colocated, one deploy, familiar stack |
| Database | Supabase (Postgres) | Neon, PlanetScale | Auth + RLS + dashboard built in; team has used it |
| SMS | Twilio | MessageBird | Mature US coverage, simple SDK, DNC add-ons |
| Email | Resend | Postmark | Good deliverability, clean DX, free tier fits scale |
| Ad tracking | Meta CAPI (server) | Pixel only | iOS/privacy changes gutted pixel-only tracking |
| Analytics | Plausible or Umami | Google Analytics | Faster, privacy-friendly, no cookie banner needed |
| Hosting | Vercel | Railway, Fly | Zero config for Next.js, preview deploys for A/B |

## 1.6 Environments

Keep it simple. Staging is unnecessary for a solo operation of this size.

- Local dev: Next.js dev server + dev Supabase project
- Preview: Vercel auto-preview per branch, dev Supabase
- Production: Vercel main branch, production Supabase, production Twilio + Resend

## 1.7 Environment variables

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=     # server-only, never expose to client
 
# Twilio (agent SMS)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=            # purchased US long-code or toll-free
AGENT_PHONE_NUMBER=            # destination for alerts
 
# Resend (transactional email)
RESEND_API_KEY=
FROM_EMAIL=hello@yourdomain.com
 
# Meta Conversions API
META_PIXEL_ID=
META_CAPI_ACCESS_TOKEN=
META_TEST_EVENT_CODE=          # test only, remove in prod
 
# App
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
ADMIN_ALLOWED_EMAILS=team@yourdomain.com  # Phase 2 platform app only
```

## 1.8 Security model

- All lead data writes go through the server (API route), never directly from client to Supabase
- Supabase Row Level Security (RLS) enabled on every table from day one
- Service role key used only in server code, never shipped to browser
- Rate limiting on /api/leads — max 3 submissions per IP per hour
- Honeypot field + submission-time check (under 3 seconds = bot) on the form
- All consent-capture data stored in a separate immutable table (consent_log) — never updated or deleted, only inserted

# Part 2 — Landing page

## 2.1 The one job

The landing page has one purpose: convert Meta ad traffic into a form submission. Not to educate, not to rank on Google, not to build brand. Every element either supports that conversion or it gets cut.

Meta traffic is mobile (85%+), impatient (bounce if not engaged in 3 seconds), and cold (never heard of you). The page must work in that context.

## 2.2 Page structure

### Above the fold

- **Headline — **One line, 6–10 words. Benefit-driven, not clever.
- **Sub-headline — **Qualifying line.
- **Primary CTA button — **Scrolls to the form or opens it inline.
- **Trust bar (optional) — **Small row below CTA: "Licensed agents" · "No obligation" · "Takes 60 seconds."

### Below the fold

- **How it works — **Three numbered steps with icons.
- **The form — **Inline, not popup. See Part 3 for field spec.
- **Social proof — **Real testimonials with first name, city, age. Skip rather than fabricate.
- **FAQ — **Four or five common objections.
- **Footer — **Privacy policy link, terms link, company legal name, contact email, California Privacy Notice.

## 2.3 Copy direction

- 8th-grade reading level. Short sentences. Active voice.
- Frame positively: "protect your family" not "don't leave them in debt"
- Avoid specific price claims ("$12/month"). Use ranges or "personalized" instead.
- No guarantees ("guaranteed approval"). Compliance landmines.
- Avoid the word "free" near insurance product references — Meta flags it.
- Don't imply false urgency.

## 2.4 Mobile-first requirements

- Design and test at 375px width (iPhone) first
- Tap targets minimum 44×44px
- Form fields 16px font minimum (smaller triggers iOS zoom)
- Hero video (if any) under 5 seconds, silent autoplay, loops
- Page weight under 500KB on first paint; AVIF/WebP via next/image
- Core Web Vitals: LCP < 2.5s, CLS < 0.1, INP < 200ms

## 2.5 Build notes

- Next.js App Router. Page is a server component; form is a client component.
- Tailwind for styling. shadcn/ui is overkill for a single page.
- next/font for typography (Inter); no external font CDNs
- next/image for image optimization; real photos beat stock by ~20%
- Accessibility: proper label tags, aria-live for form errors, semantic HTML

## 2.6 A/B testing

Multiple Vercel preview deployments, each at a distinct URL, distributed via different ad creatives. Variables worth testing one at a time:

- Headline (benefit-led vs question-led vs outcome-led)
- Hero image (family photo vs house photo vs document/illustration)
- Form length (4 fields vs 10 fields)
- CTA button text
  Don't test until at least 500 page visits per variation — below that, results are noise.

# Part 3 — Form, API, database, and consent capture

## 3.1 Form fields

| **#** | **Field** | **Type** | **Purpose** |
|---|---|---|---|
| 1 | Mortgage balance | Slider $50k–$1M | Qualification + intent score |
| 2 | Age | Number 18–75 | Qualification |
| 3 | Are you a smoker? | Yes/No | Pricing signal for agent |
| 4 | Homeowner? | Yes/No | Must be Yes to submit |
| 5 | State | US state dropdown | Agent licensing check |
| 6 | First name | Text | Contact |
| 7 | Last name | Text | Contact + duplicate check |
| 8 | Phone number | Tel, US format | Primary contact channel |
| 9 | Email | Email | Backup + welcome email |
| 10 | Best time to call | Morning/afternoon/evening | Agent efficiency |
| 11 | TCPA consent | Checkbox, required | Legal basis for agent to call |

**Progressive disclosure: **Show questions one at a time on mobile. First question (the slider) is easy and mildly fun. Contact fields come last, after the lead has invested 30 seconds. Reduces abandonment by 30–40%.

## 3.2 Validation

Validate twice: client-side for UX, server-side for security.

- **Phone — **libphonenumber-js, normalize to E.164. Reject invalid or non-US.
- **Email — **Format regex + server-side MX lookup. Reject disposable domains.
- **State — **One of 50 + DC. Reject territories unless agent is licensed.
- **Age — **Integer 18–75.
- **Balance — **Integer 50,000–2,000,000.
- **Names — **Reject obvious garbage with simple heuristic.

## 3.3 Bot protection

1. Honeypot field: hidden input named "website". If filled, silently reject (200 response, do not insert).
2. Submission time check: form_loaded_at to submit delta. Under 3 seconds = reject.
3. Rate limiting: Vercel built-in or Upstash Redis. 3 submissions per IP per hour.
   Do NOT use CAPTCHA. Friction costs conversions; the three layers above catch 99% of bots without affecting real users.

## 3.4 Database schema

### Table: leads

One row per form submission. Primary business data.

- id (uuid, primary key)
- created_at (timestamptz, default now())
- first_name, last_name (text)
- phone_e164 (text, validated E.164) — 30-day per (brand, product) dedup enforced in /api/leads (not at DB layer)
- email (text, lowercased)
- state (char(2))
- mortgage_balance (integer)
- age (integer)
- is_smoker, is_homeowner (boolean)
- best_time_to_call (enum: morning, afternoon, evening)
- intent_score (integer, computed at insert)
- temperature (enum: hot, warm, cold)
- status (enum: new, contacted, appointment, sold, dead, refunded)
- agent_id (uuid, fk to agents)
- first_contact_at, outcome, policy_value, notes (nullable)
- utm_source, utm_campaign, utm_adset, utm_creative (nullable)
- fbclid, fbc, fbp (nullable) — Meta CAPI matching
- landing_page_variant (nullable) — A/B attribution

### Table: consent_log

Append-only. Never updated, never deleted. Separate from leads (5+ year retention under FTC TSR).

- id, lead_id (fk), created_at
- consent_text (full snapshot, not a reference)
- ip_address (inet)
- user_agent, page_url
- form_version (track changes over time)

### Table: agents

- id, email (unique, maps to Supabase Auth), full_name
- license_states (text[])
- active (boolean), created_at

### Table: lead_events

Audit log per lead. Useful for debugging and Phase 2 timeline view.

- id, lead_id, event_type (enum), event_data (jsonb), created_at

## 3.5 Row Level Security policies

- **leads — **SELECT: admin unconditional, agent only their rows. INSERT: service role only. UPDATE: admin, agent (limited fields).
- **consent_log — **INSERT only via service role. SELECT admin only. No UPDATE, no DELETE, ever.
- **agents — **SELECT own row for agents; full access for admin.
- **lead_events — **INSERT via service role. SELECT mirrors leads policy.

## 3.6 The form submission API endpoint

POST /api/leads — single endpoint that does everything. Responsibilities in order:

4. Parse and validate the JSON body against zod schema
5. Check honeypot and submission time; silently reject if bot
6. Check rate limit for IP
7. Server validation: normalize phone, verify email MX, check state, check ranges
8. Compute intent score and temperature
9. Begin DB transaction: INSERT leads + consent_log + lead_events('created')
10. Commit. If fails, return 500 generic error.
11. Fire-and-forget: Twilio SMS, Resend email, Meta CAPI
12. Return 200 with thank-you payload
    Keep handler under 200 lines. Extract validation, notification dispatch, CAPI into separate modules.

## 3.7 Intent score logic

```typescript
function computeIntentScore(lead) {
  let score = 0;
  // Mortgage balance (single biggest signal)
  if (lead.mortgage_balance >= 500000) score += 40;
  else if (lead.mortgage_balance >= 250000) score += 30;
  else if (lead.mortgage_balance >= 100000) score += 20;
  else score += 10;
  // Age (sweet spot 30-50)
  if (lead.age >= 30 && lead.age <= 50) score += 25;
  else if (lead.age >= 51 && lead.age <= 65) score += 15;
  else score += 5;
  // Health signals
  if (!lead.is_smoker) score += 15;
  // Intent signals
  if (lead.best_time_to_call === 'morning') score += 5;
  // Completeness
  if (lead.phone_e164 && lead.email) score += 5;
  return score;  // max 90, practical range 15-85
}
 
function computeTemperature(score) {
  if (score >= 70) return 'hot';
  if (score >= 50) return 'warm';
  return 'cold';
}
```

# Part 4 — Notifications, automation, and ad attribution

## 4.1 Three parallel integrations

On lead submission, three things happen concurrently. All fire-and-forget — if any fails, lead is still saved and user still sees success. Errors logged and retried asynchronously.

- SMS to agent (Twilio) — competitive differentiator. Sub-2-minute delivery.
- Welcome email to lead (Resend) — sets expectations, reduces friction
- Meta Conversions API event (Lead) — feeds Meta's algorithm for better optimization

## 4.2 Twilio SMS

### Setup

13. Create Twilio account; verify payment
14. Buy a US phone number (local long-code cheaper, toll-free better for A2P)
15. Register A2P 10DLC for production SMS to US numbers (3–7 days approval)
16. Store credentials in env vars; use Twilio Node SDK

### Message format

```
🔥 NEW {temperature} LEAD
{firstName} {lastName}, age {age}
{state} — mortgage ${mortgage_balance}
Call: {phone}
Score: {intent_score}/90
 
Best time: {best_time_to_call}
Submitted: {created_at}
 
https://yourdomain.com/admin/leads/{id}
```

Typical lead fits in 2 SMS segments (~$0.015 per lead).

## 4.3 Resend email

### Setup

17. Create Resend account; verify domain (SPF, DKIM, Return-Path CNAME)
18. Create API key with send scope
19. Default From address: hello@yourdomain.com

### Welcome email

Subject: "Your mortgage protection quote is on its way, {firstName}"

```
Hi {firstName},
 
Thanks for requesting a mortgage protection quote.
 
One of our licensed agents will call you shortly from a US
number to talk through options tailored to your mortgage.
 
The call takes 10-15 minutes. There's no obligation, no
pressure, and no medical exam required for an initial quote.
 
If you'd prefer a different time, just reply to this email.
 
Talk soon,
{YourName}
{BrandName}
 
---
Privacy policy: [link]. Reply STOP to any text or
'unsubscribe' here to opt out.
```

## 4.4 Meta Conversions API (CAPI)

iOS 14.5 and ongoing privacy changes mean browser pixel alone captures ~50-70% of conversions on iPhone traffic. Server-side CAPI recovers most of that and gives Meta better optimization data.

### Setup

20. In Meta Events Manager, create dataset
21. Generate CAPI access token; store in env vars
22. Install Meta JS Pixel on landing page (alongside CAPI)
23. Use event_id on both pixel and server events to deduplicate
24. On submission, send Lead event server-side with hashed user data, event_id, event_time, IP, UA, fbc/fbp
25. Use Test Events tab during dev. Remove META_TEST_EVENT_CODE before launch.

### Event shape

```
POST https://graph.facebook.com/v18.0/{PIXEL_ID}/events?access_token={TOKEN}
{
  "data": [{
    "event_name": "Lead",
    "event_time": unix_timestamp,
    "event_id": "<same id used in client pixel>",
    "action_source": "website",
    "event_source_url": "https://yourdomain.com/",
    "user_data": {
      "em": [sha256(lead.email.toLowerCase().trim())],
      "ph": [sha256(lead.phone_e164.replace('+',''))],
      "client_ip_address": ip,
      "client_user_agent": ua,
      "fbc": fbc, "fbp": fbp
    },
    "custom_data": { "value": 40, "currency": "USD" }
  }]
}
```

**Why include the $40 value: **Meta's optimization algorithm can bid on "Value" not just "Leads." Telling it each lead is worth $40 lets it find cheaper high-value leads over time. Free optimization — do not skip.

## 4.5 Retries and monitoring

- Wrap each external call in try/catch, log failures to lead_events
- SMS watchdog: cron checks every minute for leads in last 60-120s without sms_sent event, retries
- Vercel error logging piped to Slack or email for any 500 from /api/leads
- CAPI failures low priority — retry once at 30s, then give up

# Part 5 — Code references and SQL schema

Directional code samples. Claude Code will produce full implementations. Use these as specs for what to build.

## 5.1 Supabase SQL: initial migration

### Extensions and enums

```sql
create extension if not exists "uuid-ossp";
 
create type lead_status as enum (
  'new', 'contacted', 'appointment', 'sold', 'dead', 'refunded'
);
create type lead_temperature as enum ('hot', 'warm', 'cold');
create type lead_event_type as enum (
  'created', 'sms_sent', 'email_sent', 'capi_sent',
  'status_change', 'note_added', 'refund_requested'
);
create type time_of_day as enum ('morning', 'afternoon', 'evening');
```

### agents table

```sql
create table agents (
  id uuid primary key default uuid_generate_v4(),
  email text not null unique,
  full_name text not null,
  license_states text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
 
alter table agents enable row level security;
 
create policy "agents_select_own"
  on agents for select
  using (auth.jwt() ->> 'email' = email);
```

### leads table

```sql
create table leads (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
 
  first_name text not null,
  last_name text not null,
  phone_e164 text not null,
  email text not null,
  state char(2) not null,
 
  mortgage_balance integer not null check (mortgage_balance between 50000 and 2000000),
  age integer not null check (age between 18 and 75),
  is_smoker boolean not null,
  is_homeowner boolean not null,
  best_time_to_call time_of_day not null,
 
  intent_score integer not null,
  temperature lead_temperature not null,
 
  status lead_status not null default 'new',
  agent_id uuid references agents(id),
  first_contact_at timestamptz,
  outcome text,
  policy_value integer,
  notes text,
 
  utm_source text, utm_campaign text, utm_adset text, utm_creative text,
  fbclid text, fbc text, fbp text,
  landing_page_variant text
);
 
-- 30-day per (brand, product) dedup is enforced in /api/leads (Part 3.6), not at the DB layer.
-- A partial unique index using now() in the predicate is rejected by
-- Postgres because now() is STABLE, not IMMUTABLE.
 
create index leads_status_idx on leads(status);
create index leads_agent_id_idx on leads(agent_id);
create index leads_created_at_idx on leads(created_at desc);
 
alter table leads enable row level security;
 
create policy "leads_select_agent"
  on leads for select
  using (agent_id in (
    select id from agents where email = auth.jwt() ->> 'email'
  ));
 
create policy "leads_update_agent"
  on leads for update
  using (agent_id in (
    select id from agents where email = auth.jwt() ->> 'email'
  ));
```

### consent_log, lead_events, suppressions, dnc_registry

```sql
create table consent_log (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid not null references leads(id),
  created_at timestamptz not null default now(),
  consent_text text not null,
  form_version text not null,
  ip_address inet not null,
  user_agent text not null,
  page_url text not null
);
alter table consent_log enable row level security;
 
create table lead_events (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid not null references leads(id),
  event_type lead_event_type not null,
  event_data jsonb,
  created_at timestamptz not null default now()
);
alter table lead_events enable row level security;
 
create table suppressions (
  id uuid primary key default uuid_generate_v4(),
  phone_e164 text,
  email text,
  reason text not null,
  suppressed_at timestamptz not null default now(),
  check (phone_e164 is not null or email is not null)
);
alter table suppressions enable row level security;
 
create table dnc_registry (
  phone_e164 text primary key,
  updated_at timestamptz not null default now()
);
alter table dnc_registry enable row level security;
```

## 5.2 Form submission handler — shape

```typescript
// /app/api/leads/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
 
const LeadSchema = z.object({
  first_name: z.string().min(2).max(50),
  last_name: z.string().min(2).max(50),
  phone: z.string(),
  email: z.string().email(),
  state: z.string().length(2),
  mortgage_balance: z.number().int().min(50000).max(2000000),
  age: z.number().int().min(18).max(75),
  is_smoker: z.boolean(),
  is_homeowner: z.literal(true),
  best_time_to_call: z.enum(['morning','afternoon','evening']),
  consent: z.literal(true),
  form_loaded_at: z.number(),
  honeypot: z.string().max(0),
  utm_source: z.string().optional(),
  utm_campaign: z.string().optional(),
  // ...
});
 
export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? '0.0.0.0';
  const ua = req.headers.get('user-agent') ?? '';
 
  if (await isRateLimited(ip)) return NextResponse.json({ ok: false }, { status: 429 });
 
  const parsed = LeadSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
 
  if (parsed.data.honeypot) return silentSuccess();
  if (Date.now() - parsed.data.form_loaded_at < 3000) return silentSuccess();
 
  const phone_e164 = normalizePhone(parsed.data.phone);
  if (!phone_e164) return NextResponse.json({ ok:false }, { status: 400 });
  if (!(await validateEmailMX(parsed.data.email))) {
    return NextResponse.json({ ok: false, error: 'email' }, { status: 400 });
  }
 
  if (await isSuppressed(phone_e164, parsed.data.email)) return silentSuccess();
  const on_dnc = await isOnDNC(phone_e164);
 
  const score = computeIntentScore(parsed.data);
  const temp = computeTemperature(score);
 
  const lead = await insertLeadTransaction({
    ...parsed.data, phone_e164, intent_score: score, temperature: temp,
    ip, user_agent: ua,
  });
 
  if (!on_dnc) sendAgentSMS(lead).catch(logError);
  sendWelcomeEmail(lead).catch(logError);
  sendMetaCAPIEvent(lead, ip, ua, req).catch(logError);
 
  return NextResponse.json({ ok: true, id: lead.id });
}
```

## 5.3 Twilio SMS — shape

```typescript
import twilio from 'twilio';
 
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!,
);
 
export async function sendAgentSMS(lead: Lead) {
  const emoji = lead.temperature === 'hot' ? '🔥' : '⚡';
  const body = [
    `${emoji} NEW ${lead.temperature.toUpperCase()} LEAD`,
    `${lead.first_name} ${lead.last_name}, age ${lead.age}`,
    `${lead.state} — mortgage $${lead.mortgage_balance.toLocaleString()}`,
    `Call: ${lead.phone_e164}`,
    `Score: ${lead.intent_score}/90`,
    '',
    `Best time: ${lead.best_time_to_call}`,
  ].join('\n');
 
  const msg = await client.messages.create({
    from: process.env.TWILIO_FROM_NUMBER!,
    to: process.env.AGENT_PHONE_NUMBER!,
    body,
  });
 
  await insertLeadEvent(lead.id, 'sms_sent', { sid: msg.sid });
}
```

## 5.4 Meta CAPI — shape

```typescript
import { createHash } from 'crypto';
 
const sha256 = (s: string) =>
  createHash('sha256').update(s.trim().toLowerCase()).digest('hex');
 
export async function sendMetaCAPIEvent(lead, ip, ua, req) {
  const cookies = req.headers.get('cookie') ?? '';
  const fbc = extractCookie(cookies, '_fbc');
  const fbp = extractCookie(cookies, '_fbp');
 
  const payload = {
    data: [{
      event_name: 'Lead',
      event_time: Math.floor(Date.now() / 1000),
      event_id: lead.id,
      action_source: 'website',
      event_source_url: `https://${process.env.NEXT_PUBLIC_SITE_URL}/`,
      user_data: {
        em: [sha256(lead.email)],
        ph: [sha256(lead.phone_e164.replace('+',''))],
        client_ip_address: ip,
        client_user_agent: ua,
        ...(fbc && { fbc }),
        ...(fbp && { fbp }),
      },
      custom_data: { value: 40, currency: 'USD' },
    }],
  };
 
  const res = await fetch(
    `https://graph.facebook.com/v18.0/${process.env.META_PIXEL_ID}/events?access_token=${process.env.META_CAPI_ACCESS_TOKEN}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
  );
 
  await insertLeadEvent(lead.id, 'capi_sent', await res.json());
}
```

## 5.5 STOP webhook (Twilio inbound)

```typescript
// /app/api/twilio/incoming/route.ts
export async function POST(req: Request) {
  const body = await req.formData();
  const from = body.get('From') as string;
  const text = (body.get('Body') as string).trim().toUpperCase();
 
  if (['STOP','UNSUBSCRIBE','CANCEL','END','QUIT'].includes(text)) {
    await addSuppression({ phone_e164: from, reason: 'SMS_STOP' });
  }
 
  return new Response('<?xml version="1.0"?><Response></Response>',
    { headers: { 'Content-Type': 'text/xml' } });
}
```

*— End of Technical Reference —*