// AI Services Configuration
// This file contains the configuration and helper functions for various AI services

import OpenAI from 'openai';

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
  duration: number;
  style: string;
  aspectRatio: '9:16' | '16:9' | '1:1';
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
  try {
    // Using Replicate API for video generation
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: process.env.REPLICATE_VIDEO_MODEL_VERSION || 'stability-ai/stable-video-diffusion',
        input: {
          prompt: params.prompt,
          num_frames: Math.round(params.duration * 30), // 30 fps
          width: params.aspectRatio === '9:16' ? 576 : 1024,
          height: params.aspectRatio === '9:16' ? 1024 : 576,
          guidance_scale: 7.5,
          num_inference_steps: 25
        }
      })
    });

    const prediction = await response.json();
    
    // Poll for completion
    let videoUrl = '';
    while (!videoUrl) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await fetch(
        `https://api.replicate.com/v1/predictions/${prediction.id}`,
        {
          headers: {
            'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
          },
        }
      );
      
      const status = await statusResponse.json();
      if (status.status === 'succeeded') {
        videoUrl = status.output;
      } else if (status.status === 'failed') {
        throw new Error('Video generation failed');
      }
    }

    return videoUrl;
  } catch (error) {
    console.error('Video generation error:', error);
    throw new Error('Failed to generate video');
  }
}

// Text-to-Speech using ElevenLabs
export async function generateVoiceover(params: GenerateVoiceoverParams): Promise<string> {
  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${params.voice}`,
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
      throw new Error('Failed to generate voiceover');
    }

    // Convert audio stream to blob and upload to storage
    const audioBlob = await response.blob();
    // Upload to your storage solution (Supabase Storage, S3, etc.)
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
}): Promise<string> {
  try {
    // This would typically use FFmpeg on a server or a video processing service
    // For production, consider using:
    // 1. Shotstack API
    // 2. Bannerbear Video API
    // 3. AWS MediaConvert
    // 4. Your own FFmpeg server
    
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
        resolution: '1080x1920', // 9:16 aspect ratio
        fps: 30
      })
    });

    const result = await response.json();
    return result.videoUrl;
  } catch (error) {
    console.error('Video processing error:', error);
    throw new Error('Failed to process video');
  }
}

// Helper function to upload audio to storage
async function uploadAudioToStorage(audioBlob: Blob): Promise<string> {
  // Implementation depends on your storage solution
  // Example for Supabase Storage:
  
  const { createClient } = await import('../../supabase/server');
  const supabase = await createClient();
  
  const fileName = `voiceover-${Date.now()}.mp3`;
  const { data, error } = await supabase.storage
    .from('audio')
    .upload(fileName, audioBlob, {
      contentType: 'audio/mpeg'
    });

  if (error) throw error;
  
  const { data: { publicUrl } } = supabase.storage
    .from('audio')
    .getPublicUrl(fileName);
    
  return publicUrl;
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
    const audioBlob = await audioResponse.blob();
    const audioFile = new File([audioBlob], 'audio.mp3', { type: 'audio/mpeg' });

    // Use OpenAI Whisper for transcription with timestamps
    const formData = new FormData();
    formData.append('file', audioFile);
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'verbose_json');
    formData.append('timestamp_granularities', 'word');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: formData
    });

    const result = await response.json();
    
    // Process the segments into caption format
    const captions = result.segments.map((segment: any) => ({
      text: segment.text,
      start: segment.start,
      end: segment.end
    }));

    return captions;
  } catch (error) {
    console.error('Caption generation error:', error);
    throw new Error('Failed to generate captions');
  }
}

// Voice options configuration
export const VOICE_OPTIONS = {
  professional: 'voice_id_professional', // Replace with actual ElevenLabs voice IDs
  casual: 'voice_id_casual',
  energetic: 'voice_id_energetic',
  calm: 'voice_id_calm',
  storyteller: 'voice_id_storyteller'
};

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