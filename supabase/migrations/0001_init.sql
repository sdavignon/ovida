-- Supabase initial schema for Ovida
create extension if not exists "pgcrypto" with schema public;
create extension if not exists "uuid-ossp" with schema public;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

create table if not exists public.guests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  expires_at timestamptz
);

create table if not exists public.stories (
  id text primary key,
  title text not null,
  canon_version text not null,
  policy_version text not null,
  created_at timestamptz default now()
);

create table if not exists public.runs (
  id uuid primary key default gen_random_uuid(),
  story_id text references public.stories(id) on delete restrict,
  user_id uuid references public.profiles(user_id),
  guest_id uuid references public.guests(id),
  seed bigint not null,
  model_version text not null,
  policy_version text not null,
  canon_version text not null,
  visibility text not null default 'public' check (visibility in ('public','unlisted','private')),
  checksum text not null,
  parent_run_id uuid references public.runs(id),
  fork_beat_index int,
  created_at timestamptz default now()
);

create index if not exists runs_story_id_idx on public.runs (story_id);
create index if not exists runs_user_id_idx on public.runs (user_id);
create index if not exists runs_guest_id_idx on public.runs (guest_id);

create table if not exists public.events (
  run_id uuid references public.runs(id) on delete cascade,
  idx int not null,
  state_hash text not null,
  choice_id text not null,
  safety_flags jsonb default '[]'::jsonb,
  audio_key text,
  created_at timestamptz default now(),
  primary key(run_id, idx)
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  story_id text references public.stories(id),
  run_id uuid references public.runs(id),
  host_user_id uuid references public.profiles(user_id),
  host_guest_id uuid references public.guests(id),
  mode text not null check (mode in ('duo','party','global')),
  quorum int,
  vote_window_ms int not null default 12000,
  status text not null default 'lobby' check (status in ('lobby','sync','vote_open','vote_locked','resolving','playing','end')),
  created_at timestamptz default now()
);

create table if not exists public.votes (
  room_id uuid references public.rooms(id) on delete cascade,
  beat_idx int not null,
  voter_user_id uuid references public.profiles(user_id),
  voter_guest_id uuid references public.guests(id),
  choice_id text not null,
  ts timestamptz default now(),
  primary key(room_id, beat_idx, voter_user_id, voter_guest_id)
);
