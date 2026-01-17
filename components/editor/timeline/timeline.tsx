"use client";

import { Film, Minus, Music, Plus, Video } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Playhead } from "./playhead";
import { TimelineRuler } from "./timeline-ruler";
import {
  type DragData,
  type TimelineClip,
  TimelineTrack,
} from "./timeline-track";

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
  onClipMove?: (
    clipId: string,
    newStartTime: number,
    sourceTrackId: string,
    targetTrackId: string,
  ) => void;
  onAddTrack?: (type: "video" | "audio") => void;
  onRemoveTrack?: (trackId: string) => void;
  className?: string;
}

// Empty timeline state
function TimelineEmptyOverlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      <div className="text-center">
        <div
          className={cn(
            "w-16 h-16 border border-dashed border-border rounded-lg",
            "flex items-center justify-center mx-auto mb-3",
            "bg-muted/50",
          )}
        >
          <Film className="h-8 w-8 text-foreground/30" />
        </div>
        <p className="text-sm font-medium text-foreground/40">
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
  onClipMove,
  onAddTrack,
  onRemoveTrack: _onRemoveTrack, // Reserved for future track deletion UI
  className,
}: TimelineProps) {
  const [pixelsPerSecond, setPixelsPerSecond] = useState(50);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [draggedClip, setDraggedClip] = useState<DragData | null>(null);

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
        "flex flex-col border border-border bg-background rounded-lg",
        className,
      )}
    >
      {/* Timeline Header with Controls */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted rounded-t-lg">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-foreground/60">
            Timeline
          </span>
          {/* Add Track Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1">
                <Plus className="h-3 w-3" />
                <span className="text-xs">Add Track</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => onAddTrack?.("video")}>
                <Video className="h-4 w-4 mr-2 text-chart-2" />
                Video Track
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddTrack?.("audio")}>
                <Music className="h-4 w-4 mr-2 text-chart-3" />
                Audio Track
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleZoomOut}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="text-xs font-medium w-12 text-center">
            {Math.round(pixelsPerSecond)}px/s
          </span>
          <Button
            variant="ghost"
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
                onClipMove={(clipId, newStartTime) => {
                  onClipMove?.(clipId, newStartTime, track.id, track.id);
                }}
                onClipDragStart={(dragData) => {
                  setDraggedClip(dragData);
                }}
                onClipDragEnd={() => {
                  setDraggedClip(null);
                }}
                onClipDrop={(clipId, newStartTime, targetTrackId) => {
                  if (draggedClip) {
                    onClipMove?.(
                      clipId,
                      newStartTime,
                      draggedClip.sourceTrackId,
                      targetTrackId,
                    );
                  }
                  setDraggedClip(null);
                }}
                draggedClip={draggedClip}
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
