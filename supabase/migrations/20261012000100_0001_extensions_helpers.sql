-- 0001: extensions, private `app` schema, shared enums and helpers.
-- See docs/PLAN.md §6.

create extension if not exists pgcrypto with schema extensions;

-- Private schema for helpers and snapshot tables. Not exposed through the API.
create schema if not exists app;
grant usage on schema app to authenticated, anon, service_role;

create type public.tier as enum ('essential', 'growth', 'premium');

create type public.staff_role as enum (
  'gm', 'front_desk', 'housekeeping', 'fnb', 'finance', 'hr', 'marketing', 'flint_support'
);

create type public.channel as enum ('direct', 'ota', 'walk_in');

create type public.res_status as enum ('confirmed', 'in_house', 'checked_out', 'cancelled', 'no_show');

create type public.room_status as enum ('occupied', 'dirty', 'cleaning', 'clean', 'inspected', 'out_of_order');

-- 'seed' rows come from the generator; everything created during a demo is 'demo'
-- and is deleted by demo_reset().
create type public.data_origin as enum ('seed', 'demo');

create function app.tier_rank(t public.tier)
returns int
language sql
immutable
set search_path = ''
as $$
  select case t when 'essential' then 1 when 'growth' then 2 when 'premium' then 3 end;
$$;

-- Applies the standard tenant-isolation policies to a table with a tenant_id column.
-- writable = false gives members read access only; writes then need the service role.
-- Called from each migration right after the table is created, so no table can be
-- added without the pattern (supabase/tests/000_rls_meta.sql enforces this).
create function app.apply_tenant_rls(tbl regclass, writable boolean default true)
returns void
language plpgsql
set search_path = ''
as $$
declare
  name text := (select c.relname from pg_class c where c.oid = tbl);
begin
  execute format('alter table %s enable row level security', tbl);
  execute format(
    'create policy %I on %s for select to authenticated using (app.is_member(tenant_id))',
    name || '_tenant_select', tbl);
  if writable then
    execute format(
      'create policy %I on %s for insert to authenticated with check (app.is_member(tenant_id))',
      name || '_tenant_insert', tbl);
    execute format(
      'create policy %I on %s for update to authenticated using (app.is_member(tenant_id)) with check (app.is_member(tenant_id))',
      name || '_tenant_update', tbl);
    execute format(
      'create policy %I on %s for delete to authenticated using (app.is_member(tenant_id))',
      name || '_tenant_delete', tbl);
  end if;
end;
$$;

revoke all on function app.apply_tenant_rls(regclass, boolean) from public;
