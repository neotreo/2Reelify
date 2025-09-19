// AI Services Configuration
// This file contains the configuration and helper functions for various AI services

import OpenAI from "openai";
import { toFile } from "openai/uploads";
import Replicate from "replicate";

// Lazy OpenAI client accessor (avoid build-time crash if key missing)
let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("OPENAI_API_KEY not set");
    _openai = new OpenAI({ apiKey: key });
  }
  return _openai;
}

// Types
export interface GenerateScriptParams {
  idea: string;
  duration: number;
  style: string;
  tone?: string;
}

export interface ScriptScene {
  text: string;
  duration: number;
  videoPrompt: string;
  transitionType?: string;
}

export interface GenerateVideoParams {
  prompt: string;
  duration: number; // seconds target length (we'll map to frames or model-specific length)
  style: string;
  aspectRatio: "9:16" | "16:9" | "1:1";
  modelId?: string; // optional override (e.g. "wan-video/wan-2.2-t2v-fast")
}

export interface GenerateVoiceoverParams {
  text: string;
  voice: string;
  speed?: number;
  pitch?: number;
}

// Script Generation using OpenAI
export async function generateScriptWithAI(
  params: GenerateScriptParams,
): Promise<{
  script: string;
  scenes: ScriptScene[];
}> {
  try {
    const systemPrompt = `You are a senior creative copywriter crafting NATURAL sounding spoken narration for short vertical videos (TikTok/Reels/Shorts).
Principles:
- Open with an immediate hook (curiosity, tension, surprise, benefit) in the first seconds.
- Sound like a human thinking out loud – vary sentence length, occasionally use a rhetorical question, mix micro-pauses (represented with commas or an em dash) for rhythm.
- DO NOT enumerate sections or say "Section 1/2/3," or "Firstly/Secondly." Avoid listy cadence.
- Seamlessly bridge ideas; each sentence should propel the next (cause → effect, question → answer, setup → payoff).
- Remove filler sign‑offs like "and that's it." End on a punch, insight, or call to curiosity.
- Keep wording concise but visually evocative; no corporate fluff.
Strict prohibition for narration fields (script and scenes[].text):
- Absolutely NO stage or camera directions, and NO bracketed text. Ban words: camera, shot, cut, pan, zoom, angle, close-up, wide shot, transition, montage, scene, fade, title card, on-screen.
Video prompt guidance:
- For each scene generate a rich very descriptive visual prompt: subject(s), setting, camera perspective/movement, lighting, mood, color palette, motion/action, texture, atmosphere.
- Avoid generic words alone (e.g. "cinematic shot"). Combine specifics (e.g. "handheld medium shot of a runner exhaling mist in cold dawn light, warm amber rim light, shallow depth of field, subtle particles in air").
- No on-screen text directions, watermarks, logos, or UI references.`;

  const userPrompt = `Create an approximately ${params.duration} second vertical video narration about: "${params.idea}".
Style guidance: ${params.style}

Return JSON ONLY in this shape:
{
  "script": "full narration (concatenation of all scenes) WITHOUT scene labels and WITHOUT any stage/camera directions",
  "scenes": [
    {
      "text": "spoken narration for this slice (no numbering; no directions)",
      "duration": 6,
      "videoPrompt": "rich very descriptive visual generation prompt",
      "transitionType": "fade|cut|zoom|none"
    }
  ]
}

Rules:
- 5 to 8 scenes total.
- Scene durations should be varied (some short punchy 3–4s, some medium 6–9s) and sum close to ${params.duration} (±3s tolerance).
- No explicit scene labels inside the text.
- Replace any lone proper names with vivid descriptive phrases (e.g. instead of "Barnaby" use "a lanky teen with wind-tossed dark hair and a retro red canvas jacket"). Never rely on a name alone for context, and be as descriptive as possible.
- Each videoPrompt must be 14–100 words, specific and cinematic (camera, lighting, motion, subject, atmosphere, palette), and contain no personal names.
`;

    const model = process.env.OPENAI_MODEL || process.env.DEFAULT_OPENAI_MODEL || 'gpt-4o-mini';
    const isGpt5 = /^gpt-5/i.test(model);
    const req: any = {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 1,
    };
    if (isGpt5) req.max_completion_tokens = 2000; else req.max_tokens = 2000;
    const response = await getOpenAI().chat.completions.create(req);
    console.info('[script] model used:', model);

    const result = JSON.parse(response.choices[0].message.content || "{}");
    let scenes: ScriptScene[] = Array.isArray(result.scenes)
      ? result.scenes
      : [];
    // Light touch: clamp obviously extreme values but DO NOT force-fit total to params.duration
    if (scenes.length) {
      const MIN = 2.5;
      const MAX = 14;
      scenes = scenes.map((s) => {
        let d =
          typeof s.duration === "number" && s.duration > 0 ? s.duration : 5;
        if (d < MIN) d = MIN;
        else if (d > MAX) d = MAX;
        return {
          ...s,
          text: sanitizeSpoken(String((s as any).text || '')),
          duration: Math.round(d * 10) / 10,
          videoPrompt: optimizeVideoPrompt(
            String((s as any).videoPrompt || ""),
          ),
        };
      });
    }
    const combinedScript =
      typeof result.script === "string"
        ? sanitizeSpoken(result.script)
        : sanitizeSpoken(scenes.map((s) => (s as any).text || '').join(" ") || "");
    return {
      script: combinedScript,
      scenes,
    };
  } catch (error) {
    console.error("Script generation error:", error);
    throw new Error("Failed to generate script");
  }
}

// Video Generation using Replicate (Stable Video Diffusion or similar)
export async function generateVideoClip(
  params: GenerateVideoParams,
): Promise<string> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error("Missing REPLICATE_API_TOKEN");

  // Instantiate SDK (lightweight)
  const replicate = new Replicate({ auth: token });

  // Default model (fast WAN 2.2 text-to-video) unless overridden by user input
  let model = params.modelId || "wan-video/wan-2.2-t2v-fast";
  console.info(
    "[video] generateVideoClip requested model:",
    params.modelId,
    "using model:",
    model,
  );

  const isSeedance = /^bytedance\/seedance-1/i.test(model);
  const isHailuo = /hailuo-0?2/i.test(model);
  const isKling = /kling-v2\.1/.test(model);

  // Seedance 1 Lite
  if (isSeedance) {
    try {
      const input: any = {
        fps: 24,
        prompt: optimizeVideoPrompt(params.prompt),
        duration: Math.max(2, Math.min(14, Math.round(params.duration || 5))),
        resolution: '720p',
        aspect_ratio: params.aspectRatio,
        camera_fixed: false
      };
      const output: any = await replicate.run(model as any, { input });
      if (!output) throw new Error('Empty seedance output');
      if (typeof output === 'string') return output;
      if (Array.isArray(output) && output.length) return output[0];
      if (output.url && typeof output.url === 'function') return output.url();
      if (output.url && typeof output.url === 'string') return output.url;
      if (output.video) return output.video;
      throw new Error('Unrecognized seedance output format');
    } catch (err) {
      console.error('[seedance] generation failed, falling back to WAN fast model:', (err as any)?.message);
      model = 'wan-video/wan-2.2-t2v-fast';
    }
  }

  // Hailuo 02
  if (!isSeedance && isHailuo) {
    try {
      const input: any = {
        prompt: optimizeVideoPrompt(params.prompt),
        duration: Math.max(2, Math.min(14, Math.round(params.duration || 6))),
        resolution: '1080p',
        aspect_ratio: params.aspectRatio,
        prompt_optimizer: false
      };
      const output: any = await replicate.run(model as any, { input });
      if (!output) throw new Error('Empty hailuo output');
      if (typeof output === 'string') return output;
      if (Array.isArray(output) && output.length) return output[0];
      if (output.url && typeof output.url === 'function') return output.url();
      if (output.url && typeof output.url === 'string') return output.url;
      if (output.video) return output.video;
      throw new Error('Unrecognized hailuo output format');
    } catch (err) {
      console.error('[hailuo] generation failed, falling back to WAN fast model:', (err as any)?.message);
      model = 'wan-video/wan-2.2-t2v-fast';
    }
  }

  // Kling (standard or master)
  if (!isSeedance && !isHailuo && isKling) {
    try {
      const input: any = {
        prompt: optimizeVideoPrompt(params.prompt),
        duration: Math.max(2, Math.min(14, Math.round(params.duration || 6))),
        aspect_ratio: params.aspectRatio,
        negative_prompt: ''
      };
      const output: any = await replicate.run(model as any, { input });
      if (!output) throw new Error('Empty kling output');
      if (typeof output === 'string') return output;
      if (Array.isArray(output) && output.length) return output[0];
      if (output.url && typeof output.url === 'function') return output.url();
      if (output.url && typeof output.url === 'string') return output.url;
      if (output.video) return output.video;
      throw new Error('Unrecognized kling output format');
    } catch (err) {
      console.error('[kling] generation failed, falling back to WAN fast model:', (err as any)?.message);
      model = 'wan-video/wan-2.2-t2v-fast';
    }
  }

  // WAN 2.2 expected inputs (keeping everything static except aspect_ratio & duration-derived num_frames)
  // Reference example provided by user.
  const framesPerSecond = 16; // static per user's sample
  // WAN 2.2 fast validation (from errors observed): num_frames must be between 81 and 121 inclusive.
  const WAN_MIN_FRAMES = 81;
  const WAN_MAX_FRAMES = 121; // ~7.56s at 16 fps
  let desiredFrames = Math.round(params.duration * framesPerSecond);
  if (desiredFrames < WAN_MIN_FRAMES) desiredFrames = WAN_MIN_FRAMES; // short sections will be slightly longer
  if (desiredFrames > WAN_MAX_FRAMES) desiredFrames = WAN_MAX_FRAMES; // long sections truncated
  let numFrames = desiredFrames;
  const aspectRatio = params.aspectRatio; // pass directly (model expects strings like "16:9", "9:16", "1:1")
  const prompt = optimizeVideoPrompt(params.prompt);

  // Attempt run with small retry loop (network / transient API errors)
  const maxAttempts = 3;
  let lastErr: any;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const output: any = await replicate.run(model as any, {
        input: {
          prompt,
          go_fast: true,
          num_frames: numFrames,
          // Using 480p as in sample; could expose later.
          resolution: "480p",
          aspect_ratio: aspectRatio,
          sample_shift: 12,
          optimize_prompt: false,
          frames_per_second: framesPerSecond,
          lora_scale_transformer: 1,
          lora_scale_transformer_2: 1,
        },
      });

      // SDK returns either array of frames/urls or an object with url() helper (per your example)
      if (!output) throw new Error("Empty replicate output");
      if (typeof output === "string") return output;
      if (Array.isArray(output)) {
        // If frames array, pick first (some models output mp4 as single element)
        return output[0];
      }
      if (output.url && typeof output.url === "function") return output.url();
      if (output.url && typeof output.url === "string") return output.url;
      // Some models return { video: 'url' }
      if (output.video) return output.video;
      throw new Error("Unrecognized replicate output format");
    } catch (e: any) {
      lastErr = e;
      // If model complains about num_frames >= 81, force to minimum and retry
      if (
        typeof e?.message === "string" &&
        e.message.includes("num_frames") &&
        e.message.includes("greater than or equal to 81")
      ) {
        numFrames = Math.max(numFrames, 81);
      }
      console.warn(
        `[replicate] video attempt ${attempt}/${maxAttempts} failed:`,
        e?.message || e,
      );
      if (attempt < maxAttempts)
        await new Promise((r) => setTimeout(r, attempt * 2500));
    }
  }
  throw new Error(lastErr?.message || "Failed to generate video");
}

// Text-to-Speech using ElevenLabs
export async function generateVoiceover(
  params: GenerateVoiceoverParams,
): Promise<string> {
  try {
    // Allow passing either a friendly alias (e.g. 'professional') or a raw ElevenLabs voice ID.
    // We'll resolve aliases using VOICE_OPTIONS if available.
    const aliasResolved =
      (VOICE_OPTIONS as any)?.[params.voice] || params.voice;
    const hasKey = !!process.env.ELEVENLABS_API_KEY;
    const isPlaceholder =
      /^voice_id_(professional|casual|energetic|calm|storyteller)/.test(
        aliasResolved,
      );

    // Fallback / demo mode: if no API key or still using placeholder mapping (not replaced with real ElevenLabs ID)
    if (!hasKey || isPlaceholder) {
      if (!hasKey)
        console.warn(
          "[voiceover] Missing ELEVENLABS_API_KEY, using stub audio.",
        );
      else
        console.warn(
          "[voiceover] Placeholder alias not mapped to real ElevenLabs voice ID, using stub audio.",
        );
      const stubBlob = createStubSilentWav({ seconds: 1.5 });
      return await uploadAudioToStorage(stubBlob, { filenamePrefix: "stub" });
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${aliasResolved}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: params.text,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            speed: params.speed || 1.0,
          },
        }),
      },
    );

    if (!response.ok) {
      const errText = await safeReadText(response);
      console.error(
        "[voiceover] ElevenLabs API error",
        response.status,
        errText,
      );
      throw new Error("Failed to generate voiceover");
    }

    // Convert audio stream to blob and upload to storage
    const audioBlob = await response.blob();
    const audioUrl = await uploadAudioToStorage(audioBlob);
    return audioUrl;
  } catch (error) {
    console.error("Voiceover generation error:", error);
    throw new Error("Failed to generate voiceover");
  }
}

// Video Processing using FFmpeg (server-side or using a service)
export async function processAndCombineVideos(params: {
  videoClips: string[];
  audioUrl?: string;
  musicUrl?: string;
  captions?: Array<{ text: string; start: number; end: number }>;
  durations?: number[]; // seconds per clip (optional)
  captionStyle?: string; // theme key (energetic|calm|professional|storyteller|casual)
}): Promise<string> {
  try {
    // Prefer Shotstack if API key present
    if (process.env.SHOTSTACK_API_KEY) {
      try {
        return await processWithShotstack(params);
      } catch (e) {
        console.error(
          "[stitch] Shotstack failed, falling back to simple concatenation placeholder:",
          e,
        );
      }
    }
    // Custom processor fallback
    if (process.env.VIDEO_PROCESSOR_URL) {
      const headers: any = { "Content-Type": "application/json" };
      if (process.env.VIDEO_PROCESSOR_API_KEY) {
        headers["Authorization"] =
          `Bearer ${process.env.VIDEO_PROCESSOR_API_KEY}`;
      }
      const response = await fetch(
        `${process.env.VIDEO_PROCESSOR_URL}/process`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            clips: params.videoClips,
            audio: params.audioUrl,
            backgroundMusic: params.musicUrl,
            captions: params.captions,
            outputFormat: "mp4",
            resolution: "1080x1920",
            fps: 30,
          }),
        },
      );
      if (!response.ok)
        throw new Error(`Video processor failed: ${response.status}`);
      let result: any = null;
      try {
        result = await response.json();
      } catch {
        console.warn("[processor] Non-JSON response body");
      }
      return result?.videoUrl || params.videoClips[0];
    }
    // Last resort: return first clip
    return params.videoClips[0];
  } catch (error) {
    console.error("Video processing error:", error);
    throw new Error("Failed to process video");
  }
}

// Shotstack processing helper
async function processWithShotstack(params: {
  videoClips: string[];
  audioUrl?: string;
  captions?: Array<{ text: string; start: number; end: number }>;
  durations?: number[];
  captionStyle?: string;
}): Promise<string> {
  // Shotstack now uses Edit API base: https://api.shotstack.io/edit/{version}
  // version is either 'v1' (production) or 'stage' (sandbox). Older code used SHOTSTACK_ENV=prod|stage.
  const legacyEnv = (process.env.SHOTSTACK_ENV || "").toLowerCase();
  let version = (process.env.SHOTSTACK_EDIT_VERSION || "").toLowerCase();
  if (!version) {
    if (legacyEnv === "prod" || legacyEnv === "production") version = "v1";
    else if (legacyEnv === "stage" || legacyEnv === "staging")
      version = "stage";
    else version = "stage";
  }
  if (!["v1", "stage"].includes(version)) {
    console.warn(
      `[shotstack] Invalid SHOTSTACK_EDIT_VERSION '${version}', defaulting to 'stage'`,
    );
    version = "stage";
  }
  const base = `https://api.shotstack.io/edit/${version}`;
  const apiKey = process.env.SHOTSTACK_API_KEY!;

  // Derive target durations from caption timeline (voiceover) if available; otherwise fallback equal split heuristic.
  let durations: number[];
  const lastCaptionEnd = params.captions?.length
    ? params.captions[params.captions.length - 1].end
    : 0;
  if (lastCaptionEnd && lastCaptionEnd > 1) {
    // Evenly divide total voiceover duration among clips (simple heuristic).
    const per = lastCaptionEnd / params.videoClips.length;
    durations = params.videoClips.map(() => per);
  } else {
    durations = params.videoClips.map(() => 6);
  }

  // Build timeline clips
  let currentStart = 0;
  // Approximate original generated clip length constraints (WAN fast ~5.06s to ~7.56s); adjust playback speed to fit desired length
  const MIN_ORIG = 81 / 16; // ~5.06
  const MAX_ORIG = 121 / 16; // ~7.56
  const clips = params.videoClips.map((src, i) => {
    const desired = Math.max(0.75, durations[i] || 5);
    // Heuristic: assume original length clamped to model bounds relative to desired
    let assumedOriginal = desired;
    if (assumedOriginal < MIN_ORIG) assumedOriginal = MIN_ORIG;
    if (assumedOriginal > MAX_ORIG) assumedOriginal = MAX_ORIG;
    // speed = original / desired -> <1 slows down (extends), >1 speeds up
    let speed = assumedOriginal / desired;
    // Constrain extreme speed changes
    if (speed < 0.4) speed = 0.4;
    if (speed > 2.2) speed = 2.2;
    const clip = {
      asset: { type: "video", src },
      start: currentStart,
      length: desired,
      fit: "cover"
      // Removed speed: Shotstack Edit API doesn't accept clip-level speed here
    } as any;
    currentStart += desired;
    return clip;
  });

  // Basic caption track (burned-in) using title assets per word/segment (simplified)
  let captionClips: any[] = [];
  if (params.captions && params.captions.length) {
    const theme = getCaptionTheme(params.captionStyle);
    captionClips = params.captions.slice(0, 200).map((c) => ({
      asset: {
        type: "title",
        text: c.text,
        style: theme.style,
        size: theme.size,
        color: theme.color,
        background: theme.background || undefined,
      },
      // Place subtitles at the bottom of the frame
      position: theme.position,
      start: c.start,
      length: Math.max(
        theme.minLength || 0.45,
        Math.min(
          theme.maxLength || 8,
          c.end - c.start || theme.defaultLength || 1.2,
        ),
      ),
      transition: {
        in: theme.transition || "fade",
        out: theme.transition || "fade",
      },
    }));
  }

  const body = {
    timeline: {
      soundtrack: params.audioUrl
        ? { src: params.audioUrl, effect: "fadeInFadeOut" }
        : undefined,
      tracks: [
        { clips },
        captionClips.length ? { clips: captionClips } : undefined,
      ].filter(Boolean),
  // Shotstack expects a string; use solid black background
  background: '#000000',
    },
    output: {
      format: "mp4",
      resolution: "1080",
      aspectRatio: "9:16",
    },
  };

  const renderRes = await fetch(`${base}/render`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!renderRes.ok) {
    const txt = await renderRes.text();
    throw new Error("Shotstack render request failed: " + txt);
  }
  const renderData = await renderRes.json();
  const id = renderData.id || renderData.response?.id;
  if (!id) throw new Error("Shotstack missing render id");

  const started = Date.now();
  while (true) {
    await new Promise((r) => setTimeout(r, 4000));
    const statusRes = await fetch(`${base}/render/${id}`, {
      headers: { "x-api-key": apiKey },
    });
    if (!statusRes.ok) continue;
    const statusData = await statusRes.json();
    const status = statusData.status || statusData.response?.status;
    if (status === "done") {
      return statusData.url || statusData.response?.url;
    }
    if (status === "failed" || status === "error" || status === "cancelled") {
      throw new Error("Shotstack render failed");
    }
    if (Date.now() - started > 1000 * 60 * 8) {
      throw new Error("Shotstack render timeout");
    }
  }
}

// Helper function to upload audio to storage
async function uploadAudioToStorage(
  audioBlob: Blob,
  opts?: { filenamePrefix?: string },
): Promise<string> {
  try {
    const { createClient } = await import("../../supabase/server");
    const supabase = await createClient();

    const prefix = opts?.filenamePrefix || "voiceover";
    const ext = audioBlob.type === "audio/wav" ? "wav" : "mp3";
    const fileName = `${prefix}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("audio")
      .upload(fileName, audioBlob, {
        contentType:
          audioBlob.type || (ext === "wav" ? "audio/wav" : "audio/mpeg"),
        upsert: false,
      });

    if (error) {
      console.error("[voiceover] Storage upload error", error);
      throw new Error("Failed to store voiceover audio");
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("audio").getPublicUrl(fileName);
    return publicUrl;
  } catch (e) {
    console.error("[voiceover] Unexpected storage error", e);
    throw e instanceof Error ? e : new Error("Unknown storage error");
  }
}

// Caption Generation using Whisper API
export async function generateCaptions(audioUrl: string): Promise<
  Array<{
    text: string;
    start: number;
    end: number;
  }>
> {
  try {
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok)
      throw new Error(`Failed to download audio: ${audioResponse.status}`);
    const contentType =
      audioResponse.headers.get("content-type") || "audio/mpeg";
    const arrayBuffer = await audioResponse.arrayBuffer();
    const audioBlob = new Blob([arrayBuffer], { type: contentType });

    const file = await toFile(
      audioBlob as any,
      contentType.includes("wav") ? "audio.wav" : "audio.mp3",
    );
    let result: any;
    const openai = getOpenAI();
    try {
      result = await openai.audio.transcriptions.create({
        file,
        model: "gpt-4o-mini-transcribe",
        response_format: "verbose_json",
      } as any);
    } catch (e) {
      // Fallback to Whisper
      result = await openai.audio.transcriptions.create({
        file,
        model: "whisper-1",
        response_format: "verbose_json",
      } as any);
    }

    const segments: any[] = Array.isArray(result.segments)
      ? result.segments
      : [];
    // If we don't have segments, bail early
    if (!segments.length) return [];

    type Word = { start: number; end: number; word: string };
    const rawWords: Word[] = segments
      .flatMap((seg: any) =>
        Array.isArray(seg.words)
          ? seg.words.map((w: any) => ({
              start: w.start,
              end: w.end,
              word: String(w.word || "").trim(),
            }))
          : [
              {
                start: seg.start,
                end: seg.end,
                word: String(seg.text || "").trim(),
              },
            ],
      )
      .filter(
        (w: any) =>
          typeof w.start === "number" && typeof w.end === "number" && w.word,
      );

    const mergeWords = (
      words: Word[],
      opts: { maxWords: number; maxDuration: number; gap: number },
    ): { text: string; start: number; end: number }[] => {
      const out: { text: string; start: number; end: number }[] = [];
      let bucket: Word[] = [];
      for (let i = 0; i < words.length; i++) {
        const w = words[i];
        if (!bucket.length) {
          bucket.push(w);
          continue;
        }
        const prev = bucket[bucket.length - 1];
        const gap = w.start - prev.end;
        const bucketDuration = bucket[bucket.length - 1].end - bucket[0].start;
        if (
          bucket.length >= opts.maxWords ||
          bucketDuration >= opts.maxDuration ||
          gap > opts.gap
        ) {
          out.push({
            text: bucket
              .map((b) => b.word)
              .join(" ")
              .replace(/\s+/g, " ")
              .trim(),
            start: bucket[0].start,
            end: bucket[bucket.length - 1].end,
          });
          bucket = [w];
        } else {
          bucket.push(w);
        }
      }
      if (bucket.length) {
        out.push({
          text: bucket
            .map((b) => b.word)
            .join(" ")
            .replace(/\s+/g, " ")
            .trim(),
          start: bucket[0].start,
          end: bucket[bucket.length - 1].end,
        });
      }
      return out;
    };

    const merged = mergeWords(rawWords, {
      maxWords: 7,
      maxDuration: 2.8,
      gap: 0.55,
    }).filter((s) => s.text);
    return merged.slice(0, 180);
  } catch (error) {
    console.error("Caption generation error:", error);
    throw new Error("Failed to generate captions");
  }
}

// Add spoken narration sanitizer (no directions)
function sanitizeSpoken(input: string): string {
  let s = String(input || '').trim();
  s = s.replace(/\[[^\]]*\]/g, '').replace(/\([^)]*\)/g, '');
  s = s.replace(/^(?:scene\s*\d+[:.-]?|\d+[:.-]?\s*)/gim, '');
  const banned = [
    'camera','shot','cut to','pan','zoom','angle','close-up','wide shot','transition','montage','scene','fade','title card','on-screen','super:'
  ];
  const re = new RegExp(`\\b(${banned.map(x => x.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|')})\\b`, 'gi');
  s = s.replace(re, '').replace(/\s{2,}/g, ' ').trim();
  return s;
}

// Prompt optimizer for video models
function optimizeVideoPrompt(raw: string): string {
  if (!raw) return "";
  let s = raw
    .replace(/\s+/g, " ")
    .replace(/[“”]/g, '"')
    .replace(
      /\b(?:a|an|the|very|really|basically|just|kind of|sort of|like)\b/gi,
      "",
    )
    .replace(/\s{2,}/g, " ")
    .trim();
  const MAX = 220;
  if (s.length > MAX)
    s = s
      .slice(0, MAX)
      .replace(/[,:;\-\s]+$/, "")
      .trim();
  if (!/9:16|vertical/i.test(s)) s = s + " vertical 9:16";
  return s;
}

// --- Internal helpers ----------------------------------------------------

function createStubSilentWav({ seconds = 1 }: { seconds?: number }): Blob {
  // Create a minimal silent PCM WAV (16-bit mono) for the given duration.
  const sampleRate = 16000;
  const numSamples = Math.max(1, Math.floor(sampleRate * seconds));
  const bytesPerSample = 2; // 16-bit
  const dataSize = numSamples * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  let offset = 0;
  const writeString = (s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset++, s.charCodeAt(i));
  };
  const writeUint32 = (v: number) => {
    view.setUint32(offset, v, true);
    offset += 4;
  };
  const writeUint16 = (v: number) => {
    view.setUint16(offset, v, true);
    offset += 2;
  };
  // RIFF header
  writeString("RIFF");
  writeUint32(36 + dataSize); // ChunkSize
  writeString("WAVE");
  // fmt subchunk
  writeString("fmt ");
  writeUint32(16); // Subchunk1Size (PCM)
  writeUint16(1); // AudioFormat PCM
  writeUint16(1); // NumChannels
  writeUint32(sampleRate); // SampleRate
  writeUint32(sampleRate * bytesPerSample); // ByteRate
  writeUint16(bytesPerSample); // BlockAlign
  writeUint16((8 * bytesPerSample) / 2); // BitsPerSample (16)
  // data subchunk
  writeString("data");
  writeUint32(dataSize);
  // Silence (all zeros by default)
  // (ArrayBuffer already zero-filled)
  return new Blob([buffer], { type: "audio/wav" });
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "<unreadable body>";
  }
}

// Voice options configuration
export const VOICE_OPTIONS = {
  storyteller: "qAZH0aMXY8tw1QufPN0D",
  energetic: "RexqLjNzkCjWogguKyff",
  calm: "a1TnjruAs5jTzdrjL8Vd",
  professional: "uju3wxzG5OhpWcoi3SMy",
  casual: "UgBBYS2sOqTuMpoF3BR0",
};

// Caption theme helper
function getCaptionTheme(theme?: string) {
  const base = {
    style: "minimal",
    size: "x-small",
    position: "bottom",
    color: "#FFFFFF",
    background: null as string | null,
    transition: "fade",
    minLength: 0.45,
    maxLength: 6,
    defaultLength: 1.2,
  };
  switch ((theme || "").toLowerCase()) {
    case "energetic":
      return {
        ...base,
        style: "subtitle",
        color: "#FFE600",
        background: "#00000066",
      };
    case "calm":
      return { ...base, style: "minimal", color: "#E0F7FA" };
    case "professional":
      return { ...base, style: "minimal", color: "#FFFFFF" };
    case "storyteller":
      return { ...base, style: "subtitle", color: "#FFD8A8" };
    case "casual":
      return { ...base, style: "minimal", color: "#FFD54F" };
    default:
      return base;
  }
}
// Background music options (URLs to royalty-free music)
export const MUSIC_OPTIONS = {
  upbeat: "/music/upbeat.mp3",
  cinematic: "/music/cinematic.mp3",
  chill: "/music/chill.mp3",
  dramatic: "/music/dramatic.mp3",
  none: null,
};

// Video style configurations
export const VIDEO_STYLES = {
  cinematic: {
    prompt_prefix: "cinematic, professional, high quality, dramatic lighting",
    transitions: ["fade", "zoom"],
    colorGrade: "cinematic",
  },
  casual: {
    prompt_prefix: "casual, vlog style, natural lighting, handheld",
    transitions: ["cut", "slide"],
    colorGrade: "natural",
  },
  animated: {
    prompt_prefix: "animated, cartoon style, vibrant colors, smooth motion",
    transitions: ["bounce", "slide"],
    colorGrade: "vibrant",
  },
  minimalist: {
    prompt_prefix: "minimalist, clean, modern, simple composition",
    transitions: ["fade", "cut"],
    colorGrade: "minimal",
  },
  documentary: {
    prompt_prefix: "documentary style, realistic, informative, professional",
    transitions: ["cut", "fade"],
    colorGrade: "natural",
  },
  energetic: {
    prompt_prefix: "high energy, dynamic, fast-paced, vibrant",
    transitions: ["zoom", "slide", "spin"],
    colorGrade: "vibrant",
  },
};