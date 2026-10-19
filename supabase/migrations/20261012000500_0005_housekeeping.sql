-- 0005: housekeeping tasks, and Realtime for the front-desk board (B5: <= 3 s, no reload).

create table public.hk_tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  room_id uuid not null,
  reservation_id uuid,
  kind text not null check (kind in ('departure', 'stayover', 'inspection')),
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'clean', 'inspected')),
  due_on date not null,
  assigned_to uuid references auth.users (id) on delete set null,
  started_at timestamptz,
  cleaned_at timestamptz,
  inspected_at timestamptz,
  origin public.data_origin not null default 'demo',
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, room_id) references public.rooms (tenant_id, id) on delete cascade,
  foreign key (tenant_id, reservation_id) references public.reservations (tenant_id, id) on delete set null (reservation_id)
);

create index hk_tasks_tenant_idx on public.hk_tasks (tenant_id);
create index hk_tasks_due_idx on public.hk_tasks (tenant_id, due_on);
select app.apply_tenant_rls('public.hk_tasks');

-- Realtime respects RLS, so a tenant only receives its own rows (rls.spec.ts).
alter publication supabase_realtime add table public.rooms, public.hk_tasks, public.reservations;
