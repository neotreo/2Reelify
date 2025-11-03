"use client";

import { useState } from "react";
import { VideoSection, CaptionSegment } from "@/types/video";
import { TimelineClip } from "./timeline-clip";
import { AudioWaveform } from "./audio-waveform";
import { CaptionTimeline } from "./caption-timeline";
import { Badge } from "@/components/ui/badge";
import { Video, Mic, Type } from "lucide-react";

interface VideoTimelineProps {
  sections: VideoSection[];
  voiceoverUrl?: string | null;
  captions?: CaptionSegment[];
  onSectionsReorder: (sections: VideoSection[]) => void;
  onSectionDelete: (sectionId: string) => void;
  selectedSectionId?: string;
  onSectionSelect?: (section: VideoSection) => void;
  currentTime?: number;
  totalDuration?: number;
}

export function VideoTimeline({
  sections,
  voiceoverUrl,
  captions,
  onSectionsReorder,
  onSectionDelete,
  selectedSectionId,
  onSectionSelect,
  currentTime = 0,
  totalDuration = 0,
}: VideoTimelineProps) {
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
  };

  const handleSelect = (section: VideoSection) => {
    if (onSectionSelect) {
      onSectionSelect(section);
    }
  };

  const calculatedDuration = sections.reduce(
    (sum, s) => sum + (s.target_seconds || 5),
    0
  );

  const finalDuration = totalDuration || calculatedDuration;

  const audioWidth = sections.reduce(
    (sum, s) => sum + Math.max((s.target_seconds || 5) * 40, 80),
    0
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Timeline Info Bar */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <span className="font-medium text-gray-900">{sections.length} clips</span>
          <span>•</span>
          <span>{finalDuration}s total duration</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>0s</span>
          <div className="w-24 h-0.5 bg-gray-300"></div>
          <span>{finalDuration}s</span>
        </div>
      </div>

      {/* Video Clips Track */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Video className="w-5 h-5 text-purple-600" />
          <span className="text-sm font-semibold text-gray-900">Video Clips</span>
        </div>
        <div className="relative bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200">
          <div className="flex gap-3 overflow-x-auto pb-2">
            {sections.length === 0 ? (
              <div className="flex items-center justify-center w-full h-20 text-sm text-gray-500 border-2 border-dashed border-gray-300 rounded-lg bg-white/50">
                No clips yet - waiting for generation...
              </div>
            ) : (
              sections.map((section, index) => (
                <TimelineClip
                  key={section.id}
                  section={section}
                  index={index}
                  isSelected={selectedSectionId === section.id}
                  onSelect={() => handleSelect(section)}
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

      {/* Voiceover Audio Track */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Mic className="w-5 h-5 text-blue-600" />
          <span className="text-sm font-semibold text-gray-900">Voiceover Audio</span>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <AudioWaveform
            audioUrl={voiceoverUrl || undefined}
            width={Math.max(audioWidth, 400)}
            height={48}
            currentTime={currentTime}
            duration={finalDuration}
          />
        </div>
      </div>

      {/* Captions Track */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Type className="w-5 h-5 text-green-600" />
          <span className="text-sm font-semibold text-gray-900">Captions</span>
          <Badge variant="outline" className="text-xs">{captions?.length || 0} segments</Badge>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <CaptionTimeline
            captions={captions || []}
            totalDuration={finalDuration}
            width={Math.max(audioWidth, 400)}
            height={48}
            currentTime={currentTime}
          />
        </div>
      </div>
    </div>
  );
}
