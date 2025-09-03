create table if not exists public.video_jobs (
  id uuid primary key,
  user_id uuid references auth.users(id) on delete set null,
  idea text not null,
  status text not null,
  sections jsonb not null default '[]'::jsonb,
  voiceover_url text,
  captions jsonb,
  video_url text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists video_jobs_user_id_idx on public.video_jobs(user_id);
create index if not exists video_jobs_status_idx on public.video_jobs(status);

alter table public.video_jobs enable row level security;

drop policy if exists "select own or public" on public.video_jobs;
create policy "select own or public" on public.video_jobs for select using (auth.uid() = user_id);

drop policy if exists "insert own" on public.video_jobs;
create policy "insert own" on public.video_jobs for insert with check (auth.uid() = user_id);

drop policy if exists "update own" on public.video_jobs;
create policy "update own" on public.video_jobs for update using (auth.uid() = user_id);

alter publication supabase_realtime add table public.video_jobs;

notify pgrst, 'reload schema';
