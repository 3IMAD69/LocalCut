"use client";

import { Film, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Playhead } from "./playhead";
import { TimelineRuler } from "./timeline-ruler";
import { type TimelineClip, TimelineTrack } from "./timeline-track";

interface Track {
  id: string;
  type: "video" | "audio";
  label: string;
  clips: TimelineClip[];
}

interface TimelineProps {
  tracks: Track[];
  currentTime: number;
  duration: number;
  onTimeChange?: (time: number) => void;
  onClipSelect?: (clipId: string) => void;
  className?: string;
}

// Empty timeline state
function TimelineEmptyOverlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      <div className="text-center">
        <div
          className={cn(
            "w-16 h-16 border-2 border-dashed border-border",
            "flex items-center justify-center mx-auto mb-3",
            "bg-secondary-background/50",
          )}
        >
          <Film className="h-8 w-8 text-foreground/30" />
        </div>
        <p className="text-sm font-heading text-foreground/40">
          No clips on timeline
        </p>
        <p className="text-xs text-foreground/30">
          Drag media from library or double-click to add
        </p>
      </div>
    </div>
  );
}

export function Timeline({
  tracks,
  currentTime,
  duration,
  onTimeChange,
  onClipSelect,
  className,
}: TimelineProps) {
  const [pixelsPerSecond, setPixelsPerSecond] = useState(50);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);

  const handleZoomIn = () => {
    setPixelsPerSecond((prev) => Math.min(prev * 1.5, 200));
  };

  const handleZoomOut = () => {
    setPixelsPerSecond((prev) => Math.max(prev / 1.5, 10));
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - 96; // Subtract track label width
    if (x >= 0) {
      const newTime = x / pixelsPerSecond;
      onTimeChange?.(Math.max(0, Math.min(newTime, duration)));
    }
  };

  const timelineWidth = duration * pixelsPerSecond + 96 + 100; // Extra padding at end

  // Check if timeline is empty (no clips in any track)
  const isEmpty = tracks.every((track) => track.clips.length === 0);

  return (
    <div
      className={cn(
        "flex flex-col border-2 border-border bg-background",
        className,
      )}
    >
      {/* Timeline Header with Controls */}
      <div className="flex items-center justify-between px-4 py-2 border-b-2 border-border bg-secondary-background">
        <div className="flex items-center gap-2">
          <span className="text-xs font-heading uppercase tracking-wide text-foreground/60">
            Timeline
          </span>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="noShadow"
            size="icon"
            className="h-7 w-7"
            onClick={handleZoomOut}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="text-xs font-heading w-12 text-center">
            {Math.round(pixelsPerSecond)}px/s
          </span>
          <Button
            variant="noShadow"
            size="icon"
            className="h-7 w-7"
            onClick={handleZoomIn}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Timeline Content */}
      <ScrollArea className="flex-1">
        <div
          role="slider"
          tabIndex={0}
          aria-label="Timeline"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={currentTime}
          className="relative min-h-[200px]"
          style={{ width: `${timelineWidth}px` }}
          onClick={handleTimelineClick}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") {
              onTimeChange?.(Math.max(0, currentTime - 1));
            } else if (e.key === "ArrowRight") {
              onTimeChange?.(Math.min(duration, currentTime + 1));
            }
          }}
        >
          {/* Ruler */}
          <TimelineRuler
            duration={duration}
            pixelsPerSecond={pixelsPerSecond}
          />

          {/* Tracks */}
          <div className="flex flex-col">
            {tracks.map((track) => (
              <TimelineTrack
                key={track.id}
                id={track.id}
                type={track.type}
                label={track.label}
                clips={track.clips}
                isSelected={selectedTrackId === track.id}
                onClipSelect={(clipId) => {
                  setSelectedTrackId(track.id);
                  onClipSelect?.(clipId);
                }}
                pixelsPerSecond={pixelsPerSecond}
              />
            ))}
          </div>

          {/* Empty state overlay */}
          {isEmpty && <TimelineEmptyOverlay />}

          {/* Playhead */}
          <Playhead position={currentTime} pixelsPerSecond={pixelsPerSecond} />
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
