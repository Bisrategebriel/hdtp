-- Structural RLS checks over the whole public schema. These catch the forgotten new
-- table and the policy written as `using (true)` by mistake. See docs/PLAN.md §6.3.
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

-- Tables without tenant_id that are allowed to exist, each with a reason:
--   tenants        public hotel metadata shown on the website
--   profiles       keyed by auth user, guarded by its own policy
--   tier_features  global feature catalog
--   sla_policies   global SLA targets by tier and priority
create temp table allowlist (relname name primary key) on commit drop;
insert into allowlist values ('tenants'), ('profiles'), ('tier_features'), ('sla_policies');

-- Temp views cannot take `on commit drop`; the rollback below removes it.
create temp view public_tables as
select c.oid, c.relname, c.relrowsecurity,
  exists (
    select 1 from pg_attribute a
    where a.attrelid = c.oid and a.attname = 'tenant_id' and not a.attisdropped
  ) as has_tenant_id
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r';

select is(
  (select array_agg(relname order by relname) from public_tables where not relrowsecurity),
  null,
  'every public table has row level security enabled'
);

select is(
  (select array_agg(relname order by relname) from public_tables
   where not has_tenant_id and relname not in (select relname from allowlist)),
  null,
  'every public table either has tenant_id or is on the allowlist'
);

select is(
  (select array_agg(t.relname order by t.relname) from public_tables t
   where t.has_tenant_id and not exists (
     select 1 from pg_policies p
     where p.schemaname = 'public' and p.tablename = t.relname and p.cmd in ('SELECT', 'ALL')
   )),
  null,
  'every tenant table has a select policy'
);

-- Every policy on a tenant table must be scoped by app.is_member(tenant_id), except
-- explicit public-read policies for anon (named *_public_select).
select is(
  (select array_agg(p.tablename || '.' || p.policyname order by 1) from pg_policies p
   join public_tables t on t.relname = p.tablename and t.has_tenant_id
   where p.schemaname = 'public'
     and p.policyname not like '%\_public\_select'
     and coalesce(p.qual, '') not like '%is_member(tenant_id)%'
     and coalesce(p.with_check, '') not like '%is_member(tenant_id)%'),
  null,
  'every tenant-table policy is scoped by app.is_member(tenant_id)'
);

select * from finish();
rollback;
