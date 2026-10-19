-- 0006: website content, event leads and the notification outbox.
-- (PLAN §6.1 listed these under 0007/0008; they move earlier because booking needs the
-- outbox and the site needs its content in Block 2.)

create table public.site_content (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  kind text not null check (kind in ('offer', 'gallery', 'review', 'page', 'menu_item')),
  title text not null,
  body text not null default '',
  image text,
  -- Kind-specific fields: offer {price, badge}, review {author, rating, source}, ...
  data jsonb not null default '{}'::jsonb,
  published boolean not null default true,
  sort int not null default 0,
  origin public.data_origin not null default 'demo',
  created_at timestamptz not null default now(),
  unique (tenant_id, id)
);

create index site_content_tenant_idx on public.site_content (tenant_id, kind);
select app.apply_tenant_rls('public.site_content');
create policy site_content_public_select on public.site_content for select to anon using (published);

-- Event and meeting enquiries from the website. Written by the server (service role).
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  event_type text not null,
  event_date date,
  guests int,
  message text not null default '',
  status text not null default 'new' check (status in ('new', 'contacted', 'won', 'lost')),
  origin public.data_origin not null default 'demo',
  created_at timestamptz not null default now(),
  unique (tenant_id, id)
);

create index leads_tenant_idx on public.leads (tenant_id);
select app.apply_tenant_rls('public.leads');

-- Messages the mock messaging adapter "sends". Nothing is ever delivered.
create table public.outbox (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  channel text not null check (channel in ('email', 'sms', 'whatsapp')),
  recipient text not null,
  subject text,
  body text not null,
  reference text,
  status text not null default 'queued' check (status in ('queued', 'sent')),
  origin public.data_origin not null default 'demo',
  created_at timestamptz not null default now(),
  unique (tenant_id, id)
);

create index outbox_tenant_idx on public.outbox (tenant_id, created_at desc);
select app.apply_tenant_rls('public.outbox', writable => false);
