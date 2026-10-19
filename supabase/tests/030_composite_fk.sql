-- Composite foreign keys (tenant_id, x_id) stop a row from pointing at another tenant's
-- row, even through a bug in code running with the service role. See docs/PLAN.md §6.3.
begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

insert into public.tenants (id, slug, name) values
  ('a0000000-0000-0000-0000-000000000000', 'tenant-a', 'Tenant A'),
  ('b0000000-0000-0000-0000-000000000000', 'tenant-b', 'Tenant B');
insert into public.properties (id, tenant_id, name, city) values
  ('a1000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'A Main', 'Addis Ababa'),
  ('b1000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000000', 'B Main', 'Addis Ababa');
insert into public.room_types (id, tenant_id, property_id, code, name, bed, size_sqm, max_adults, base_rate) values
  ('a2000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000',
   'a1000000-0000-0000-0000-000000000000', 'DK', 'Deluxe King', 'King', 32, 2, 8000),
  ('b2000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000000',
   'b1000000-0000-0000-0000-000000000000', 'DK', 'Deluxe King', 'King', 32, 2, 8000);
insert into public.rooms (id, tenant_id, property_id, room_type_id, number, floor) values
  ('b7000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000000',
   'b1000000-0000-0000-0000-000000000000', 'b2000000-0000-0000-0000-000000000000', '512', 5);
insert into public.rate_plans (id, tenant_id, code, name)
values ('a3000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'BAR', 'Best available');
insert into public.guests (id, tenant_id, first_name, last_name)
values ('a4000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'Test', 'Guest');
insert into public.reservations (id, tenant_id, property_id, guest_id, rate_plan_id, code, channel, check_in, check_out)
values ('a5000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000',
        'a1000000-0000-0000-0000-000000000000', 'a4000000-0000-0000-0000-000000000000',
        'a3000000-0000-0000-0000-000000000000', 'TA-1', 'direct', '2026-10-20', '2026-10-22');

select throws_ok(
  $$ insert into public.reservation_rooms (tenant_id, reservation_id, room_type_id, room_id)
     values ('a0000000-0000-0000-0000-000000000000', 'a5000000-0000-0000-0000-000000000000',
             'a2000000-0000-0000-0000-000000000000', 'b7000000-0000-0000-0000-000000000000') $$,
  '23503', null, 'a tenant A reservation cannot be assigned a tenant B room'
);

select throws_ok(
  $$ insert into public.reservation_rooms (tenant_id, reservation_id, room_type_id)
     values ('a0000000-0000-0000-0000-000000000000', 'a5000000-0000-0000-0000-000000000000',
             'b2000000-0000-0000-0000-000000000000') $$,
  '23503', null, 'a tenant A reservation cannot book a tenant B room type'
);

select throws_ok(
  $$ insert into public.room_types (tenant_id, property_id, code, name, bed, size_sqm, max_adults, base_rate)
     values ('a0000000-0000-0000-0000-000000000000', 'b1000000-0000-0000-0000-000000000000',
             'X', 'X', 'King', 20, 2, 100) $$,
  '23503', null, 'a tenant A room type cannot live in a tenant B property'
);

select * from finish();
rollback;
