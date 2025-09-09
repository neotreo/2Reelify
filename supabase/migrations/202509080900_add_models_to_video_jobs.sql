-- Add script_model and video_model customization columns to video_jobs
ALTER TABLE public.video_jobs
  ADD COLUMN IF NOT EXISTS script_model text,
  ADD COLUMN IF NOT EXISTS video_model text;

-- Optional: simple indices if filtering later
CREATE INDEX IF NOT EXISTS video_jobs_script_model_idx ON public.video_jobs (script_model);
CREATE INDEX IF NOT EXISTS video_jobs_video_model_idx ON public.video_jobs (video_model);
