"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause, Square, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface VideoPreviewProps {
  videoUrl?: string | null;
  className?: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
}

export function VideoPreview({ videoUrl, className, onTimeUpdate }: VideoPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState([100]);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (onTimeUpdate) {
        onTimeUpdate(video.currentTime, video.duration);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
    };
  }, [videoUrl]);

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };

  const handleStop = () => {
    const video = videoRef.current;
    if (!video) return;

    video.pause();
    video.currentTime = 0;
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const handleReverse = () => {
    const video = videoRef.current;
    if (!video) return;

    // Simple reverse: go back 5 seconds
    video.currentTime = Math.max(0, video.currentTime - 5);
  };

  const handleSeek = (newTime: number[]) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = newTime[0];
    setCurrentTime(newTime[0]);
  };

  const handleVolumeChange = (newVolume: number[]) => {
    const video = videoRef.current;
    if (!video) return;

    const volumeLevel = newVolume[0] / 100;
    video.volume = volumeLevel;
    setVolume(newVolume);
    setIsMuted(volumeLevel === 0);
  };

  const handleMuteToggle = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isMuted) {
      video.volume = volume[0] / 100;
      setIsMuted(false);
    } else {
      video.volume = 0;
      setIsMuted(true);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  if (!videoUrl) {
    return (
      <div className={cn(
        "flex flex-col bg-black rounded-lg overflow-hidden",
        className
      )}>
        <div className="flex-1 flex items-center justify-center text-white/50">
          <div className="text-center">
            <Play className="w-12 h-12 mx-auto mb-2" />
            <p className="text-sm">No video to preview yet</p>
            <p className="text-xs text-white/30 mt-1">
              Video will appear as sections generate
            </p>
          </div>
        </div>
        <div className="p-3 bg-gray-900 border-t border-gray-700">
          <div className="flex items-center gap-2">
            <Button size="sm" disabled variant="ghost" className="text-gray-500">
              <Play className="w-4 h-4" />
            </Button>
            <Button size="sm" disabled variant="ghost" className="text-gray-500">
              <Square className="w-4 h-4" />
            </Button>
            <Button size="sm" disabled variant="ghost" className="text-gray-500">
              <RotateCcw className="w-4 h-4" />
            </Button>
            <div className="text-xs text-gray-500 ml-2">0:00 / 0:00</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex flex-col bg-black rounded-lg overflow-hidden",
      className
    )}>
      {/* Video */}
      <div className="flex-1 relative">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-contain"
          playsInline
        />
        {/* Overlay play button when paused */}
        {!isPlaying && (
          <button
            onClick={handlePlayPause}
            className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors"
          >
            <div className="p-4 bg-black/50 rounded-full">
              <Play className="w-8 h-8 text-white" />
            </div>
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="p-3 bg-gray-900 border-t border-gray-700 space-y-2">
        {/* Progress bar */}
        {duration > 0 && (
          <div className="space-y-1">
            <Slider
              value={[currentTime]}
              max={duration}
              step={0.1}
              onValueChange={handleSeek}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        )}

        {/* Control buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handlePlayPause}
              variant="ghost"
              className="text-white hover:bg-gray-700"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>
            <Button
              size="sm"
              onClick={handleStop}
              variant="ghost"
              className="text-white hover:bg-gray-700"
            >
              <Square className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              onClick={handleReverse}
              variant="ghost"
              className="text-white hover:bg-gray-700"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>

          {/* Volume control */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleMuteToggle}
              variant="ghost"
              className="text-white hover:bg-gray-700"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </Button>
            <div className="w-20">
              <Slider
                value={volume}
                max={100}
                step={1}
                onValueChange={handleVolumeChange}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}