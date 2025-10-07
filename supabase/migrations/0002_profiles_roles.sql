-- Add role tracking to profiles for admin/producer/moderator separation
alter table public.profiles
  add column if not exists role text not null default 'user'
    check (role in ('admin','producer','moderator','analyst','user'));

create index if not exists profiles_role_idx on public.profiles (role);
