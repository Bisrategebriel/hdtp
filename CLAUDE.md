# HDTP Concept Platform

@AGENTS.md

A Flint-owned, multi-tenant **sales demo** of the Hotel Digital Transformation Program (HDTP). It is not a production HMS. Source of truth: `docs/hdtp-blueprint.md`; plan: `docs/PLAN.md`; backlog: `TASKS.md`.

## Stack
Next.js (App Router, current stable, pinned) · TypeScript strict · Tailwind · shadcn/ui · Recharts (via shadcn charts) · Supabase (Postgres, Auth, RLS, Realtime, Storage) · Zod · Vercel (fra1) · Playwright (e2e) · Vitest (unit) · pgTAP (RLS). Package manager: **pnpm**.

## Commands
| Command | Does |
| --- | --- |
| `pnpm dev` | Next dev server |
| `pnpm db:start` / `db:stop` | Local Supabase (Docker) |
| `pnpm db:reset` | Re-apply migrations to local DB |
| `pnpm seed [--tenant x] [--seed n] [--anchor date]` | Deterministic seed generator |
| `pnpm catalog:types` | Regenerate `src/config/feature-keys.ts` from `supabase/seed/tier_features.csv` |
| `pnpm test:rls` | `supabase test db` (pgTAP) |
| `pnpm test:unit` | Vitest |
| `pnpm test:e2e` | Playwright (local; `--project=prod` for deployed) |
| `pnpm typecheck` / `pnpm lint` | tsc / eslint |
| `pnpm offline` | Full local fallback stack (see docs/PLAN.md §10) |

## Layout
- `src/app/[tenant]/(site)` public site and booking · `[tenant]/stay/[token]` guest portal · `[tenant]/app` staff console · `app/concept/[key]` concept template · `(flint)` presenter shell.
- `src/features/<area>/` holds all code for an area (`components/`, `actions.ts`, `queries.ts`, `schema.ts`). Areas: platform, website, hms, portal, ai, bi, roi, support, assessment, concept.
- `src/adapters/<name>/` holds the interface plus `mock.ts`. Payment, AI, messaging and digital key are **mock only**.
- `src/server/admin.ts` is the **only** place the service-role key is used (`import 'server-only'`).
- `src/config/` holds `flint-brand.ts`, `proposal.ts` (placeholder targets), `tiers.ts` and the generated `feature-keys.ts`.
- `supabase/migrations/` (numbered), `supabase/tests/` (pgTAP), `supabase/seed/tier_features.csv`, `scripts/seed/`, `tests/e2e/`, `tests/unit/`.

## Conventions
- Files are kebab-case and components PascalCase. Database identifiers are snake_case. Feature keys are dotted and must exist in `tier_features.csv`.
- Every tenant table has `tenant_id`, `origin` ('seed'|'demo'), a `tenant_id` index and composite foreign keys `(tenant_id, x_id)`. Apply RLS with `select app.apply_tenant_rls('public.x')` (or `writable => false` for read-only to members) right after `create table`. Anon read policies must be named `*_public_select`. `000_rls_meta.sql` enforces all of this, and `010_cross_tenant.sql` covers new tables automatically. Private helper and snapshot tables go in the `app` schema.
- Supabase clients: `createAnonClient()` (`src/lib/supabase/anon.ts`, no cookies) for the public site; `createClient()` (`src/lib/supabase/server.ts`) for staff screens, where RLS applies; `createAdminClient()` only from `src/server/admin.ts` callers listed there. Console actions call `verifyPresenter()` first.
- Next.js 16 (read `node_modules/next/dist/docs/` before using an API you are unsure of; see AGENTS.md): `src/proxy.ts`, not middleware; `params`, `searchParams` and `cookies()` are async; `PageProps`/`LayoutProps` are generated globals (`next typegen`, run by `pnpm typecheck`); refresh after an action with `refresh()` from `next/cache`. Cache Components is **off** on purpose (every surface is per-request dynamic).
- shadcn/ui uses the `base-nova` style on **Base UI**, not Radix: compose with the `render` prop, not `asChild`. Check the component file before using its API.
- Gate UI with `<Feature flag>`, which shows a locked state rather than hiding, and gate actions with `requireFeature()`. Never branch on tier names in components.
- Multi-step writes (booking, check-in, check-out, reset) go through Postgres functions, not chained client calls.
- Prefer Server Components and server actions. Use client components only for interactivity and Realtime.
- Validate every route and action input with Zod.

## Hard rules
- **No real card data.** Card numbers never leave the browser. The client checks them against the test-card allowlist; the server receives only a token. Use no `cc-*` autocomplete attributes, never store a card number, and show the TEST MODE banner on every payment form.
- **Label mock data.** Seeded screens carry a "Demo data" chip. Projections and slider values above 0 carry "Illustrative projection: not client results". AI screens are marked as simulated. Concept screens carry the CONCEPT badge.
- **No real hotel brands, real people or copyrighted imagery.** Use free-license stock (credit in `docs/CREDITS.md`) and text-wordmark logos only.
- **English only.** No i18n library.
- Proposal figures come only from `src/config/proposal.ts`; never hard-code a target.
- Respect the cut lines in `docs/PLAN.md §5`. Do not add scope after the Fri 23 Oct freeze.

## Testing rules
- `pnpm typecheck && pnpm lint && pnpm test:unit && pnpm test:rls` must pass before every push.
- Every Build feature has one Playwright spec. `gm-storyline.spec.ts` and `nav-crawl.spec.ts` must pass on prod before any demo.
- Pure logic (ROI, pricing, SLA clocks, seed determinism) gets Vitest tests.
- RLS changes are reviewed by hand: read the policy and run the cross-tenant test.
