# HDTP Concept Platform: Build Plan

Source of truth: `docs/hdtp-blueprint.md`. Where this plan changes the blueprint, it says so and explains why.

## 1. Critique of the blueprint

The blueprint is sound in its main bet: build eight features properly, make about twelve interactive and show the rest as concept screens, with cut lines agreed up front. The problems below are listed by how much schedule or credibility they put at risk.

### 1.1 Gaps in the source material

1. **The sprint plan and the architecture diagram are missing.** Both appear as `[embedded content]` placeholders, so the "six build blocks and five milestones" are not in the file. §5 reconstructs them. Correct my block dates if your diagram differs.
2. **The proposal itself is not in the repo.** The demo shows numbers from Table 2 (module integration), Table 8 (SLA targets), Table 9 (24-month outcome targets), Section 13 (tiers) and Section 14 (governance). Without the proposal, those numbers are placeholders. Every one of them lives in `src/config/proposal.ts`, marked `PLACEHOLDER`, so swapping in the real values takes about 15 minutes. **A GM will read these numbers aloud, so drop the proposal into `docs/` before Day 8.**

### 1.2 Schedule realism

3. **There is zero slack across 14 consecutive days, including two weekends.** The "8 build-properly features" are really about 11 once you count the hidden Deep dependencies: persona switching, demo reset, the seed generator and guest-portal online check-in (which the GM storyline needs). **The seed generator is effectively a ninth Build feature and the riskiest one**, because every dashboard depends on it reconciling. It gets a full day (Day 3), and a single tenant comes first.
4. **The GM storyline depends on features the cut lines allow you to drop.** Online check-in sits at cut line 3 and the AI concierge at cut line 4. The storyline and the smoke test must still pass with both cut, so those steps are tagged optional in the script (§9) and the core thread uses only Build features.
5. **Blocks cannot overrun into the last block's rehearsal time.** The blueprint says overruns come out of concept screens and polish. Agreed, but **Sat 24 (dry run) and Sun 25 (backup video, final pass) are protected**: overruns are absorbed by Fri 23 only, otherwise by the block's own cut lines.

### 1.3 Contradictions and design problems

6. **"Interactive = nothing durable" contradicts the blueprint's own catalog.** Online check-in "updates the front desk", and the event form "creates a CRM lead". Writing these rows is cheap once the tables exist, so **portal check-in, service requests and event leads write rows**. Everything else Interactive reads only.
7. **One booking will not visibly move a 12-month KPI.** In "Dashboard updates" in the GM storyline, a single booking among about 20,000 changes nothing on screen. Add a **Live today strip** to the executive dashboard (arrivals, in-house, direct bookings today, direct share today, revenue on the books), computed live from the transactional tables. That is what visibly moves on stage.
8. **"Two data states per tenant" should not be two full transactional datasets.** Two datasets double the seed time and storage. Worse, live bookings would land in one "state" and not the other. Instead, transactional data is seeded once (Month 0, the live hotel). Month 24 exists only at the KPI level, as rows rolled up from transactions generated in memory with Month-24 parameters. The slider interpolates between the two (§7).
9. **The reset button cannot reseed about 200k rows inside a serverless request.** A Vercel function will time out. So the **Reset** button runs a single SQL function, `demo_reset(tenant)`: it deletes rows with `origin = 'demo'` and restores the few mutable seed columns from snapshot tables. That takes under a second. The full reseed is a CLI command (`pnpm seed`) run each morning of a demo day.
10. **Mixing live data with projections will confuse a sharp GM.** The dashboard keeps them visually separate. "Live operations" is always real tenant data. "Program projection" (slider ≠ 0) carries an **Illustrative projection** banner. Everything seeded carries a small **Demo data** chip.
11. **Three of the ten KPIs have no data source.** The blueprint defines nothing for web traffic, conversion or marketing ROI. The generator synthesizes daily web sessions, conversions and marketing spend into `kpi_daily`, and these KPIs are labeled as such.
12. **Lakeview's "2 properties" adds a property dimension to every screen.** The plan models `properties` from day 1 (cheap now, expensive later). The second property is small and appears only in a property switcher. All screens default to the main property.
13. **Persona switching and the Flint console have no auth design.** Proposed: the presenter logs in once at `/login`, which sets a signed, httpOnly `flint_presenter` cookie. Console actions (switch tenant, flip tier, reset, set month) are server actions that verify the cookie and then use the service role. Switching persona means signing in as a seeded persona user (`gm@lakeview.demo`, and so on), which takes under a second and needs no logout. The guest uses a portal token, not an account.
14. **Language switcher and multi-language conflict with the "English only" decision.** Both become concept screens. **Drop next-intl entirely.**

### 1.4 Stack: remove what a solo, 14-day build does not need

| Blueprint says | Change | Why |
| --- | --- | --- |
| Next.js 15 | Current stable Next.js (16.x), pinned on Day 1 | Starting a new project on an old major version buys nothing. Note that Next 16 renames `middleware.ts` to `proxy.ts`. |
| TanStack Query | Drop | Server Components and server actions cover reads and writes. Only 3 or 4 client components need realtime, and they use the Supabase client directly. |
| Supabase Edge Functions | Drop; use Postgres functions (RPC) | `create_booking`, `check_in`, `check_out` and `demo_reset` are transactional and need consistency. One less deploy target. |
| Nightly `kpi_daily` job | Drop | History comes from the seed, today is computed live by a view, and there are no cron jobs to break. |
| next-intl | Drop | English only. |
| Recharts or Tremor | Recharts via shadcn/ui charts | One charting library, already styled. |
| GitHub Actions with Playwright | CI runs typecheck, lint, unit and RLS tests only. Playwright runs locally and against prod before each demo. | Booting Supabase in CI is a half-day rabbit hole. |
| (not listed) | Add **Vitest** for pure logic | ROI math, pricing, SLA clocks and seed determinism are faster to test without a browser. |

### 1.5 Commercial and legal risks the blueprint understates

15. **Hosting terms.** Vercel Hobby is for non-commercial use only, and a Flint sales demo is commercial, so the plan recommended **Vercel Pro**. **Decided 19 Oct: stay on Vercel Hobby (free)**; the owner accepts the terms risk. **Supabase Free (decided)** works for the demo, with guards:
    - **Pausing.** Free projects pause after about a week without activity, which would kill the demo link between client meetings. A scheduled GitHub Action runs a cheap read against the Supabase REST API every day as a keep-alive. Still open the prod URL the day before every demo; restoring a paused project from the dashboard takes a few minutes.
    - **500 MB database limit.** The full seed is estimated at about 150 to 250 MB, data and indexes together. Reseeding must `TRUNCATE` the tenant tables, not `DELETE` them, so dead rows don't pile up. Check the size in the dashboard after the first full seed (Day 3). If it gets close to the limit, shorten Lakeview's history before cutting tenants.
    - **No backups.** The free plan has no automatic backups, so the deterministic seed is the backup: `pnpm seed` rebuilds everything. Migrations live in git.
    - **Two active projects per org, and no SLA.** Use one project only (prod); develop against the local Supabase stack. If the cloud project is down at the venue, switch to the local fallback (§10).
    - Realtime, Auth and storage limits on Free are far above what a demo needs.
16. **Code ownership is still open (open decision 6).** If your developer partner touches the repo, get the assignment to Flint in writing **before Day 1**, not after.
17. **Card data in the mock gateway.** Card fields use `autocomplete="off"` and non-`cc-*` names, so browsers never autofill a real card. The number is checked **in the browser** against a fixed allowlist of test numbers. The server receives only a token (`tok_success`, `tok_decline`, `tok_3ds`) and never a card number. The page shows a "TEST MODE" banner. The "mobile wallet" option is generic and uses no real wallet brand or logo.
18. **Hotel names.** A web search on 11 Oct found **no Addis Ababa property** named Acacia Court Hotel, Lakeview Suites and Spa, or Highland Grand Resort. Similar names exist only elsewhere (Hotel Acacia and Hotel Acacia City in Kampala, Acacia Hotel in Machakos in Kenya). A web search is not proof, so do a 10-minute Google Maps and Booking.com check for Addis Ababa, Bishoftu and Hawassa before Day 2, when the names go on screen. Guest and staff names come from first-name and father's-name lists, combined at random, so no real person is depicted.

## 2. Assumptions (defaults for open items; correct any of them)

| # | Topic | Assumption |
| --- | --- | --- |
| A1 | Direct bookings | **Direct share = direct bookings ÷ all bookings, by count, in percent.** "Direct" is the website, the chatbot hand-off, phone and email. Walk-ins are a separate channel and count only in the denominator. Dashboards show the share and both changes, for example "38% · +11 pp · +41% relative". I read the proposal's "30 to 50% increase" as a **relative** increase, so the Month-24 target is about 1.4× the baseline share. |
| A2 | Demo domain and Flint brand | Placeholders in `src/config/flint-brand.ts` (name, logo SVG, colors, domain). Swapping them takes one file. |
| A3 | Presenter and audience | Owner storyline first, then GM. The GM storyline is what the smoke test automates, because it covers the most code. |
| A4 | Proposal numbers | Table 8 SLA targets, Table 9 outcome targets and tier prices are placeholders in `src/config/proposal.ts` until the proposal is added. |
| A5 | Working days | All 14 days, weekends included, as the blueprint implies. If not, see the cut lines in §5. |
| A6 | Currency | ETB, set per tenant. ADR, rates and commission (17% blended OTA) are placeholders for Flint sales to sanity-check. |
| A7 | Taxes | 15% VAT and a 10% service charge on folios. Illustrative only, not tax advice. |
| A8 | Regions | Vercel `fra1` and Supabase `eu-central-1` (Frankfurt), the closest to Addis Ababa. |
| A9 | "Today" | The seed is anchored to the real date at seed time. All dates are offsets from that anchor, so a reseed on any morning gives fresh arrivals and departures. Output is deterministic for a given (seed, anchor). |
| A10 | Imagery | Free-license stock photos (Unsplash or Pexels), with no visible real-hotel signage. Text-wordmark logos only. Sources go in `docs/CREDITS.md`. |
| A11 | Accounts | Flint owns the GitHub org, Vercel team and Supabase org. The developer is invited. |

## 3. Architecture decisions

- **One Next.js app, three surfaces plus the Flint shell.**
  - `/[tenant]`: public site and booking
  - `/[tenant]/stay/[token]`: guest portal PWA
  - `/[tenant]/app`: staff and executive console
  - `/login`, `/demo`: Flint presenter shell
- **Tenant resolution.** `proxy.ts` matches the slug to a tenant. The tenant layout loads `{id, tier, theme}` once per request (React `cache`) and injects the theme as CSS variables.
- **Tier gating.** Features resolve as `tier_features.min_tier` ≤ `tenants.tier`, unless overridden in `tenant_feature_overrides`. Three helpers do the gating:
  - `<Feature flag>` shows a **locked** state with an upgrade prompt rather than hiding the feature, because locked modules are what sells the upgrade.
  - `requireFeature()` guards server actions and routes.
  - Navigation is generated from the same catalog, so there is no hand-maintained menu.
- **Tier switch in under a second.** A server action updates `tenants.tier`, then calls `revalidatePath` and `router.refresh()`. A Realtime subscription on the tenant row re-renders other open devices, such as the phone.
- **Adapters.** `src/adapters/{payment,ai,messaging,digital-key}/` each contain `index.ts` (the interface), `mock.ts` and a factory that selects the implementation by env. Only mocks exist.
- **Event flow.** Postgres functions do the work, each in one transaction:
  - `create_booking`: reservation, `reservation_rooms`, folio, payment and outbox
  - `check_in`: room assignment and status
  - `check_out`: settles the folio, marks the room dirty, creates an `hk_task` and an outbox row
  - `demo_reset`

  Staff functions run as `security invoker`, so RLS still applies.
- **Service role.** It is used only inside `src/server/admin.ts` (`import 'server-only'`), and only for these:
  - public booking (tenant resolved from the URL slug)
  - the portal-token lookup
  - console actions after the presenter cookie is checked
  - the seed

## 4. Repo structure and conventions

```
/
├─ CLAUDE.md  TASKS.md
├─ docs/            hdtp-blueprint.md, PLAN.md, CREDITS.md, proposal (when supplied)
├─ src/
│  ├─ app/
│  │  ├─ (flint)/login, (flint)/demo          Flint shell, presenter login, storyline checklist
│  │  ├─ [tenant]/(site)/...                  public website + booking
│  │  ├─ [tenant]/stay/[token]/...            guest portal
│  │  ├─ [tenant]/app/...                     staff/exec console; app/concept/[key] = concept template
│  │  └─ api/...                              route handlers (booking, payment mock, portal, reset)
│  ├─ features/     one folder per area, each with components/, actions.ts, queries.ts, schema.ts
│  │  ├─ platform/  tenancy, tiers, theme, personas, console, flint-branding
│  │  ├─ website/   booking/, payment/ (UI for mock gateway)
│  │  ├─ hms/       front-office/, housekeeping/
│  │  ├─ portal/    ai/   bi/   roi/   support/   assessment/   concept/
│  ├─ adapters/     payment/, ai/, messaging/, digital-key/   (interface + mock)
│  ├─ config/       flint-brand.ts, proposal.ts, tiers.ts, feature-keys.ts (generated)
│  ├─ components/ui shadcn/ui only
│  ├─ lib/          supabase/{server,client}.ts, format.ts, dates.ts
│  └─ server/       admin.ts (service role), presenter.ts (cookie)
├─ supabase/
│  ├─ migrations/   0001_… to 0012_…
│  ├─ tests/        pgTAP: 000_rls_meta.sql, 010_cross_tenant.sql, …
│  └─ seed/         tier_features.csv
├─ scripts/seed/    generator (rng.ts, calendar.ts, tenants/*.ts, fixtures.ts, rollup.ts, index.ts)
└─ tests/  e2e/ (Playwright), unit/ (Vitest)
```

**Naming.**
- Files are kebab-case and components PascalCase. Database identifiers are snake_case.
- Feature keys are dotted and match the CSV (`hms.hk.room_status`).
- Migrations use the CLI's timestamp prefix and a numbered slug, for example `20261012090000_0002_tenancy.sql`.
- Server actions are verbs (`checkInReservation`). Queries start with `get`/`list`.

## 5. Day-by-day plan (12 to 25 Oct)

The six blocks are reconstructed (§1.1). Milestones are M1 to M5. Each day ends with a push to GitHub and, from Day 2, a Vercel deploy.

### Block 1: Foundation (Mon 12 and Tue 13) → M1: platform shell live

**Day 1, Mon 12**
- Set up the repo and accounts:
  - `git init` and a private GitHub repo in the Flint org
  - move the blueprint to `docs/` and commit the plan files
- Create the Supabase cloud project (Free, Frankfurt; see §1.5 item 15) and the Vercel project (Hobby by decision, fra1), and record their env vars.
- Scaffold:
  - `create-next-app` (TypeScript, Tailwind, App Router, `src/`), pinning versions
  - `shadcn init` and `supabase init`
  - install Playwright and Vitest
  - add the `pnpm` scripts from CLAUDE.md
- Write migrations 0001 (extensions, `app` schema, enums, `app.is_member()`) and 0002 (tenants, properties, profiles, memberships, tier_features, tenant_feature_overrides, demo_state), with RLS.
- Write pgTAP `000_rls_meta.sql` and `010_cross_tenant.sql`, and get both passing with `supabase test db`.
- Deploy a hello-world page to Vercel.

**Day 2, Tue 13**
- Tenant routing: `proxy.ts` and the tenant layout, so `/lakeview` resolves the tenant and themes the page.
- Theme engine:
  - CSS variables from `tenants.theme`
  - 3 font pairs via `next/font` (self-hosted, which keeps the demo working offline)
  - text-wordmark logos
- Tier gating: `getFeatures()`, `<Feature>`, `requireFeature()`, and navigation generated from the catalog.
- CSV loader in the seed, plus `pnpm catalog:types`.
- Flint layer:
  - console bar (hotel, tier, month, persona, reset)
  - "Powered by Flint Technologies PLC" footer
  - `/login`, the presenter cookie and `flint-brand.ts`
- Personas: seed the auth users and add the persona-switch server action.
- Adapter interfaces and mocks: payment, ai, messaging, digital-key.
- Concept template and route `app/concept/[key]` (§8.3).

**Definition of done (M1).**
- On the deployed URL, a presenter logs in, switches Lakeview ↔ Acacia (re-themed) and flips the tier, and a locked module unlocks in under 1 second.
- Every catalog feature opens a concept screen or a locked state.
- The footer appears on all surfaces.
- RLS tests are green.

**Cut lines if it overruns.**
- The MFA toggle becomes a concept screen.
- Personas cut down to GM, Front Desk, Housekeeping, Guest and Flint Support.
- Themes switch colors and logo only; fonts stay fixed.

### Block 2: Data and website booking (Wed 14 to Fri 16) → M2: a guest can book and pay

**Day 3, Wed 14**
- Migrations 0003 to 0012 (§6.1), with RLS and pgTAP coverage for each table.
- Seed generator v1 for Lakeview only:
  - RNG, calendar and seasonality
  - inventory and rates
  - reservations, guests, folios and payments
  - hk_tasks, feedback, tickets
  - `kpi_daily` for 'before'
  - storyline fixtures
- Snapshot tables and `demo_reset()`.
- Vitest: the same seed and anchor produce the same hash.

**Day 4, Thu 15**
- Public site: home, rooms, offers, about and contact, plus gallery, reviews and the event form (which writes to `leads`), all themed and mobile-first.
- Booking step 1: dates and guests, live availability from `availability()`, and rates from `daily_rates`.

**Day 5, Fri 16**
- Booking steps 2 to 4: extras, guest details, and the mock gateway (allowlist, decline, a 3-D Secure-style challenge, TEST MODE banner).
- `create_booking` RPC, then the confirmation page with an "Online check-in" link (the portal token). An outbox row is written.
- Playwright `booking.spec.ts`.

**Definition of done (M2).**
- On prod, a booking for tonight with the 3DS test card creates a reservation, folio, payment and outbox row.
- A decline creates nothing.
- A non-test number is rejected before submit.

**Cut lines if it overruns.**
- Blueprint cut 1: Acacia gets theme and tier only, no full seed.
- Drop the extras step.
- 3DS becomes success or decline only.
- The site shrinks to home, rooms and booking.

### Block 3: Hotel operations (Sat 17 and Sun 18) → M3: the booking-to-housekeeping thread works

**Day 6, Sat 17**
- Front Office:
  - reservation list and calendar (filters by date, status and channel; badges for channel and "online check-in done")
  - arrivals and departures for today
  - check-in (ID-capture mock, room assignment that suggests rooms matching the guest's preference first)
  - check-out (folio view, settlement through the mock gateway or cash, HTML invoice with a print stylesheet)
  - walk-in
- RPCs `check_in`, `check_out` and `create_walk_in`.

**Day 7, Sun 18**
- Housekeeping:
  - room board for the front desk (grid by floor, status chips)
  - mobile housekeeper view (my tasks; Start, Clean, then Inspected by the supervisor)
  - Realtime on `rooms` and `hk_tasks`
- Playwright `front-office.spec.ts` and `housekeeping.spec.ts` (two browser contexts).

**Definition of done (M3).**
- Check out room 512, mark it clean on the phone, and the front-desk board shows "Inspected" within 3 seconds without a reload.
- The arriving guest is then checked into room 512.

**Cut lines if it overruns.**
- Blueprint cut 2: replace Realtime with 5-second polling plus a refresh button.
- Walk-in becomes a concept screen.
- No invoice print view.

### Block 4: Proof of value (Mon 19 and Tue 20) → M4: all 8 Build features done; the GM storyline runs end to end

**Day 8, Mon 19**
- Executive KPI suite: 10 KPI cards, each with value, trend sparkline, target and variance.
- Live today strip.
- Program-month slider (0, 6, 12, 24) with interpolation and the Illustrative projection banner.
- A direct-share card that shows pp and relative change.
- `src/config/proposal.ts`. Swap in the real proposal values if they have arrived.

**Day 9, Tue 20**
- ROI calculator: pure function plus Vitest, sliders, outputs, and an "Owner view" layout.
- Helpdesk:
  - create, assign and resolve
  - priority from the SLA policy
  - live response and resolution countdowns (client clock, server timestamps)
  - escalation computed when the ticket is read, using the escalation matrix
  - seeded breached and near-breach tickets
  - Flint Support persona
- Playwright for the KPI dashboard, ROI and helpdesk, then the first full run of `gm-storyline.spec.ts` (core steps).

**Definition of done (M4).**
- `gm-storyline.spec.ts` passes on prod with the optional steps skipped.
- The 8 per-feature specs pass.

**Cut lines if it overruns.**
- Blueprint cut 5: the slider becomes a two-state toggle (Before HDTP / Month 24).
- The escalation matrix shrinks to a single level.
- The ROI owner layout is dropped.

### Block 5: Guest experience, AI and interactive screens (Wed 21 and Thu 22) → interactive set complete

**Day 10, Wed 21**
- Guest portal: home, online check-in (registration, ID-upload mock, room preference), which writes to the reservation, so the front desk sees "Online check-in complete". Room-service request writes to `service_requests`.
- Scripted AI:
  - `AIProvider` mock with intent matching over `kb_articles`
  - chatbot widget on the site, with hand-off to booking
  - concierge in the portal, with a confidence score and hand-off to staff
- Outbox screen.

**Day 11, Thu 22**
- Interactive screens, each built with the shared table, drawer and chart pattern:
  - forecast chart
  - maturity radar
  - tier recommendation
  - 24-month roadmap
  - direct vs OTA commission view
  - operational dashboard
  - module integration map
  - quarterly business review
  - system health
- Enable the optional steps in `gm-storyline.spec.ts`.

**Definition of done.**
- All 12 interactive features are reachable from navigation with seeded data.
- The full storyline spec, optional steps included, passes on prod.

**Cut lines if it overruns.**
- Blueprint cut 3: the portal becomes 3 static screens.
- Blueprint cut 4: AI becomes one fixed five-question conversation.
- Blueprint cut 6: the operational dashboard, QBR and system health become concept screens.
- Then tier recommendation, roadmap and the integration map become concept screens, in that order.

### Block 6: Concept screens, freeze and rehearsal (Fri 23 to Sun 25) → M5: demo ready

**Day 12, Fri 23 (FEATURE FREEZE at 18:00)**
- Write the descriptions and choose sample-data kinds for every concept entry in the CSV.
- Run the Acacia full seed and the Highland light seed (Premium).
- Owner storyline checklist in `/demo`.
- `nav-crawl.spec.ts` (no dead click) for 3 tenants × 3 tiers.
- Phone and projector viewport pass (390×844, 1280×720).
- Rehearse the local fallback with Wi-Fi off.

**Day 13, Sat 24**
- Morning: reseed prod, then the full Playwright run on prod.
- **Dry run with a friendly GM.**
- Afternoon: fix bugs only. Record a draft of the backup video.

**Day 14, Sun 25**
- Reseed, run the full Playwright suite on prod and on local, and reset.
- **Record the final backup video** (5 minutes GM plus 3 minutes Owner) and a screenshot PDF.
- Copy everything to a USB drive. Demo ready.

**Definition of done (M5).**
- Both storylines run with no dead click on the projector and on a phone.
- The backup video and the local fallback are verified.

**Cut lines if it overruns.**
- Concept descriptions shrink to one line each.
- Highland becomes theme and tier only, with no seed.
- Polish is dropped.
- **Never cut: the dry run, the backup video or the local fallback test.**

**Overrun rule.** If a block's definition of done is not met by 20:00 on its last day, apply that block's cut lines that night and start the next block on time. Only Fri 23 may absorb spill, never Sat 24 or Sun 25. The blueprint's never-cut list stands, plus persona switching and demo reset.

## 6. Supabase design

### 6.1 Migration order and tables (32 tables, cut down from the blueprint's ~55)

Concept screens do **not** get tables. Their sample data comes from the deterministic generator in memory, which saves about 23 migrations and their RLS tests.

| # | Migration | Tables / objects |
| --- | --- | --- |
| 0001 | extensions_helpers | `pgcrypto`; schema `app`; enums `tier` (essential, growth, premium), `staff_role`, `channel` (direct, ota, walk_in), `res_status`, `room_status` (occupied, dirty, cleaning, clean, inspected, out_of_order); `app.is_member(tenant uuid)`, `app.member_tenants()` (security definer, stable) |
| 0002 | tenancy | `tenants` (slug, name, tier, theme jsonb, settings jsonb, currency), `properties`, `profiles`, `memberships` (user, tenant, role), `tier_features` (global), `tenant_feature_overrides`, `demo_state` (tenant, program_month, seed_anchor, seeded_at) |
| 0003 | inventory | `room_types`, `rooms` (status, floor, property), `rate_plans`, `daily_rates`; function `availability(tenant, property, from, to)` |
| 0004 | bookings | `guests`, `reservations` (channel, status, online_checkin_at, portal_token_hash), `reservation_rooms`, `folios`, `folio_items` (category: room, fnb, spa, extra, tax, service), `payments` (outcome, test_card_last4, token, never the full card number) |
| 0005 | housekeeping | `hk_tasks`; add `rooms`, `hk_tasks`, `reservations` and `tenants` to the `supabase_realtime` publication |
| 0006 | operations_rpc | `create_booking`, `check_in`, `check_out`, `create_walk_in` |
| 0007 | content_portal | `site_content` (kind: offer, gallery, review, page, menu_item), `leads`, `portal_sessions`, `service_requests`, `feedback` |
| 0008 | messaging_ai | `conversations`, `messages` (sender: guest, staff, bot, concierge), `kb_articles` (intent, keywords[], answer), `outbox` |
| 0009 | bi | `kpi_daily` (tenant, date, scenario: before or m24, rooms_sold, rooms_available, room_revenue, total_revenue, bookings_total, bookings_direct, bookings_ota, bookings_walkin, ota_commission, csat_avg, repeat_guest_pct, web_sessions, web_conversions, mkt_spend, mkt_revenue), `forecasts`; view `v_kpi_today` (live) |
| 0010 | support | `sla_policies` (global: tier × priority → response_min, resolve_min, escalation roles), `tickets`, `ticket_events` |
| 0011 | assessment | `assessments`, `assessment_scores` (dimension, score, peer_score, scenario), `roadmap_items` |
| 0012 | demo_reset | `seed_snapshot_rooms`, `seed_snapshot_reservations`, `seed_snapshot_hk_tasks`, `seed_snapshot_tickets`; function `demo_reset(tenant)` |

Every tenant table has the following:
- `id uuid`, `tenant_id uuid not null`, `origin text not null default 'demo'` (the seed writes `'seed'`) and `created_at`
- an index on `tenant_id`
- **composite foreign keys** `(tenant_id, x_id) → x(tenant_id, id)`, so a row cannot reference another tenant's row even through a bug

### 6.2 RLS policy pattern

```sql
alter table public.X enable row level security;
create policy x_tenant_select on public.X for select to authenticated using (app.is_member(tenant_id));
create policy x_tenant_insert on public.X for insert to authenticated with check (app.is_member(tenant_id));
create policy x_tenant_update on public.X for update to authenticated using (app.is_member(tenant_id)) with check (app.is_member(tenant_id));
create policy x_tenant_delete on public.X for delete to authenticated using (app.is_member(tenant_id));
```

- **Isolation is enforced by the database; role restrictions are enforced by the app.** RLS guarantees tenant isolation. Persona and role limits, such as a housekeeper not seeing finance, are enforced in the UI and server actions. That is enough for a demo, and the plan states it openly.
- **Public (anon) reads.** Anonymous users can select only `room_types`, `rate_plans`, `daily_rates`, `site_content` where `published`, and `kb_articles`. They have no write policies at all. Bookings, leads and portal writes go through server routes using the service role, with the tenant taken from the URL slug and input validated by Zod.
- **Global tables** (`tier_features`, `sla_policies`): authenticated and anon users can read them. Only the service role can write them.
- **Tier is not an RLS concern.** It gates the UI and actions, not row visibility.

### 6.3 RLS test plan

| Test | Tool | Asserts |
| --- | --- | --- |
| `000_rls_meta.sql` | pgTAP | Every `public` table with a `tenant_id` column has RLS enabled and policies for all four commands. Every `public` table *without* `tenant_id` is on an explicit allowlist (`tier_features`, `sla_policies`). **This catches the forgotten new table.** |
| `010_cross_tenant.sql` | pgTAP (loops over all tenant tables dynamically) | Signed in as a Lakeview GM (`set local role authenticated` plus JWT claims): `select count(*) where tenant_id = acacia` = 0; inserting a row with Acacia's `tenant_id` raises an error; updating or deleting Acacia rows affects 0 rows. |
| `020_anon.sql` | pgTAP | Anon users cannot read guests, reservations, folios, payments or tickets, and can read published `site_content`. |
| `030_composite_fk.sql` | pgTAP | Inserting a `reservation_room` with a Lakeview reservation and an Acacia room fails. |
| `rls.spec.ts` | Playwright | The Lakeview GM opens `/acacia/app` and gets 403. A Realtime subscription as an Acacia user receives no event when a Lakeview room changes. |

These run in CI (`supabase test db` on a local stack) and **must pass before every deploy**.

## 7. Seed design

The generator lives in `scripts/seed/` and runs as `pnpm seed [--tenant lakeview|acacia|highland|all] [--seed 20261025] [--anchor YYYY-MM-DD]`. It writes over a direct Postgres connection (`postgres` library, batched inserts) and creates persona auth users through the Supabase Admin API.

**Determinism.**
- A `mulberry32` PRNG (no dependency) is forked per stream (`rng.fork('reservations')`), so adding a stream does not shift the others.
- Same seed and anchor give byte-identical output, which a Vitest test checks by hashing the generated rows.
- Fixtures for the storyline are hand-written, not random.

**Per-tenant profile** (`scripts/seed/tenants/*.ts`):

| Tenant | Rooms / properties | Tier | Dataset |
| --- | --- | --- | --- |
| Lakeview Suites and Spa (`lakeview`) | 210 / 2 (180 + 30) | Growth | Full: 365 days back, 120 days forward |
| Acacia Court Hotel (`acacia`) | 90 / 1 | Essential | Full |
| Highland Grand Resort (`highland`) | 340 / 1 | Premium | Light: 90 days back, 30 days forward, no chat history |

**What it generates for Month 0, the live hotel and "Before HDTP" baseline.**
- **Inventory.** It generates 4 or 5 room types, rooms by floor, 4 rate plans (BAR, non-refundable, corporate, package) and daily rates from −365 to +120 days. Rates vary by season, weekday and event:
  - Enkutatash, Meskel, Genna and Timket
  - the AU summit in February
  - the conference season
- **Reservations.**
  - Occupancy targets curve: monthly base × weekday factor (business hotel: Mon to Thu high; resort: weekends high) × event uplift, plus noise.
  - Lead time and length of stay follow skewed distributions.
  - **Channel mix before HDTP: OTA 55 to 65%**, direct about 25 to 32%, walk-in the rest.
  - Status follows the date: past stays are checked_out, about 8% cancelled and about 3% no_show; current stays are in_house; future stays are confirmed.
- **Guests.** Generated from name lists, with a nationality mix (domestic, diaspora, regional, international) and a repeat rate of about 18% (this drives retention).
- **Folios and payments.** Room nights plus F&B, spa (Lakeview and Highland) and extras, then 10% service charge and 15% VAT. Payments are settled at check-out, and OTA bookings carry 17% commission.
- **Operations.**
  - hk_tasks for the last 14 days and today
  - current room status consistent with in-house guests
  - feedback for about 30% of checkouts (CSAT about 4.0 of 5)
  - helpdesk tickets for 12 months, with SLA outcomes, plus 3 open (one near breach, one breached and escalated)
  - chat conversations
  - `kb_articles` (20 to 30 intents per tenant)
  - `site_content` (offers, gallery, reviews, menu)
- **Synthetic marketing data.** Daily web sessions, conversions and marketing spend.
- **`kpi_daily` with scenario 'before'.** Rolled up from the generated transactions, so the dashboards reconcile with the front-office lists.
- **Phase 1 data.**
  - maturity scores (6 dimensions, plus a peer benchmark)
  - roadmap_items from the tier
  - forecasts for the next 90 days, with bands

**What it generates for Month 24 (KPI level only).** It re-runs the reservation, folio and web generators **in memory** with Month-24 parameters from `proposal.ts`:
- direct share ×1.4
- OTA share down accordingly
- occupancy +6 pp and ADR +8%
- CSAT +0.4 and repeat rate +10 pp
- web conversion ×2

It rolls those up and writes **only** `kpi_daily` rows with scenario 'm24', `assessment_scores` with scenario 'm24' and m24 forecasts. Nothing transactional is written for Month 24.

**Storyline fixtures** (`fixtures.ts`, relative to the anchor):
- Room 512 (Deluxe King, floor 5) is occupied by a seeded guest **departing today**, with an open folio of 2 nights plus minibar.
- At least 3 Deluxe King rooms are free tonight.
- There are 12 arrivals and 9 departures today.
- One helpdesk ticket is breached and escalated, and one is near breach.

**Reset.** `seed` ends by copying the mutable columns into the snapshot tables. `demo_reset(tenant)` deletes `origin='demo'` rows in reverse dependency order, restores the snapshots, sets `program_month = 0` and returns in under a second.

**How the program-month slider uses the data.** The slider writes `demo_state.program_month` ∈ {0, 6, 12, 24}. The executive dashboard reads both scenarios for the trailing 12 months and shows `before + (m24 − before) × adoption(month)`. Adoption follows an S-curve: 0 → 0, 6 → 0.25, 12 → 0.6, 24 → 1.0, defined in `proposal.ts`.
- **Month 0** shows real rollups.
- **Months 6 to 24** show the interpolated values, plus the "Illustrative projection: not client results" banner and a dashed target line.
- **The Live today strip ignores the slider.** It always shows live data.

## 8. Feature specifications

### 8.1 Build properly (8): acceptance criteria and one Playwright test each

| # | Feature | Acceptance criteria | Playwright test |
| --- | --- | --- | --- |
| B1 | Tenant, tier and theme switching (plus personas) | (1) The hotel switcher re-themes site, portal and console without a full reload error. (2) A tier flip changes navigation and locks or unlocks modules in **under 1 second**; locked modules show an upgrade prompt naming the required tier. (3) Persona switch lands on that persona's home in under 2 seconds. (4) Gated server actions reject calls when the tier is too low. | `platform.spec.ts`: switch Lakeview → Acacia and assert the `--primary` CSS variable changes; set Essential, assert "Workflow builder" is locked; set Premium, assert it unlocks within 1000 ms (measured). |
| B2 | Flint branding layer | (1) The console bar shows on every screen when the presenter cookie is set, and never otherwise. (2) "Powered by Flint Technologies PLC" appears in the footer of every tenant site, portal and console page. (3) `/login` and `/demo` use Flint tokens from one config file. (4) Tenant theme changes never alter the Flint layer. | `branding.spec.ts`: for 3 tenants × 3 surfaces, assert footer text, and console bar visible only with the cookie. |
| B3 | Booking engine and mock payment | (1) Availability excludes sold-out room types for the chosen dates. (2) Price = Σ daily rate × nights + extras + service + VAT, matching the folio. (3) Test cards: success, decline (nothing created), 3DS (challenge modal, then success). Any other number is rejected client-side, and the server never receives a card number. (4) Success creates reservation (channel `direct`), folio, payment and outbox rows atomically, and shows a confirmation code and portal link. (5) Works at 390 px width. | `booking.spec.ts`: book Deluxe King tonight for 2 nights; decline card shows an error and no reservation; 3DS card shows the challenge, approve, and the confirmation appears; check the reservation shows in the front-office list. |
| B4 | Front office: check-in, check-out, walk-in | (1) Today's arrivals and departures lists match the database. (2) Check-in needs an assigned room whose status is clean or inspected; suggestions rank by preference. (3) Check-out settles the folio to zero balance and produces an invoice; the room goes dirty and an hk_task is created in the same transaction. (4) A walk-in creates a reservation with channel `walk_in`. | `front-office.spec.ts`: check out room 512, assert balance 0, invoice visible, room 512 dirty, a new hk_task; walk-in creates `walk_in` booking. |
| B5 | Housekeeping room status (realtime) | (1) Housekeeper mobile view lists tasks; Start → Clean → Inspected (supervisor). (2) The front-desk board reflects each change **within 3 seconds without reload**. (3) Isolation: other tenants receive no events. | `housekeeping.spec.ts`: two contexts (front desk desktop, housekeeper at 390×844); mark 512 clean, then inspected; assert the board chip changes without `reload()`. |
| B6 | Executive KPI dashboard and program-month slider | (1) 10 KPIs, each with value, trend, target and variance; direct share shows pp and relative change. (2) Month 0 values equal SQL rollups of `kpi_daily`. (3) Slider 6/12/24 interpolates and shows the Illustrative banner. (4) The Live today strip increments after a new booking. | `kpi.spec.ts`: read direct-bookings-today, make a booking via API, reload, assert +1; move slider to 24, assert banner and direct share > month-0 value. |
| B7 | ROI calculator | (1) Inputs: rooms, ADR, occupancy, OTA share, commission %, tier investment (from `proposal.ts`). (2) Outputs: annual commission saved, incremental revenue, payback months, 24-month net, matching the unit-tested pure function to the birr. (3) Updates within 100 ms of slider move; works on a phone. | `roi.spec.ts`: set a fixture input set; assert payback = expected (shared fixture with Vitest). |
| B8 | Helpdesk with SLA timers | (1) Create, assign, acknowledge and resolve, with priority P1 to P4 setting targets from `sla_policies` for the tenant's tier. (2) Live response and resolution countdowns. (3) A breach escalates to the next role in the matrix, recorded as a ticket_event and shown as a badge. (4) Resolved tickets show "SLA met" or "SLA breached". | `helpdesk.spec.ts`: create a P2 ticket, acknowledge and resolve, assert "SLA met"; create a P1 ticket, `page.clock.fastForward` past the response target, assert "Escalated to Support Lead". |

Cross-cutting tests:
- `nav-crawl.spec.ts` (no dead click): every nav link for 3 tenants × 3 tiers returns 200, has no error boundary, and shows either a working screen, a concept badge or a lock.
- `rls.spec.ts`.

### 8.2 Interactive on seeded data (12)

| # | Feature | Tier | Reads | Writes |
| --- | --- | --- | --- | --- |
| I1 | Public site pages (rooms, offers, gallery, reviews, event form) | E | `room_types`, `daily_rates` (from price), `site_content` | `leads` |
| I2 | Guest portal (home, online check-in, room-service request) | E | `portal_sessions`, `reservations`, `guests`, `site_content(menu_item)` | `reservations.online_checkin_at`, preferences, `service_requests` |
| I3 | Scripted AI chatbot (site) and concierge (portal, G) | E/G | `kb_articles`, `conversations`, `messages` | `messages` |
| I4 | Occupancy and revenue forecast chart | G | `forecasts` (both scenarios) | none |
| I5 | Maturity assessment radar | E | `assessments`, `assessment_scores` (+ peer) | none |
| I6 | Tier recommendation | E | form input + `tier_features` (pure function) | none |
| I7 | 24-month roadmap (Gantt) | E | `roadmap_items` filtered by tier | none |
| I8 | Direct vs OTA commission view | E | `kpi_daily` channel and commission columns, both scenarios | none |
| I9 | Operational dashboard | G | `rooms`, `hk_tasks`, today's `reservations`; outlet covers and staffing generated in memory (labeled) | none |
| I10 | Module integration map | E | static map in `src/features/hms/integration-map.ts` + tier | none |
| I11 | Quarterly business review | G | `kpi_daily` (quarter aggregates), `tickets`, `roadmap_items` | none |
| I12 | System health and status | E | generated in memory (uptime vs 99.9% target, backups, latency), labeled Illustrative | none |

### 8.3 Concept-screen template

The concept screen has one route: `/[tenant]/app/concept/[key]`, driven entirely by the `tier_features` row and the in-memory generator.

- **Header:** title, phase chip ("Phase 3 · Operations"), tier chip, and an amber **CONCEPT** badge (not dismissible).
- **"What it does":** 2 or 3 sentences paraphrasing the proposal (`description` column).
- **"In the full HDTP build":** 3 bullets (`full_build` column, a JSON array).
- **Sample visual,** chosen by `sample_kind` (`table` | `bar` | `line` | `kanban` | `timeline` | `form`), with 8 to 20 rows generated by `conceptData(key, tenantSeed)` from shared column presets. Captioned "Sample data · not live".
- **Footer note:** "Concept screen. Shown to illustrate scope; delivered in Phase N of HDTP."
- **Locked variant** (when the tier is too low): the same page, blurred behind an upgrade card ("Available from Growth"), with a link to the tier comparison.
- **Responsive:** a single column at 390 px.
- **No buttons that do nothing.** Any button present opens a "This is a concept screen" toast.

## 9. GM storyline (15 min): demo script = `tests/e2e/gm-storyline.spec.ts`

Each step is a `test.step('S<n> …')` with the same number. Steps marked ◇ are optional: they are skipped when the matching cut line is applied (env `CUT_PORTAL=1`, `CUT_AI=1`).

**Preflight (presenter, before the audience arrives):**
- `/login`, then Reset.
- Hotel **Lakeview**, tier **Growth**, month **0**, persona **GM**.
- Phone open on the housekeeper persona.

| Step | Presenter does | Talking point | Smoke test asserts |
| --- | --- | --- | --- |
| S1 | Open `/lakeview` on the projector, scroll home, click **Book now** | "Your own site, your brand, mobile-first." | Hero shows tenant name; footer "Powered by Flint" |
| S2 | Tonight → +2 nights, 2 adults, **Deluxe King, BAR**, add breakfast, guest "Hana Bekele" | "Live availability from the same database the front desk uses." | Price summary = expected total |
| S3 | Pay with the decline card, show the error, then the **3DS card**, approve the challenge | "Mock gateway, test mode, behaves like a real checkout." | Decline message; then confirmation code `LV-` and a portal link |
| S4 ◇ | Open the portal link on the phone; online check-in, preference "high floor" | "No app download; check in before arrival." | "Online check-in complete" |
| S5 | Persona **Front Desk**: Arrivals today shows Hana (Direct, Online ✓). Departures: check out **room 512**, settle by card, show invoice | "Direct booking, zero commission." | Hana in arrivals with Direct chip; 512 balance 0; 512 status Dirty |
| S6 | Phone, persona **Housekeeping**: the new task for 512 appears; Start → Clean; supervisor marks Inspected | "Check-out creates the task automatically." | Projector board: 512 → Inspected without reload (≤3 s) |
| S7 | Front Desk: assign Hana to 512 (suggested, high floor), **check in** | "One booking, one record, every department." | Hana In-house, room 512 |
| S8 | Persona **GM**: Executive dashboard. The Live today strip shows +1 direct booking and an updated direct share. Then slide month 0 → 12 → 24 | "Where the program takes you; illustrative projection." | Direct today +1; banner at 24; direct share > month-0 |
| S9 ◇ | Portal concierge: "What time is breakfast?" and "Can you book a massage tomorrow?" | "AI answers 24/7 and hands off to staff." | Scripted answer with confidence chip; hand-off message |
| S10 | GM raises ticket "Restaurant printer offline" (P2). Persona **Flint Support** acknowledges and resolves. Show the seeded breached ticket and its escalation | "This is what support under SLA looks like." | "SLA met" on the new ticket; "Escalated" badge on the seeded one |
| S11 | Console: tier → **Essential** (CRM, HR and concierge lock), back to Growth; hotel → Acacia (re-themed) | "Tiers are configuration; same platform, any hotel." | Lock appears in ≤1 s; Acacia theme variable |

Total stage time is about 13 minutes, with 2 minutes of buffer for questions.

**Owner storyline (10 min, rehearsed first per A3).** ROI calculator with the owner's numbers → direct vs OTA commission view → tier comparison (console tier flip) → executive dashboard at Month 24 → close on the 24-month roadmap.

## 10. Fallback plan

**Level 1: local stack (no internet).**
- Docker Desktop and the Supabase images are pre-pulled. `.env.offline` points `NEXT_PUBLIC_SUPABASE_URL` to the **laptop's LAN IP**, not localhost, so the phone can reach it.
- Start it with `pnpm offline`, which runs:
  - `supabase start`
  - `supabase db reset`
  - `pnpm seed --tenant all`
  - `pnpm build`
  - `next start -H 0.0.0.0`
- No CDNs: fonts are self-hosted via `next/font` and images are in `/public`.
- Phone path: the laptop hotspot, with a Windows Firewall rule for ports 3000 and 54321.
- **Tested on Fri 23 with Wi-Fi off, and again on Sat 24.**

**Level 2: backup video.**
- A 5-minute GM cut and a 3-minute Owner cut, 1080p, recorded with OBS from the real app.
- Draft on Sat 24 after the dry run; final on Sun 25.
- Stored on the laptop, a USB drive and cloud storage. It plays offline.

**Level 3: screenshot PDF.** 15 key screens with the talking points.

**Switching rule.** At the venue, open the prod URL during setup.
- If any page takes over 3 seconds or an error appears, switch to local.
- If the laptop itself fails, play the video from the USB drive on the venue machine.

**Every demo morning:**
- `pnpm seed --tenant all` on prod
- `pnpm test:e2e --project=prod`
- Reset

## 11. Risk register (plan level)

| Risk | Mitigation |
| --- | --- |
| Zero-slack schedule over 14 consecutive days | Daily definition of done at 20:00, per-block cut lines, protected days 24 and 25 |
| Seed generator overruns Day 3 | Lakeview only on Day 3; Acacia and Highland on Day 12 from the same code; Vitest determinism test |
| Cross-tenant leak | Composite foreign keys, the RLS meta-test that catches new tables, service role confined to one file |
| Wrong proposal numbers on screen | One `proposal.ts` file marked PLACEHOLDER; the proposal needed in `docs/` by Day 8 |
| Venue or network failure | Three-level fallback, rehearsed twice |
| Concept or mock mistaken for real | CONCEPT, Demo data and Illustrative labels, asserted by `nav-crawl.spec.ts` |
| Supabase Free pauses or fills up; Vercel Hobby terms | Daily keep-alive Action, `TRUNCATE`-based reseed, size check on Day 3, local fallback; Vercel Hobby accepted by the owner (19 Oct) |

## 12. Summary

**Top 5 risks**
1. A zero-slack 14-day schedule, weekends included. The seed generator is a hidden ninth Build feature.
2. A cross-tenant leak through RLS or misuse of the service role.
3. The proposal is not in the repo, so SLA, Table 9 and tier-price numbers on screen are placeholders until it is added.
4. Venue network or live-demo failure (three-level fallback, rehearsed twice).
5. Concept, mock or Month-24 data mistaken for real results in front of a sharp GM.

**Assumptions** are A1 to A11 in §2. The biggest:
- direct share by booking count, with the +30 to 50% read as relative
- placeholder Flint brand and proposal figures
- Owner storyline first
- all 14 days worked
- ETB
- Supabase Free (with keep-alive) and Vercel Hobby (decided 19 Oct)

**First three tasks, Monday 12 Oct**
1. `git init`, a private GitHub repo in the Flint org, move the blueprint to `docs/` and commit the plan files. Create the Supabase Free (Frankfurt) and Vercel Hobby (fra1) projects.
2. Scaffold Next.js (TypeScript, Tailwind, App Router), shadcn/ui, `supabase init`, Playwright and Vitest, add the pnpm scripts, and deploy hello-world to Vercel.
3. Migrations 0001 and 0002 (helpers, tenancy, tier_features, memberships) plus pgTAP `000_rls_meta` and `010_cross_tenant`, passing with `supabase test db`.
