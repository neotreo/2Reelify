ALTER TABLE public.video_jobs ADD COLUMN IF NOT EXISTS voice_id text;

NOTIFY pgrst, 'reload schema';
