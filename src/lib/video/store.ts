import { createClient } from '../../../supabase/server';
import { VideoJob } from '@/types/video';

// Persistence helpers using Supabase 'video_jobs' table
// Table columns expected:
// id (uuid PK), user_id (uuid), idea text, status text, sections jsonb, voiceover_url text, captions jsonb, video_url text, error text, created_at timestamptz default now(), updated_at timestamptz default now()

export async function insertJob(job: VideoJob) {
  const supabase = await createClient();
  let payload: any = {
    id: job.id,
    user_id: job.user_id ?? null,
    idea: job.idea,
    status: job.status,
    sections: job.sections ?? [],
    voiceover_url: job.voiceover_url ?? null,
    captions: job.captions ?? null,
    video_url: job.video_url ?? null,
    error: job.error ?? null,
    script_model: job.script_model ?? null,
    video_model: job.video_model ?? null,
    created_at: job.created_at,
    updated_at: job.updated_at
  };
  let { error } = await supabase.from('video_jobs').insert(payload);
  if (error && /script_model|video_model/i.test(error.message)) {
    // Retry without new columns (schema cache not yet refreshed)
    const fallback = { ...payload };
    delete fallback.script_model;
    delete fallback.video_model;
    const retry = await supabase.from('video_jobs').insert(fallback);
    error = retry.error ?? null;
  }
  if (error) {
    console.error('insertJob error', {
      code: (error as any).code,
      message: error.message,
      details: (error as any).details,
      hint: (error as any).hint,
    });
    throw error;
  }
}

export async function updateJob(id: string, patch: Partial<VideoJob>) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('video_jobs')
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();
  if (error) {
    console.error('updateJob error', {
      code: (error as any).code,
      message: error.message,
      details: (error as any).details,
      hint: (error as any).hint,
    });
    throw error;
  }
  return data as VideoJob;
}

export async function getJob(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('video_jobs')
    .select('*')
    .eq('id', id)
    .single();
  if (error) {
    console.error('getJob error', {
      code: (error as any).code,
      message: error.message,
      details: (error as any).details,
      hint: (error as any).hint,
    });
    throw error;
  }
  return data as VideoJob;
}