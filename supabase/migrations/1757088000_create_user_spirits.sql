create table if not exists public.user_spirits (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text,
  enneagram jsonb not null,
  persona_locked boolean not null default true,
  welfare_score int not null default 100,
  trust_level int not null default 0,
  status text not null default 'infant',
  revoke_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.user_spirits enable row level security;

create policy if not exists "my spirits" on public.user_spirits
  for select
  using (auth.uid() = owner_id);

create policy if not exists "my spirits write" on public.user_spirits
  for insert
  with check (auth.uid() = owner_id);

create policy if not exists "my spirits update" on public.user_spirits
  for update
  using (auth.uid() = owner_id);
