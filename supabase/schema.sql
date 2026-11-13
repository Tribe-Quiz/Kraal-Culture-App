-- Kraal Culture (Kwa Khanye): database schema for a NEW Supabase project.
-- Run the whole file once in: Supabase dashboard > SQL Editor > New query.
-- It is safe to re-run (idempotent).

-- ─────────────────────────────────────────────────────────────────────────
-- 1. profiles: one row per auth user, created automatically on signup
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    text not null,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,30}$')
);

-- Case-insensitive uniqueness enforced by the database (no race conditions)
create unique index if not exists profiles_username_lower_key
  on public.profiles (lower(username));

alter table public.profiles enable row level security;

drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- No insert/delete policies on purpose: rows are created by the trigger below
-- and removed automatically when the auth user is deleted.

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Trigger: create the profile when a user signs up
--    Email signups pass `username` in user metadata. Google signups do not,
--    so a username is derived from the email and de-duplicated.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base      text;
  candidate text;
  n         int := 0;
begin
  base := lower(coalesce(new.raw_user_meta_data ->> 'username',
                         split_part(coalesce(new.email, ''), '@', 1)));
  base := regexp_replace(base, '[^a-z0-9_]', '', 'g');

  if length(base) < 3 then
    base := 'member' || substr(replace(new.id::text, '-', ''), 1, 6);
  end if;

  base := left(base, 24);
  candidate := base;

  while exists (select 1 from public.profiles where lower(username) = candidate) loop
    n := n + 1;
    candidate := base || n::text;
  end loop;

  insert into public.profiles (id, username, avatar_url)
  values (new.id, candidate, new.raw_user_meta_data ->> 'avatar_url');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────
-- 3. username_available(): lets the signup form check a name BEFORE the user
--    is signed in, without opening the profiles table to anonymous reads.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.username_available(desired text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select not exists (
    select 1 from public.profiles where lower(username) = lower(desired)
  );
$$;

revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. artists: the catalogue shown on the culture pages
--    Read-only for signed-in users. Add and edit rows from the dashboard
--    Table Editor or with the service role (both bypass RLS).
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.artists (
  id              uuid primary key default gen_random_uuid(),
  country_id      text not null,               -- matches id in src/constants/countries.js, e.g. 'za'
  culture_id      text not null,               -- e.g. 'zulu'
  culture_name    text,
  culture_symbol  text,
  name            text not null,
  tagline         text,
  genre           text,
  bio             text,
  photo_url       text,
  instagram       text,                        -- handle only, without @ or URL
  spotify_url     text,
  youtube_url     text,
  has_music       boolean not null default false,
  has_vr          boolean not null default false,
  has_bioscope    boolean not null default false,
  music_route     text,                        -- optional in-app route override
  vr_route        text,
  bioscope_route  text,
  created_at      timestamptz not null default now()
);

create index if not exists artists_country_culture_idx
  on public.artists (country_id, culture_id);

alter table public.artists enable row level security;

drop policy if exists "artists: signed-in users can read" on public.artists;
create policy "artists: signed-in users can read"
  on public.artists for select
  to authenticated
  using (true);

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Storage: public avatars bucket, each user writes only to their own folder
--    (the app uploads to avatars/<user-id>/<timestamp>.<ext>)
-- ─────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152,
        array['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars: public read" on storage.objects;
create policy "avatars: public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars: upload to own folder" on storage.objects;
create policy "avatars: upload to own folder"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars'
              and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "avatars: update own files" on storage.objects;
create policy "avatars: update own files"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars'
         and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "avatars: delete own files" on storage.objects;
create policy "avatars: delete own files"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars'
         and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ─────────────────────────────────────────────────────────────────────────
-- 6. User uploads: private music files + a table describing them
--    Any signed-in user can upload; each user sees and plays only their own.
--    Files live in the PRIVATE 'user-music' bucket under <user-id>/<file>
--    and are played through short-lived signed URLs.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.user_tracks (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title         text not null check (char_length(title)  between 1 and 120),
  artist        text not null check (char_length(artist) between 1 and 120),
  storage_path  text not null unique,
  mime_type     text not null,
  size_bytes    bigint not null check (size_bytes > 0 and size_bytes <= 20971520),
  duration_sec  integer check (duration_sec is null or duration_sec >= 0),
  created_at    timestamptz not null default now(),
  -- the file must sit inside the uploader's own folder
  constraint user_tracks_path_in_own_folder check (storage_path like user_id::text || '/%')
);

create index if not exists user_tracks_user_idx on public.user_tracks (user_id, created_at desc);

alter table public.user_tracks enable row level security;

drop policy if exists "user_tracks: read own" on public.user_tracks;
create policy "user_tracks: read own"
  on public.user_tracks for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "user_tracks: insert own" on public.user_tracks;
create policy "user_tracks: insert own"
  on public.user_tracks for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "user_tracks: update own" on public.user_tracks;
create policy "user_tracks: update own"
  on public.user_tracks for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "user_tracks: delete own" on public.user_tracks;
create policy "user_tracks: delete own"
  on public.user_tracks for delete
  to authenticated
  using (user_id = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('user-music', 'user-music', false, 20971520,
        array['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/wav',
              'audio/x-wav', 'audio/ogg', 'audio/webm', 'audio/flac'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "user-music: read own files" on storage.objects;
create policy "user-music: read own files"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'user-music'
         and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "user-music: upload to own folder" on storage.objects;
create policy "user-music: upload to own folder"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'user-music'
              and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "user-music: delete own files" on storage.objects;
create policy "user-music: delete own files"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'user-music'
         and (storage.foldername(name))[1] = (select auth.uid())::text);
