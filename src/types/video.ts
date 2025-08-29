export type VideoSection = {
  id: string;
  title: string;
  objective: string;
  target_seconds: number;
  script?: string;
  shot_prompt?: string;
  clip_id?: string;
  clip_url?: string;
  start_time?: number;
  end_time?: number;
};

export type CaptionSegment = { start: number; end: number; text: string };

export type VideoJobStatus =
  | 'queued'
  | 'planning'
  | 'scripting'
  | 'prompting'
  | 'generating_clips'
  | 'voiceover'
  | 'captions'
  | 'stitching'
  | 'complete'
  | 'error';

export interface VideoJob {
  id: string;
  user_id?: string | null;
  idea: string;
  status: VideoJobStatus;
  sections: VideoSection[];
  voiceover_url?: string | null;
  captions?: CaptionSegment[];
  video_url?: string | null;
  error?: string | null;
  created_at: string;
  updated_at: string;
}
