"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type ClipType = "video" | "audio";

export interface TimelineClip {
  id: string;
  name: string;
  type: ClipType;
  startTime: number;
  duration: number;
  color: string;
  thumbnail?: string;
}

interface TimelineTrackProps {
  id: string;
  type: ClipType;
  label: string;
  clips: TimelineClip[];
  isSelected?: boolean;
  onClipSelect?: (clipId: string) => void;
  onClipMove?: (clipId: string, newStartTime: number) => void;
  pixelsPerSecond: number;
}

export function TimelineTrack({
  type,
  label,
  clips,
  isSelected,
  onClipSelect,
  pixelsPerSecond,
}: TimelineTrackProps) {
  const [hoveredClip, setHoveredClip] = useState<string | null>(null);

  const getClipStyle = (clip: TimelineClip) => ({
    left: `${clip.startTime * pixelsPerSecond}px`,
    width: `${clip.duration * pixelsPerSecond}px`,
  });

  return (
    <div
      className={cn(
        "relative h-16 border-2 border-border bg-secondary-background",
        "flex items-center",
        isSelected && "ring-2 ring-main",
      )}
    >
      {/* Track Label */}
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 w-24 z-10",
          "flex items-center justify-center",
          "border-r-2 border-border",
          "bg-background font-heading text-xs uppercase tracking-wide",
          type === "video" ? "text-chart-2" : "text-chart-3",
        )}
      >
        {label}
      </div>

      {/* Clips Container */}
      <div className="relative ml-24 h-full flex-1 overflow-hidden">
        {clips.map((clip) => (
          <button
            type="button"
            key={clip.id}
            className={cn(
              "absolute top-1 bottom-1 text-left",
              "border-2 border-border",
              "cursor-pointer select-none",
              "flex items-center",
              "transition-all duration-75",
              hoveredClip === clip.id && "ring-2 ring-main ring-offset-1",
              type === "video" ? "bg-chart-2" : "bg-chart-3",
            )}
            style={getClipStyle(clip)}
            onClick={() => onClipSelect?.(clip.id)}
            onMouseEnter={() => setHoveredClip(clip.id)}
            onMouseLeave={() => setHoveredClip(null)}
          >
            {/* Left Trim Handle */}
            <div
              className={cn(
                "absolute left-0 top-0 bottom-0 w-2",
                "bg-black/20 hover:bg-black/40",
                "cursor-ew-resize",
              )}
            />

            {/* Clip Content */}
            <div className="flex-1 px-3 overflow-hidden">
              <span className="text-xs font-heading text-main-foreground truncate block">
                {clip.name}
              </span>
            </div>

            {/* Right Trim Handle */}
            <div
              className={cn(
                "absolute right-0 top-0 bottom-0 w-2",
                "bg-black/20 hover:bg-black/40",
                "cursor-ew-resize",
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
