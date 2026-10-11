-- A tenant must never see or change another tenant's rows. The dynamic part loops over
-- every public table with tenant_id, so new tables are covered automatically; seeded
-- fixtures for both tenants make the read checks meaningful. See docs/PLAN.md §6.3.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

-- Fixtures: two tenants, one staff user each.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'gm@tenant-a.test'),
  ('00000000-0000-0000-0000-00000000000b', 'gm@tenant-b.test');

insert into public.tenants (id, slug, name, tier) values
  ('a0000000-0000-0000-0000-000000000000', 'tenant-a', 'Tenant A', 'growth'),
  ('b0000000-0000-0000-0000-000000000000', 'tenant-b', 'Tenant B', 'essential');

insert into public.memberships (tenant_id, user_id, role) values
  ('a0000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000000a', 'gm'),
  ('b0000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000000b', 'gm');

insert into public.properties (tenant_id, name, city, is_primary) values
  ('a0000000-0000-0000-0000-000000000000', 'A Main', 'Addis Ababa', true),
  ('b0000000-0000-0000-0000-000000000000', 'B Main', 'Addis Ababa', true);

insert into public.demo_state (tenant_id) values
  ('a0000000-0000-0000-0000-000000000000'),
  ('b0000000-0000-0000-0000-000000000000');

-- Runs as the calling role (security invoker), so RLS applies. Rolled back with the test.
create function public._cross_tenant_checks(victim uuid)
returns setof text
language plpgsql
as $$
declare
  t record;
  n bigint;
begin
  for t in
    select c.relname
    from pg_class c
    join pg_namespace ns on ns.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid and a.attname = 'tenant_id' and not a.attisdropped
    where ns.nspname = 'public' and c.relkind = 'r'
    order by c.relname
  loop
    execute format('select count(*) from public.%I where tenant_id = $1', t.relname)
      into n using victim;
    return next is(n, 0::bigint, format('%s: cannot read another tenant''s rows', t.relname));

    execute format(
      'with u as (update public.%I set tenant_id = tenant_id where tenant_id = $1 returning 1) select count(*) from u',
      t.relname) into n using victim;
    return next is(n, 0::bigint, format('%s: cannot update another tenant''s rows', t.relname));

    execute format(
      'with d as (delete from public.%I where tenant_id = $1 returning 1) select count(*) from d',
      t.relname) into n using victim;
    return next is(n, 0::bigint, format('%s: cannot delete another tenant''s rows', t.relname));
  end loop;
end;
$$;

-- Act as tenant A's GM.
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

select ok(
  (select count(*) from public.properties where tenant_id = 'a0000000-0000-0000-0000-000000000000') = 1,
  'tenant A sees its own rows (RLS is not simply blocking everything)'
);

select * from public._cross_tenant_checks('b0000000-0000-0000-0000-000000000000');

select throws_ok(
  $$ insert into public.properties (tenant_id, name, city)
     values ('b0000000-0000-0000-0000-000000000000', 'Injected', 'Addis Ababa') $$,
  '42501',
  null,
  'tenant A cannot insert a property into tenant B'
);

select throws_ok(
  $$ insert into public.memberships (tenant_id, user_id, role)
     values ('b0000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000000a', 'gm') $$,
  '42501',
  null,
  'tenant A cannot add itself to tenant B'
);

select is(
  (select count(*) from public.tenant_features where tenant_id = 'b0000000-0000-0000-0000-000000000000' and enabled),
  (select count(*) from public.tier_features where min_tier = 'essential'),
  'tenant feature view is consistent for another tenant''s public tier'
);

-- Tenant metadata is public by design (the website shows it); its writes are not.
select throws_ok(
  $$ insert into public.tenants (slug, name) values ('rogue', 'Rogue') $$,
  '42501',
  null,
  'staff cannot create tenants'
);

select is(
  (with u as (update public.tenants set tier = 'premium' returning 1) select count(*) from u),
  0::bigint,
  'staff cannot change any tenant''s tier directly'
);

select * from finish();
rollback;
