"use client";

import { VideoSection } from "@/types/video";
import { Loader2, Trash2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimelineClipProps {
  section: VideoSection;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}

export function TimelineClip({
  section,
  index,
  isSelected,
  onSelect,
  onDelete,
  draggable = true,
  onDragStart,
  onDragOver,
  onDrop,
}: TimelineClipProps) {
  const isLoading = !section.clip_url;
  const hasError = !!section.clip_error;
  const duration = section.target_seconds || 5;

  const width = Math.max(duration * 40, 80);

  return (
    <div
      draggable={draggable && !isLoading}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={onSelect}
      className={cn(
        "relative flex items-center justify-between gap-2 rounded-md border-2 transition-all cursor-pointer group",
        "hover:border-purple-400",
        isSelected && "border-purple-600 ring-2 ring-purple-300",
        !isSelected && !hasError && "border-gray-300",
        hasError && "border-red-400 bg-red-50",
        isLoading && "bg-gray-100 border-gray-200",
        !isLoading && !hasError && "bg-white"
      )}
      style={{ width: `${width}px`, minHeight: "60px" }}
    >
      {draggable && !isLoading && (
        <div className="absolute left-1 top-1/2 -translate-y-1/2 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
          <GripVertical className="w-4 h-4" />
        </div>
      )}

      <div className="flex-1 px-3 py-2 min-w-0">
        {isLoading && (
          <div className="flex flex-col items-center justify-center gap-1">
            <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
            <span className="text-xs text-gray-500">Generating...</span>
          </div>
        )}

        {hasError && (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-red-600">Error</span>
            <span className="text-xs text-red-500 truncate">
              {section.clip_error}
            </span>
          </div>
        )}

        {!isLoading && !hasError && (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-700 truncate">
              {section.title}
            </span>
            <span className="text-xs text-gray-500">{duration}s</span>
          </div>
        )}
      </div>

      {!isLoading && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}

      <div className="absolute -top-2 -left-2 w-5 h-5 bg-purple-600 text-white text-xs rounded-full flex items-center justify-center font-medium">
        {index + 1}
      </div>
    </div>
  );
}
