"use client";

import { VideoJob, VideoSection } from "@/types/video";
import { VideoTimeline } from "./video-timeline";
import { VideoPreview } from "./video-preview";
import { SectionDetails } from "./section-details";
import { X, Minimize2, Maximize2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface VideoEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: VideoJob | null;
  onSectionsUpdate: (sections: VideoJob["sections"]) => void;
  onSectionRegenerate?: (sectionId: string) => void;
}

export function VideoEditorModal({
  isOpen,
  onClose,
  job,
  onSectionsUpdate,
  onSectionRegenerate,
}: VideoEditorModalProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [selectedSection, setSelectedSection] = useState<VideoSection | null>(null);
  const [regeneratingSection, setRegeneratingSection] = useState<string | null>(null);

  if (!job) return null;

  const handleSectionsReorder = (newSections: VideoJob["sections"]) => {
    onSectionsUpdate(newSections);
  };

  const handleSectionDelete = (sectionId: string) => {
    const newSections = job.sections.filter((s) => s.id !== sectionId);
    onSectionsUpdate(newSections);
    if (selectedSection?.id === sectionId) {
      setSelectedSection(null);
    }
  };

  const handleSectionSelect = (section: VideoSection) => {
    setSelectedSection(section);
  };

  const handlePromptUpdate = (sectionId: string, newPrompt: string) => {
    const updatedSections = job.sections.map((s) =>
      s.id === sectionId ? { ...s, shot_prompt: newPrompt } : s
    );
    onSectionsUpdate(updatedSections);
    
    // Update selected section if it's the one being edited
    if (selectedSection?.id === sectionId) {
      setSelectedSection({ ...selectedSection, shot_prompt: newPrompt });
    }
  };

  const handleRegenerate = async (sectionId: string) => {
    if (!onSectionRegenerate) return;
    
    setRegeneratingSection(sectionId);
    try {
      await onSectionRegenerate(sectionId);
    } finally {
      setRegeneratingSection(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        "max-w-[98vw] max-h-[95vh] overflow-hidden flex flex-col p-0",
        isMinimized && "max-h-[200px]"
      )}>
        {/* Header */}
        <DialogHeader className="flex-shrink-0 px-6 py-4 border-b bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              <span className="text-xl font-bold text-gray-900">Video Editor</span>
              <Badge variant={job.status === "complete" ? "default" : "secondary"} className="text-xs">
                {job.status === "complete" ? "Complete" : "Generating..."}
              </Badge>
              <div className="flex items-center gap-4 ml-4 text-sm">
                <span className="text-gray-600">
                  <strong className="text-green-600">{job.sections?.filter((s) => s.clip_url).length || 0}</strong> / {job.sections?.length || 0} clips
                </span>
                {job.sections?.filter((s) => s.clip_error).length > 0 && (
                  <span className="text-red-600">
                    {job.sections?.filter((s) => s.clip_error).length} errors
                  </span>
                )}
              </div>
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMinimized(!isMinimized)}
                className="h-8 w-8 hover:bg-white/50"
              >
                {isMinimized ? (
                  <Maximize2 className="h-4 w-4" />
                ) : (
                  <Minimize2 className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 hover:bg-white/50"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {!isMinimized && (
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Main Content Area - Unified Layout */}
            <div className="flex-1 overflow-y-auto">
              {/* Video Preview Section - Full Width */}
              <div className="p-6 border-b bg-gray-900">
                <VideoPreview 
                  videoUrl={job.video_url}
                  className="w-full max-w-4xl mx-auto"
                />
              </div>

              {/* Timeline Section - Full Width */}
              <div className="p-6 bg-white">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline & Clips</h3>
                <VideoTimeline
                  sections={job.sections || []}
                  voiceoverUrl={job.voiceover_url}
                  captions={job.captions || []}
                  onSectionsReorder={handleSectionsReorder}
                  onSectionDelete={handleSectionDelete}
                  selectedSectionId={selectedSection?.id}
                  onSectionSelect={handleSectionSelect}
                />
              </div>

              {/* Section Details - Full Width when selected */}
              {selectedSection && (
                <div className="p-6 border-t bg-gray-50">
                  <SectionDetails
                    section={selectedSection}
                    onClose={() => setSelectedSection(null)}
                    onPromptUpdate={handlePromptUpdate}
                    onRegenerate={handleRegenerate}
                    isRegenerating={regeneratingSection === selectedSection?.id}
                  />
                </div>
              )}

              {!selectedSection && (
                <div className="p-6 border-t bg-gray-50">
                  <div className="text-center text-gray-500 py-8">
                    <p className="text-sm">Click on any clip in the timeline above to edit its details</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex-shrink-0 px-6 py-4 border-t bg-white flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Drag clips to reorder • Click to edit • Changes are saved automatically
              </p>
              <Button
                onClick={onClose}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Done Editing
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
