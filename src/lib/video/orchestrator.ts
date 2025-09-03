import { randomUUID } from 'crypto';
import OpenAI from 'openai';
import { VideoJob, VideoSection } from '@/types/video';
import { insertJob, updateJob, getJob } from './store';
import { generateVoiceover as ttsGenerateVoiceover, generateCaptions as whisperGenerateCaptions, generateVideoClip, processAndCombineVideos } from '@/lib/ai-services';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function structuredJSON<T>(prompt: string, schemaName: string, schema: any): Promise<T> {
  const schemaText = JSON.stringify(schema, null, 2);
  const res = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You ONLY output valid JSON. It MUST satisfy this JSON Schema named ${schemaName}:\n${schemaText}`
      },
      { role: 'user', content: prompt }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
    max_tokens: 1800
  });
  const text = res.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty OpenAI JSON response');
  try {
    return JSON.parse(text) as T;
  } catch (err) {
    throw new Error(`Model returned invalid JSON: ${text}`);
  }
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
  
  // Use setTimeout instead of queueMicrotask for better error handling
  setTimeout(async () => {
    try {
      await runPipeline(job.id);
    } catch (err) {
      console.error('Pipeline error:', err);
      await updateJob(job.id, { 
        status: 'error', 
        error: err instanceof Error ? err.message : 'Unknown error' 
      });
    }
  }, 100);
  
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
    console.error('Pipeline error:', e);
    await updateJob(job.id, { 
      status: 'error', 
      error: e?.message || 'Pipeline failed' 
    });
    throw e;
  }
}

async function plan(job: VideoJob): Promise<VideoJob> {
  await updateJob(job.id, { status: 'planning' });
  
  const prompt = `Plan a high-retention vertical short video (TikTok/Reel) based on this idea: "${job.idea}".
  
  Requirements:
  - Total duration: 35-55 seconds
  - Create 5-8 sections
  - Each section should be 4-10 seconds
  - Focus on viral hooks and retention
  
  Return a JSON object with this structure:
  {
    "sections": [
      {
        "title": "Hook/Introduction/etc",
        "objective": "What this section achieves",
        "targetSeconds": 5
      }
    ]
  }`;
  
  const data = await structuredJSON<{ sections: { title: string; objective: string; targetSeconds: number }[] }>(
    prompt,
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
  
  const sectionDesc = job.sections.map((s, i) => 
    `Section ${i+1}: ${s.title} (${s.objective}) - ${s.target_seconds} seconds`
  ).join('\n');
  
  const prompt = `Write an engaging spoken script for a viral short video about "${job.idea}".
  
  Sections to write for:
  ${sectionDesc}
  
  Requirements:
  - Natural, conversational tone
  - High energy and engaging
  - No camera directions, just spoken words
  - Each section's script should fit its time allocation
  
  Return JSON with this structure:
  {
    "sections": [
      {
        "id": "section_id_here",
        "script": "The actual spoken words for this section"
      }
    ]
  }
  
  Use these section IDs: ${job.sections.map(s => s.id).join(', ')}`;
  
  const data = await structuredJSON<{ sections: { id: string; script: string }[] }>(
    prompt,
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
  
  const scriptMap = new Map(job.sections.map(s => [s.id, '']));
  data.sections.forEach(s => {
    if (scriptMap.has(s.id)) {
      scriptMap.set(s.id, s.script);
    }
  });
  
  const updatedSections = job.sections.map(s => ({
    ...s,
    script: scriptMap.get(s.id) || s.objective
  }));
  
  return await updateJob(job.id, { sections: updatedSections });
}

async function prompts(job: VideoJob): Promise<VideoJob> {
  await updateJob(job.id, { status: 'prompting' });
  
  const scriptsDesc = job.sections.map(s => 
    `ID: ${s.id}\nScript: "${s.script}"`
  ).join('\n\n');
  
  const prompt = `Create visual generation prompts for AI video creation based on these script sections:
  
  ${scriptsDesc}
  
  Requirements:
  - Cinematic, vertical 9:16 format descriptions
  - No text overlays or watermarks in prompts
  - Focus on visuals that match the narration
  - Maximum 200 characters per prompt
  - Be specific about camera angles, subjects, and mood
  
  Return JSON:
  {
    "prompts": [
      {
        "id": "section_id",
        "shotPrompt": "Detailed visual description here"
      }
    ]
  }`;
  
  const data = await structuredJSON<{ prompts: { id: string; shotPrompt: string }[] }>(
    prompt,
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
  
  const promptMap = new Map(data.prompts.map(p => [p.id, p.shotPrompt]));
  const updatedSections = job.sections.map(s => ({
    ...s,
    shot_prompt: promptMap.get(s.id) || 'Cinematic shot related to: ' + s.objective
  }));
  
  return await updateJob(job.id, { sections: updatedSections });
}

// Generate clips per section using AI video model (Replicate / etc.)
async function generateClips(job: VideoJob): Promise<VideoJob> {
  await updateJob(job.id, { status: 'generating_clips' });

  const sections = [...job.sections];

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    // Skip if already has clip (idempotency / resume support)
    if (section.clip_url) continue;
    try {
      const duration = Math.min(Math.max(section.target_seconds || 5, 2), 12);
      const prompt = section.shot_prompt || `Cinematic vertical video illustrating: ${section.objective}`;
      const clipUrl = await generateVideoClip({
        prompt,
        duration,
        style: 'cinematic',
        aspectRatio: '9:16'
      });
      section.clip_id = randomUUID();
      section.clip_url = clipUrl;
  delete (section as any).clip_error;
    } catch (err) {
      console.error('Clip generation failed for section', section.id, err);
      // Leave clip_url undefined; pipeline can still proceed (or fail later in stitch)
  section.clip_error = err instanceof Error ? err.message : 'clip_failed';
    }
    // Persist progress after each section to allow UI polling
    await updateJob(job.id, { sections });
  }

  return await getJob(job.id);
}

async function generateVoiceover(job: VideoJob): Promise<VideoJob> {
  await updateJob(job.id, { status: 'voiceover' });
  const fullScript = job.sections.map(s => s.script).join(' ').trim();
  if (!fullScript) throw new Error('Empty script cannot generate voiceover');

  // Heuristic voice selection based on idea & section titles/objectives
  const text = (job.idea + ' ' + job.sections.map(s => `${s.title} ${s.objective}`).join(' ')).toLowerCase();
  let voice: string = 'professional';
  if (/energy|exciting|fast|hype|extreme|viral|high energy/.test(text)) voice = 'energetic';
  else if (/calm|relax|soothing|meditat|sleep|ambient|focus/.test(text)) voice = 'calm';
  else if (/story|narrat|once upon|journey|adventure|history/.test(text)) voice = 'storyteller';
  else if (/investigat|mystery|true crime|analysis|deep dive|forensic/.test(text)) voice = 'calm';
  else if (/casual|vlog|day in the life|behind the scenes/.test(text)) voice = 'casual';

  const voiceoverUrl = await ttsGenerateVoiceover({
    text: fullScript,
    voice,
    speed: 1.0
  });
  return await updateJob(job.id, { voiceover_url: voiceoverUrl, voice_id: voice });
}

async function generateCaptions(job: VideoJob): Promise<VideoJob> {
  await updateJob(job.id, { status: 'captions' });
  if (!job.voiceover_url) throw new Error('Voiceover must be generated before captions');
  const captionSegments = await whisperGenerateCaptions(job.voiceover_url);
  // Basic sanity filter
  const filtered = captionSegments.filter(c => typeof c.start === 'number' && typeof c.end === 'number' && c.text);
  return await updateJob(job.id, { captions: filtered });
}

async function stitch(job: VideoJob): Promise<VideoJob> {
  await updateJob(job.id, { status: 'stitching' });

  const clipUrls = job.sections.map(s => s.clip_url).filter(Boolean) as string[];
  if (!clipUrls.length) throw new Error('No clips generated to stitch');

  try {
    const finalUrl = await processAndCombineVideos({
      videoClips: clipUrls,
      audioUrl: job.voiceover_url || undefined,
      captions: job.captions || undefined,
  durations: job.sections.map(s => s.target_seconds || 5),
  captionStyle: job.voice_id || undefined
    });
    return await updateJob(job.id, { video_url: finalUrl });
  } catch (err) {
    console.error('Stitching failed', err);
    throw err;
  }
}