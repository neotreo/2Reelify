import { randomUUID } from 'crypto';
import OpenAI from 'openai';
import { VideoJob, VideoSection } from '@/types/video';
import { insertJob, updateJob, getJob } from './store';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function structuredJSON<T>(prompt: string, schemaName: string, schema: any): Promise<T> {
  const res = await openai.responses.create({
    model: 'gpt-4.1-mini',
    input: prompt,
    response_format: { type: 'json_schema', json_schema: { name: schemaName, schema } }
  });
  const text = (res as any).output[0].content[0].text as string;
  return JSON.parse(text) as T;
}

export async function createVideoJob(idea: string, userId?: string | null): Promise<VideoJob> {
  const job: VideoJob = {
    id: randomUUID(),
    user_id: userId,
    idea,
    status: 'planning',
    sections: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  await insertJob(job);
  queueMicrotask(() => runPipeline(job.id).catch(err => console.error('Pipeline error', err)));
  return job;
}

async function runPipeline(jobId: string) {
  let job = await getJob(jobId);
  try {
    job = await plan(job);
    job = await script(job);
    job = await prompts(job);
    job = await generateClips(job);
    job = await generateVoiceover(job);
    job = await generateCaptions(job);
    job = await stitch(job);
    await updateJob(job.id, { status: 'complete' });
  } catch (e: any) {
    await updateJob(job.id, { status: 'error', error: e?.message || 'unknown error' });
  }
}

async function plan(job: VideoJob): Promise<VideoJob> {
  await updateJob(job.id, { status: 'planning' });
  const data = await structuredJSON<{ sections: { title: string; objective: string; targetSeconds: number }[] }>(
    `Plan a high retention vertical short (TikTok/Reel) based on the idea: "${job.idea}".\nConstraints:\n- 35-55s total\n- 5-8 sections\n- Each targetSeconds 4-10\nReturn JSON only.`,
    'video_plan',
    {
      type: 'object',
      properties: {
        sections: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              objective: { type: 'string' },
              targetSeconds: { type: 'integer' }
            },
            required: ['title','objective','targetSeconds']
          },
          minItems: 4,
          maxItems: 8
        }
      },
      required: ['sections']
    }
  );
  const sections: VideoSection[] = data.sections.map(s => ({
    id: randomUUID(),
    title: s.title,
    objective: s.objective,
    target_seconds: s.targetSeconds
  }));
  return await updateJob(job.id, { sections });
}

async function script(job: VideoJob): Promise<VideoJob> {
  await updateJob(job.id, { status: 'scripting' });
  const sectionDesc = job.sections.map((s,i) => `${i+1}. ${s.title} (objective: ${s.objective}, target: ${s.target_seconds}s)`).join('\n');
  const data = await structuredJSON<{ sections: { id: string; script: string }[] }>(
    `Write an engaging spoken script for each section below. Avoid camera directions. Keep wording natural & energetic.\nReturn JSON with sections array (id, script).\nSections:\n${sectionDesc}\n`,
    'video_script',
    {
      type: 'object',
      properties: {
        sections: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              script: { type: 'string' }
            },
            required: ['id','script']
          }
        }
      },
      required: ['sections']
    }
  );
  const map = new Map(data.sections.map(s => [s.id, s.script]));
  const updatedSections = job.sections.map(s => ({ ...s, script: map.get(s.id) || s.objective }));
  return await updateJob(job.id, { sections: updatedSections });
}

async function prompts(job: VideoJob): Promise<VideoJob> {
  await updateJob(job.id, { status: 'prompting' });
  const scripts = job.sections.map(s => ({ id: s.id, script: s.script })).slice(0, job.sections.length);
  const data = await structuredJSON<{ prompts: { id: string; shotPrompt: string }[] }>(
    `Create a concise visual generation prompt for each script line for an AI video model. Focus on cinematic, vertical 9:16 visuals, no text overlays, no watermarks. Max 200 chars each.\nReturn JSON with prompts array (id, shotPrompt).`,
    'video_prompts',
    {
      type: 'object',
      properties: {
        prompts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              shotPrompt: { type: 'string' }
            },
            required: ['id','shotPrompt']
          }
        }
      },
      required: ['prompts']
    }
  );
  const map = new Map(data.prompts.map(p => [p.id, p.shotPrompt]));
  const updatedSections = job.sections.map(s => ({ ...s, shot_prompt: map.get(s.id) || s.objective }));
  return await updateJob(job.id, { sections: updatedSections });
}

async function generateClips(job: VideoJob): Promise<VideoJob> {
  await updateJob(job.id, { status: 'generating_clips' });
  // Placeholder: real API integration needed. Simulate URLs.
  const updatedSections = job.sections.map(s => ({
    ...s,
    clip_id: randomUUID(),
    clip_url: `https://example.invalid/clips/${s.id}.mp4`
  }));
  return await updateJob(job.id, { sections: updatedSections });
}

async function generateVoiceover(job: VideoJob): Promise<VideoJob> {
  await updateJob(job.id, { status: 'voiceover' });
  // Placeholder: integrate TTS provider. Save to storage and set voiceover_url.
  const full = job.sections.map(s => s.script).join(' ');
  // Not actually generating: stub URL
  return await updateJob(job.id, { voiceover_url: `https://example.invalid/voice/${job.id}.mp3` });
}

async function generateCaptions(job: VideoJob): Promise<VideoJob> {
  await updateJob(job.id, { status: 'captions' });
  let cursor = 0;
  const captions = job.sections.flatMap(section => {
    const words = (section.script || '').split(/\s+/).filter(Boolean);
    const perWord = (section.target_seconds || 5) / Math.max(words.length,1);
    return words.map((w, i) => {
      const start = cursor + i * perWord;
      const end = start + perWord;
      if (i === words.length - 1) cursor = end; // advance after last
      return { start, end, text: w };
    });
  });
  return await updateJob(job.id, { captions });
}

async function stitch(job: VideoJob): Promise<VideoJob> {
  await updateJob(job.id, { status: 'stitching' });
  // Actual stitching with ffmpeg should happen in a worker environment where ffmpeg is available.
  return await updateJob(job.id, { video_url: `https://example.invalid/videos/${job.id}.mp4` });
}
