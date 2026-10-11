-- 0002: tenancy and access. tenants, properties, profiles, memberships,
-- tier_features, tenant_feature_overrides, demo_state.

-- Tenant metadata (name, slug, tier, theme) is public: the hotel website shows it.
-- No tenant_id column, so it is on the allowlist in 000_rls_meta.sql.
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  tier public.tier not null default 'essential',
  theme jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  currency text not null default 'ETB',
  created_at timestamptz not null default now()
);

alter table public.tenants enable row level security;
create policy tenants_public_select on public.tenants for select to anon, authenticated using (true);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.staff_role not null,
  origin public.data_origin not null default 'demo',
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

create index memberships_user_idx on public.memberships (user_id);

-- Security definer so policies on memberships itself do not recurse.
create function app.is_member(t uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.tenant_id = t and m.user_id = (select auth.uid())
  );
$$;

revoke all on function app.is_member(uuid) from public;
grant execute on function app.is_member(uuid) to authenticated, service_role;

-- Members can see who else is on their tenant; memberships are written by the service role only.
select app.apply_tenant_rls('public.memberships', writable => false);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy profiles_self_or_colleague_select on public.profiles for select to authenticated using (
  id = (select auth.uid())
  or exists (
    select 1 from public.memberships m
    where m.user_id = profiles.id and app.is_member(m.tenant_id)
  )
);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  city text not null,
  is_primary boolean not null default false,
  origin public.data_origin not null default 'demo',
  created_at timestamptz not null default now(),
  unique (tenant_id, id)
);

create index properties_tenant_idx on public.properties (tenant_id);
select app.apply_tenant_rls('public.properties', writable => false);

-- Global catalog, loaded from supabase/seed/tier_features.csv by the seed script.
create table public.tier_features (
  feature_key text primary key check (feature_key ~ '^[a-z_]+(\.[a-z_]+)+$'),
  category text not null,
  phase int not null check (phase between 0 and 7),
  title text not null,
  min_tier public.tier not null,
  depth text not null check (depth in ('deep', 'medium', 'light')),
  level text not null check (level in ('build', 'interactive', 'concept', 'support')),
  description text,
  full_build jsonb,
  sample_kind text check (sample_kind in ('table', 'bar', 'line', 'kanban', 'timeline', 'form'))
);

alter table public.tier_features enable row level security;
create policy tier_features_public_select on public.tier_features for select to anon, authenticated using (true);

create table public.tenant_feature_overrides (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  feature_key text not null references public.tier_features (feature_key) on delete cascade,
  enabled boolean not null,
  origin public.data_origin not null default 'demo',
  created_at timestamptz not null default now(),
  unique (tenant_id, feature_key)
);

create index tenant_feature_overrides_tenant_idx on public.tenant_feature_overrides (tenant_id);
select app.apply_tenant_rls('public.tenant_feature_overrides', writable => false);

-- One row per tenant: the program-month slider position and the seed anchor ("today").
create table public.demo_state (
  tenant_id uuid primary key references public.tenants (id) on delete cascade,
  program_month int not null default 0 check (program_month in (0, 6, 12, 24)),
  seed_anchor date,
  seeded_at timestamptz,
  origin public.data_origin not null default 'seed'
);

select app.apply_tenant_rls('public.demo_state', writable => false);

-- Features resolved for a tenant: min_tier <= tenant tier, unless overridden.
-- security_invoker so it respects the caller's RLS on overrides.
create view public.tenant_features
with (security_invoker = true)
as
select
  t.id as tenant_id,
  f.feature_key,
  f.min_tier,
  f.level,
  coalesce(o.enabled, app.tier_rank(f.min_tier) <= app.tier_rank(t.tier)) as enabled
from public.tenants t
cross join public.tier_features f
left join public.tenant_feature_overrides o
  on o.tenant_id = t.id and o.feature_key = f.feature_key;

-- Tier switches and theme changes must reach every open device (B1: unlock within 1 s).
alter publication supabase_realtime add table public.tenants;
