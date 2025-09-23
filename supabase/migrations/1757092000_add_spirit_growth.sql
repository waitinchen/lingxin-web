alter table public.user_spirits
  add column if not exists dialogue_count int not null default 0,
  add column if not exists persona_badges jsonb not null default '[]'::jsonb;

create table if not exists public.spirit_events (
  id bigserial primary key,
  spirit_id uuid not null references public.user_spirits(id) on delete cascade,
  kind text not null,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table public.spirit_events enable row level security;

create policy "events by owner" on public.spirit_events
  for select
  using (
    exists (
      select 1
      from public.user_spirits s
      where s.id = spirit_id
        and s.owner_id = auth.uid()
    )
  );
