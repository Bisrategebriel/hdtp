# HDTP Concept Platform: Technical Blueprint

Oct 11, 2026 · @Bisrategebriel Fisseha

## 1. Purpose and locked decisions

The HDTP Concept Platform is a Flint-owned, multi-tenant demo that lets a hotel owner or GM click through all seven HDTP phases on a realistic fictional property, then switch tiers (Essential, Growth, Premium) and watch capabilities turn on and off. It is built to be shown live by Flint's sales team within two weeks, not operated by a real hotel.

| Topic | Decision |
| --- | --- |
| Product type | Hybrid: polished front end, real but lightweight backend modules, seeded data |
| Audience | Hotel owners and GMs evaluating Flint; presented live by Flint |
| Scope | All seven phases represented; Phases 2 to 4 built deepest |
| Tenancy | True multi-tenant: several fictional hotels, per-tenant theme, per-tenant tier |
| AI | Simulated: scripted responses and mock forecasts, behind an interface that can later call a real LLM |
| Payments | Mock gateway that behaves like a real checkout (test cards, success and failure paths) |
| Stack | Next.js + Supabase (fastest path; see section 2) |
| Team and timeline | Solo developer, working demo in 14 days |
| Identity | Neutral tenant branding; Flint branding on the demo shell and "Powered by Flint" marks |

### Demo success criteria

- A 15-minute guided walkthrough runs end to end without a dead click.
- Switching a hotel from Essential to Premium visibly unlocks modules within one second.
- Two fictional hotels are seeded in full with a believable 12 months of data; a Premium preset reuses the generator with a lighter dataset.
- Every phase in the HDTP proposal maps to at least one screen a GM can point at.
- The demo works on a laptop projector and on a phone, since GMs often review on mobile.

### Guiding principles

1. **Convincing beats complete.** Each feature needs a believable happy path and seeded data, not edge-case handling.
2. **One codebase, one data model.** Website, portal, back office and dashboards read the same tenant data, which is what the proposal promises.
3. **Tier is configuration, not code.** Essential, Growth and Premium differ only by feature flags and limits.
4. **Fake it behind real interfaces.** AI, payments, WhatsApp and keys are adapters, so swapping a mock for a real provider later does not change the UI.

## 2. Recommended stack

Use Next.js (App Router) with Supabase, deployed on Vercel. One TypeScript codebase and Supabase's built-in auth, Postgres, row-level security, storage and realtime remove roughly a week of backend work that a solo developer does not have.

| Layer | Choice | Why |
| --- | --- | --- |
| Frontend | Next.js 15, React, TypeScript, Tailwind, shadcn/ui | SSR for the SEO story in Phase 2, fast component work, matches the proposal's React/Next.js layer |
| Mobile experience | Responsive PWA (guest portal, housekeeping app) | Delivers the "no app download" portal promise; Flutter is out of scope for 2 weeks |
| Backend | Supabase Postgres, Auth, Storage, Realtime; Next.js route handlers and Supabase Edge Functions for logic | No separate API server to build or host |
| Multi-tenancy | Shared schema, `tenant_id` on every table, Postgres row-level security | Cheapest correct model; tenant isolation is enforced by the database |
| Charts and BI | Recharts or Tremor | Fast, good-looking dashboards |
| State and data fetching | TanStack Query, Zod for validation | Predictable, typed, quick |
| i18n | next-intl (English first; Amharic and Afaan Oromo as stretch) | Matches the multi-language claim in the proposal |
| Mock services | In-repo adapters: `PaymentGateway`, `AIProvider`, `Messaging`, `DigitalKey` | Each has a mock now and a real provider later |
| Hosting | Vercel + Supabase cloud | Free or low tier is enough for a demo |
| Quality | Playwright for the guided-tour smoke test, GitHub Actions CI | Protects the demo path from regressions |

### Real versus mocked

| Real | Simulated |
| --- | --- |
| Tenant isolation, auth, roles, feature flags | AI concierge and chatbot replies (scripted, intent-matched) |
| Booking, check-in and check-out flows against live tables | Occupancy, revenue and demand forecasts (seeded curves with noise) |
| Housekeeping, POS, folio and finance calculations | Payment authorization (mock gateway, test card behaviours) |
| Dashboards computed from seeded data | WhatsApp, SMS and email delivery (shown in an in-app outbox) |
| Theme engine and tier switcher | Digital room keys, virtual tour media, security scan results |

### Honest note on the stack

Your proposal names .NET Core, Azure, SQL Server and Flutter. The demo will not use them. Say so openly in the sales narrative: the demo stack is chosen for speed, and the production HDTP stack is the one in Section 12 of the proposal. A technical CTO in the room will ask.

## 3. Architecture

One Next.js application serves three surfaces from one Supabase database. The tenant record, not the code, decides what each visitor sees: its theme, its tier and therefore its features.

&#91;embedded content: platform architecture · 3 surfaces, 2 service layers, 1 database\]

The console bar re-themes and re-tiers the three surfaces; all of them read and write the same tenant-scoped database.

### How the key mechanisms work

- **Tenant resolution:** the URL slug (for example `/lakeview`) maps to a `tenants` row; middleware stores the tenant and its tier in the request context.
- **Tier gating:** a `tier_features` table maps each feature key to a minimum tier. A `<Feature flag="loyalty.signup">` component hides or locks the UI, and a `requireFeature()` guard blocks the matching API route.
- **Theme engine:** `tenants.theme` is injected as CSS variables at the root, so every component restyles without code changes.
- **Adapters:** `PaymentGateway`, `AIProvider`, `Messaging` and `DigitalKey` are TypeScript interfaces with mock implementations selected by environment.
- **Event flow:** one booking creates a reservation, then a folio, a housekeeping task at check-out, a KPI rollup and an outbox message. Database triggers or Edge Functions do this, so every screen stays consistent.

### Suggested code layout

| Route | Surface |
| --- | --- |
| `/[tenant]` | Public hotel website and booking engine |
| `/[tenant]/stay/[token]` | Guest portal PWA |
| `/[tenant]/app` | Staff and executive console (HMS, BI, helpdesk, assessment) |
| `/demo` | Flint demo console and guided tours |

Use one Next.js repository with a feature folder per area (`features/website`, `features/hms`, `features/portal`, `features/ai`, `features/bi`, `features/support`), so each phase stays self-contained and easy to cut.

## 4. Feature catalog

The platform has 8 feature categories: one cross-cutting platform core, then one per HDTP phase. Every feature carries a tier and a build depth.

**Tier:** E = Essential and above (all tiers) · G = Growth and Premium · P = Premium only.

**Depth:** Deep = fully working on live tenant data · Medium = interactive on seeded data · Light = scripted or static screen that tells the story.

### Category A. Platform core (cross-cutting)

| Feature | Tier | Depth | Notes |
| --- | --- | --- | --- |
| Multi-tenant workspaces | E | Deep | Tenant switcher in the Flint demo console; 3 seeded hotels |
| Tier switcher and feature flags | E | Deep | Flip Essential, Growth, Premium live; nav, modules and limits update |
| Theme engine | E | Deep | Per-tenant logo, colors, fonts, hero imagery; applies to website, portal and back office |
| Role-based personas | E | Deep | One-click login as GM, Front Desk, Housekeeping, F&B, Finance, HR, Marketing, Guest |
| Auth and access control | E | Medium | Supabase Auth, RLS; MFA shown as a toggle |
| Guided tour mode | E | Medium | Scripted storyline per audience (Owner, GM, Operations) with step overlays |
| Demo reset and seed engine | E | Medium | One button restores seeded data; optional fixed "today" date |
| Notification outbox | E | Medium | Shows the email, SMS and WhatsApp messages the system would send |
| Audit log | G | Medium | Who did what, per tenant; supports the security story |
| Language switcher | E | Light | English plus 1 or 2 translated screens |
| Flint branding layer | E | Deep | "Powered by Flint" footer, Flint demo console shell, Flint-owned login and about page |
| Program Command Center | E | Medium | HDTP phase tracker, deliverables checklist, governance roles and meeting cadence from Section 14 of the proposal |

### Category B. Phase 1: Digital assessment and strategy

| Feature | Tier | Depth | Notes |
| --- | --- | --- | --- |
| Digital maturity assessment wizard | E | Medium | Questions across the six dimensions; radar chart of scores versus peer benchmark |
| Website audit and Core Web Vitals report | E | Light | Seeded LCP, INP, CLS results with pass or fail chips |
| Cybersecurity assessment report | E | Light | Seeded scan findings by severity |
| PMS and software inventory | E | Light | Table of current systems, license cost, end-of-life risk |
| Competitor benchmarking | G | Light | 3 to 5 fictional competitors compared on digital metrics |
| SWOT and technology gap report | E | Medium | Gaps plotted on an impact by effort matrix |
| 24-month digital roadmap | E | Medium | Gantt view of the seven phases generated from tier |
| ROI forecast calculator | E | Deep | Sliders for rooms, ADR, OTA share, commission; outputs payback and savings. This is your strongest sales tool |
| Tier recommendation engine | E | Medium | Property profile in, recommended tier and reasons out |
| Executive summary export | G | Light | PDF of the assessment for ownership review |

### Category C. Phase 2: Website modernization

Each tenant gets a public site at its own route, with its own theme. This is the most visible part of the demo.

| Feature | Tier | Depth | Notes |
| --- | --- | --- | --- |
| Responsive, mobile-first site | E | Deep | Home, rooms, offers, about, contact |
| Booking engine | E | Deep | Dates and guests, live availability, rate display, extras, guest details, confirmation; writes a real reservation |
| Mock secure payment gateway | E | Deep | Test cards for success, decline and 3-D Secure style challenge; local wallet option shown as a mock |
| Loyalty registration | G | Medium | Sign-up flow, tier-aware rates, points visibility |
| AI chatbot widget | E | Medium | Scripted; see Category F |
| Live chat | G | Medium | Visitor chat appears in the staff inbox in real time (Supabase Realtime) |
| WhatsApp click-to-chat | E | Light | Button opens a simulated WhatsApp thread logged to CRM |
| Virtual hotel tour | G | Medium | 360-degree viewer on stock panoramas |
| Multi-language | E | Light | Language switcher with hreflang metadata |
| Blog platform | E | Medium | Markdown posts per tenant |
| Event and meeting enquiries | E | Medium | Event pages with RFP form that creates a CRM lead |
| Gallery and customer reviews | E | Medium | Categorized gallery; reviews with platform attribution |
| Newsletter subscription | E | Medium | Opt-in with interest segments |
| SEO and accessibility | E | Medium | schema.org markup, sitemap, visible Lighthouse-style score badge |
| Custom and bespoke design | G (custom) / P (bespoke) | Light | Theme presets: Standard (E), Custom (G), Bespoke layout (P) |

### Category D. Phase 3: Hotel operations digitization

One Hotel Management System with six modules sharing one data model. Essential gets the first four modules; Growth gets all six; Premium adds a workflow builder.

| Module and feature | Tier | Depth | Notes |
| --- | --- | --- | --- |
| Front Office: reservation dashboard | E | Deep | Calendar and list of bookings, group blocks, channel source |
| Front Office: check-in, check-out, walk-ins | E | Deep | ID capture mock, room assignment, folio settlement, invoice |
| Front Office: room allocation rules | E | Medium | Preference and loyalty-based suggestion |
| Housekeeping: schedule and room status | E | Deep | Auto-tasks on check-out; clean, dirty, inspected states sync to front desk in real time |
| Housekeeping: maintenance and inspections | E | Medium | Work orders with photo, priority, sign-off checklist |
| Restaurant: POS and kitchen tickets | E | Medium | Table map, order entry, kitchen display, room-charge to folio |
| Restaurant: inventory and billing | E | Light | Stock levels, reorder alerts, split bills |
| Finance: invoicing and revenue reports | E | Medium | Daily, weekly and monthly revenue by department and channel |
| Finance: expense tracking and dashboard | G | Medium | Approval workflow, budget variance alerts |
| Human Resources: staff, attendance, leave | G | Medium | Staff records, shift and leave calendar with approvals |
| Human Resources: payroll | G | Light | Payroll run with statutory deductions on seeded staff |
| CRM: guest profiles and feedback | G | Medium | Unified guest record with stay history and surveys |
| CRM: loyalty and campaigns | G | Medium | Tiers, points, segmented email and SMS campaign builder |
| Module integration map | E | Light | Interactive diagram of Table 2 in the proposal; click a module to see its data links |
| Custom workflow builder | P | Light | Simple trigger, condition, action rules (for example, VIP arrival notifies GM) |

### Category E. Phase 4: Guest experience enhancement

A mobile-first guest portal opened by QR code or link, with no app download. It runs on the same bookings as the back office.

| Feature | Tier | Depth | Notes |
| --- | --- | --- | --- |
| Online pre-arrival check-in | E | Deep | Registration, ID upload, room preference; updates the front desk |
| Pre-stay upsell | E | Medium | Upgrade, early check-in and add-ons offered in the check-in flow |
| Airport pickup booking | G | Medium | Flight number, vehicle, dispatch status |
| Mobile guest portal | E | Deep | Single entry point to every in-stay service |
| Digital room key | G | Light | Animated mobile key; hardware not integrated |
| Guest messaging | E | Medium | Two-way chat with staff, saved to the CRM |
| Room service ordering | E | Medium | Digital menu, customization, folio charge |
| Restaurant and spa booking | G | Medium | Slot selection, deposit via the mock gateway |
| Tour and event booking | G | Medium | Partner tours with commission tracking; meeting room enquiry |
| Digital concierge | G | Medium | Recommendations with one-tap booking (scripted) |
| Post-stay feedback | E | Medium | Survey by email or SMS link; low scores raise a staff task |
| Loyalty deep integration | P | Light | Points, tier perks and member offers inside the portal |

### Category F. Phase 5: Artificial intelligence (simulated)

All AI sits behind an `AIProvider` interface. The mock uses intent matching on scripted answers and seeded forecast curves, so results are repeatable on stage.

| Feature | Tier | Depth | Notes |
| --- | --- | --- | --- |
| AI chatbot: FAQs, hotel info, promotions | E | Medium | Keyword and intent matching over a per-tenant knowledge base |
| AI chatbot: reservations | E | Medium | Guided flow that hands off to the booking engine |
| AI concierge | G | Medium | 24/7 persona, language toggle, confidence score, hand-off to staff |
| Occupancy and revenue forecasts | G | Medium | 30, 60 and 90-day curves with confidence bands |
| Guest demand prediction and seasonal trends | G | Light | F&B and spa demand by day-part; trend alerts |
| AI marketing: next-best action | P | Medium | Recommended offer per segment, upsell targets |
| Custom model showcase | P | Light | "Model studio" screen with training status and accuracy placeholders, clearly labeled illustrative |
| AI governance panel | P | Light | Drift monitoring, human-override log; supports the proposal's quality promise |

### Category G. Phase 6: Business intelligence

Every dashboard is computed from the tenant's seeded 12 months of reservations, folios, POS orders and surveys, so numbers reconcile across screens.

| Feature | Tier | Depth | Notes |
| --- | --- | --- | --- |
| Executive KPI suite (10 KPIs) | E | Deep | Occupancy, ADR, RevPAR, direct booking ratio, CSAT, revenue growth, traffic, conversion, marketing ROI, retention; each with value, trend, target, variance |
| Departmental dashboards | G | Medium | Front office, housekeeping, F&B, finance, marketing |
| Operational dashboard | G | Medium | Live room status, outlet covers, staffing, maintenance queue |
| Drill-down | G | Medium | Click a KPI to see the contributing channel, segment or day |
| Exception alerts | G | Medium | Rule-based alerts (for example, direct ratio below target) |
| Custom benchmarks | P | Light | Compare against a fictional peer set |
| Report export | E | Light | PDF or CSV of the executive view |
| Direct versus OTA commission view | E | Medium | Visualizes commission outflow, the core commercial argument of HDTP |

### Category H. Phase 7: Continuous innovation and support

| Feature | Tier | Depth | Notes |
| --- | --- | --- | --- |
| Helpdesk portal | E | Deep | Create, assign and resolve tickets with priority classes from the SLA table |
| SLA timers and escalation matrix | E | Medium | Live response and resolution countdowns; breach escalates to the next role |
| Incident workflow and post-incident review | G | Light | Severity-one flow with timeline |
| System health and status page | E | Medium | Seeded uptime (99.9 percent target), backup status, performance charts |
| Security monitoring feed | G | Light | Seeded threat and access events |
| Quarterly business review view | G | Medium | Auto-assembled KPIs, initiatives and roadmap changes |
| Innovation and roadmap board | E | Medium | Kanban of enhancement requests with intake form |
| Training center | E | Light | Role-based guides and scheduled sessions |
| Monthly performance report | E | Light | Generated summary against the Table 9 outcome targets |
| Support model by tier | E | Light | Hours and channels change with tier (business, extended, 24/7 dedicated) |

### Feature count

About 90 features across 8 categories. Not all are equal: 16 are Deep and carry the demo, about 50 are Medium, and about 25 are Light screens. For a solo build, only 8 features are built properly and about 12 are interactive; the rest become concept screens (Section 7).

## 5. Data model and seed data

One Postgres schema, shared by all tenants. Every business table carries `tenant_id`, and row-level security lets a signed-in user read only rows for tenants where they hold a membership. Tier is a column on the tenant; features are resolved from a `tier_features` table so a flag change is a data change, not a deploy.

| Domain | Core tables | Notes |
| --- | --- | --- |
| Tenancy and access | `tenants`, `properties`, `memberships`, `profiles`, `tier_features`, `tenant_feature_overrides` | `tenants.tier` and `tenants.theme` (JSON: colors, fonts, logo) drive the whole UI |
| Inventory | `room_types`, `rooms`, `rate_plans`, `daily_rates`, `availability` | Availability computed per property and date |
| Guests and bookings | `guests`, `reservations`, `reservation_rooms`, `folios`, `folio_items`, `payments` | `reservations.channel` is `direct`, `ota` or `walk_in`; this powers the direct booking ratio |
| Housekeeping | `hk_tasks`, `maintenance_orders`, `inspections` | Realtime channel on room status |
| Restaurant | `outlets`, `menu_items`, `pos_orders`, `pos_order_items`, `inventory_items` | Room charge posts to `folio_items` |
| HR and finance | `staff`, `attendance`, `leave_requests`, `payroll_runs`, `invoices`, `expenses` | Payroll is seeded, not calculated against real law |
| CRM and loyalty | `loyalty_accounts`, `loyalty_transactions`, `campaigns`, `segments`, `feedback` | Segments are saved filters |
| Guest portal | `service_requests`, `portal_sessions` | One table for spa, tour, room service, airport pickup |
| Messaging and AI | `conversations`, `messages`, `kb_articles`, `outbox` | `messages.sender` is `guest`, `staff`, `bot` or `concierge` |
| BI | `kpi_daily`, `forecasts`, `alerts`, `benchmarks` | `kpi_daily` is rebuilt by the seed script and by a nightly job |
| Support | `tickets`, `ticket_events`, `sla_policies`, `releases`, `feature_requests` | SLA targets copied from Table 8 of the proposal |
| Phase 1 | `assessments`, `assessment_scores`, `roadmap_items` | Drives the maturity radar and roadmap |
| System | `audit_log`, `demo_state` | `demo_state` stores the fake "today" and the program month |

### Access rules

- Staff and GM screens: a policy on every table, `tenant_id` must match one of the caller's memberships.
- Public website: read-only policies for published rooms, rates, posts and reviews; bookings are written through a server route that resolves the tenant from the URL.
- Guest portal: access by a signed link or QR code tied to one reservation, no account needed.
- Demo console: a Flint-only role that can switch tenants, flip tiers and reset data.

### Seed data design

Three fictional hotels, one per tier profile. A solo build seeds the first two in full and gives Highland a lighter dataset, enough to demonstrate Premium flags. Check the names against real Addis Ababa properties before use.

| Tenant | Profile | Tier | Purpose in the story |
| --- | --- | --- | --- |
| Acacia Court Hotel | 90 rooms, single property, city | Essential | Shows the entry point and what upgrading adds |
| Lakeview Suites and Spa | 210 rooms, 2 properties, spa and events | Growth | Full-suite walkthrough; the default demo |
| Highland Grand Resort | 340 rooms, resort and group sales | Premium | Custom workflows, full AI suite, 24/7 support |

A deterministic seed script (fixed random seed, so the demo is repeatable) generates:

- 12 months of reservations with realistic seasonality, weekday patterns and a 55 to 65 percent OTA share before HDTP.
- Matching folios, POS orders, housekeeping tasks, surveys, tickets and chat history.
- Two data states per tenant, "Before HDTP" and "Month 24", so the program-month slider can show the outcomes promised in Table 9 of your proposal. Label the Month 24 state as illustrative projections, not client results.

## 6. Demo experience and branding

The demo succeeds or fails on its storyline, not on feature count. Five controls sit in a persistent Flint demo console bar at the top of every screen.

| Control | What it does | Why it sells |
| --- | --- | --- |
| Hotel switcher | Moves between the three fictional tenants and re-themes instantly | Proves the platform is generic and white-label |
| Tier switcher | Essential, Growth, Premium; modules appear or lock with an upgrade prompt | Turns the three investment tiers in Section 13 into something visible |
| Program month slider | Month 0, 6, 12, 24; dashboards and KPIs move toward the Table 9 targets | Shows the 24-month journey rather than a static product |
| Persona switcher | GM, Front Desk, Housekeeping, F&B, Finance, Marketing, Guest | Lets one presenter show every user's view without logging out |
| Reset | Restores seed data | Safe live demos |

### Branding model

- **Flint layer (fixed):** demo console bar, login and landing page, "Powered by Flint Technologies PLC" footer on every tenant site and portal, Flint-styled PDF exports, favicon on the demo domain. This is what makes the platform visibly Flint-owned.
- **Tenant layer (swappable):** logo, palette, typography, hero imagery and copy tone per hotel, stored in `tenants.theme`.
- **Neutral default:** a clean, restrained design system (generous spacing, one accent color, system-safe fonts) so any hotel theme looks credible on top of it. Reuse your Flint brand tokens for the console bar only.

### Three guided storylines

1. **Owner, 10 minutes:** ROI calculator, direct booking ratio and OTA commission view, tier comparison, Month 24 outcome.
2. **GM, 15 minutes:** guest books on the website, pays, checks in online, front desk sees it, housekeeping turns the room, dashboard updates, AI concierge answers, a ticket is resolved within SLA.
3. **Operations, 15 minutes:** HMS modules, integration map, housekeeping app on a phone, then concept screens for POS, payroll and finance, labeled as concept.

The GM storyline is the one to rehearse first: it threads Phases 2 to 7 through one booking, which is the clearest proof of a single integrated platform.

## 7. Two-week roadmap (solo)

A solo developer cannot build 90 features in 14 days. The plan is to build 8 features properly, make about 12 interactive on seeded data, and show the rest as clearly labeled concept screens. Day 1 is Monday, Oct 12, 2026, feature work stops on Oct 23 and the demo is ready on Oct 25.

### What a solo build can deliver

| Level | Count | Meaning | Features |
| --- | --- | --- | --- |
| Build properly | 8 | Works on live tenant data | Tenant, tier and theme switching; Flint branding layer; booking engine with mock payment; front-office check-in and check-out; housekeeping room status (realtime); executive KPI dashboard with program-month slider; ROI calculator; helpdesk with SLA timers |
| Interactive on seeded data | about 12 | Clickable, reads seeded rows, nothing durable | Public site pages (rooms, offers, gallery, reviews, event form); guest portal (check-in, requests); scripted AI chatbot and concierge; occupancy and revenue forecast chart; maturity assessment radar; tier recommendation; 24-month roadmap; direct versus OTA commission view; operational dashboard; module integration map; quarterly review view; system health page |
| Concept screens | about 70 | One template page per feature, with a "concept" badge | Everything else in Section 4: description from the proposal, a seeded table or chart, and a note that it belongs to the full build |

Concept screens come from one template, not from 70 separate designs. Label them on screen, so a GM never mistakes one for working software.

&#91;embedded content: solo sprint plan · 6 build blocks, 5 milestones\]

The blocks run back to back, so every day has one job and there is no slack. Any overrun comes out of the last block (concept screens and polish), never out of the first three. Book the dry run with a friendly GM for Oct 24, inside the last block.

### Ways to move faster

- **Build one thread, then widen.** Tenant switch, public site, booking, front desk, housekeeping, dashboard. Everything else hangs off it.
- **Start from a template.** Use a Next.js and Supabase starter with auth and shadcn/ui dashboard blocks, and a stock hotel website layout. Time-box design to one neutral system with no custom illustration; as a designer, this is where your time will leak.
- **Scaffold, don't hand-build.** One generic data table, detail drawer and status chip pattern produces the interactive and concept screens.
- **Mock adapters on day 1.** Payment, messaging and AI mocks exist from the start, so no screen ever waits on an integration.
- **Lean on AI-assisted coding.** Let it generate the schema, seed script, CRUD screens and RLS tests; review the RLS policies and booking logic by hand.
- **Hard stops.** Each block ends on its date; unfinished parts drop to concept screens. Feature work stops on Oct 23.

### Cut lines

If a block overruns, cut in this order. Each row has a fallback that keeps the story intact. The demo is English only.

| Cut order | Feature | Fallback |
| --- | --- | --- |
| 1 | Second hotel's full seed data | One hotel in full; the others show themes and tiers only |
| 2 | Realtime housekeeping sync | Refresh button or short polling |
| 3 | Guest portal interactivity | Three static portal screens |
| 4 | Scripted AI chat | One fixed five-question conversation |
| 5 | Program-month slider | A two-state toggle: Before HDTP and Month 24 |
| 6 | Operational dashboard, quarterly review, system health | Concept screens |

**Never cut:** tenant, tier and theme switching; the booking-to-housekeeping thread; executive KPIs; the ROI calculator; helpdesk with SLA timers; the Flint branding layer.

## 8. Risks, critique and open decisions

### Honest critique of the plan

The scope is the main danger. About 90 features in 14 days is not realistic for a solo developer under any plan. The platform therefore ships 8 features built properly, about 12 interactive on seeded data, and concept screens for the rest. Even that has no slack: the schedule only works if every block ends on its date. Treat Section 7's cut lines as binding, and agree on them before day 1.

Two points in the proposal itself will surface during the demo and are worth fixing first:

- **"Direct bookings" is ambiguous.** The Executive Summary says a 30 to 50 percent increase in direct online bookings; Section 3.3 says grow the share by 30 to 50 percent. These are very different claims (a 40 percent relative rise in a 20 percent share is 28 percent; a 40 percentage-point rise is unlikely). The dashboard has to pick one definition, so decide which the proposal means.
- **Essential's "Core 4 modules" is never named.** This plan assumes Front Office, Housekeeping, Restaurant and Finance. Confirm, because the tier switcher will expose it on screen.

Also, the Month 24 view shows targets as if achieved. Label it "illustrative projection" everywhere, because the proposal's outcome figures are targets, and a sharp GM will ask for evidence from real engagements. Finally, the proposal still contains bracketed placeholders (contact details, investment ranges) that should be filled before it goes to a client.

### Risk register

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Scope exceeds 14 days | High | Build 8 features properly; everything else is a concept screen; hard stop per block; cut lines in Section 7 |
| Single point of failure: illness, power or laptop loss | High | Push to Git daily; keep a one-command local setup; record the backup video by Oct 25 at the latest |
| Concept screens mistaken for working software | High | Visible "concept" badge on every template screen; say so in the demo script |
| Cross-tenant data leak from a bad RLS policy | High | Write RLS tests per table first; one automated test that a tenant never sees another's rows |
| Live demo fails on venue internet | High | Run the full stack locally (Supabase CLI) as a fallback; record a 5-minute backup video; test on a phone hotspot |
| Mock outputs mistaken for real results | Medium | "Demo data" and "Illustrative" labels on forecasts, Month 24 view and AI screens |
| Real card data typed into the mock gateway | Medium | Fake card form with visible test-mode banner; reject non-test numbers; never store card data |
| Stack differs from the proposal | Medium | Say it openly; point to Section 12 as the production architecture |
| Code ownership unclear | Medium | Confirm in writing that all code and assets are assigned to Flint, including any help from your developer partner |
| Design polish eats build time | Medium | One neutral design system; stock imagery; no custom illustration before Oct 24 |
| Stock images or hotel names clash with real brands | Low | Use licensed or free-license imagery; check fictional names against Addis hotels |
| Latency from hosting far from Addis Ababa | Low | Choose the nearest Supabase and Vercel regions (Europe); cache the public site |

### Open decisions

- [x] Confirm Essential's four modules (assumed: Front Office, Housekeeping, Restaurant, Finance).
- [ ] Decide the definition of "direct bookings" used by the dashboards.
- [ ] Choose demo domain and Flint brand assets (logo, tokens) for the console layer.
- [x] Decide whether Amharic or Afaan Oromo screens are in the first demo or a later release.
- [ ] Name the presenter and the first target audience, so the first storyline is rehearsed.
- [ ] Confirm who owns the code and the demo infrastructure accounts.
