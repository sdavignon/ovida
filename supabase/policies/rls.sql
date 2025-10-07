alter table public.profiles enable row level security;
alter table public.runs     enable row level security;
alter table public.events   enable row level security;
alter table public.rooms    enable row level security;
alter table public.votes    enable row level security;

create policy if not exists "profiles_read_public" on public.profiles
for select using (true);

create policy if not exists "profiles_user_update" on public.profiles
for update using (auth.uid() = user_id)
with check (auth.uid() = user_id and role = 'user');

create policy if not exists "runs_select_public_or_owner" on public.runs
for select using (
  visibility <> 'private' or (user_id is not null and auth.uid() = user_id)
);

create policy if not exists "runs_insert_owner" on public.runs
for insert with check (auth.uid() = user_id);

create policy if not exists "events_select_inherit" on public.events
for select using (
  exists(select 1 from public.runs r where r.id = events.run_id
         and (r.visibility <> 'private' or (r.user_id is not null and auth.uid() = r.user_id)))
);

create policy if not exists "rooms_select" on public.rooms
for select using (
  status <> 'lobby' or (host_user_id is not null and auth.uid() = host_user_id)
);

create policy if not exists "votes_select_public" on public.votes
for select using (true);
