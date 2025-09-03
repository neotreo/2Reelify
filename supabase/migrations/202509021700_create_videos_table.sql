-- Creates legacy videos table used by server actions with real script/voiceover/captions
create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  title text,
  description text,
  script text,
  scenes jsonb,
  video_url text,
  style text,
  duration integer,
  voice_type text,
  music_type text,
  has_voiceover boolean default false,
  has_captions boolean default false,
  has_music boolean default false,
  voiceover_url text,
  captions jsonb,
  status text default 'processing',
  error text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.videos enable row level security;

create index if not exists videos_user_id_idx on public.videos(user_id);
create index if not exists videos_status_idx on public.videos(status);

create policy "select own videos" on public.videos for select using (auth.uid() = user_id);
create policy "insert own videos" on public.videos for insert with check (auth.uid() = user_id);
create policy "update own videos" on public.videos for update using (auth.uid() = user_id);

-- trigger for updated_at
create or replace function public.videos_set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;$$;

create trigger trg_videos_updated before update on public.videos for each row execute procedure public.videos_set_updated_at();
