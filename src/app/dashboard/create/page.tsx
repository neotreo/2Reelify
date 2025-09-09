"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import DashboardNavbar from "@/components/dashboard-navbar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Sparkles,
  Video,
  Mic,
  Type,
  Download,
  RefreshCw,
  Settings,
  Loader2,
  CheckCircle,
  AlertCircle,
  Film,
  Music,
  Palette,
  Clock,
} from "lucide-react";
import {
  startVideoJobAction,
  getVideoJobAction,
} from "@/app/actions/video-actions";
import VideoPlayer from "@/components/video-player";
import { useRouter } from "next/navigation";
import type { VideoJob, VideoJobStatus } from "@/types/video";

interface VideoProject {
  id?: string;
  status:
    | "idle"
    | "planning"
    | "scripting"
    | "generating"
    | "processing"
    | "complete"
    | "error";
  progress: number;
  script?: string;
  scenes?: Array<{
    text: string;
    duration: number;
    videoPrompt: string;
  }>;
  videoUrl?: string;
  error?: string;
  metadata?: {
    duration: number;
    style: string;
    voiceType: string;
    musicType: string;
  };
}

export default function CreateVideoPage() {
  const router = useRouter();
  const [idea, setIdea] = useState("");
  const [videoStyle, setVideoStyle] = useState("cinematic");
  const [videoDuration, setVideoDuration] = useState([30]);
  const [voiceType, setVoiceType] = useState("professional");
  const [musicType, setMusicType] = useState("upbeat");
  const [includeVoiceover, setIncludeVoiceover] = useState(true);
  const [includeCaptions, setIncludeCaptions] = useState(true);
  const [includeMusic, setIncludeMusic] = useState(true);
  const [scriptModel, setScriptModel] = useState("gpt-4o-mini");
  const [videoModel, setVideoModel] = useState("wan-video/wan-2.2-t2v-fast");
  const [project, setProject] = useState<VideoProject>({
    status: "idle",
    progress: 0,
  });

  // Job state for real-time updates
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<VideoJob | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const statusMessages = {
    idle: "Ready to create your video",
    planning: "AI is planning your video structure...",
    scripting: "Writing the perfect script...",
    generating: "Creating stunning visuals...",
    processing: "Adding voiceover and captions...",
    complete: "Your video is ready!",
    error: "Something went wrong",
  } as const;

  const jobStatusToProjectStatus: Record<
    VideoJobStatus,
    VideoProject["status"]
  > = {
    queued: "planning",
    planning: "planning",
    scripting: "scripting",
    prompting: "generating",
    generating_clips: "generating",
    voiceover: "processing",
    captions: "processing",
    stitching: "processing",
    complete: "complete",
    error: "error",
  };

  function jobStatusToProgress(status: VideoJobStatus): number {
    switch (status) {
      case "queued":
        return 5;
      case "planning":
        return 10;
      case "scripting":
        return 30;
      case "prompting":
        return 45;
      case "generating_clips":
        return 65;
      case "voiceover":
        return 75;
      case "captions":
        return 85;
      case "stitching":
        return 95;
      case "complete":
        return 100;
      case "error":
      default:
        return 0;
    }
  }

  const handleGenerateVideo = async () => {
    if (!idea.trim()) return;

    setProject({
      status: "planning",
      progress: 10,
    });

    try {
      const formData = new FormData();
      formData.append("idea", idea);
      formData.append("style", videoStyle);
      formData.append("duration", videoDuration[0].toString());
      formData.append("voiceType", voiceType);
      formData.append("musicType", musicType);
      formData.append("includeVoiceover", includeVoiceover.toString());
      formData.append("includeCaptions", includeCaptions.toString());
      formData.append("includeMusic", includeMusic.toString());
      formData.append("scriptModel", scriptModel);
      formData.append("videoModel", videoModel);

      // Start background job
      const res = await startVideoJobAction(formData);
      if (res?.error) {
        console.error("startVideoJobAction error:", res.error);
        setProject({ status: "error", progress: 0, error: res.error });
        return;
      }
      if (res?.jobId) {
        setJobId(res.jobId);
      }
    } catch (error) {
      console.error("handleGenerateVideo error:", error);
      setProject({
        status: "error",
        progress: 0,
        error: "Failed to start video generation. Please try again.",
      });
    }
  };

  // Poll for job updates
  useEffect(() => {
    if (!jobId) return;

    // Clear any existing interval
    if (pollRef.current) clearInterval(pollRef.current);

    const tick = async () => {
      const res = await getVideoJobAction(jobId);
      if (res?.error) {
        console.error("getVideoJobAction error:", res.error);
        setProject((prev) => ({
          ...prev,
          status: "error",
          progress: 0,
          error: res.error,
        }));
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
        return;
      }
      if (res?.job) {
        setJob(res.job);
        const pStatus = jobStatusToProjectStatus[res.job.status];
        const progress = jobStatusToProgress(res.job.status);

        const combinedScript = (res.job.sections || [])
          .map((s) => (s.script || "").trim())
          .filter(Boolean)
          .join("\n\n");

        setProject((prev) => ({
          ...prev,
          status: pStatus,
          progress,
          script: combinedScript || prev.script,
          videoUrl: res.job?.video_url || prev.videoUrl,
          error: res.job?.error || undefined,
          metadata: prev.metadata ?? {
            duration: videoDuration[0],
            style: videoStyle,
            voiceType: voiceType,
            musicType: musicType,
          },
        }));

        if (res.job.status === "complete" || res.job.status === "error") {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }
    };

    // Initial tick immediately
    tick();
    // Then poll regularly
    pollRef.current = setInterval(tick, 2000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [jobId]);

  const resetProject = () => {
    setProject({
      status: "idle",
      progress: 0,
    });
    setIdea("");
    setJobId(null);
    setJob(null);
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  // Helpers for plan UI
  const sectionChecks = useMemo(() => {
    return (job?.sections || []).map((s) => ({
      id: s.id,
      title: s.title,
      objective: s.objective,
      scriptDone: Boolean(s.script && s.script.trim().length > 0),
      promptDone: Boolean(s.shot_prompt && s.shot_prompt.trim().length > 0),
      clipDone: Boolean(s.clip_url && s.clip_url.trim().length > 0),
    }));
  }, [job]);

  const voiceoverDone = Boolean(job?.voiceover_url);
  const captionsDone = Boolean(job?.captions && job.captions.length > 0);

  return (
    <>
      <DashboardNavbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Create New Video</h1>
            <p className="text-muted-foreground">
              Transform your ideas into viral-ready videos with AI
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Panel - Input & Settings */}
            <div className="lg:col-span-2 space-y-6">
              {/* Idea Input */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    Your Video Idea
                  </CardTitle>
                  <CardDescription>
                    Describe what you want your video to be about
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="E.g., '5 mind-blowing facts about space that will leave you speechless' or 'How to make the perfect morning coffee routine' or 'Why cats are secretly planning world domination'"
                    value={idea}
                    onChange={(e) => setIdea(e.target.value)}
                    className="min-h-[120px] resize-none"
                    disabled={project.status !== "idle"}
                  />
                  <div className="flex gap-2">
                    <Badge variant="outline">
                      {idea.length}/500 characters
                    </Badge>
                    {idea.length > 20 && (
                      <Badge variant="outline" className="text-green-600">
                        Good length!
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Video Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-purple-600" />
                    Video Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Tabs defaultValue="style" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="style">Style</TabsTrigger>
                      <TabsTrigger value="audio">Audio</TabsTrigger>
                      <TabsTrigger value="features">Features</TabsTrigger>
                    </TabsList>

                    <TabsContent value="style" className="space-y-4">
                      <div className="space-y-2">
                        <Label>Video Style</Label>
                        <Select
                          value={videoStyle}
                          onValueChange={setVideoStyle}
                          disabled={project.status !== "idle"}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cinematic">
                              <div className="flex items-center gap-2">
                                <Film className="w-4 h-4" />
                                Cinematic
                              </div>
                            </SelectItem>
                            <SelectItem value="casual">Casual Vlog</SelectItem>
                            <SelectItem value="animated">Animated</SelectItem>
                            <SelectItem value="minimalist">
                              Minimalist
                            </SelectItem>
                            <SelectItem value="documentary">
                              Documentary
                            </SelectItem>
                            <SelectItem value="energetic">
                              High Energy
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Duration: {videoDuration[0]} seconds</Label>
                        <Slider
                          value={videoDuration}
                          onValueChange={setVideoDuration}
                          min={15}
                          max={60}
                          step={5}
                          disabled={project.status !== "idle"}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>15s</span>
                          <span>30s</span>
                          <span>45s</span>
                          <span>60s</span>
                        </div>
                      </div>

                      {/* Models */}
                      <div className="grid md:grid-cols-2 gap-4 pt-2">
                        <div className="space-y-2">
                          <Label>Script Model</Label>
                          <Select value={scriptModel} onValueChange={setScriptModel} disabled={project.status !== "idle"}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="gpt-4o-mini">Fast (gpt-4o-mini)</SelectItem>
                              <SelectItem value="gpt-4-turbo-preview">Creative (gpt-4-turbo-preview)</SelectItem>
                              <SelectItem value="gpt-4o">Intelligent (gpt-4o)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Video Model</Label>
                          <Select value={videoModel} onValueChange={setVideoModel} disabled={project.status !== "idle"}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="wan-video/wan-2.2-t2v-fast">WAN 2.2 Fast</SelectItem>
                              <SelectItem value="bytedance/seedance-1-lite">Seedance 1 Lite</SelectItem>
                              <SelectItem value="minimax/hailuo-02">Hailuo 02</SelectItem>
                              <SelectItem value="kwaivgi/kling-v2.1">Kling v2.1</SelectItem>
                              <SelectItem value="kwaivgi/kling-v2.1-master">Kling v2.1 Master</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="audio" className="space-y-4">
                      <div className="space-y-2">
                        <Label>Voice Type</Label>
                        <Select
                          value={voiceType}
                          onValueChange={setVoiceType}
                          disabled={
                            project.status !== "idle" || !includeVoiceover
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="professional">
                              Professional
                            </SelectItem>
                            <SelectItem value="casual">Casual</SelectItem>
                            <SelectItem value="energetic">Energetic</SelectItem>
                            <SelectItem value="calm">Calm</SelectItem>
                            <SelectItem value="storyteller">
                              Storyteller
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Background Music</Label>
                        <Select
                          value={musicType}
                          onValueChange={setMusicType}
                          disabled={project.status !== "idle" || !includeMusic}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="upbeat">Upbeat</SelectItem>
                            <SelectItem value="cinematic">Cinematic</SelectItem>
                            <SelectItem value="chill">Chill</SelectItem>
                            <SelectItem value="dramatic">Dramatic</SelectItem>
                            <SelectItem value="none">No Music</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TabsContent>

                    <TabsContent value="features" className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Mic className="w-4 h-4 text-purple-600" />
                          <Label htmlFor="voiceover">AI Voiceover</Label>
                        </div>
                        <Switch
                          id="voiceover"
                          checked={includeVoiceover}
                          onCheckedChange={setIncludeVoiceover}
                          disabled={project.status !== "idle"}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Type className="w-4 h-4 text-purple-600" />
                          <Label htmlFor="captions">Auto Captions</Label>
                        </div>
                        <Switch
                          id="captions"
                          checked={includeCaptions}
                          onCheckedChange={setIncludeCaptions}
                          disabled={project.status !== "idle"}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Music className="w-4 h-4 text-purple-600" />
                          <Label htmlFor="music">Background Music</Label>
                        </div>
                        <Switch
                          id="music"
                          checked={includeMusic}
                          onCheckedChange={setIncludeMusic}
                          disabled={project.status !== "idle"}
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              {/* Generate Button */}
              <div className="flex gap-4">
                {project.status === "idle" ? (
                  <Button
                    onClick={handleGenerateVideo}
                    disabled={!idea.trim()}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    size="lg"
                  >
                    <Sparkles className="mr-2 w-5 h-5" />
                    Generate Video
                  </Button>
                ) : project.status === "complete" ? (
                  <>
                    <Button
                      onClick={resetProject}
                      variant="outline"
                      size="lg"
                      className="flex-1"
                    >
                      <RefreshCw className="mr-2 w-5 h-5" />
                      Create Another
                    </Button>
                    <Button
                      size="lg"
                      className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600"
                      disabled={!project.videoUrl}
                    >
                      <Download className="mr-2 w-5 h-5" />
                      Download Video
                    </Button>
                  </>
                ) : project.status === "error" ? (
                  <Button
                    onClick={resetProject}
                    variant="outline"
                    size="lg"
                    className="flex-1"
                  >
                    <RefreshCw className="mr-2 w-5 h-5" />
                    Try Again
                  </Button>
                ) : (
                  <Button disabled size="lg" className="flex-1">
                    <Loader2 className="mr-2 w-5 h-5 animate-spin" />
                    {statusMessages[project.status]}
                  </Button>
                )}
              </div>
            </div>

            {/* Right Panel - Preview & Progress */}
            <div className="space-y-6">
              {/* Progress Card */}
              {project.status !== "idle" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {project.status === "complete" ? (
                        <>
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          Complete!
                        </>
                      ) : project.status === "error" ? (
                        <>
                          <AlertCircle className="w-5 h-5 text-red-600" />
                          Error
                        </>
                      ) : (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                          Processing
                        </>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{statusMessages[project.status]}</span>
                        <span>{project.progress}%</span>
                      </div>
                      <Progress value={project.progress} />
                    </div>

                    {project.error && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{project.error}</AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Plan Card - shows sections with live checkmarks */}
              {job && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Type className="w-5 h-5 text-purple-600" />
                      Video Plan
                    </CardTitle>
                    <CardDescription>
                      Checkmarks appear as each part completes
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      {sectionChecks.map((s, idx) => (
                        <div
                          key={s.id}
                          className="flex items-start justify-between gap-4 p-3 rounded-md border"
                        >
                          <div>
                            <div className="font-medium">
                              Section {idx + 1}: {s.title}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {s.objective}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1 text-sm">
                              {s.scriptDone ? (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              ) : (
                                <Clock className="w-4 h-4 text-muted-foreground" />
                              )}
                              <span>Script</span>
                            </div>
                            <div className="flex items-center gap-1 text-sm">
                              {s.promptDone ? (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              ) : (
                                <Clock className="w-4 h-4 text-muted-foreground" />
                              )}
                              <span>Prompt</span>
                            </div>
                            <div className="flex items-center gap-1 text-sm">
                              {s.clipDone ? (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              ) : (
                                <Clock className="w-4 h-4 text-muted-foreground" />
                              )}
                              <span>Clip</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 p-2 rounded-md border">
                        {voiceoverDone ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <Clock className="w-4 h-4 text-muted-foreground" />
                        )}
                        <span className="text-sm">Voiceover</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-md border">
                        {captionsDone ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <Clock className="w-4 h-4 text-muted-foreground" />
                        )}
                        <span className="text-sm">Captions</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Video Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Video className="w-5 h-5 text-purple-600" />
                    Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="aspect-[9/16] bg-black rounded-lg overflow-hidden">
                    {project.videoUrl ? (
                      <VideoPlayer url={project.videoUrl} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/50">
                        <div className="text-center">
                          <Video className="w-12 h-12 mx-auto mb-2" />
                          <p className="text-sm">Your video will appear here</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Script Preview */}
              {project.script && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Type className="w-5 h-5 text-purple-600" />
                      Generated Script
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-48 overflow-y-auto">
                      <p className="text-sm whitespace-pre-wrap">
                        {project.script}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Metadata */}
              {project.metadata && (
                <Card>
                  <CardHeader>
                    <CardTitle>Video Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Duration</span>
                        <span>{project.metadata.duration}s</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Style</span>
                        <span className="capitalize">
                          {project.metadata.style}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Voice</span>
                        <span className="capitalize">
                          {project.metadata.voiceType}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Music</span>
                        <span className="capitalize">
                          {project.metadata.musicType}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}