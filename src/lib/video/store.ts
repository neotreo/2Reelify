import { createClient } from '../../../supabase/server';
import { VideoJob } from '@/types/video';

// Persistence helpers using Supabase 'video_jobs' table
// Table columns expected:
// id (uuid PK), user_id (uuid), idea text, status text, sections jsonb, voiceover_url text, captions jsonb, video_url text, error text, created_at timestamptz default now(), updated_at timestamptz

export async function insertJob(job: VideoJob) {
  const supabase = await createClient();
  await supabase.from('video_jobs').insert({
    id: job.id,
    user_id: job.user_id,
    idea: job.idea,
    status: job.status,
    sections: job.sections,
    voiceover_url: job.voiceover_url,
    captions: job.captions,
    video_url: job.video_url,
    error: job.error,
    created_at: job.created_at,
    updated_at: job.updated_at
  });
}

export async function updateJob(id: string, patch: Partial<VideoJob>) {
  const supabase = await createClient();
  const { data, error } = await supabase.from('video_jobs').update({
    ...patch,
    updated_at: new Date().toISOString()
  }).eq('id', id).select('*').single();
  if (error) throw error;
  return data as VideoJob;
}

export async function getJob(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from('video_jobs').select('*').eq('id', id).single();
  if (error) throw error;
  return data as VideoJob;
}
