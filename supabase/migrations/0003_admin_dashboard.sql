-- Admin dashboard schema expansion

-- reusable updated_at trigger helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- extend stories with ownership/status metadata
alter table public.stories
  add column if not exists owner_name text,
  add column if not exists status text not null default 'draft'
    check (status in ('draft','ready','published')),
  add column if not exists summary text,
  add column if not exists updated_at timestamptz default now();

update public.stories
  set updated_at = now()
  where updated_at is null;

create trigger stories_set_updated_at
before update on public.stories
for each row
execute function public.set_updated_at();

-- extend rooms with admin-friendly metadata
alter table public.rooms
  add column if not exists admin_label text unique,
  add column if not exists last_activity_at timestamptz default now(),
  add column if not exists member_estimate int;

alter table public.rooms
  drop constraint if exists rooms_status_check,
  add constraint rooms_status_check
    check (status in ('lobby','sync','vote_open','vote_locked','resolving','playing','paused','end'));

update public.rooms
  set admin_label = 'RM-' || upper(substr(replace(id::text, '-', ''), 1, 6))
  where admin_label is null;

update public.rooms
  set last_activity_at = coalesce(last_activity_at, created_at, now());

-- story guides provide high-level creative direction
create table if not exists public.story_guides (
  id text primary key,
  story_id text not null references public.stories(id) on delete cascade,
  guide_type text not null check (guide_type in ('Character','World','Style','Lore','Mechanic')),
  title text not null,
  summary text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists story_guides_story_idx on public.story_guides (story_id);

create trigger story_guides_set_updated_at
before update on public.story_guides
for each row
execute function public.set_updated_at();

-- chapters structure stories into ordered acts
create table if not exists public.story_chapters (
  id text primary key,
  story_id text not null references public.stories(id) on delete cascade,
  chapter_order int not null,
  title text not null,
  synopsis text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint story_chapters_story_order_unique unique (story_id, chapter_order)
);

create index if not exists story_chapters_story_idx on public.story_chapters (story_id);

create trigger story_chapters_set_updated_at
before update on public.story_chapters
for each row
execute function public.set_updated_at();

-- scenes live inside chapters with publication workflow state
create table if not exists public.story_scenes (
  id text primary key,
  chapter_id text not null references public.story_chapters(id) on delete cascade,
  scene_order int not null default 0,
  title text not null,
  premise text,
  status text not null check (status in ('draft','ready','published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists story_scenes_chapter_idx on public.story_scenes (chapter_id);

create trigger story_scenes_set_updated_at
before update on public.story_scenes
for each row
execute function public.set_updated_at();

-- voice library for TTS provider inventory
create table if not exists public.voices (
  id text primary key,
  provider text not null,
  voice_handle text not null,
  license text not null,
  default_story_id text references public.stories(id),
  tags text[] not null default '{}'::text[],
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint voices_provider_handle_unique unique (provider, voice_handle)
);

create trigger voices_set_updated_at
before update on public.voices
for each row
execute function public.set_updated_at();

-- room membership tracking for live counts
create table if not exists public.room_memberships (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  profile_id uuid references public.profiles(user_id),
  guest_id uuid references public.guests(id),
  member_key text generated always as (
    case
      when profile_id is not null then profile_id::text
      else guest_id::text
    end
  ) stored,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  constraint room_memberships_identity check (
    ((profile_id is not null)::int + (guest_id is not null)::int) = 1
  )
);

create index if not exists room_memberships_room_idx on public.room_memberships (room_id);
create unique index if not exists room_memberships_active_unique
  on public.room_memberships (room_id, member_key)
  where left_at is null;

-- policy version catalogue
create table if not exists public.policy_versions (
  id text primary key,
  rating_label text not null,
  disallowed_topics text[] not null default '{}'::text[],
  soft_filters text[] not null default '{}'::text[],
  summary text,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger policy_versions_set_updated_at
before update on public.policy_versions
for each row
execute function public.set_updated_at();

-- policy flags raised by guardrails
create table if not exists public.policy_flags (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.runs(id) on delete set null,
  event_idx int,
  rule_id text,
  flag_severity text not null check (flag_severity in ('info','warn','block')),
  description text,
  status text not null default 'open' check (status in ('open','reviewing','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(user_id)
);

create index if not exists policy_flags_run_idx on public.policy_flags (run_id);
create index if not exists policy_flags_status_idx on public.policy_flags (status);

create trigger policy_flags_set_updated_at
before update on public.policy_flags
for each row
execute function public.set_updated_at();

-- user generated reports
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('room','run','user','story','beat')),
  target_id text not null,
  reason text not null,
  status text not null default 'open' check (status in ('open','reviewing','closed')),
  submitted_by_profile uuid references public.profiles(user_id),
  submitted_by_guest uuid references public.guests(id),
  resolution_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reports_submitter_present check (
    ((submitted_by_profile is not null)::int + (submitted_by_guest is not null)::int) >= 1
  )
);

create index if not exists reports_status_idx on public.reports (status);

create trigger reports_set_updated_at
before update on public.reports
for each row
execute function public.set_updated_at();

-- admin metrics (dashboard + analytics)
create table if not exists public.admin_metrics (
  metric_id text primary key,
  category text not null default 'dashboard' check (category in ('dashboard','analytics')),
  label text not null,
  value text not null,
  description text,
  trend text check (trend in ('up','down','flat')),
  display_order int not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists admin_metrics_category_idx on public.admin_metrics (category, display_order);

create trigger admin_metrics_set_updated_at
before update on public.admin_metrics
for each row
execute function public.set_updated_at();

-- activity log used for realtime admin feed
create table if not exists public.admin_activity_log (
  id uuid primary key default gen_random_uuid(),
  activity_type text not null check (activity_type in ('run','flag','report','room','policy','control')),
  occurred_at timestamptz not null default now(),
  message text not null,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists admin_activity_log_occurred_at_idx
  on public.admin_activity_log (occurred_at desc);

-- singleton safety controls for admin panel
create table if not exists public.admin_control_settings (
  id int primary key default 1 check (id = 1),
  auto_moderation_enabled boolean not null default true,
  safety_mode text not null default 'standard' check (safety_mode in ('relaxed','standard','strict')),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(user_id)
);

insert into public.admin_control_settings (id)
values (1)
on conflict (id) do nothing;

create trigger admin_control_settings_set_updated_at
before update on public.admin_control_settings
for each row
execute function public.set_updated_at();

-- logging helper
create or replace function public.log_admin_activity(
  p_activity_type text,
  p_message text,
  p_metadata jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.admin_activity_log(activity_type, message, metadata)
  values (p_activity_type, p_message, coalesce(p_metadata, '{}'::jsonb));
end;
$$;

-- trigger: runs -> activity log
create or replace function public.trg_runs_admin_activity()
returns trigger
language plpgsql
as $$
declare
  story_title text;
begin
  if new.story_id is not null then
    select title into story_title from public.stories where id = new.story_id;
  end if;

  perform public.log_admin_activity(
    'run',
    format('Run %s recorded for %s', new.id, coalesce(story_title, new.story_id::text)),
    jsonb_build_object(
      'run_id', new.id,
      'story_id', new.story_id,
      'policy_version', new.policy_version,
      'canon_version', new.canon_version,
      'created_at', new.created_at
    )
  );

  return new;
end;
$$;

drop trigger if exists runs_admin_activity on public.runs;

create trigger runs_admin_activity
after insert on public.runs
for each row
execute function public.trg_runs_admin_activity();

-- trigger: policy flags -> activity log
create or replace function public.trg_policy_flags_activity()
returns trigger
language plpgsql
as $$
declare
  story_title text;
begin
  if new.run_id is not null then
    select s.title
      into story_title
      from public.runs r
      left join public.stories s on s.id = r.story_id
      where r.id = new.run_id;
  end if;

  perform public.log_admin_activity(
    'flag',
    format('Policy %s flag raised', new.flag_severity),
    jsonb_build_object(
      'flag_id', new.id,
      'run_id', new.run_id,
      'event_idx', new.event_idx,
      'severity', new.flag_severity,
      'status', new.status,
      'story_title', story_title,
      'created_at', new.created_at
    )
  );

  return new;
end;
$$;

drop trigger if exists policy_flags_activity on public.policy_flags;

create trigger policy_flags_activity
after insert on public.policy_flags
for each row
execute function public.trg_policy_flags_activity();

-- trigger: reports -> activity log
create or replace function public.trg_reports_activity()
returns trigger
language plpgsql
as $$
begin
  perform public.log_admin_activity(
    'report',
    format('Report opened for %s %s', new.target_type, new.target_id),
    jsonb_build_object(
      'report_id', new.id,
      'target_type', new.target_type,
      'target_id', new.target_id,
      'status', new.status,
      'created_at', new.created_at
    )
  );

  return new;
end;
$$;

drop trigger if exists reports_activity on public.reports;

create trigger reports_activity
after insert on public.reports
for each row
execute function public.trg_reports_activity();

-- dashboard data functions ---------------------------------------------------

create or replace function public.admin_dashboard_metrics()
returns table (
  metric_id text,
  label text,
  value text,
  description text,
  trend text,
  updated_at timestamptz
)
language sql
stable
as $$
  select metric_id, label, value, description, trend, updated_at
  from public.admin_metrics
  where category = 'dashboard'
  order by display_order, metric_id;
$$;

create or replace function public.admin_analytics_metrics()
returns table (
  metric_id text,
  label text,
  value text,
  description text,
  trend text,
  updated_at timestamptz
)
language sql
stable
as $$
  select metric_id, label, value, description, trend, updated_at
  from public.admin_metrics
  where category = 'analytics'
  order by display_order, metric_id;
$$;

create or replace function public.admin_recent_activity(p_limit int default 20)
returns table (
  id uuid,
  occurred_at timestamptz,
  activity_type text,
  message text,
  metadata jsonb
)
language sql
stable
as $$
  select id, occurred_at, activity_type, message, metadata
  from public.admin_activity_log
  order by occurred_at desc
  limit greatest(p_limit, 1);
$$;

create or replace function public.admin_room_monitor()
returns table (
  room_id uuid,
  room_label text,
  story_id text,
  story_title text,
  mode text,
  status text,
  member_count bigint,
  vote_window_ms int,
  last_activity_at timestamptz
)
language sql
stable
as $$
  select
    r.id as room_id,
    coalesce(r.admin_label, r.id::text) as room_label,
    r.story_id,
    s.title as story_title,
    r.mode,
    r.status,
    coalesce(m.member_count, r.member_estimate, 0) as member_count,
    r.vote_window_ms,
    coalesce(r.last_activity_at, r.created_at) as last_activity_at
  from public.rooms r
  left join public.stories s on s.id = r.story_id
  left join (
    select room_id, count(distinct member_key) as member_count
    from public.room_memberships
    where left_at is null
    group by room_id
  ) m on m.room_id = r.id
  order by coalesce(r.last_activity_at, r.created_at) desc, r.id;
$$;

create or replace function public.admin_voice_library()
returns table (
  id text,
  provider text,
  voice_handle text,
  license text,
  default_story_id text,
  default_story_title text,
  is_active boolean,
  updated_at timestamptz
)
language sql
stable
as $$
  select
    v.id,
    v.provider,
    v.voice_handle,
    v.license,
    v.default_story_id,
    s.title as default_story_title,
    v.is_active,
    v.updated_at
  from public.voices v
  left join public.stories s on s.id = v.default_story_id
  order by v.provider, v.voice_handle;
$$;

create or replace function public.admin_policy_versions()
returns table (
  id text,
  rating_label text,
  disallowed_topics text[],
  soft_filters text[],
  summary text,
  published_at timestamptz,
  updated_at timestamptz
)
language sql
stable
as $$
  select
    id,
    rating_label,
    disallowed_topics,
    soft_filters,
    summary,
    published_at,
    updated_at
  from public.policy_versions
  order by published_at desc, id;
$$;

create or replace function public.admin_reports()
returns table (
  id uuid,
  target_type text,
  target_id text,
  reason text,
  status text,
  submitted_by text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
as $$
  select
    r.id,
    r.target_type,
    r.target_id,
    r.reason,
    r.status,
    coalesce(
      p.display_name,
      case
        when r.submitted_by_guest is not null
          then 'guest:' || substr(r.submitted_by_guest::text, 1, 8)
        else null
      end,
      'unknown'
    ) as submitted_by,
    r.created_at,
    r.updated_at
  from public.reports r
  left join public.profiles p on p.user_id = r.submitted_by_profile
  order by r.created_at desc;
$$;

create or replace function public.admin_story_library()
returns jsonb
language sql
stable
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', s.id,
        'title', s.title,
        'owner', coalesce(s.owner_name, 'Unassigned'),
        'status', s.status,
        'updatedAt', s.updated_at,
        'guides',
          coalesce(
            (
              select jsonb_agg(
                       jsonb_build_object(
                         'id', g.id,
                         'type', g.guide_type,
                         'title', g.title,
                         'summary', g.summary,
                         'order', g.sort_order
                       )
                       order by g.sort_order, g.created_at
                     )
              from public.story_guides g
              where g.story_id = s.id
            ),
            '[]'::jsonb
          ),
        'chapters',
          coalesce(
            (
              select jsonb_agg(
                       jsonb_build_object(
                         'id', c.id,
                         'title', c.title,
                         'synopsis', c.synopsis,
                         'order', c.chapter_order,
                         'scenes',
                           coalesce(
                             (
                               select jsonb_agg(
                                        jsonb_build_object(
                                          'id', sc.id,
                                          'title', sc.title,
                                          'premise', sc.premise,
                                          'status', sc.status,
                                          'order', sc.scene_order
                                        )
                                        order by sc.scene_order, sc.created_at
                                      )
                               from public.story_scenes sc
                               where sc.chapter_id = c.id
                             ),
                             '[]'::jsonb
                           )
                       )
                       order by c.chapter_order, c.created_at
                     )
              from public.story_chapters c
              where c.story_id = s.id
            ),
            '[]'::jsonb
          )
      )
      order by s.created_at, s.id
    ),
    '[]'::jsonb
  )
  from public.stories s;
$$;

create or replace function public.admin_get_safety_settings()
returns table (
  auto_moderation_enabled boolean,
  safety_mode text,
  updated_at timestamptz,
  updated_by uuid
)
language sql
stable
as $$
  select
    auto_moderation_enabled,
    safety_mode,
    updated_at,
    updated_by
  from public.admin_control_settings
  where id = 1;
$$;

create or replace function public.admin_update_safety_settings(
  p_auto_moderation boolean default null,
  p_safety_mode text default null,
  p_actor uuid default null
) returns public.admin_control_settings
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.admin_control_settings%rowtype;
  new_mode text;
  new_auto boolean;
begin
  if p_safety_mode is not null then
    new_mode := lower(p_safety_mode);
    if new_mode not in ('relaxed','standard','strict') then
      raise exception 'Invalid safety mode %', p_safety_mode;
    end if;
  end if;

  update public.admin_control_settings
     set auto_moderation_enabled = coalesce(p_auto_moderation, auto_moderation_enabled),
         safety_mode = coalesce(new_mode, safety_mode),
         updated_at = now(),
         updated_by = p_actor
   where id = 1
   returning * into result;

  new_auto := result.auto_moderation_enabled;

  perform public.log_admin_activity(
    'policy',
    format('Safety mode set to %s (auto moderation %s)',
           result.safety_mode,
           case when new_auto then 'on' else 'off' end),
    jsonb_build_object(
      'auto_moderation_enabled', result.auto_moderation_enabled,
      'safety_mode', result.safety_mode,
      'updated_by', p_actor
    )
  );

  return result;
end;
$$;
