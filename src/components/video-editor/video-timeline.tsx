"use client";

import { useState } from "react";
import { VideoSection, CaptionSegment } from "@/types/video";
import { TimelineClip } from "./timeline-clip";
import { Video, Mic, Type } from "lucide-react";

interface VideoTimelineProps {
  sections: VideoSection[];
  voiceoverUrl?: string | null;
  captions?: CaptionSegment[];
  onSectionsReorder: (sections: VideoSection[]) => void;
  onSectionDelete: (sectionId: string) => void;
}

export function VideoTimeline({
  sections,
  voiceoverUrl,
  captions,
  onSectionsReorder,
  onSectionDelete,
}: VideoTimelineProps) {
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => (e: React.DragEvent) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (dropIndex: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    const newSections = [...sections];
    const [removed] = newSections.splice(draggedIndex, 1);
    newSections.splice(dropIndex, 0, removed);

    onSectionsReorder(newSections);
    setDraggedIndex(null);
  };

  const handleDelete = (sectionId: string) => {
    onSectionDelete(sectionId);
    if (selectedClipId === sectionId) {
      setSelectedClipId(null);
    }
  };

  const totalDuration = sections.reduce(
    (sum, s) => sum + (s.target_seconds || 5),
    0
  );

  const audioWidth = sections.reduce(
    (sum, s) => sum + Math.max((s.target_seconds || 5) * 40, 80),
    0
  );

  return (
    <div className="flex flex-col gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium text-gray-700">
            Video Timeline
          </div>
          <div className="text-xs text-gray-500">
            {sections.length} clips • {totalDuration}s total
          </div>
        </div>
        <div className="text-xs text-gray-500">
          Drag clips to reorder • Click to select • Hover to delete
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Video className="w-4 h-4 text-purple-600" />
            Video Clips
          </div>
          <div className="relative">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {sections.length === 0 ? (
                <div className="flex items-center justify-center w-full h-16 text-sm text-gray-400 border-2 border-dashed border-gray-300 rounded-md">
                  No clips yet - waiting for generation...
                </div>
              ) : (
                sections.map((section, index) => (
                  <TimelineClip
                    key={section.id}
                    section={section}
                    index={index}
                    isSelected={selectedClipId === section.id}
                    onSelect={() => setSelectedClipId(section.id)}
                    onDelete={() => handleDelete(section.id)}
                    onDragStart={handleDragStart(index)}
                    onDragOver={handleDragOver(index)}
                    onDrop={handleDrop(index)}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Mic className="w-4 h-4 text-blue-600" />
            Voiceover
          </div>
          <div className="relative h-12 bg-white border border-gray-200 rounded-md overflow-hidden">
            {voiceoverUrl ? (
              <div
                className="h-full bg-gradient-to-r from-blue-100 to-blue-200 border-l-4 border-blue-500 flex items-center px-3"
                style={{ width: `${audioWidth}px` }}
              >
                <span className="text-xs font-medium text-blue-700">
                  Audio Track ({totalDuration}s)
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-gray-400">
                {sections.length > 0
                  ? "Generating voiceover..."
                  : "Waiting for clips..."}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Type className="w-4 h-4 text-green-600" />
            Captions
          </div>
          <div className="relative h-12 bg-white border border-gray-200 rounded-md overflow-hidden">
            {captions && captions.length > 0 ? (
              <div
                className="h-full bg-gradient-to-r from-green-100 to-green-200 border-l-4 border-green-500 flex items-center px-3"
                style={{ width: `${audioWidth}px` }}
              >
                <span className="text-xs font-medium text-green-700">
                  {captions.length} caption segments
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-gray-400">
                {voiceoverUrl
                  ? "Generating captions..."
                  : sections.length > 0
                  ? "Waiting for voiceover..."
                  : "Waiting for clips..."}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
        <div className="text-xs text-gray-400">0s</div>
        <div className="flex-1 h-px bg-gray-300"></div>
        <div className="text-xs text-gray-400">{totalDuration}s</div>
      </div>
    </div>
  );
}
