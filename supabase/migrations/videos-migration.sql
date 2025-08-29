-- Create videos table
CREATE TABLE IF NOT EXISTS public.videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  script TEXT,
  scenes JSONB,
  video_url TEXT,
  thumbnail_url TEXT,
  style TEXT,
  duration INTEGER,
  voice_type TEXT,
  music_type TEXT,
  has_voiceover BOOLEAN DEFAULT false,
  has_captions BOOLEAN DEFAULT false,
  has_music BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'processing',
  processing_started_at TIMESTAMP WITH TIME ZONE,
  processing_completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  view_count INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_videos_user_id ON public.videos(user_id);
CREATE INDEX idx_videos_status ON public.videos(status);
CREATE INDEX idx_videos_created_at ON public.videos(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own videos" ON public.videos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own videos" ON public.videos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own videos" ON public.videos
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own videos" ON public.videos
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_videos_updated_at 
  BEFORE UPDATE ON public.videos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create video_generations table to track API usage and costs
CREATE TABLE IF NOT EXISTS public.video_generations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID REFERENCES public.videos(id) ON DELETE SET NULL,
  generation_type TEXT NOT NULL, -- 'script', 'video_clip', 'voiceover', 'processing'
  provider TEXT, -- 'openai', 'runway', 'elevenlabs', etc.
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_cents INTEGER,
  duration_seconds INTEGER,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for video_generations
CREATE INDEX idx_video_generations_user_id ON public.video_generations(user_id);
CREATE INDEX idx_video_generations_video_id ON public.video_generations(video_id);
CREATE INDEX idx_video_generations_created_at ON public.video_generations(created_at DESC);

-- Enable RLS for video_generations
ALTER TABLE public.video_generations ENABLE ROW LEVEL SECURITY;

-- RLS policies for video_generations
CREATE POLICY "Users can view their own generation history" ON public.video_generations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert generation records" ON public.video_generations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add video credits/limits to users table if not exists
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS video_credits INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS videos_created_this_month INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_video_reset_date DATE DEFAULT CURRENT_DATE;

-- Function to check and update video credits
CREATE OR REPLACE FUNCTION check_video_credits(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_credits INTEGER;
  v_subscription_status TEXT;
BEGIN
  -- Get user's credits and subscription status
  SELECT u.video_credits, s.status
  INTO v_credits, v_subscription_status
  FROM public.users u
  LEFT JOIN public.subscriptions s ON u.user_id = s.user_id
  WHERE u.user_id = p_user_id;

  -- If user has active subscription, allow unlimited
  IF v_subscription_status = 'active' THEN
    RETURN true;
  END IF;

  -- Check if user has credits
  IF v_credits > 0 THEN
    -- Deduct one credit
    UPDATE public.users 
    SET video_credits = video_credits - 1
    WHERE user_id = p_user_id;
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset monthly video credits (run this with a cron job)
CREATE OR REPLACE FUNCTION reset_monthly_video_credits()
RETURNS void AS $$
BEGIN
  UPDATE public.users
  SET 
    video_credits = 3,
    videos_created_this_month = 0,
    last_video_reset_date = CURRENT_DATE
  WHERE last_video_reset_date < CURRENT_DATE - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;