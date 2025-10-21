"use server";

import { createClient } from "../../../supabase/server";
import { redirect } from "next/navigation";
import {
  generateScriptWithAI,
  generateVideoClip,
  generateVoiceover as ttsVoiceover,
  generateCaptions as whisperCaptions,
  processAndCombineVideos,
  VIDEO_STYLES,
} from "@/lib/ai-services";
import { createVideoJob } from "@/lib/video/orchestrator";
import { getJob } from "@/lib/video/store";
import type { VideoJob } from "@/types/video";

// AI Provider interfaces (you'll need to implement these with actual APIs)
interface ScriptScene {
  text: string;
  duration: number;
  videoPrompt: string;
}

interface VideoGenerationResponse {
  script?: string;
  scenes?: ScriptScene[];
  videoUrl?: string;
  videoId?: string;
  error?: string;
}

// Start background video job via orchestrator and return job id immediately
export async function startVideoJobAction(
  formData: FormData,
): Promise<{ jobId?: string; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Please sign in to create videos" };
  }

  try {
    const idea = (formData.get("idea") as string)?.trim();
    if (!idea) return { error: "Please describe your video idea" };

    const scriptModel = (formData.get("scriptModel") as string) || undefined;
    const videoModel = (formData.get("videoModel") as string) || undefined;

    // Kick off background pipeline
    const job = await createVideoJob(idea, user.id, {
      scriptModel,
      videoModel,
    });
    return { jobId: job.id };
  } catch (e: any) {
    const msg = e?.message || (typeof e === "string" ? e : JSON.stringify(e));
    console.error("Failed to start video job:", e);
    return { error: `Failed to start video generation: ${msg}` };
  }
}

// Fetch current job status and data for polling in the client
export async function getVideoJobAction(
  jobId: string,
): Promise<{ job?: VideoJob; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  try {
    const job = await getJob(jobId);
    if (job.user_id && job.user_id !== user.id) return { error: "Forbidden" };
    return { job };
  } catch (e) {
    console.error("getVideoJobAction error:", e);
    return { error: "Unable to load job" };
  }
}

// Cancel a running video job
export async function cancelVideoJobAction(
  jobId: string,
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  try {
    const job = await getJob(jobId);
    if (job.user_id && job.user_id !== user.id) return { error: "Forbidden" };
    
    // Only allow cancellation if job is still in progress
    if (job.status === "complete" || job.status === "error" || job.status === "cancelled") {
      return { error: "Cannot cancel a job that has already finished" };
    }

    // Update job status to cancelled
    await supabase
      .from("video_jobs")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", jobId);

    return { success: true };
  } catch (e) {
    console.error("cancelVideoJobAction error:", e);
    return { error: "Failed to cancel job" };
  }
}

// Main video generation action (legacy synchronous flow - unused in new create screen)
export async function generateVideoAction(
  formData: FormData,
): Promise<VideoGenerationResponse> {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Please sign in to create videos" };
  }

  // Check subscription status
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  // Allow exactly 1 free video if no active subscription
  if (!subscription) {
    const { count, error: countError } = await supabase
      .from("video_jobs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (countError) {
      return {
        error: "Unable to verify free video eligibility. Please try again.",
      };
    }

    if ((count ?? 0) >= 1) {
      return {
        error:
          "Free video used. Please upgrade your plan to continue creating videos.",
      };
    }
  }

  try {
    // Extract form data
    const idea = formData.get("idea") as string;
    const style = formData.get("style") as string;
    const requestedDuration = parseInt(
      (formData.get("duration") as string) || "30",
      10,
    );
    const voiceType = formData.get("voiceType") as string;
    const musicType = formData.get("musicType") as string;
    const includeVoiceover = formData.get("includeVoiceover") === "true";
    const includeCaptions = formData.get("includeCaptions") === "true";
    const includeMusic = formData.get("includeMusic") === "true";

    const isTrial = !subscription;
    const videoModel = (formData.get("videoModel") as string) || undefined;
    const duration = isTrial
      ? Math.min(
          Number.isFinite(requestedDuration) ? requestedDuration : 30,
          30,
        )
      : Number.isFinite(requestedDuration)
        ? requestedDuration
        : 30;

    // Step 1: Generate script and scene planning
    const scriptData = await generateScript(idea, duration, style);
    if (
      !scriptData.script ||
      !scriptData.scenes ||
      scriptData.scenes.length === 0
    ) {
      return { error: "Failed to generate script" };
    }

    // Step 2: Generate video clips for each scene
    const videoClips = await generateVideoClips(
      scriptData.scenes,
      style,
      videoModel,
    );
    if (!videoClips || videoClips.length === 0) {
      return { error: "Failed to generate video clips" };
    }

    // Step 3: Generate voiceover if needed
    let voiceoverUrl: string | undefined;
    if (includeVoiceover) {
      voiceoverUrl = await generateVoiceover(scriptData.script, voiceType);
    }

    // Step 4: Process and combine everything
    const finalVideoUrl = await processVideo({
      clips: videoClips,
      script: scriptData.script,
      scenes: scriptData.scenes,
      voiceoverUrl,
      musicType: includeMusic ? musicType : undefined,
      includeCaptions,
      style,
      duration,
    });

    if (!finalVideoUrl) {
      return { error: "Failed to process final video" };
    }

    // Step 5: Save to database
    const { data: video, error: dbError } = await supabase
      .from("videos")
      .insert({
        user_id: user.id,
        title: idea.substring(0, 100),
        description: idea,
        script: scriptData.script,
        scenes: scriptData.scenes,
        video_url: finalVideoUrl,
        style,
        duration,
        voice_type: voiceType,
        music_type: musicType,
        has_voiceover: includeVoiceover,
        has_captions: includeCaptions,
        has_music: includeMusic,
        voiceover_url: voiceoverUrl ?? null,
        captions:
          includeCaptions && voiceoverUrl
            ? await generateCaptions(voiceoverUrl)
            : null,
        status: "complete",
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      return { error: "Failed to save video" };
    }

    return {
      script: scriptData.script,
      scenes: scriptData.scenes,
      videoUrl: finalVideoUrl,
      videoId: video.id,
    };
  } catch (error) {
    console.error("Video generation error:", error);
    return { error: "An unexpected error occurred" };
  }
}

// Generate script and scene breakdown using AI
async function generateScript(
  idea: string,
  duration: number,
  style: string,
): Promise<{ script?: string; scenes?: ScriptScene[] }> {
  try {
    const res = await generateScriptWithAI({ idea, duration, style });
    return res;
  } catch (error) {
    console.error("Script generation error:", error);
    return {};
  }
}

// Generate video clips using AI video generation
async function generateVideoClips(
  scenes: ScriptScene[],
  style: string,
  videoModel?: string,
): Promise<string[]> {
  try {
    const clips = await Promise.all(
      scenes.map((scene) =>
        generateVideoClip({
          prompt:
            `${VIDEO_STYLES[style as keyof typeof VIDEO_STYLES]?.prompt_prefix || ""}, ${scene.videoPrompt}`.trim(),
          duration: Math.min(Math.max(scene.duration, 2), 12),
          style,
          aspectRatio: "9:16",
          modelId: videoModel,
        }),
      ),
    );
    return clips.filter(Boolean);
  } catch (error) {
    console.error("Video generation error:", error);
    return [];
  }
}

// Generate voiceover using text-to-speech
async function generateVoiceover(
  script: string,
  voiceType: string,
): Promise<string | undefined> {
  try {
    return await ttsVoiceover({
      text: script,
      voice: voiceType || "professional",
    });
  } catch (error) {
    console.error("Voiceover generation error:", error);
    return undefined;
  }
}

// Process and combine all elements into final video
async function processVideo(params: {
  clips: string[];
  script: string;
  scenes: ScriptScene[];
  voiceoverUrl?: string;
  musicType?: string;
  includeCaptions: boolean;
  style: string;
  duration: number;
}): Promise<string | undefined> {
  try {
    const caps =
      params.includeCaptions && params.voiceoverUrl
        ? await whisperCaptions(params.voiceoverUrl)
        : undefined;
    const url = await processAndCombineVideos({
      videoClips: params.clips,
      audioUrl: params.voiceoverUrl,
      captions: caps,
      durations: Array.isArray(params.scenes)
        ? params.scenes.map((s) =>
            Math.max(1, Math.min(14, Number(s.duration) || 5)),
          )
        : undefined,
      captionStyle: params.style,
    });
    return url;
  } catch (error) {
    console.error("Video processing error:", error);
    return undefined;
  }
}

// Get user's videos
export async function getUserVideos() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated", videos: [] };
  }

  // Fetch from video_jobs instead of videos and map to UI shape
  const { data: jobs, error } = await supabase
    .from("video_jobs")
    .select("id, idea, status, video_url, voiceover_url, captions, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return { error: error.message, videos: [] };
  }

  const videos = (jobs || []).map((j: any) => ({
    id: j.id,
    title: (j.idea || "Untitled").slice(0, 100),
    description: j.idea || undefined,
    video_url: j.video_url || undefined,
    thumbnail_url: undefined,
    duration:
      Array.isArray(j.captions) && j.captions.length
        ? Math.round(j.captions[j.captions.length - 1].end || 0)
        : undefined,
    style: undefined,
    status: j.status,
    view_count: 0,
    created_at: j.created_at,
    has_voiceover: !!j.voiceover_url,
    has_captions: Array.isArray(j.captions) && j.captions.length > 0,
    has_music: false,
  }));

  return { videos, error: null };
}

// Delete a video
export async function deleteVideo(videoId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("video_jobs")
    .delete()
    .eq("id", videoId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

// Helper to generate captions after voiceover (used inline during insert)
async function generateCaptions(voiceoverUrl: string) {
  try {
    return await whisperCaptions(voiceoverUrl);
  } catch (e) {
    console.error("Caption generation error:", e);
    return [];
  }
}
