import { randomUUID } from "crypto";
import OpenAI from "openai";
import { VideoJob, VideoSection } from "@/types/video";
import { insertJob, updateJob, getJob } from "./store";
import {
  generateVoiceover as ttsGenerateVoiceover,
  generateCaptions as whisperGenerateCaptions,
  generateVideoClip,
  processAndCombineVideos,
} from "@/lib/ai-services";

// Response type aliases (avoid inline object literal generic args to keep SWC happy)
type VideoScriptResponse = {
  sections: { id: string; script: string }[];
};

type VideoPlanResponse = {
  sections: { title: string; objective: string; targetSeconds: number }[];
};

type VideoDraftResponse = {
  sections: { title: string; draft_narration: string; draft_visual: string }[];
};

type VideoEntitiesResponse = {
  characters: { id: string; descriptor: string; coreTraits: string }[];
  settings: { id: string; descriptor: string }[];
  visualStyle: { palette: string; lighting: string; atmosphere: string; cameraStyle: string };
};

type VideoPromptsResponse = {
  prompts: { id: string; shotPrompt: string }[];
};

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("OPENAI_API_KEY not set");
    _openai = new OpenAI({ apiKey: key });
  }
  return _openai;
}

async function structuredJSON<T>(
  prompt: string,
  schemaName: string,
  schema: any,
  model?: string,
): Promise<T> {
  const schemaText = JSON.stringify(schema, null, 2);
  const chosenModel = model || process.env.OPENAI_MODEL || process.env.DEFAULT_OPENAI_MODEL || "gpt-4o-mini";
  const maxAttempts = 3;
  let lastErr: any = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const isGpt5 = /^gpt-5/i.test(chosenModel);
      const request: any = {
        model: chosenModel,
        messages: [
          {
            role: "system",
            content: `You ONLY output valid JSON. It MUST satisfy this JSON Schema named ${schemaName}:\n${schemaText}`,
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 1,
      };
      if (isGpt5) request.max_completion_tokens = 1800; else request.max_tokens = 1800;
      const res = await getOpenAI().chat.completions.create(request);
      const msg = res.choices?.[0]?.message;
      let text = msg?.content;
      if (!text || !text.trim()) {
        // Try to salvage JSON if tool/function call style output present in additional fields
        const rawString = JSON.stringify(res);
        const match = rawString.match(/\{\s*\"[\s\S]*\}\s*(?=")?/);
        if (match) text = match[0];
      }
      if (!text || !text.trim()) {
        throw new Error(`Empty OpenAI JSON response (attempt ${attempt})`);
      }
      try {
        const parsed: any = JSON.parse(text);
        // Minimal schema enforcement: required keys must exist
        if (schema && Array.isArray(schema.required)) {
          for (const key of schema.required) {
            if (!(key in parsed)) {
              throw new Error(`Parsed JSON missing required key '${key}'`);
            }
          }
        }
        // Additional targeted validations
        if (schemaName === 'video_plan') {
          if (!Array.isArray(parsed.sections) || !parsed.sections.length) {
            throw new Error('video_plan: sections array empty or missing');
          }
        } else if (schemaName === 'video_script') {
          if (!Array.isArray(parsed.sections) || !parsed.sections.length) {
            throw new Error('video_script: sections array empty or missing');
          }
        } else if (schemaName === 'video_prompts') {
            if (!Array.isArray(parsed.prompts) || !parsed.prompts.length) {
              throw new Error('video_prompts: prompts array empty or missing');
            }
        }
        return parsed as T;
      } catch (parseErr) {
        // Attempt to extract first JSON object substring
        const maybe = text.match(/\{[\s\S]*\}/);
        if (maybe) {
          try {
            return JSON.parse(maybe[0]) as T;
          } catch { /* ignore */ }
        }
        throw new Error(`Invalid JSON (attempt ${attempt}): ${text.slice(0, 400)}`);
      }
    } catch (err: any) {
      lastErr = err;
      if (attempt < maxAttempts) {
        const delay = 1200 * attempt;
        console.warn(`[structuredJSON] attempt ${attempt} failed for model ${chosenModel}:`, err?.message || err);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
    }
  }
  // Optional fallback model if gpt-5 unstable
  if (/^gpt-5/i.test(chosenModel) && process.env.OPENAI_FALLBACK_MODEL) {
    const fallback = process.env.OPENAI_FALLBACK_MODEL;
    console.warn(`[structuredJSON] All attempts failed with ${chosenModel}; trying fallback model ${fallback}`);
    try {
      return await structuredJSON<T>(prompt, schemaName, schema, fallback);
    } catch (e) {
      console.error('[structuredJSON] fallback model also failed');
    }
  }
  throw lastErr || new Error("structuredJSON failed");
}

function sanitizeSpokenScript(input: string): string {
  let s = String(input || "").trim();
  // Remove bracketed directions
  s = s.replace(/\[[^\]]*\]/g, "").replace(/\([^)]*\)/g, "");
  // Remove scene numbering/prefixes at line starts
  s = s.replace(/^(?:scene\s*\d+[:.-]?|\d+[:.-]?\s*)/gim, "");
  // Remove common direction terms
  const banned = [
    'camera', 'shot', 'cut to', 'pan', 'zoom', 'angle', 'close-up', 'wide shot',
    'transition', 'montage', 'scene', 'fade', 'title card', 'on-screen', 'super:', 'b-roll'
  ];
  const re = new RegExp(`\\b(${banned.map(x => x.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|')})\\b`, 'gi');
  s = s.replace(re, '').replace(/\s{2,}/g, ' ').trim();
  // Normalize spaces/dashes
  s = s.replace(/\s+—\s+/g, ' — ');
  return s;
}

export async function createVideoJob(
  idea: string,
  userId?: string | null,
  opts?: { scriptModel?: string; videoModel?: string },
): Promise<VideoJob> {
  const job: VideoJob = {
    id: randomUUID(),
    user_id: userId,
    idea,
    status: "planning",
    sections: [],
    script_model: opts?.scriptModel || null,
    video_model: opts?.videoModel || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  await insertJob(job);
  setTimeout(async () => {
    try {
      await runPipeline(job.id);
    } catch (err) {
      console.error("Pipeline error:", err);
      await updateJob(job.id, {
        status: "error",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }, 100);
  return job;
}

async function runPipeline(jobId: string) {
  let job = await getJob(jobId);
  try {
  job = normalizeJob(job);
    job = await plan(job);
  job = normalizeJob(job);
    job = await draft(job);
  job = normalizeJob(job);
    job = await script(job);
  job = normalizeJob(job);
    job = await prompts(job);
  job = normalizeJob(job);
    job = await generateClips(job);
    job = await generateVoiceover(job);
    job = await generateCaptions(job);
    job = await stitch(job);
    await updateJob(job.id, { status: "complete" });
  } catch (e: any) {
    console.error("Pipeline error:", e);
    await updateJob(job.id, {
      status: "error",
      error: e?.message || "Pipeline failed",
    });
    throw e;
  }
}

function normalizeJob(job: VideoJob): VideoJob {
  if (!Array.isArray(job.sections)) {
    console.warn('[pipeline] job.sections was not an array, initializing empty array. Raw value:', job.sections);
    (job as any).sections = [];
  }
  return job;
}

async function plan(job: VideoJob): Promise<VideoJob> {
  await updateJob(job.id, { status: "planning" });

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

  const data = await structuredJSON<VideoPlanResponse>(
    prompt,
    "video_plan",
    {
      type: "object",
      properties: {
        sections: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              objective: { type: "string" },
              targetSeconds: { type: "integer" },
            },
            required: ["title", "objective", "targetSeconds"],
          },
          minItems: 4,
          maxItems: 8,
        },
      },
      required: ["sections"],
    },
  job.script_model || job.video_model || undefined,
  );
  console.info('[pipeline] plan model used:', job.script_model || job.video_model || process.env.OPENAI_MODEL || process.env.DEFAULT_OPENAI_MODEL);

  const sections: VideoSection[] = data.sections.map((s) => ({
    id: randomUUID(),
    title: s.title,
    objective: s.objective,
    target_seconds: s.targetSeconds,
  }));

  return await updateJob(job.id, { sections });
}

// Draft step: create rough narration & visual outline before polished script
async function draft(job: VideoJob): Promise<VideoJob> {
  await updateJob(job.id, { status: 'drafting' });
  if (!Array.isArray(job.sections) || !job.sections.length) return job;
  const list = job.sections.map((s,i)=>`${i+1}. ${s.title} — ${s.objective} (${s.target_seconds}s)`).join('\n');
  const prompt = `Produce a ROUGH DRAFT for each section below. For every section output:
  draft_narration: conversational spoken wording (approx length fits target seconds) no numbering
  draft_visual: concise yet concrete visual description (subjects, motion, environment, camera, lighting, mood)
Sections:\n${list}\nReturn JSON: { "sections": [ { "title": "", "draft_narration": "", "draft_visual": "" } ] }`;
  let data: VideoDraftResponse = { sections: [] };
  try {
    data = await structuredJSON<VideoDraftResponse> (
      prompt,
      'video_draft',
      { type:'object', properties:{ sections:{ type:'array', items:{ type:'object', properties:{ title:{type:'string'}, draft_narration:{type:'string'}, draft_visual:{type:'string'} }, required:['title','draft_narration','draft_visual'] } } }, required:['sections'] },
      job.script_model || job.video_model || undefined
    );
  } catch (e) {
    console.warn('[draft] generation failed:', (e as any)?.message);
  }
  const map = new Map<string,{draft_narration:string; draft_visual:string}>();
  if (Array.isArray(data.sections)) {
    for (const sec of data.sections) {
      if (sec?.title) map.set(sec.title.toLowerCase(), { draft_narration: sec.draft_narration, draft_visual: sec.draft_visual });
    }
  }
  const updated = job.sections.map(s => {
    const found = map.get(s.title.toLowerCase());
    return { ...s, draft_narration: found?.draft_narration || s.objective, draft_visual: found?.draft_visual || `Visual: ${s.objective}` };
  });
  return await updateJob(job.id, { sections: updated });
}

async function script(job: VideoJob): Promise<VideoJob> {
  await updateJob(job.id, { status: "scripting" });
  if (!Array.isArray(job.sections)) job.sections = [];
  const sectionDesc = job.sections.length
    ? job.sections
        .map(
          (s, i) =>
            `Section ${i + 1}: ${s.title} (${s.objective}) - ${s.target_seconds} seconds`,
        )
        .join("\n")
    : "(No sections produced by planning step; create a single fallback section)";
  if (!job.sections.length) {
    job.sections = [
      {
        id: randomUUID(),
        title: "Intro",
        objective: "Fallback autogenerated because planning failed",
        target_seconds: 6,
      },
    ];
  }

  const prompt = `Write a polished spoken SCRIPT for a viral short video about "${job.idea}".
  Use each section's draft_narration as a baseline but refine wording for clarity, hook strength, and flow.
  Output ONLY the spoken words. Absolutely NO stage directions, camera terms (camera, shot, cut, pan, zoom, angle, close-up, wide, transition, montage, scene, fade), and NO bracketed text [] or ().
  Sections to write for:
  ${sectionDesc}
  
  Requirements:
  - Natural, conversational tone
  - High energy and engaging
  - Each section's script should fit its time allocation
  - No numbering, no labels, no quotes
  
  Return JSON with this structure:
  {
    "sections": [
      {
        "id": "section_id_here",
        "script": "The actual spoken words for this section only"
      }
    ]
  }
  
  Use these section IDs: ${job.sections.map((s) => s.id).join(", ")}`;

  const data = await structuredJSON<VideoScriptResponse>(
    prompt,
    "video_script",
    {
      type: "object",
      properties: {
        sections: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              script: { type: "string" },
            },
            required: ["id", "script"],
          },
        },
      },
      required: ["sections"],
    },
  job.script_model || job.video_model || undefined,
  );
  console.info('[pipeline] script model used:', job.script_model || job.video_model || process.env.OPENAI_MODEL || process.env.DEFAULT_OPENAI_MODEL);

  const scriptMap = new Map(job.sections.map((s) => [s.id, s.draft_narration || ""]));
  if (Array.isArray(data.sections)) {
    data.sections.forEach((s) => {
      if (scriptMap.has(s.id) && typeof s.script === 'string') {
        scriptMap.set(s.id, sanitizeSpokenScript(s.script));
      }
    });
  } else {
    console.warn('[script] Missing sections array in model response after validation bypass');
  }

  const updatedSections = job.sections.map((s) => ({
    ...s,
    script: sanitizeSpokenScript(scriptMap.get(s.id) || s.objective),
  }));

  return await updateJob(job.id, { sections: updatedSections });
}

async function prompts(job: VideoJob): Promise<VideoJob> {
  await updateJob(job.id, { status: "prompting" });
  if (!Array.isArray(job.sections)) job.sections = [];
  // 1. Derive global context (characters, settings, visual style) to ensure consistency across scenes.
  const scriptConcat = job.sections.map(s => s.script || '').join('\n');
  let entities: any = null;
  try {
    entities = await structuredJSON<VideoEntitiesResponse>(
      `From the following narration sections extract up to 3 recurring CHARACTERS (generic descriptions, no names), up to 3 SETTINGS (distinct locations or environments), and an overall VISUAL STYLE summary (palette, lighting, atmosphere, camera style).\nNarration:\n${scriptConcat}\nReturn JSON only. Use stable, reusable descriptors (no pronouns).`,
      'video_entities',
      {
        type: 'object',
        properties: {
          characters: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, descriptor: { type: 'string' }, coreTraits: { type: 'string' } }, required: ['id','descriptor'] }, maxItems: 3 },
          settings: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, descriptor: { type: 'string' } , }, required: ['id','descriptor'] }, maxItems: 3 },
          visualStyle: { type: 'object', properties: { palette: { type: 'string' }, lighting: { type: 'string' }, atmosphere: { type: 'string' }, cameraStyle: { type: 'string' } }, required: ['palette','lighting','atmosphere','cameraStyle'] }
        },
        required: ['characters','settings','visualStyle']
      },
      job.script_model || job.video_model || undefined
    );
  } catch (e) {
    console.warn('[prompts] entity extraction failed; continuing with heuristic.', (e as any)?.message);
  }
  if (!entities) {
    entities = {
      characters: [],
      settings: [],
      visualStyle: { palette: 'rich complementary colors', lighting: 'cinematic contrast', atmosphere: 'layered depth with subtle particles', cameraStyle: 'dynamic handheld + smooth tracking' }
    };
  }
  const characterBlock = entities.characters.map((c: any, i: number) => `CHARACTER${i+1}: ${c.descriptor} | traits: ${c.coreTraits || ''}`.trim()).join('\n');
  const settingBlock = entities.settings.map((s: any, i: number) => `SETTING${i+1}: ${s.descriptor}`).join('\n');
  const styleBlock = `PALETTE: ${entities.visualStyle?.palette}\nLIGHTING: ${entities.visualStyle?.lighting}\nATMOSPHERE: ${entities.visualStyle?.atmosphere}\nCAMERA_STYLE: ${entities.visualStyle?.cameraStyle}`;
  const globalContextBlock = `GLOBAL CONSISTENT ELEMENTS\n${characterBlock || 'NO_EXPLICIT_CHARACTERS'}\n${settingBlock || 'NO_EXPLICIT_SETTINGS'}\n${styleBlock}`;

  const scriptsDesc = job.sections.length
    ? job.sections
        .map((s) => `ID: ${s.id}\nDraftVisual: ${s.draft_visual || 'n/a'}\nScript: "${s.script}"`)
        .join("\n\n")
    : "ID: placeholder\nDraftVisual: none\nScript: Generated placeholder because prior steps failed";
  if (!job.sections.length) {
    job.sections = [
      {
        id: randomUUID(),
        title: "Intro",
        objective: "Placeholder",
        target_seconds: 6,
        script: "This is a placeholder narration segment while the pipeline recovers.",
      },
    ];
  }

  const prompt = `You are generating per-section VISUAL GENERATION PROMPTS for a multi-shot vertical short video.

${globalContextBlock}

Video Idea (overall theme only, do NOT copy wording literally): "${job.idea}"

Section Scripts (ID + narration text):
${scriptsDesc}

Objective:
For EACH section return ONE richly detailed SCENE-ONLY prompt that a stateless text-to-video model can use in isolation. The model has ZERO memory of earlier shots. Therefore every prompt must include all essential visual context for that slice (subjects, setting, style) WITHOUT referencing previous sections (no words like "continues", "still", "same"). Avoid ALL character personal names; instead describe characters generically (e.g. "young freckled girl in a sun-faded denim jacket" instead of a name). NEVER output real or invented proper names.

Prompt Content Requirements (each prompt 120–260 WORDS, can exceed if needed for clarity; NO hard upper limit if detail adds clarity):
 - Vivid concrete SUBJECT description (age vibe, attire, notable physical traits) but no personal names.
 - ACTION / MOTION clearly stated.
 - ENVIRONMENT & BACKGROUND with sensory detail (textures, weather, atmosphere, depth cues).
 - CAMERA: angle + lens feel (e.g. "handheld medium shot", "aerial wide shot", "35mm shallow DOF tracking").
 - LIGHTING: quality, direction, color temperature, contrast (e.g. "golden hour rim light, soft volumetric haze").
 - MOOD / TONE adjectives (avoid clichés like "beautiful", prefer specific: "melancholic warm nostalgia").
 - COLOR PALETTE (2–5 evocative palette descriptors or color pairings).
 - MOTION/FX if relevant (particles, dust, petals drifting, subtle camera sway, slow motion, parallax).
  - CONSISTENCY: Reuse the same canonical descriptors for recurring characters and settings exactly as listed in GLOBAL CONSISTENT ELEMENTS (do not invent new ones unless absent there).
 - NO on-screen text, captions, subtitles, logos, watermarks, UI, text overlays, brand names, celebrity likenesses.
 - NO personal names, no quotation marks, no scene numbering, no meta instructions.

Style: natural language sentence fragment or a single flowing sentence separated by commas/semicolons. Do NOT wrap in quotes.

Return ONLY JSON:
{
  "prompts": [ { "id": "<section_id>", "shotPrompt": "<LONG DESCRIPTIVE PROMPT HERE>" } ]
}`;

  const data = await structuredJSON<VideoPromptsResponse>(
    prompt,
    "video_prompts",
    {
      type: "object",
      properties: {
        prompts: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              shotPrompt: { type: "string" },
            },
            required: ["id", "shotPrompt"],
          },
        },
      },
      required: ["prompts"],
    },
  job.script_model || job.video_model || undefined,
  );
  console.info('[pipeline] prompts model used:', job.script_model || job.video_model || process.env.OPENAI_MODEL || process.env.DEFAULT_OPENAI_MODEL);

  const promptMap: Map<string, string> = new Map(
    Array.isArray(data.prompts)
      ? data.prompts.map((p) => [p.id, p.shotPrompt] as [string, string])
      : [],
  );
  const updatedSections = job.sections.map((s) => ({
    ...s,
    shot_prompt:
      promptMap.get(s.id) || ("Cinematic shot related to: " + s.objective),
  }));

  return await updateJob(job.id, { sections: updatedSections });
}

// Generate clips per section using AI video model (Replicate / etc.)
async function generateClips(job: VideoJob): Promise<VideoJob> {
  await updateJob(job.id, { status: "generating_clips" });
  if (!Array.isArray(job.sections)) job.sections = [];
  const sections = [...job.sections];

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    // Skip if already has clip (idempotency / resume support)
    if (section.clip_url) continue;
    try {
      const duration = Math.min(Math.max(section.target_seconds || 5, 2), 12);
      // Build standalone prompt: strip any names (simple heuristic) and ensure sufficient descriptive length
      let base = section.shot_prompt || section.objective || section.title || 'cinematic scene';
      // Remove potential quoted names / single capitalized tokens at start
      base = base.replace(/^["']?[A-Z][a-z]{2,}\b["']?[,\s-]*/,'');
      // If very short, append generic cinematic enrichment cues
      if (base.split(/\s+/).length < 18) {
        base += ', richly detailed environment, atmospheric depth, cinematic lighting, dynamic composition, realistic motion texture';
      }
      const prompt = base;
      const clipUrl = await generateVideoClip({
        prompt: prompt,
        duration: duration,
        style: "cinematic",
        aspectRatio: "9:16",
        modelId: job.video_model || undefined,
      });
      section.clip_id = randomUUID();
      section.clip_url = clipUrl;
      delete (section as any).clip_error;
    } catch (err) {
      console.error("Clip generation failed for section", section.id, err);
      // Leave clip_url undefined; pipeline can still proceed (or fail later in stitch)
      section.clip_error = err instanceof Error ? err.message : "clip_failed";
    }
    // Persist progress after each section to allow UI polling
    await updateJob(job.id, { sections });
  }

  return await getJob(job.id);
}

async function generateVoiceover(job: VideoJob): Promise<VideoJob> {
  await updateJob(job.id, { status: "voiceover" });
  const fullScript = job.sections
    .map((s) => s.script)
    .join(" ")
    .trim();
  if (!fullScript) throw new Error("Empty script cannot generate voiceover");

  // Heuristic voice selection based on idea & section titles/objectives
  const text = (
    job.idea +
    " " +
    job.sections.map((s) => `${s.title} ${s.objective}`).join(" ")
  ).toLowerCase();
  let voice: string = "professional";
  if (/energy|exciting|fast|hype|extreme|viral|high energy/.test(text))
    voice = "energetic";
  else if (/calm|relax|soothing|meditat|sleep|ambient|focus/.test(text))
    voice = "calm";
  else if (/story|narrat|once upon|journey|adventure|history/.test(text))
    voice = "storyteller";
  else if (
    /investigat|mystery|true crime|analysis|deep dive|forensic/.test(text)
  )
    voice = "calm";
  else if (/casual|vlog|day in the life|behind the scenes/.test(text))
    voice = "casual";

  const voiceoverUrl = await ttsGenerateVoiceover({
    text: fullScript,
    voice,
    speed: 1.0,
  });
  return await updateJob(job.id, {
    voiceover_url: voiceoverUrl,
    voice_id: voice,
  });
}

async function generateCaptions(job: VideoJob): Promise<VideoJob> {
  await updateJob(job.id, { status: "captions" });
  if (!job.voiceover_url)
    throw new Error("Voiceover must be generated before captions");
  const captionSegments = await whisperGenerateCaptions(job.voiceover_url);
  // Basic sanity filter
  const filtered = captionSegments.filter(
    (c) => typeof c.start === "number" && typeof c.end === "number" && c.text,
  );
  return await updateJob(job.id, { captions: filtered });
}

async function stitch(job: VideoJob): Promise<VideoJob> {
  await updateJob(job.id, { status: "stitching" });

  const clipUrls = job.sections
    .map((s) => s.clip_url)
    .filter(Boolean) as string[];
  if (!clipUrls.length) throw new Error("No clips generated to stitch");
  console.info('[stitch] job', job.id, 'clips:', clipUrls.length, 'voiceover?', !!job.voiceover_url, 'captions?', !!job.captions?.length);

  try {
    const finalUrl = await processAndCombineVideos({
      videoClips: clipUrls,
      audioUrl: job.voiceover_url || undefined,
      captions: job.captions || undefined,
      durations: job.sections.map((s) => Math.max(1, s.target_seconds || 5)),
      captionStyle: job.voice_id || undefined,
    });
    console.info('[stitch] completed for job', job.id, 'finalUrl:', finalUrl);
    return await updateJob(job.id, { video_url: finalUrl });
  } catch (err) {
    console.error("Stitching failed", err);
    throw err;
  }
}