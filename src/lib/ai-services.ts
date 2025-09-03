// AI Services Configuration
// This file contains the configuration and helper functions for various AI services

import OpenAI from 'openai';
import Replicate from 'replicate';

// Initialize OpenAI client (for script generation and GPT features)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

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
  aspectRatio: '9:16' | '16:9' | '1:1';
  modelId?: string; // optional override (e.g. "wan-video/wan-2.2-t2v-fast")
}

export interface GenerateVoiceoverParams {
  text: string;
  voice: string;
  speed?: number;
  pitch?: number;
}

// Script Generation using OpenAI
export async function generateScriptWithAI(params: GenerateScriptParams): Promise<{
  script: string;
  scenes: ScriptScene[];
}> {
  try {
    const systemPrompt = `You are an expert short-form video scriptwriter specializing in viral content for TikTok, Instagram Reels, and YouTube Shorts. 
    Create engaging, punchy scripts that hook viewers immediately and maintain attention throughout.`;

    const userPrompt = `Create a ${params.duration}-second video script about: "${params.idea}"
    
    Style: ${params.style}
    
    Requirements:
    1. Start with a strong hook in the first 3 seconds
    2. Keep it concise and engaging
    3. Break the script into scenes (each 5-10 seconds)
    4. For each scene, provide:
       - The narration text
       - Duration in seconds
       - A detailed visual prompt for AI video generation
    5. End with a call-to-action or thought-provoking statement
    
    Return the response in this JSON format:
    {
      "script": "full script text here",
      "scenes": [
        {
          "text": "narration for this scene",
          "duration": 5,
          "videoPrompt": "detailed prompt for video generation",
          "transitionType": "fade|cut|zoom"
        }
      ]
    }`;

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
      max_tokens: 2000
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return {
      script: result.script || '',
      scenes: result.scenes || []
    };
  } catch (error) {
    console.error('Script generation error:', error);
    throw new Error('Failed to generate script');
  }
}

// Video Generation using Replicate (Stable Video Diffusion or similar)
export async function generateVideoClip(params: GenerateVideoParams): Promise<string> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error('Missing REPLICATE_API_TOKEN');

  // Instantiate SDK (lightweight)
  const replicate = new Replicate({ auth: token });

  // Default model (fast WAN 2.2 text-to-video) unless overridden by user input
  const model = params.modelId || 'wan-video/wan-2.2-t2v-fast';

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
  const prompt = params.prompt;

  // Attempt run with small retry loop (network / transient API errors)
  const maxAttempts = 3;
  let lastErr: any;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const output: any = await replicate.run(model, {
        input: {
          prompt,
          go_fast: true,
          num_frames: numFrames,
            // Using 480p as in sample; could expose later.
          resolution: '480p',
          aspect_ratio: aspectRatio,
          sample_shift: 12,
          optimize_prompt: false,
          frames_per_second: framesPerSecond,
          lora_scale_transformer: 1,
          lora_scale_transformer_2: 1
        }
      });

      // SDK returns either array of frames/urls or an object with url() helper (per your example)
      if (!output) throw new Error('Empty replicate output');
      if (typeof output === 'string') return output;
      if (Array.isArray(output)) {
        // If frames array, pick first (some models output mp4 as single element)
        return output[0];
      }
      if (output.url && typeof output.url === 'function') return output.url();
      if (output.url && typeof output.url === 'string') return output.url;
      // Some models return { video: 'url' }
      if (output.video) return output.video;
      throw new Error('Unrecognized replicate output format');
    } catch (e: any) {
      lastErr = e;
      // If model complains about num_frames >= 81, force to minimum and retry
      if (typeof e?.message === 'string' && e.message.includes('num_frames') && e.message.includes('greater than or equal to 81')) {
        numFrames = Math.max(numFrames, 81);
      }
      console.warn(`[replicate] video attempt ${attempt}/${maxAttempts} failed:`, e?.message || e);
      if (attempt < maxAttempts) await new Promise(r => setTimeout(r, attempt * 2500));
    }
  }
  throw new Error(lastErr?.message || 'Failed to generate video');
}

// Text-to-Speech using ElevenLabs
export async function generateVoiceover(params: GenerateVoiceoverParams): Promise<string> {
  try {
    // Allow passing either a friendly alias (e.g. 'professional') or a raw ElevenLabs voice ID.
    // We'll resolve aliases using VOICE_OPTIONS if available.
    const aliasResolved = (VOICE_OPTIONS as any)?.[params.voice] || params.voice;
    const hasKey = !!process.env.ELEVENLABS_API_KEY;
    const isPlaceholder = /^voice_id_(professional|casual|energetic|calm|storyteller)/.test(aliasResolved);

    // Fallback / demo mode: if no API key or still using placeholder mapping (not replaced with real ElevenLabs ID)
    if (!hasKey || isPlaceholder) {
      if (!hasKey) console.warn('[voiceover] Missing ELEVENLABS_API_KEY, using stub audio.');
      else console.warn('[voiceover] Placeholder alias not mapped to real ElevenLabs voice ID, using stub audio.');
      const stubBlob = createStubSilentWav({ seconds: 1.5 });
      return await uploadAudioToStorage(stubBlob, { filenamePrefix: 'stub' });
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${aliasResolved}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: params.text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            speed: params.speed || 1.0,
          }
        })
      }
    );

    if (!response.ok) {
      const errText = await safeReadText(response);
      console.error('[voiceover] ElevenLabs API error', response.status, errText);
      throw new Error('Failed to generate voiceover');
    }

    // Convert audio stream to blob and upload to storage
    const audioBlob = await response.blob();
    const audioUrl = await uploadAudioToStorage(audioBlob);
    return audioUrl;
  } catch (error) {
    console.error('Voiceover generation error:', error);
    throw new Error('Failed to generate voiceover');
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
        console.error('[stitch] Shotstack failed, falling back to simple concatenation placeholder:', e);
      }
    }
    // Custom processor fallback
    if (process.env.VIDEO_PROCESSOR_URL) {
      const response = await fetch(`${process.env.VIDEO_PROCESSOR_URL}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.VIDEO_PROCESSOR_API_KEY}`
        },
        body: JSON.stringify({
          clips: params.videoClips,
          audio: params.audioUrl,
          backgroundMusic: params.musicUrl,
          captions: params.captions,
          outputFormat: 'mp4',
          resolution: '1080x1920',
          fps: 30
        })
      });
      if (!response.ok) throw new Error(`Video processor failed: ${response.status}`);
      const result = await response.json();
      return result.videoUrl || params.videoClips[0];
    }
    // Last resort: return first clip
    return params.videoClips[0];
  } catch (error) {
    console.error('Video processing error:', error);
    throw new Error('Failed to process video');
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
  const legacyEnv = (process.env.SHOTSTACK_ENV || '').toLowerCase();
  let version = (process.env.SHOTSTACK_EDIT_VERSION || '').toLowerCase();
  if (!version) {
    if (legacyEnv === 'prod' || legacyEnv === 'production') version = 'v1';
    else if (legacyEnv === 'stage' || legacyEnv === 'staging') version = 'stage';
    else version = 'stage';
  }
  if (!['v1','stage'].includes(version)) {
    console.warn(`[shotstack] Invalid SHOTSTACK_EDIT_VERSION '${version}', defaulting to 'stage'`);
    version = 'stage';
  }
  const base = `https://api.shotstack.io/edit/${version}`;
  const apiKey = process.env.SHOTSTACK_API_KEY!;

  // Derive durations: use provided, else equal split of total caption time or default 5s
  let durations = params.durations && params.durations.length === params.videoClips.length
    ? params.durations
    : undefined;
  if (!durations) {
    let total = params.captions?.length ? params.captions[params.captions.length - 1].end : 0;
    if (total && total > 4) {
      const avg = total / params.videoClips.length;
      durations = Array(params.videoClips.length).fill(0).map(() => avg);
    } else {
      durations = Array(params.videoClips.length).fill(5);
    }
  }

  // Build timeline clips
  let currentStart = 0;
  const clips = params.videoClips.map((src, i) => {
    const length = Math.max(1, Math.min(15, durations![i] || 5));
    const clip = {
      asset: { type: 'video', src },
      start: currentStart,
      length,
      fit: 'cover'
    } as any;
    currentStart += length;
    return clip;
  });

  // Basic caption track (burned-in) using title assets per word/segment (simplified)
  let captionClips: any[] = [];
  if (params.captions && params.captions.length) {
    const theme = getCaptionTheme(params.captionStyle);
    captionClips = params.captions.slice(0, 200).map(c => ({
      asset: {
        type: 'title',
        text: c.text,
        style: theme.style,
        size: theme.size,
        position: theme.position,
        color: theme.color,
        background: theme.background || undefined
      },
      start: c.start,
      length: Math.max(theme.minLength || 0.45, Math.min(theme.maxLength || 8, c.end - c.start || theme.defaultLength || 1.2)),
      transition: theme.transition || 'fade'
    }));
  }

  const body = {
    timeline: {
      soundtrack: params.audioUrl ? { src: params.audioUrl, effect: 'fadeInFadeOut' } : undefined,
      tracks: [ { clips }, captionClips.length ? { clips: captionClips } : undefined ].filter(Boolean)
    },
    output: {
      format: 'mp4',
      resolution: '1080',
      aspectRatio: '9:16'
    }
  };

  const renderRes = await fetch(`${base}/render`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!renderRes.ok) {
    const txt = await renderRes.text();
  throw new Error('Shotstack render request failed: ' + txt);
  }
  const renderData = await renderRes.json();
  const id = renderData.id || renderData.response?.id;
  if (!id) throw new Error('Shotstack missing render id');

  const started = Date.now();
  while (true) {
    await new Promise(r => setTimeout(r, 4000));
    const statusRes = await fetch(`${base}/render/${id}`, { headers: { 'x-api-key': apiKey } });
    if (!statusRes.ok) continue;
    const statusData = await statusRes.json();
    const status = statusData.status || statusData.response?.status;
    if (status === 'done') {
      return statusData.url || statusData.response?.url;
    }
    if (status === 'failed' || status === 'error' || status === 'cancelled') {
      throw new Error('Shotstack render failed');
    }
    if (Date.now() - started > 1000 * 60 * 8) {
      throw new Error('Shotstack render timeout');
    }
  }
}

// Helper function to upload audio to storage
async function uploadAudioToStorage(audioBlob: Blob, opts?: { filenamePrefix?: string }): Promise<string> {
  try {
    const { createClient } = await import('../../supabase/server');
    const supabase = await createClient();

    const prefix = opts?.filenamePrefix || 'voiceover';
    const ext = audioBlob.type === 'audio/wav' ? 'wav' : 'mp3';
    const fileName = `${prefix}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from('audio')
      .upload(fileName, audioBlob, {
        contentType: audioBlob.type || (ext === 'wav' ? 'audio/wav' : 'audio/mpeg'),
        upsert: false
      });

    if (error) {
      console.error('[voiceover] Storage upload error', error);
      throw new Error('Failed to store voiceover audio');
    }

    const { data: { publicUrl } } = supabase.storage
      .from('audio')
      .getPublicUrl(fileName);
    return publicUrl;
  } catch (e) {
    console.error('[voiceover] Unexpected storage error', e);
    throw e instanceof Error ? e : new Error('Unknown storage error');
  }
}

// Caption Generation using Whisper API
export async function generateCaptions(audioUrl: string): Promise<Array<{
  text: string;
  start: number;
  end: number;
}>> {
  try {
    // Download audio file
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      throw new Error(`Failed to download audio: ${audioResponse.status}`);
    }
    const contentType = audioResponse.headers.get('content-type') || 'audio/mpeg';
    // In Node.js environments, File may not be available; use Blob with filename in FormData
    const arrayBuffer = await audioResponse.arrayBuffer();
    const audioBlob = new Blob([arrayBuffer], { type: contentType });

    // Use OpenAI Whisper for transcription with timestamps
    const formData = new FormData();
    const ext = contentType.includes('wav') ? 'wav' : 'mp3';
    formData.append('file', audioBlob as any, `audio.${ext}`);
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'verbose_json');
    formData.append('timestamp_granularities[]', 'word');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: formData
    });

    const result = await response.json();

    // Prefer word-level granularity if present (OpenAI verbose_json can include segments or words)
    const rawWords: any[] = Array.isArray(result.words)
      ? result.words
      : Array.isArray(result.segments)
        ? result.segments.flatMap((seg: any) => Array.isArray(seg.words) ? seg.words : [{ start: seg.start, end: seg.end, word: seg.text }])
        : [];

    // Fallback: if no word objects found, build from segments
    if (!rawWords.length && Array.isArray(result.segments)) {
      return result.segments.map((segment: any) => ({
        text: (segment.text || '').trim(),
        start: segment.start,
        end: segment.end
      }));
    }

    // Merge words into readable phrase segments for on-screen display
    interface Word { start: number; end: number; word: string; }
    const words: Word[] = rawWords
      .filter(w => typeof w.start === 'number' && typeof w.end === 'number')
      .map(w => ({ start: w.start, end: w.end, word: String(w.word || w.text || '').trim() }))
      .filter(w => w.word.length);

    function mergeWords(words: Word[], opts: { maxWords: number; maxDuration: number; gap: number }): { text: string; start: number; end: number }[] {
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
            text: bucket.map(b => b.word).join(' ').replace(/\s+/g, ' ').trim(),
            start: bucket[0].start,
            end: bucket[bucket.length - 1].end
          });
          bucket = [w];
        } else {
          bucket.push(w);
        }
      }
      if (bucket.length) {
        out.push({
          text: bucket.map(b => b.word).join(' ').replace(/\s+/g, ' ').trim(),
          start: bucket[0].start,
          end: bucket[bucket.length - 1].end
        });
      }
      return out;
    }

    const merged = mergeWords(words, { maxWords: 7, maxDuration: 2.8, gap: 0.55 })
      .filter(s => s.text);

    // Limit to first N captions for Shotstack (avoid overload). Keep ~180 segments max.
    const limited = merged.slice(0, 180);
    return limited;
  } catch (error) {
    console.error('Caption generation error:', error);
    throw new Error('Failed to generate captions');
  }
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
  const writeString = (s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(offset++, s.charCodeAt(i)); };
  const writeUint32 = (v: number) => { view.setUint32(offset, v, true); offset += 4; };
  const writeUint16 = (v: number) => { view.setUint16(offset, v, true); offset += 2; };
  // RIFF header
  writeString('RIFF');
  writeUint32(36 + dataSize); // ChunkSize
  writeString('WAVE');
  // fmt subchunk
  writeString('fmt ');
  writeUint32(16); // Subchunk1Size (PCM)
  writeUint16(1);  // AudioFormat PCM
  writeUint16(1);  // NumChannels
  writeUint32(sampleRate); // SampleRate
  writeUint32(sampleRate * bytesPerSample); // ByteRate
  writeUint16(bytesPerSample); // BlockAlign
  writeUint16(8 * bytesPerSample / 2); // BitsPerSample (16)
  // data subchunk
  writeString('data');
  writeUint32(dataSize);
  // Silence (all zeros by default)
  // (ArrayBuffer already zero-filled)
  return new Blob([buffer], { type: 'audio/wav' });
}

async function safeReadText(response: Response): Promise<string> {
  try { return await response.text(); } catch { return '<unreadable body>'; }
}

// Voice options configuration
export const VOICE_OPTIONS = {
  storyteller: 'qAZH0aMXY8tw1QufPN0D',
  energetic: 'RexqLjNzkCjWogguKyff',
  calm: 'a1TnjruAs5jTzdrjL8Vd',
  professional: 'uju3wxzG5OhpWcoi3SMy',
  casual: 'UgBBYS2sOqTuMpoF3BR0'
};

// Caption theme helper
function getCaptionTheme(theme?: string) {
  const base = {
    style: 'minimal',
    size: 'small',
    position: 'bottom',
    color: '#FFFFFF',
    background: null as string | null,
    transition: 'fade',
    minLength: 0.45,
    maxLength: 6,
    defaultLength: 1.2
  };
  switch ((theme || '').toLowerCase()) {
    case 'energetic':
      return { ...base, style: 'subtitle', color: '#FFE600', background: '#00000066' };
    case 'calm':
      return { ...base, style: 'minimal', color: '#E0F7FA' };
    case 'professional':
      return { ...base, style: 'minimal', color: '#FFFFFF' };
    case 'storyteller':
      return { ...base, style: 'subtitle', color: '#FFD8A8' };
    case 'casual':
      return { ...base, style: 'minimal', color: '#FFD54F' };
    default:
      return base;
  }
}
// Background music options (URLs to royalty-free music)
export const MUSIC_OPTIONS = {
  upbeat: '/music/upbeat.mp3',
  cinematic: '/music/cinematic.mp3',
  chill: '/music/chill.mp3',
  dramatic: '/music/dramatic.mp3',
  none: null
};

// Video style configurations
export const VIDEO_STYLES = {
  cinematic: {
    prompt_prefix: 'cinematic, professional, high quality, dramatic lighting',
    transitions: ['fade', 'zoom'],
    colorGrade: 'cinematic'
  },
  casual: {
    prompt_prefix: 'casual, vlog style, natural lighting, handheld',
    transitions: ['cut', 'slide'],
    colorGrade: 'natural'
  },
  animated: {
    prompt_prefix: 'animated, cartoon style, vibrant colors, smooth motion',
    transitions: ['bounce', 'slide'],
    colorGrade: 'vibrant'
  },
  minimalist: {
    prompt_prefix: 'minimalist, clean, modern, simple composition',
    transitions: ['fade', 'cut'],
    colorGrade: 'minimal'
  },
  documentary: {
    prompt_prefix: 'documentary style, realistic, informative, professional',
    transitions: ['cut', 'fade'],
    colorGrade: 'natural'
  },
  energetic: {
    prompt_prefix: 'high energy, dynamic, fast-paced, vibrant',
    transitions: ['zoom', 'slide', 'spin'],
    colorGrade: 'vibrant'
  }
};