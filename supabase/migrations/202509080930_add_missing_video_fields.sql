-- Add commonly referenced fields to videos table if missing
ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS view_count bigint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS thumbnail_url text;

-- Basic RLS remains from earlier migration.

-- Optional index if querying by view_count later
CREATE INDEX IF NOT EXISTS videos_view_count_idx ON public.videos(view_count);

NOTIFY pgrst, 'reload schema';
