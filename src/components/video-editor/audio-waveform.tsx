"use client";

import { useRef, useEffect, useState } from "react";

interface AudioWaveformProps {
  audioUrl?: string;
  width: number;
  height: number;
  className?: string;
  currentTime?: number;
  duration?: number;
}

export function AudioWaveform({
  audioUrl,
  width,
  height,
  className = "",
  currentTime = 0,
  duration = 0,
}: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Generate waveform data from audio
  useEffect(() => {
    if (!audioUrl) return;

    const generateWaveform = async () => {
      setIsLoading(true);
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Get audio data from first channel
        const rawData = audioBuffer.getChannelData(0);
        const samples = Math.floor(width / 2); // Sample every 2 pixels for better performance
        const blockSize = Math.floor(rawData.length / samples);
        const filteredData: number[] = [];

        // Downsample and get peak values for each block
        for (let i = 0; i < samples; i++) {
          const start = i * blockSize;
          const end = Math.min(start + blockSize, rawData.length);
          let sum = 0;
          let max = 0;

          for (let j = start; j < end; j++) {
            const value = Math.abs(rawData[j]);
            sum += value;
            max = Math.max(max, value);
          }

          // Use RMS (root mean square) for better visual representation
          const rms = Math.sqrt(sum / (end - start));
          filteredData.push(Math.max(rms, max * 0.3)); // Blend RMS with peak for better visualization
        }

        setWaveformData(filteredData);
        audioContext.close();
      } catch (error) {
        console.error("Error generating waveform:", error);
        // Generate dummy waveform data as fallback
        const dummyData = Array.from({ length: Math.floor(width / 2) }, () => 
          Math.random() * 0.3 + 0.1
        );
        setWaveformData(dummyData);
      } finally {
        setIsLoading(false);
      }
    };

    generateWaveform();
  }, [audioUrl, width]);

  // Draw waveform on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || waveformData.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    const barWidth = width / waveformData.length;
    const progressX = duration > 0 ? (currentTime / duration) * width : 0;

    waveformData.forEach((amplitude, index) => {
      const barHeight = amplitude * height * 0.8; // Scale to 80% of height
      const x = index * barWidth;
      const y = (height - barHeight) / 2;
      
      // Different colors for played vs unplayed sections
      const isPlayed = x < progressX;
      ctx.fillStyle = isPlayed ? "#8b5cf6" : "#e5e7eb"; // Purple for played, gray for unplayed
      
      ctx.fillRect(x, y, barWidth - 1, barHeight);
    });

    // Draw progress line
    if (progressX > 0) {
      ctx.strokeStyle = "#6366f1";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(progressX, 0);
      ctx.lineTo(progressX, height);
      ctx.stroke();
    }
  }, [waveformData, width, height, currentTime, duration]);

  if (!audioUrl) {
    return (
      <div 
        className={`bg-gray-100 rounded flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <span className="text-xs text-gray-500">No audio</span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div 
        className={`bg-gray-100 rounded flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={`rounded ${className}`}
    />
  );
}