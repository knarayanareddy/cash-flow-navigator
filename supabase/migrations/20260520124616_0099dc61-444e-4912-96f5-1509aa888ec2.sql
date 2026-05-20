-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  company text,
  role text,
  created_at timestamptz not null default now()
);

-- Scenarios
create table public.scenarios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null default 'Untitled Scenario',
  description text,
  levers jsonb not null,
  base_data jsonb,
  calculated_result jsonb,
  preset_type text,
  is_favorite boolean not null default false,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index scenarios_user_id_idx on public.scenarios(user_id);
create index scenarios_updated_at_idx on public.scenarios(updated_at desc);

-- Snapshots
create table public.scenario_snapshots (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references public.scenarios(id) on delete cascade,
  snapshot_name text,
  levers jsonb not null,
  calculated_result jsonb,
  end_year_cash numeric,
  min_cash_month text,
  created_at timestamptz not null default now()
);

create index scenario_snapshots_scenario_id_idx on public.scenario_snapshots(scenario_id);

-- RLS
alter table public.profiles enable row level security;
alter table public.scenarios enable row level security;
alter table public.scenario_snapshots enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

create policy "scenarios_select_own" on public.scenarios for select using (auth.uid() = user_id);
create policy "scenarios_insert_own" on public.scenarios for insert with check (auth.uid() = user_id);
create policy "scenarios_update_own" on public.scenarios for update using (auth.uid() = user_id);
create policy "scenarios_delete_own" on public.scenarios for delete using (auth.uid() = user_id);

create policy "snapshots_select_own" on public.scenario_snapshots for select using (
  exists (select 1 from public.scenarios s where s.id = scenario_id and s.user_id = auth.uid())
);
create policy "snapshots_insert_own" on public.scenario_snapshots for insert with check (
  exists (select 1 from public.scenarios s where s.id = scenario_id and s.user_id = auth.uid())
);
create policy "snapshots_delete_own" on public.scenario_snapshots for delete using (
  exists (select 1 from public.scenarios s where s.id = scenario_id and s.user_id = auth.uid())
);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_scenarios_set_updated_at
before update on public.scenarios
for each row execute function public.set_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, company)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'company', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Realtime
alter table public.scenarios replica identity full;
alter publication supabase_realtime add table public.scenarios;