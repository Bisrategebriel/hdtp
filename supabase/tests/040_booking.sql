-- quote_stay(), availability(), create_booking() and demo_reset() as the service role
-- (how the public booking route calls them). Dates are relative to the hotel's today.
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

insert into public.tenants (id, slug, name, settings) values
  ('a0000000-0000-0000-0000-000000000000', 'tenant-a', 'Tenant A',
   '{"vatPct": 15, "serviceChargePct": 10, "breakfastPrice": 500, "codePrefix": "TA"}');
insert into public.demo_state (tenant_id, program_month) values ('a0000000-0000-0000-0000-000000000000', 12);
insert into public.properties (id, tenant_id, name, city)
values ('a1000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'A Main', 'Addis Ababa');
insert into public.room_types (id, tenant_id, property_id, code, name, bed, size_sqm, max_adults, base_rate)
values ('a2000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000',
        'a1000000-0000-0000-0000-000000000000', 'DK', 'Deluxe King', 'King', 32, 2, 8000);
-- One room only, so the second booking for the same night is sold out.
insert into public.rooms (id, tenant_id, property_id, room_type_id, number, floor, status, origin)
values ('a7000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000',
        'a1000000-0000-0000-0000-000000000000', 'a2000000-0000-0000-0000-000000000000', '512', 5, 'inspected', 'seed');
insert into public.rate_plans (id, tenant_id, code, name)
values ('a3000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'BAR', 'Best available');
insert into public.daily_rates (tenant_id, room_type_id, rate_plan_id, date, amount)
select 'a0000000-0000-0000-0000-000000000000', 'a2000000-0000-0000-0000-000000000000',
       'a3000000-0000-0000-0000-000000000000', app.hotel_today() + i, 8000 + i * 1000
from generate_series(0, 5) i;

select app.take_seed_snapshot('a0000000-0000-0000-0000-000000000000');
set local role service_role;

-- 2 nights (8000 + 9000) + breakfast 2 adults x 2 nights (2000) = 19000;
-- service 10% = 1900; VAT 15% of 20900 = 3135; total 24035.
select is(
  (public.quote_stay('a0000000-0000-0000-0000-000000000000', 'a2000000-0000-0000-0000-000000000000',
    'a3000000-0000-0000-0000-000000000000', app.hotel_today(), app.hotel_today() + 2, 2, true) ->> 'total')::numeric,
  24035.00,
  'quote = nights + breakfast + 10% service + 15% VAT on both'
);

select throws_ok(
  $$ select public.quote_stay('a0000000-0000-0000-0000-000000000000', 'a2000000-0000-0000-0000-000000000000',
       'a3000000-0000-0000-0000-000000000000', app.hotel_today() + 4, app.hotel_today() + 8, 2, false) $$,
  '22023', 'no_rate', 'a stay past the rate calendar has no quote'
);

select is(
  (select available from public.availability('a0000000-0000-0000-0000-000000000000',
    'a1000000-0000-0000-0000-000000000000', app.hotel_today(), app.hotel_today() + 2)),
  1, 'the one room is available before booking'
);

create temp table booked as
select public.create_booking(
  'a0000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000000',
  'a2000000-0000-0000-0000-000000000000', 'a3000000-0000-0000-0000-000000000000',
  app.hotel_today(), app.hotel_today() + 2, 2, 0, true,
  '{"first_name": "Hana", "last_name": "Bekele", "email": "hana@example.com", "preferences": ["high floor"]}',
  '{"token": "tok_3ds", "last4": "3220", "transaction_id": "mock_1", "amount": 24035}'
) as r;

select matches((select r ->> 'code' from booked), '^TA-[0-9A-F]{6}$', 'booking returns a confirmation code');
select is(
  (select count(*) from public.reservations where tenant_id = 'a0000000-0000-0000-0000-000000000000' and channel = 'direct' and status = 'confirmed' and origin = 'demo'),
  1::bigint, 'a direct, confirmed demo reservation is created'
);
select is(
  (select sum(amount) from public.folio_items where tenant_id = 'a0000000-0000-0000-0000-000000000000'), 24035.00::numeric, 'folio items add up to the quoted total'
);
select is(
  (select array_agg(test_card_last4 || ':' || token) from public.payments where tenant_id = 'a0000000-0000-0000-0000-000000000000'), array['3220:tok_3ds'],
  'payment stores only the token and last 4 digits'
);
select is((select count(*) from public.outbox where tenant_id = 'a0000000-0000-0000-0000-000000000000'), 1::bigint, 'a confirmation is queued in the outbox');
select is(
  (select portal_token_hash from public.reservations where tenant_id = 'a0000000-0000-0000-0000-000000000000'),
  (select encode(extensions.digest(r ->> 'portal_token', 'sha256'), 'hex') from booked),
  'only the hash of the portal token is stored'
);

select throws_ok(
  $$ select public.create_booking(
       'a0000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000000',
       'a2000000-0000-0000-0000-000000000000', 'a3000000-0000-0000-0000-000000000000',
       app.hotel_today(), app.hotel_today() + 1, 1, 0, false,
       '{"first_name": "Second", "last_name": "Guest"}',
       '{"token": "tok_success", "last4": "4242", "transaction_id": "mock_2", "amount": 10120}') $$,
  'P0001', 'sold_out', 'the last room cannot be sold twice'
);

select throws_ok(
  $$ select public.create_booking(
       'a0000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000000',
       'a2000000-0000-0000-0000-000000000000', 'a3000000-0000-0000-0000-000000000000',
       app.hotel_today() + 2, app.hotel_today() + 3, 1, 0, false,
       '{"first_name": "Cheap", "last_name": "Guest"}',
       '{"token": "tok_success", "last4": "4242", "transaction_id": "mock_3", "amount": 1}') $$,
  'P0001', 'price_changed', 'a payment that does not match the server quote is refused'
);

update public.rooms set status = 'dirty';
select public.demo_reset('a0000000-0000-0000-0000-000000000000');

select is(
  (select count(*) from public.reservations where tenant_id = 'a0000000-0000-0000-0000-000000000000') + (select count(*) from public.guests where tenant_id = 'a0000000-0000-0000-0000-000000000000')
    + (select count(*) from public.payments where tenant_id = 'a0000000-0000-0000-0000-000000000000') + (select count(*) from public.outbox where tenant_id = 'a0000000-0000-0000-0000-000000000000'),
  0::bigint, 'reset deletes every demo booking row'
);
select is(
  (select status::text || ':' || (select program_month from public.demo_state where tenant_id = 'a0000000-0000-0000-0000-000000000000')::text from public.rooms where tenant_id = 'a0000000-0000-0000-0000-000000000000'),
  'inspected:0', 'reset restores room status and program month'
);

select * from finish();
rollback;
