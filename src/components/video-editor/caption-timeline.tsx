interface CaptionTimelineProps {
  captions: Array<{
    start: number;
    end: number;
    text: string;
  }>;
  totalDuration: number;
  width: number;
  height: number;
  className?: string;
  currentTime?: number;
}

export function CaptionTimeline({
  captions,
  totalDuration,
  width,
  height,
  className = "",
  currentTime = 0,
}: CaptionTimelineProps) {
  if (!captions || captions.length === 0) {
    return (
      <div 
        className={`bg-gray-100 rounded flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <span className="text-xs text-gray-500">No captions</span>
      </div>
    );
  }

  const progressX = totalDuration > 0 ? (currentTime / totalDuration) * width : 0;

  return (
    <div 
      className={`relative bg-gray-50 rounded border overflow-hidden ${className}`}
      style={{ width, height }}
    >
      {captions.map((caption, index) => {
        const startX = (caption.start / totalDuration) * width;
        const captionWidth = ((caption.end - caption.start) / totalDuration) * width;
        const isActive = currentTime >= caption.start && currentTime <= caption.end;
        
        return (
          <div
            key={index}
            className={`absolute top-0 h-full border-l border-r border-gray-300 flex items-center px-1 text-xs font-medium transition-colors ${
              isActive 
                ? "bg-purple-200 text-purple-900 border-purple-400" 
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
            style={{
              left: startX,
              width: Math.max(captionWidth, 20), // Minimum width for visibility
            }}
            title={caption.text}
          >
            <span className="truncate">
              {caption.text}
            </span>
          </div>
        );
      })}
      
      {/* Progress line */}
      {progressX > 0 && (
        <div
          className="absolute top-0 h-full w-0.5 bg-purple-600 pointer-events-none z-10"
          style={{ left: progressX }}
        />
      )}
    </div>
  );
}