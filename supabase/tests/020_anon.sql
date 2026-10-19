-- Anonymous visitors (the public website) read only public catalog data and never guest,
-- booking or payment data. See docs/PLAN.md §6.2 and §6.3.
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

insert into public.tenants (id, slug, name) values ('a0000000-0000-0000-0000-000000000000', 'tenant-a', 'Tenant A');
insert into public.properties (id, tenant_id, name, city)
values ('a1000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'A Main', 'Addis Ababa');
insert into public.room_types (id, tenant_id, property_id, code, name, bed, size_sqm, max_adults, base_rate)
values ('a2000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000',
        'a1000000-0000-0000-0000-000000000000', 'DK', 'Deluxe King', 'King', 32, 2, 8000);
insert into public.rooms (tenant_id, property_id, room_type_id, number, floor)
values ('a0000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000000',
        'a2000000-0000-0000-0000-000000000000', '101', 1);
insert into public.rate_plans (id, tenant_id, code, name)
values ('a3000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'BAR', 'Best available');
insert into public.guests (id, tenant_id, first_name, last_name)
values ('a4000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'Test', 'Guest');
insert into public.reservations (id, tenant_id, property_id, guest_id, rate_plan_id, code, channel, check_in, check_out)
values ('a5000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000',
        'a1000000-0000-0000-0000-000000000000', 'a4000000-0000-0000-0000-000000000000',
        'a3000000-0000-0000-0000-000000000000', 'TA-1', 'direct', '2026-10-20', '2026-10-22');
insert into public.folios (id, tenant_id, reservation_id)
values ('a6000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'a5000000-0000-0000-0000-000000000000');
insert into public.payments (tenant_id, folio_id, method, amount)
values ('a0000000-0000-0000-0000-000000000000', 'a6000000-0000-0000-0000-000000000000', 'cash', 100);
insert into public.site_content (tenant_id, kind, title, published) values
  ('a0000000-0000-0000-0000-000000000000', 'offer', 'Published offer', true),
  ('a0000000-0000-0000-0000-000000000000', 'offer', 'Draft offer', false);
insert into public.leads (tenant_id, name, email, event_type)
values ('a0000000-0000-0000-0000-000000000000', 'Lead', 'lead@example.com', 'wedding');

set local role anon;

select is((select count(*) from public.guests where tenant_id = 'a0000000-0000-0000-0000-000000000000'), 0::bigint, 'anon cannot read guests');
select is((select count(*) from public.reservations where tenant_id = 'a0000000-0000-0000-0000-000000000000'), 0::bigint, 'anon cannot read reservations');
select is((select count(*) from public.folios where tenant_id = 'a0000000-0000-0000-0000-000000000000'), 0::bigint, 'anon cannot read folios');
select is((select count(*) from public.payments where tenant_id = 'a0000000-0000-0000-0000-000000000000'), 0::bigint, 'anon cannot read payments');
select is((select count(*) from public.leads where tenant_id = 'a0000000-0000-0000-0000-000000000000'), 0::bigint, 'anon cannot read leads');
select is((select count(*) from public.rooms where tenant_id = 'a0000000-0000-0000-0000-000000000000'), 0::bigint, 'anon cannot read rooms (staff-only)');
select is((select count(*) from public.room_types where tenant_id = 'a0000000-0000-0000-0000-000000000000'), 1::bigint, 'anon reads room types');
select is((select count(*) from public.rate_plans where tenant_id = 'a0000000-0000-0000-0000-000000000000'), 1::bigint, 'anon reads rate plans');
select is(
  (select array_agg(title) from public.site_content where tenant_id = 'a0000000-0000-0000-0000-000000000000'),
  array['Published offer'],
  'anon reads only published site content'
);

select throws_ok(
  $$ insert into public.leads (tenant_id, name, email, event_type)
     values ('a0000000-0000-0000-0000-000000000000', 'x', 'x@example.com', 'x') $$,
  '42501', null, 'anon cannot write leads directly (the server writes them)'
);

select throws_ok(
  $$ select public.create_booking(null, null, null, null, null, null, null, null, null, null, null) $$,
  '42501', null, 'anon cannot call create_booking'
);

select throws_ok(
  $$ select public.demo_reset('a0000000-0000-0000-0000-000000000000') $$,
  '42501', null, 'anon cannot call demo_reset'
);

select throws_ok(
  $$ select * from public.availability(null, null, null, null) $$,
  '42501', null, 'anon cannot call availability (the server calls it)'
);

select * from finish();
rollback;
