/**
 * Deterministic seed generator (docs/PLAN.md §7).
 *   pnpm seed [--tenant lakeview|acacia|highland|all] [--seed 20261025] [--anchor YYYY-MM-DD] [--env .env.cloud]
 * Writes the catalog, tenants, persona users and everything generateTenant() returns
 * (inventory, rates, site content and, for full datasets, bookings), then snapshots the
 * mutable seed columns for demo_reset(). KPIs, tickets and assessments arrive in Block 4.
 */
import { config } from "dotenv";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";
import { loadCatalog } from "./catalog";
import { stableId } from "./ids";
import { hotelToday } from "./calendar";
import { generateTenant, TABLE_ORDER, type SeedRows } from "./generate";
import { PROFILES, type TenantProfile } from "./tenants/profiles";
import { PERSONAS, personaEmail } from "../../src/features/platform/personas";

const args = parseArgs(process.argv.slice(2));
config({ path: args.env, quiet: true });
console.log(`env=${args.env} db=${new URL(must("NEXT_PUBLIC_SUPABASE_URL")).host}`);

const sql = postgres(must("DATABASE_URL"), { max: 1, onnotice: () => {} });
const admin = createClient(must("NEXT_PUBLIC_SUPABASE_URL"), must("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  const profiles = args.tenant === "all" ? PROFILES : PROFILES.filter((p) => p.slug === args.tenant);
  if (profiles.length === 0) throw new Error(`Unknown tenant ${args.tenant}`);
  console.log(`seed=${args.seed} anchor=${args.anchor} tenants=${profiles.map((p) => p.slug).join(",")}`);

  await seedCatalog();
  for (const profile of profiles) {
    const tenantId = stableId(`tenant:${profile.slug}`);
    const started = Date.now();
    const rows = generateTenant(tenantId, profile, { seed: args.seed, anchor: args.anchor });
    await seedTenant(tenantId, profile, rows);
    await seedPersonas(tenantId, profile.slug);
    console.log(`  ${profile.slug}: ${summary(rows)} (${((Date.now() - started) / 1000).toFixed(1)} s)`);
  }
  await seedFlintSupport();
  await sql.end();
}

async function seedCatalog() {
  const rows = loadCatalog();
  await sql.begin(async (tx) => {
    await tx`delete from public.tier_features where feature_key not in ${tx(rows.map((r) => r.feature_key))}`;
    await tx`
      insert into public.tier_features ${tx(rows, "feature_key", "category", "phase", "title", "min_tier", "depth", "level")}
      on conflict (feature_key) do update set
        category = excluded.category, phase = excluded.phase, title = excluded.title,
        min_tier = excluded.min_tier, depth = excluded.depth, level = excluded.level`;
  });
  console.log(`  catalog: ${rows.length} features`);
}

async function seedTenant(tenantId: string, p: TenantProfile, rows: SeedRows) {
  await sql.begin(async (tx) => {
    // Deleting the tenant cascades to every tenant-owned row; reinsert from scratch.
    await tx`delete from public.tenants where id = ${tenantId}`;
    await tx`
      insert into public.tenants (id, slug, name, tier, theme, settings, currency)
      values (${tenantId}, ${p.slug}, ${p.name}, ${p.tier}, ${tx.json(p.theme)}, ${tx.json(p.settings)}, ${p.currency})`;
    await tx`
      insert into public.demo_state (tenant_id, program_month, seed_anchor, seeded_at, origin)
      values (${tenantId}, 0, ${args.anchor}, now(), 'seed')`;
    for (const table of TABLE_ORDER) {
      const data = rows[table];
      if (data.length === 0) continue;
      const cols = Object.keys(data[0]);
      // Stay under Postgres's 65,535 bind parameters per statement.
      const size = Math.floor(60_000 / cols.length);
      for (let i = 0; i < data.length; i += size) {
        const batch = data.slice(i, i + size).map(toDbRow);
        await tx`insert into ${tx("public." + table)} ${tx(batch, cols)}`;
      }
    }
    // Baseline for the Reset button (demo_reset() restores these columns).
    await tx`select app.take_seed_snapshot(${tenantId})`;
  });
}

/**
 * Objects go to jsonb through sql.json() (a stringified object would be stored as a JSON
 * string, not an object); arrays stay arrays (text[]).
 */
function toDbRow(row: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = v !== null && typeof v === "object" && !Array.isArray(v) ? sql.json(v as postgres.JSONValue) : v;
  }
  return out as Record<string, string>;
}

function summary(rows: SeedRows) {
  const n = (k: keyof SeedRows) => rows[k].length.toLocaleString("en-US");
  return `${n("rooms")} rooms, ${n("daily_rates")} rates, ${n("reservations")} reservations, ${n("folio_items")} folio items`;
}

async function seedPersonas(tenantId: string, slug: string) {
  for (const { role, label } of PERSONAS.filter((p) => p.role !== "flint_support")) {
    const userId = await ensureUser(personaEmail(role, slug), `${label} (${slug})`);
    await sql`
      insert into public.memberships (tenant_id, user_id, role, origin)
      values (${tenantId}, ${userId}, ${role}, 'seed')
      on conflict (tenant_id, user_id) do update set role = excluded.role`;
  }
}

async function seedFlintSupport() {
  const userId = await ensureUser(personaEmail("flint_support", ""), "Flint Support");
  const tenants = await sql<{ id: string }[]>`select id from public.tenants`;
  for (const t of tenants) {
    await sql`
      insert into public.memberships (tenant_id, user_id, role, origin)
      values (${t.id}, ${userId}, 'flint_support', 'seed')
      on conflict (tenant_id, user_id) do update set role = excluded.role`;
  }
}

/** Creates the auth user if missing and resets the shared persona password. */
async function ensureUser(email: string, fullName: string): Promise<string> {
  const password = must("DEMO_PERSONA_PASSWORD");
  const [existing] = await sql<{ id: string }[]>`select id from auth.users where email = ${email}`;
  let id = existing?.id;
  if (id) {
    const { error } = await admin.auth.admin.updateUserById(id, { password });
    if (error) throw error;
  } else {
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw error;
    id = data.user.id;
  }
  await sql`
    insert into public.profiles (id, full_name) values (${id}, ${fullName})
    on conflict (id) do update set full_name = excluded.full_name`;
  return id;
}

function parseArgs(argv: string[]) {
  const get = (flag: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  return {
    tenant: get("--tenant") ?? "all",
    seed: Number(get("--seed") ?? 20261025),
    // "Today" in Addis Ababa, matching app.hotel_today() in the database.
    anchor: get("--anchor") ?? hotelToday(),
    // .env.cloud targets the hosted project; the default is the local stack.
    env: get("--env") ?? ".env.local",
  };
}

function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} in ${args.env} (see .env.example)`);
  return v;
}

main().catch(async (err) => {
  console.error(err);
  await sql.end({ timeout: 1 });
  process.exit(1);
});
