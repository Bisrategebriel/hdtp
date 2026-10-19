-- 0003: inventory. room_types, rooms, rate_plans, daily_rates and availability().
-- See docs/PLAN.md §6.1. Room types, rate plans and daily rates are public (the website
-- shows them); rooms are staff-only.

create table public.room_types (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  property_id uuid not null,
  code text not null,
  name text not null,
  description text not null default '',
  bed text not null,
  size_sqm int not null,
  max_adults int not null check (max_adults between 1 and 6),
  base_rate numeric(12, 2) not null check (base_rate > 0),
  amenities text[] not null default '{}',
  image text,
  sort int not null default 0,
  origin public.data_origin not null default 'demo',
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (property_id, code),
  foreign key (tenant_id, property_id) references public.properties (tenant_id, id) on delete cascade
);

create index room_types_tenant_idx on public.room_types (tenant_id);
select app.apply_tenant_rls('public.room_types', writable => false);
create policy room_types_public_select on public.room_types for select to anon using (true);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  property_id uuid not null,
  room_type_id uuid not null,
  number text not null,
  floor int not null,
  status public.room_status not null default 'clean',
  origin public.data_origin not null default 'demo',
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (property_id, number),
  foreign key (tenant_id, property_id) references public.properties (tenant_id, id) on delete cascade,
  foreign key (tenant_id, room_type_id) references public.room_types (tenant_id, id) on delete cascade
);

create index rooms_tenant_idx on public.rooms (tenant_id);
create index rooms_type_idx on public.rooms (room_type_id);
select app.apply_tenant_rls('public.rooms');

create table public.rate_plans (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  code text not null,
  name text not null,
  description text not null default '',
  refundable boolean not null default true,
  includes_breakfast boolean not null default false,
  sort int not null default 0,
  origin public.data_origin not null default 'demo',
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, code)
);

create index rate_plans_tenant_idx on public.rate_plans (tenant_id);
select app.apply_tenant_rls('public.rate_plans', writable => false);
create policy rate_plans_public_select on public.rate_plans for select to anon using (true);

-- One price per room type, rate plan and night.
create table public.daily_rates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  room_type_id uuid not null,
  rate_plan_id uuid not null,
  date date not null,
  amount numeric(12, 2) not null check (amount > 0),
  origin public.data_origin not null default 'demo',
  unique (tenant_id, id),
  unique (room_type_id, rate_plan_id, date),
  foreign key (tenant_id, room_type_id) references public.room_types (tenant_id, id) on delete cascade,
  foreign key (tenant_id, rate_plan_id) references public.rate_plans (tenant_id, id) on delete cascade
);

create index daily_rates_tenant_idx on public.daily_rates (tenant_id);
select app.apply_tenant_rls('public.daily_rates', writable => false);
create policy daily_rates_public_select on public.daily_rates for select to anon using (true);
