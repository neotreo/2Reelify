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
  clip_error?: string;
  draft_narration?: string;
  draft_visual?: string;
};

export type CaptionSegment = { start: number; end: number; text: string };

export type VideoJobStatus =
  | 'queued'
  | 'planning'
  | 'drafting'
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
  voice_id?: string | null; // chosen voice profile key used
  captions?: CaptionSegment[];
  video_url?: string | null;
  error?: string | null;
  draft_url?: string | null;
  // New customization fields
  script_model?: string | null; // e.g. gpt-5-mini | gpt-5 | gpt-4-turbo-preview
  video_model?: string | null;  // e.g. wan-video/wan-2.2-t2v-fast | bytedance/seedance-1-lite | minimax/hailuo-02 | kwaivgi/kling-v2.1 | kwaivgi/kling-v2.1-master
  created_at: string;
  updated_at: string;
}
