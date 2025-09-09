-- Ensure script_model and video_model columns exist (idempotent)
ALTER TABLE public.video_jobs
	ADD COLUMN IF NOT EXISTS script_model text,
	ADD COLUMN IF NOT EXISTS video_model text;

-- Recreate indices (no-op if already present)
CREATE INDEX IF NOT EXISTS video_jobs_script_model_idx ON public.video_jobs (script_model);
CREATE INDEX IF NOT EXISTS video_jobs_video_model_idx ON public.video_jobs (video_model);

-- Touch table to bump updated_at or trigger schema cache refresh (writing a dummy comment)
COMMENT ON COLUMN public.video_jobs.script_model IS 'Script model used for this job';
COMMENT ON COLUMN public.video_jobs.video_model IS 'Video generation model used for this job';

-- Ask PostgREST to reload schema for new columns
NOTIFY pgrst, 'reload schema';
