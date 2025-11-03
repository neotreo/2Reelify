"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { VideoJob, VideoSection } from "@/types/video";
import { VideoTimeline } from "@/components/video-editor/video-timeline";
import { VideoPreview } from "@/components/video-editor/video-preview";
import { SectionDetails } from "@/components/video-editor/section-details";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Download, 
  Save, 
  RefreshCw,
  Play,
  Pause,
  Settings
} from "lucide-react";
import { 
  getVideoJobAction, 
  regenerateSectionAction 
} from "@/app/actions/video-actions";

export default function VideoEditorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId");
  
  const [job, setJob] = useState<VideoJob | null>(null);
  const [selectedSection, setSelectedSection] = useState<VideoSection | null>(null);
  const [regeneratingSection, setRegeneratingSection] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Poll for job updates
  useEffect(() => {
    if (!jobId) {
      setError("No job ID provided");
      setIsLoading(false);
      return;
    }

    const fetchJob = async () => {
      try {
        const res = await getVideoJobAction(jobId);
        if (res?.error) {
          setError(res.error);
        } else if (res?.job) {
          setJob(res.job);
          setError(null);
        }
      } catch (e) {
        setError("Failed to load video job");
        console.error("Error fetching job:", e);
      } finally {
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchJob();

    // Poll every 3 seconds if job is still generating
    const startPolling = () => {
      if (pollRef.current) clearInterval(pollRef.current);
      
      pollRef.current = setInterval(() => {
        fetchJob();
      }, 3000);
    };

    startPolling();

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, [jobId]);

  // Stop polling when job is complete
  useEffect(() => {
    if (job?.status === "complete" || job?.status === "error" || job?.status === "cancelled") {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
  }, [job?.status]);

  const handleSectionsUpdate = (newSections: VideoJob["sections"]) => {
    if (job) {
      setJob({ ...job, sections: newSections });
    }
  };

  const handleSectionSelect = (section: VideoSection) => {
    setSelectedSection(section);
  };

  const handlePromptUpdate = (sectionId: string, newPrompt: string) => {
    if (!job) return;
    
    const updatedSections = job.sections.map((s) =>
      s.id === sectionId ? { ...s, shot_prompt: newPrompt } : s
    );
    handleSectionsUpdate(updatedSections);
    
    if (selectedSection?.id === sectionId) {
      setSelectedSection({ ...selectedSection, shot_prompt: newPrompt });
    }
  };

  const handleRegenerate = async (sectionId: string) => {
    if (!jobId) return;
    
    setRegeneratingSection(sectionId);
    try {
      const res = await regenerateSectionAction(jobId, sectionId);
      if (res?.error) {
        console.error("Failed to regenerate section:", res.error);
      }
    } finally {
      setRegeneratingSection(null);
    }
  };

  const handleBackToCreate = () => {
    router.push("/dashboard/create");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "complete":
        return "bg-green-100 text-green-800 border-green-200";
      case "error":
        return "bg-red-100 text-red-800 border-red-200";
      case "cancelled":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-600" />
          <p className="text-gray-600">Loading video editor...</p>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || "Video job not found"}</p>
          <Button onClick={handleBackToCreate} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Create
          </Button>
        </div>
      </div>
    );
  }

  const completedClips = job.sections?.filter(s => s.clip_url).length || 0;
  const totalClips = job.sections?.length || 0;
  const errorClips = job.sections?.filter(s => s.clip_error).length || 0;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              onClick={handleBackToCreate}
              variant="ghost"
              size="sm"
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Create
            </Button>
            
            <div className="h-6 w-px bg-gray-300" />
            
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Video Editor
              </h1>
              <p className="text-sm text-gray-500">
                {job.idea.substring(0, 60)}{job.idea.length > 60 ? "..." : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Badge className={getStatusColor(job.status)}>
                {job.status === "complete" ? "Complete" : 
                 job.status === "error" ? "Error" : 
                 job.status === "cancelled" ? "Cancelled" : "Generating..."}
              </Badge>
              
              <div className="text-sm text-gray-600">
                {completedClips}/{totalClips} clips
                {errorClips > 0 && (
                  <span className="text-red-600 ml-2">• {errorClips} errors</span>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!job.video_url}
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              
              <Button
                size="sm"
                className="bg-purple-600 hover:bg-purple-700"
                disabled={job.status !== "complete"}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Project
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Editor */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-4 gap-0">
          {/* Left Sidebar - Timeline (25%) */}
          <div className="bg-white border-r border-gray-200 p-4 overflow-y-auto">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Timeline</h3>
                <p className="text-xs text-gray-500 mb-4">
                  Click clips to edit • Drag to reorder • Hover to delete
                </p>
              </div>

              <VideoTimeline
                sections={job.sections || []}
                voiceoverUrl={job.voiceover_url}
                captions={job.captions || []}
                onSectionsReorder={handleSectionsUpdate}
                onSectionDelete={(sectionId) => {
                  const newSections = job.sections.filter(s => s.id !== sectionId);
                  handleSectionsUpdate(newSections);
                  if (selectedSection?.id === sectionId) {
                    setSelectedSection(null);
                  }
                }}
                selectedSectionId={selectedSection?.id}
                onSectionSelect={handleSectionSelect}
                currentTime={currentTime}
                totalDuration={videoDuration}
              />

              <div className="pt-4 border-t border-gray-200 space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    // Reset to original order
                    console.log("Reset order");
                  }}
                >
                  <RefreshCw className="w-3 h-3 mr-2" />
                  Reset Order
                </Button>
              </div>
            </div>
          </div>

          {/* Center - Video Preview (50%) */}
          <div className="col-span-2 bg-gray-900 p-6 flex flex-col">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-white mb-1">Preview</h3>
              <p className="text-xs text-gray-400">
                Full video preview with playback controls
              </p>
            </div>
            
            <VideoPreview 
              videoUrl={job.video_url}
              className="flex-1"
              onTimeUpdate={(time, duration) => {
                setCurrentTime(time);
                setVideoDuration(duration);
              }}
            />
          </div>

          {/* Right Sidebar - Section Details (25%) */}
          <div className="bg-white border-l border-gray-200 overflow-hidden">
            <SectionDetails
              section={selectedSection}
              onClose={() => setSelectedSection(null)}
              onPromptUpdate={handlePromptUpdate}
              onRegenerate={handleRegenerate}
              isRegenerating={regeneratingSection === selectedSection?.id}
            />
          </div>
        </div>
      </div>
    </div>
  );
}