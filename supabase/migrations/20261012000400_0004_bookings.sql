-- 0004: bookings. guests, reservations, reservation_rooms, folios, folio_items, payments,
-- and availability(). All staff-only: anon never reads guest or payment data
-- (supabase/tests/020_anon.sql). Public bookings go through create_booking() (0007).

create type public.folio_category as enum ('room', 'fnb', 'spa', 'extra', 'service', 'tax');
create type public.payment_method as enum ('card', 'cash', 'mobile_wallet', 'ota');

create table public.guests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  nationality text not null default 'Ethiopia',
  preferences text[] not null default '{}',
  origin public.data_origin not null default 'demo',
  created_at timestamptz not null default now(),
  unique (tenant_id, id)
);

create index guests_tenant_idx on public.guests (tenant_id);
select app.apply_tenant_rls('public.guests');

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  property_id uuid not null,
  guest_id uuid not null,
  rate_plan_id uuid not null,
  code text not null,
  channel public.channel not null,
  -- Where a direct booking came from; OTA bookings name the (fictional) agency.
  source text not null default 'website',
  status public.res_status not null default 'confirmed',
  check_in date not null,
  check_out date not null,
  adults int not null default 1 check (adults between 1 and 6),
  children int not null default 0 check (children between 0 and 6),
  total numeric(12, 2) not null default 0,
  commission numeric(12, 2) not null default 0,
  currency text not null default 'ETB',
  online_checkin_at timestamptz,
  portal_token_hash text,
  booked_at timestamptz not null default now(),
  origin public.data_origin not null default 'demo',
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, code),
  check (check_out > check_in),
  foreign key (tenant_id, property_id) references public.properties (tenant_id, id) on delete cascade,
  foreign key (tenant_id, guest_id) references public.guests (tenant_id, id) on delete cascade,
  foreign key (tenant_id, rate_plan_id) references public.rate_plans (tenant_id, id)
);

create index reservations_tenant_idx on public.reservations (tenant_id);
create index reservations_dates_idx on public.reservations (tenant_id, check_in, check_out);
create index reservations_guest_idx on public.reservations (guest_id);
create unique index reservations_portal_token_idx on public.reservations (portal_token_hash) where portal_token_hash is not null;
select app.apply_tenant_rls('public.reservations');

-- One row per room booked. room_id stays null until check-in assigns a room.
create table public.reservation_rooms (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  reservation_id uuid not null,
  room_type_id uuid not null,
  room_id uuid,
  origin public.data_origin not null default 'demo',
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, reservation_id) references public.reservations (tenant_id, id) on delete cascade,
  foreign key (tenant_id, room_type_id) references public.room_types (tenant_id, id),
  foreign key (tenant_id, room_id) references public.rooms (tenant_id, id)
);

create index reservation_rooms_tenant_idx on public.reservation_rooms (tenant_id);
create index reservation_rooms_reservation_idx on public.reservation_rooms (reservation_id);
create index reservation_rooms_room_idx on public.reservation_rooms (room_id);
select app.apply_tenant_rls('public.reservation_rooms');

create table public.folios (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  reservation_id uuid not null,
  status text not null default 'open' check (status in ('open', 'settled')),
  settled_at timestamptz,
  origin public.data_origin not null default 'demo',
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (reservation_id),
  foreign key (tenant_id, reservation_id) references public.reservations (tenant_id, id) on delete cascade
);

create index folios_tenant_idx on public.folios (tenant_id);
select app.apply_tenant_rls('public.folios');

create table public.folio_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  folio_id uuid not null,
  category public.folio_category not null,
  description text not null,
  amount numeric(12, 2) not null,
  posted_on date not null,
  origin public.data_origin not null default 'demo',
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, folio_id) references public.folios (tenant_id, id) on delete cascade
);

create index folio_items_tenant_idx on public.folio_items (tenant_id);
create index folio_items_folio_idx on public.folio_items (folio_id);
select app.apply_tenant_rls('public.folio_items');

-- Never a card number: only the test token and its last four digits (CLAUDE.md hard rules).
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  folio_id uuid not null,
  method public.payment_method not null,
  amount numeric(12, 2) not null check (amount > 0),
  token text check (token in ('tok_success', 'tok_3ds')),
  test_card_last4 text check (test_card_last4 ~ '^[0-9]{4}$'),
  transaction_id text,
  paid_at timestamptz not null default now(),
  origin public.data_origin not null default 'demo',
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, folio_id) references public.folios (tenant_id, id) on delete cascade
);

create index payments_tenant_idx on public.payments (tenant_id);
create index payments_folio_idx on public.payments (folio_id);
select app.apply_tenant_rls('public.payments');

-- Rooms of each type still free on every night in [p_from, p_to). Out-of-order rooms do
-- not count. Security invoker: staff see their own tenant; public booking calls it with
-- the service role and a tenant resolved from the URL slug.
create function public.availability(p_tenant uuid, p_property uuid, p_from date, p_to date)
returns table (room_type_id uuid, total int, available int)
language sql
stable
set search_path = ''
as $$
  with nights as (
    select d::date as night from generate_series(p_from, p_to - 1, interval '1 day') d
  ),
  types as (
    select rt.id, count(r.id) filter (where r.status <> 'out_of_order')::int as total
    from public.room_types rt
    left join public.rooms r on r.room_type_id = rt.id
    where rt.tenant_id = p_tenant and rt.property_id = p_property
    group by rt.id
  ),
  booked as (
    select rr.room_type_id, n.night, count(*)::int as n
    from public.reservation_rooms rr
    join public.reservations res on res.id = rr.reservation_id
    join nights n on n.night >= res.check_in and n.night < res.check_out
    where res.tenant_id = p_tenant and res.property_id = p_property
      and res.status in ('confirmed', 'in_house')
    group by rr.room_type_id, n.night
  )
  select t.id, t.total, greatest(t.total - coalesce(max(b.n), 0), 0)::int
  from types t
  left join booked b on b.room_type_id = t.id
  group by t.id, t.total;
$$;

revoke all on function public.availability(uuid, uuid, date, date) from public, anon;
grant execute on function public.availability(uuid, uuid, date, date) to authenticated, service_role;
