-- Business Desk: one database, many customer businesses.
-- Every data row carries org_id, and row-level security limits each signed-in user
-- to the businesses they belong to. Table shapes match ingest/businessdesk_ingest/schema.py.

create table public.orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- owner: everything; accounts: sales, collections, finance; hr: people; sales: sales
create type public.member_role as enum ('owner', 'accounts', 'hr', 'sales');

create table public.memberships (
  org_id uuid not null references public.orgs on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role public.member_role not null default 'owner',
  primary key (org_id, user_id)
);

create type public.source_kind as enum ('excel', 'google_sheets', 'tally');

create table public.data_sources (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs on delete cascade,
  kind public.source_kind not null,
  name text not null,
  -- column mapping chosen by the user, remembered for the next upload
  mapping jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.imports (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs on delete cascade,
  source_id uuid not null references public.data_sources on delete cascade,
  status text not null check (status in ('running', 'done', 'failed')),
  rows_by_table jsonb not null default '{}'::jsonb,
  warnings text[] not null default '{}',
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table public.sales_lines (
  org_id uuid not null references public.orgs on delete cascade,
  import_id uuid references public.imports on delete set null,
  order_id text not null,
  date date not null,
  customer text not null,
  region text not null,
  salesperson text not null,
  product text not null,
  category text not null,
  payment text not null,
  qty numeric not null,
  revenue numeric not null,
  cost numeric not null,
  ship_fee numeric not null default 0,
  primary key (org_id, order_id)
);

create table public.pnl_monthly (
  org_id uuid not null references public.orgs on delete cascade,
  import_id uuid references public.imports on delete set null,
  month date not null,  -- first day of month
  region text not null,
  metric text not null check (metric in ('revenue', 'expense', 'ebit')),
  scenario text not null check (scenario in ('actual', 'plan')),
  amount numeric not null,
  primary key (org_id, month, region, metric, scenario)
);

create table public.receivables_aging (
  org_id uuid not null references public.orgs on delete cascade,
  import_id uuid references public.imports on delete set null,
  month date not null,
  region text not null,
  bucket text not null check (bucket in ('0-30', '31-60', '61-90', '90+')),
  amount numeric not null,
  primary key (org_id, month, region, bucket)
);

create table public.people_moves (
  org_id uuid not null references public.orgs on delete cascade,
  import_id uuid references public.imports on delete set null,
  month date not null,
  region text not null,
  hires integer not null,
  exits integer not null,
  primary key (org_id, month, region)
);

create table public.satisfaction (
  org_id uuid not null references public.orgs on delete cascade,
  import_id uuid references public.imports on delete set null,
  year integer not null,
  region text not null,
  score numeric not null,
  target numeric not null,
  primary key (org_id, year, region)
);

-- Attendance: not in the sample files yet; shape agreed for the first pilot register.
create table public.attendance (
  org_id uuid not null references public.orgs on delete cascade,
  import_id uuid references public.imports on delete set null,
  date date not null,
  employee_id text not null,
  name text not null,
  branch text not null,
  status text not null check (status in ('P', 'A', 'L', 'H')),  -- present, absent, leave, holiday
  in_time time,
  out_time time,
  primary key (org_id, date, employee_id)
);

create index on public.sales_lines (org_id, date);
create index on public.attendance (org_id, employee_id);

-- Row-level security ------------------------------------------------------

create function public.has_role(target uuid, roles public.member_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships m
    where m.org_id = target and m.user_id = auth.uid() and m.role = any (roles)
  );
$$;

alter table public.orgs enable row level security;
alter table public.memberships enable row level security;
alter table public.data_sources enable row level security;
alter table public.imports enable row level security;

create policy "members read their org" on public.orgs for select
  using (public.has_role(id, '{owner,accounts,hr,sales}'));
create policy "members read memberships" on public.memberships for select
  using (public.has_role(org_id, '{owner,accounts,hr,sales}'));
create policy "owners manage memberships" on public.memberships for all
  using (public.has_role(org_id, '{owner}')) with check (public.has_role(org_id, '{owner}'));
create policy "members read sources" on public.data_sources for select
  using (public.has_role(org_id, '{owner,accounts,hr,sales}'));
create policy "owners manage sources" on public.data_sources for all
  using (public.has_role(org_id, '{owner}')) with check (public.has_role(org_id, '{owner}'));
create policy "members read imports" on public.imports for select
  using (public.has_role(org_id, '{owner,accounts,hr,sales}'));

-- Data tables: read access by role. Writes go through the import service (service role), not the browser.
do $$
declare t record;
begin
  for t in select * from (values
    ('sales_lines', '{owner,accounts,sales}'),
    ('pnl_monthly', '{owner,accounts}'),
    ('receivables_aging', '{owner,accounts}'),
    ('people_moves', '{owner,hr}'),
    ('satisfaction', '{owner,accounts,hr,sales}'),
    ('attendance', '{owner,hr}')
  ) as v(name, roles) loop
    execute format('alter table public.%I enable row level security', t.name);
    execute format('create policy "role can read" on public.%I for select using (public.has_role(org_id, %L))', t.name, t.roles);
  end loop;
end $$;
