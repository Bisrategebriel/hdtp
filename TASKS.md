# TASKS: HDTP Concept Platform

Tags: `[Day]` · level **B** (Build) / **I** (Interactive) / **C** (Concept) / **S** (support/infra) · tier **E/G/P**. The list is ordered by dependency.

## Block 1: Foundation
- [ ] [D1][S][E] git init, private GitHub repo (Flint org), move blueprint to `docs/`, commit plan files
- [ ] [D1][S][E] Supabase Free project (eu-central-1), Vercel Pro project (fra1), env vars, `.env.example`
- [ ] [D1][S][E] GitHub Action: daily Supabase keep-alive query (prevents Free-tier pausing)
- [x] [D1][S][E] Scaffold Next.js + TS + Tailwind + shadcn/ui; `supabase init`; Playwright + Vitest; pnpm scripts
- [ ] [D1][S][E] Migration 0001: extensions, `app` schema, enums, `app.is_member()`
- [ ] [D1][B][E] Migration 0002: tenants, properties, profiles, memberships, tier_features, overrides, demo_state + RLS
- [ ] [D1][S][E] pgTAP `000_rls_meta.sql` + `010_cross_tenant.sql` green
- [ ] [D1][S][E] Hello-world deploy on Vercel
- [ ] [D2][B][E] `proxy.ts` tenant resolution + tenant layout + 404 for unknown slug
- [ ] [D2][B][E] Theme engine (CSS vars, 3 font pairs via next/font, wordmark logos)
- [x] [D2][S][E] Load `tier_features.csv` in seed; `pnpm catalog:types`
- [ ] [D2][B][E] `getFeatures()`, `<Feature>`, `requireFeature()`, catalog-driven nav with lock states
- [ ] [D2][B][E] Flint layer: console bar, footer, `/login`, presenter cookie, `flint-brand.ts`
- [ ] [D2][B][E] Persona auth users + persona-switch server action
- [x] [D2][S][E] Adapter interfaces + mocks (payment, ai, messaging, digital-key)
- [ ] [D2][C][E] Concept template route `app/concept/[key]` + locked variant
- [ ] [D2][B][E] `platform.spec.ts`, `branding.spec.ts`
- [ ] **M1 check:** switch hotel/tier on prod, unlock < 1 s, RLS green

## Block 2: Data and website booking
- [ ] [D3][S][E] Migrations 0003–0012 with RLS + pgTAP per table (`020_anon`, `030_composite_fk`)
- [ ] [D3][S][E] Seed: rng, calendar (holidays/events), inventory and rates (Lakeview)
- [ ] [D3][S][E] Seed: guests, reservations, folios, payments, hk_tasks, feedback, tickets, kb, site_content
- [ ] [D3][S][E] Seed: `kpi_daily` 'before' rollup, forecasts, assessment, roadmap; m24 in-memory run → 'm24' rows
- [ ] [D3][S][E] Storyline fixtures (room 512 departure, 3 free Deluxe King, breached/near-breach tickets)
- [ ] [D3][S][E] Snapshot tables + `demo_reset()`; reset button wired
- [ ] [D3][S][E] Vitest: seed determinism hash
- [ ] [D4][I][E] Public site: home, rooms, offers, about, contact (themed, mobile-first)
- [ ] [D4][I][E] Gallery, reviews, event form → `leads`
- [ ] [D4][B][E] Booking step 1: search, `availability()`, rates
- [ ] [D5][B][E] Booking: extras, guest details (Zod)
- [ ] [D5][B][E] Mock gateway UI: allowlist, decline, 3DS challenge, TEST MODE banner, token-only submit
- [ ] [D5][B][E] `create_booking` RPC + confirmation + portal token + outbox row
- [ ] [D5][B][E] `booking.spec.ts`
- [ ] **M2 check:** booking with 3DS card on prod creates reservation/folio/payment/outbox

## Block 3: Hotel operations
- [ ] [D6][B][E] Reservation list + calendar, filters, channel/online badges
- [ ] [D6][B][E] Arrivals/departures today; check-in with room suggestions
- [ ] [D6][B][E] Check-out: folio, mock settlement, invoice (print CSS); `check_out` RPC creates hk_task
- [ ] [D6][B][E] Walk-in (`create_walk_in`)
- [ ] [D7][B][E] Front-desk room board (by floor, status chips)
- [ ] [D7][B][E] Housekeeper mobile view: Start → Clean → Inspected
- [ ] [D7][B][E] Realtime subscriptions (rooms, hk_tasks) with RLS
- [ ] [D7][B][E] `front-office.spec.ts`, `housekeeping.spec.ts` (two contexts)
- [ ] **M3 check:** 512 check-out → clean on phone → board updates ≤ 3 s → check-in

## Block 4: Proof of value
- [ ] [D8][S][E] `src/config/proposal.ts` (targets, SLA, tier prices, adoption curve) — real values if the proposal has arrived
- [ ] [D8][B][E] Executive KPI suite (10 KPIs: value, trend, target, variance)
- [ ] [D8][B][E] Live today strip (`v_kpi_today`)
- [ ] [D8][B][E] Program-month slider + interpolation + Illustrative banner
- [ ] [D8][B][E] `kpi.spec.ts`
- [ ] [D9][B][E] ROI pure function + Vitest fixtures; calculator UI
- [ ] [D9][B][E] Helpdesk: create/assign/ack/resolve; SLA policies by tier
- [ ] [D9][B][E] SLA countdowns, escalation on read, ticket_events; Flint Support persona
- [ ] [D9][B][E] `roi.spec.ts`, `helpdesk.spec.ts`
- [ ] [D9][S][E] `gm-storyline.spec.ts` core steps (S1–S3, S5–S8, S10–S11)
- [ ] **M4 check:** storyline core + 8 feature specs green on prod

## Block 5: Guest, AI and interactive screens
- [ ] [D10][I][E] Guest portal home + online check-in (writes reservation) + room-service request
- [ ] [D10][I][E] AIProvider mock: intent matching over `kb_articles`
- [ ] [D10][I][E] Site chatbot widget with booking hand-off
- [ ] [D10][I][G] Portal AI concierge with confidence + staff hand-off
- [ ] [D10][S][E] Outbox screen
- [ ] [D11][I][G] Forecast chart (both scenarios, bands)
- [ ] [D11][I][E] Maturity radar (vs peer, before/m24)
- [ ] [D11][I][E] Tier recommendation
- [ ] [D11][I][E] 24-month roadmap Gantt
- [ ] [D11][I][E] Direct vs OTA commission view
- [ ] [D11][I][G] Operational dashboard
- [ ] [D11][I][E] Module integration map
- [ ] [D11][I][G] Quarterly business review
- [ ] [D11][I][E] System health and status
- [ ] [D11][S][E] Enable storyline S4 and S9
- [ ] **Block 5 check:** full storyline green on prod

## Block 6: Concept screens, freeze and rehearsal
- [ ] [D12][C][E/G/P] Descriptions, `full_build` bullets and `sample_kind` for every concept row in CSV
- [ ] [D12][S][E] Acacia full seed; [D12][S][P] Highland light seed
- [ ] [D12][S][E] `/demo` storyline checklist (Owner + GM)
- [ ] [D12][S][E] `nav-crawl.spec.ts` (3 tenants × 3 tiers)
- [ ] [D12][S][E] Viewport pass 390×844 and 1280×720
- [ ] [D12][S][E] `pnpm offline` rehearsal with Wi-Fi off
- [ ] **[D12] FEATURE FREEZE 18:00**
- [ ] [D13][S][E] Reseed prod + full e2e on prod
- [ ] [D13][S][E] Dry run with friendly GM; bug fixes only
- [ ] [D13][S][E] Backup video draft
- [ ] [D14][S][E] Reseed, full e2e on prod and local, reset
- [ ] [D14][S][E] Final backup videos (GM 5 min, Owner 3 min) + screenshot PDF → laptop, USB, cloud
- [ ] **M5: demo ready**

## Open (non-code)
- [ ] Confirm hotel names via Google Maps/Booking.com (Addis, Bishoftu, Hawassa) before D2
- [ ] Add HDTP proposal to `docs/` before D8 (Tables 2, 8, 9; Sections 13, 14)
- [ ] Code and asset ownership assigned to Flint in writing before D1
- [ ] Flint logo and brand tokens; demo domain
