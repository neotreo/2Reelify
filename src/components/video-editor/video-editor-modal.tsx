"use client";

import { VideoJob } from "@/types/video";
import { VideoTimeline } from "./video-timeline";
import { X, Minimize2, Maximize2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface VideoEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: VideoJob | null;
  onSectionsUpdate: (sections: VideoJob["sections"]) => void;
}

export function VideoEditorModal({
  isOpen,
  onClose,
  job,
  onSectionsUpdate,
}: VideoEditorModalProps) {
  const [isMinimized, setIsMinimized] = useState(false);

  if (!job) return null;

  const handleSectionsReorder = (newSections: VideoJob["sections"]) => {
    onSectionsUpdate(newSections);
  };

  const handleSectionDelete = (sectionId: string) => {
    const newSections = job.sections.filter((s) => s.id !== sectionId);
    onSectionsUpdate(newSections);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        "max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col",
        isMinimized && "max-h-[200px]"
      )}>
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <span className="text-lg font-semibold">Video Editor</span>
              <span className="text-sm font-normal text-gray-500">
                {job.status === "complete" ? "Complete" : "Generating..."}
              </span>
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMinimized(!isMinimized)}
                className="h-8 w-8"
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
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {!isMinimized && (
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-4 p-2">
              <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-purple-900 mb-1">
                      Timeline Editor
                    </h4>
                    <p className="text-xs text-purple-700">
                      Watch your video come together in real-time! Clips will appear as they generate. 
                      You can drag clips to reorder them, click to select, and hover to delete.
                    </p>
                  </div>
                </div>
              </div>

              <VideoTimeline
                sections={job.sections || []}
                voiceoverUrl={job.voiceover_url}
                captions={job.captions || []}
                onSectionsReorder={handleSectionsReorder}
                onSectionDelete={handleSectionDelete}
              />

              <div className="grid grid-cols-4 gap-4 pt-2">
                <div className="bg-white border border-gray-200 rounded-md p-3">
                  <div className="text-xs text-gray-500 mb-1">Total Clips</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {job.sections?.length || 0}
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-md p-3">
                  <div className="text-xs text-gray-500 mb-1">Completed</div>
                  <div className="text-2xl font-bold text-green-600">
                    {job.sections?.filter((s) => s.clip_url).length || 0}
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-md p-3">
                  <div className="text-xs text-gray-500 mb-1">Generating</div>
                  <div className="text-2xl font-bold text-purple-600">
                    {job.sections?.filter((s) => !s.clip_url && !s.clip_error).length || 0}
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-md p-3">
                  <div className="text-xs text-gray-500 mb-1">Errors</div>
                  <div className="text-2xl font-bold text-red-600">
                    {job.sections?.filter((s) => s.clip_error).length || 0}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <div className="text-xs text-gray-500">
                  Changes will be reflected in the final video
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      console.log("Reset clicked");
                    }}
                  >
                    Reset Order
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={onClose}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Done Editing
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
