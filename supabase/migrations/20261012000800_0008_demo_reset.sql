-- 0008: demo reset (PLAN §1.3 item 9 and §7, Reset). The seed ends with
-- app.take_seed_snapshot(); the Reset button calls demo_reset(), which deletes every
-- origin = 'demo' row and restores the few seed columns a demo can change. Under a second.
-- (PLAN §6.1 numbered this 0012; it moves up with Block 2. Later blocks extend it with
-- `create or replace` when their tables arrive.)

create table app.seed_snapshot_rooms (
  room_id uuid primary key,
  tenant_id uuid not null,
  status public.room_status not null
);

create table app.seed_snapshot_reservations (
  reservation_id uuid primary key,
  tenant_id uuid not null,
  status public.res_status not null,
  online_checkin_at timestamptz
);

create table app.seed_snapshot_reservation_rooms (
  reservation_room_id uuid primary key,
  tenant_id uuid not null,
  room_id uuid
);

create table app.seed_snapshot_folios (
  folio_id uuid primary key,
  tenant_id uuid not null,
  status text not null,
  settled_at timestamptz
);

create table app.seed_snapshot_hk_tasks (
  hk_task_id uuid primary key,
  tenant_id uuid not null,
  status text not null,
  assigned_to uuid,
  started_at timestamptz,
  cleaned_at timestamptz,
  inspected_at timestamptz
);

create index on app.seed_snapshot_rooms (tenant_id);
create index on app.seed_snapshot_reservations (tenant_id);
create index on app.seed_snapshot_reservation_rooms (tenant_id);
create index on app.seed_snapshot_folios (tenant_id);
create index on app.seed_snapshot_hk_tasks (tenant_id);

grant select, insert, update, delete on all tables in schema app to service_role;

create function app.take_seed_snapshot(p_tenant uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  delete from app.seed_snapshot_rooms where tenant_id = p_tenant;
  delete from app.seed_snapshot_reservations where tenant_id = p_tenant;
  delete from app.seed_snapshot_reservation_rooms where tenant_id = p_tenant;
  delete from app.seed_snapshot_folios where tenant_id = p_tenant;
  delete from app.seed_snapshot_hk_tasks where tenant_id = p_tenant;

  insert into app.seed_snapshot_rooms select id, tenant_id, status from public.rooms where tenant_id = p_tenant;
  insert into app.seed_snapshot_reservations
    select id, tenant_id, status, online_checkin_at from public.reservations where tenant_id = p_tenant;
  insert into app.seed_snapshot_reservation_rooms
    select id, tenant_id, room_id from public.reservation_rooms where tenant_id = p_tenant;
  insert into app.seed_snapshot_folios
    select id, tenant_id, status, settled_at from public.folios where tenant_id = p_tenant;
  insert into app.seed_snapshot_hk_tasks
    select id, tenant_id, status, assigned_to, started_at, cleaned_at, inspected_at
    from public.hk_tasks where tenant_id = p_tenant;
end;
$$;

create function public.demo_reset(p_tenant uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  -- Children first; seed rows referenced by demo rows are never deleted.
  delete from public.outbox where tenant_id = p_tenant and origin = 'demo';
  delete from public.payments where tenant_id = p_tenant and origin = 'demo';
  delete from public.folio_items where tenant_id = p_tenant and origin = 'demo';
  delete from public.hk_tasks where tenant_id = p_tenant and origin = 'demo';
  delete from public.folios where tenant_id = p_tenant and origin = 'demo';
  delete from public.reservation_rooms where tenant_id = p_tenant and origin = 'demo';
  delete from public.reservations where tenant_id = p_tenant and origin = 'demo';
  delete from public.guests where tenant_id = p_tenant and origin = 'demo';
  delete from public.leads where tenant_id = p_tenant and origin = 'demo';

  update public.rooms r set status = s.status
  from app.seed_snapshot_rooms s
  where s.room_id = r.id and s.tenant_id = p_tenant and r.status is distinct from s.status;

  update public.reservations r set status = s.status, online_checkin_at = s.online_checkin_at
  from app.seed_snapshot_reservations s
  where s.reservation_id = r.id and s.tenant_id = p_tenant
    and (r.status, r.online_checkin_at) is distinct from (s.status, s.online_checkin_at);

  update public.reservation_rooms r set room_id = s.room_id
  from app.seed_snapshot_reservation_rooms s
  where s.reservation_room_id = r.id and s.tenant_id = p_tenant and r.room_id is distinct from s.room_id;

  update public.folios f set status = s.status, settled_at = s.settled_at
  from app.seed_snapshot_folios s
  where s.folio_id = f.id and s.tenant_id = p_tenant
    and (f.status, f.settled_at) is distinct from (s.status, s.settled_at);

  update public.hk_tasks h set
    status = s.status, assigned_to = s.assigned_to,
    started_at = s.started_at, cleaned_at = s.cleaned_at, inspected_at = s.inspected_at
  from app.seed_snapshot_hk_tasks s
  where s.hk_task_id = h.id and s.tenant_id = p_tenant
    and (h.status, h.assigned_to, h.started_at, h.cleaned_at, h.inspected_at)
      is distinct from (s.status, s.assigned_to, s.started_at, s.cleaned_at, s.inspected_at);

  update public.demo_state set program_month = 0 where tenant_id = p_tenant;
end;
$$;

revoke all on function app.take_seed_snapshot(uuid) from public;
grant execute on function app.take_seed_snapshot(uuid) to service_role;
revoke all on function public.demo_reset(uuid) from public, anon, authenticated;
grant execute on function public.demo_reset(uuid) to service_role;
