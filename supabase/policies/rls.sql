alter table public.profiles enable row level security;
alter table public.runs     enable row level security;
alter table public.events   enable row level security;
alter table public.rooms    enable row level security;
alter table public.votes    enable row level security;
alter table public.story_guides enable row level security;
alter table public.story_chapters enable row level security;
alter table public.story_scenes enable row level security;
alter table public.voices enable row level security;
alter table public.policy_versions enable row level security;
alter table public.room_memberships enable row level security;
alter table public.policy_flags enable row level security;
alter table public.reports enable row level security;
alter table public.admin_metrics enable row level security;
alter table public.admin_activity_log enable row level security;
alter table public.admin_control_settings enable row level security;

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

create policy if not exists "story_guides_select_public" on public.story_guides
for select using (true);

create policy if not exists "story_chapters_select_public" on public.story_chapters
for select using (true);

create policy if not exists "story_scenes_select_public" on public.story_scenes
for select using (true);

create policy if not exists "voices_select_public" on public.voices
for select using (true);

create policy if not exists "policy_versions_select_public" on public.policy_versions
for select using (true);

create policy if not exists "room_memberships_admin_select" on public.room_memberships
for select using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.role in ('admin','moderator','analyst','producer')
  )
);

create policy if not exists "policy_flags_admin_select" on public.policy_flags
for select using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.role in ('admin','moderator','analyst')
  )
);

create policy if not exists "policy_flags_admin_update" on public.policy_flags
for update using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.role in ('admin','moderator','analyst')
  )
) with check (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.role in ('admin','moderator','analyst')
  )
);

create policy if not exists "reports_submit" on public.reports
for insert with check (true);

create policy if not exists "reports_admin_select" on public.reports
for select using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.role in ('admin','moderator','analyst')
  )
);

create policy if not exists "reports_admin_update" on public.reports
for update using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.role in ('admin','moderator','analyst')
  )
) with check (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.role in ('admin','moderator','analyst')
  )
);

create policy if not exists "admin_metrics_admin_select" on public.admin_metrics
for select using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.role in ('admin','moderator','analyst')
  )
);

create policy if not exists "admin_activity_admin_select" on public.admin_activity_log
for select using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.role in ('admin','moderator','analyst')
  )
);

create policy if not exists "admin_control_admin_select" on public.admin_control_settings
for select using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.role in ('admin','moderator','analyst')
  )
);

create policy if not exists "admin_control_admin_update" on public.admin_control_settings
for update using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.role in ('admin','moderator','analyst')
  )
) with check (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.role in ('admin','moderator','analyst')
  )
);
