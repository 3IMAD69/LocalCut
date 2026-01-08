"use client";

import { useCallback, useRef, useState } from "react";
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

export interface DragData {
  clipId: string;
  clip: TimelineClip;
  sourceTrackId: string;
  offsetX: number;
}

interface TimelineTrackProps {
  id: string;
  type: ClipType;
  label: string;
  clips: TimelineClip[];
  isSelected?: boolean;
  onClipSelect?: (clipId: string) => void;
  onClipMove?: (clipId: string, newStartTime: number) => void;
  onClipDragStart?: (dragData: DragData) => void;
  onClipDragEnd?: () => void;
  onClipDrop?: (
    clipId: string,
    newStartTime: number,
    targetTrackId: string,
  ) => void;
  draggedClip?: DragData | null;
  pixelsPerSecond: number;
}

export function TimelineTrack({
  id: trackId,
  type,
  label,
  clips,
  isSelected,
  onClipSelect,
  onClipMove,
  onClipDragStart,
  onClipDragEnd,
  onClipDrop,
  draggedClip,
  pixelsPerSecond,
}: TimelineTrackProps) {
  const [hoveredClip, setHoveredClip] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, startX: 0 });
  const [isDropTarget, setIsDropTarget] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const getClipStyle = (clip: TimelineClip) => {
    // If this clip is being dragged, apply the offset
    const offset = isDragging === clip.id ? dragOffset.x : 0;
    return {
      left: `${clip.startTime * pixelsPerSecond + offset}px`,
      width: `${clip.duration * pixelsPerSecond}px`,
    };
  };

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, clip: TimelineClip) => {
      // Don't start drag if clicking on trim handles
      const target = e.target as HTMLElement;
      if (
        target.dataset.handle === "left" ||
        target.dataset.handle === "right"
      ) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const clipLeftPx = clip.startTime * pixelsPerSecond;
      const mouseXInContainer = e.clientX - rect.left;
      const offsetWithinClip = mouseXInContainer - clipLeftPx;

      setIsDragging(clip.id);
      setDragOffset({ x: 0, startX: e.clientX });

      // Notify parent about drag start
      onClipDragStart?.({
        clipId: clip.id,
        clip,
        sourceTrackId: trackId,
        offsetX: offsetWithinClip,
      });

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - e.clientX;
        setDragOffset({ x: deltaX, startX: e.clientX });
      };

      const handleMouseUp = (upEvent: MouseEvent) => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);

        const deltaX = upEvent.clientX - e.clientX;
        const deltaTime = deltaX / pixelsPerSecond;
        const newStartTime = Math.max(0, clip.startTime + deltaTime);

        setIsDragging(null);
        setDragOffset({ x: 0, startX: 0 });
        onClipDragEnd?.();

        // Only trigger move if position actually changed
        if (Math.abs(deltaTime) > 0.01) {
          onClipMove?.(clip.id, newStartTime);
        }
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [pixelsPerSecond, onClipMove, onClipDragStart, onClipDragEnd, trackId],
  );

  // Handle drag over for cross-track drops
  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      // Only accept drops if the dragged clip matches this track type
      if (draggedClip && draggedClip.clip.type === type) {
        setIsDropTarget(true);
        e.dataTransfer.dropEffect = "move";
      }
    },
    [draggedClip, type],
  );

  const handleDragLeave = useCallback(() => {
    setIsDropTarget(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDropTarget(false);

      if (!draggedClip || draggedClip.clip.type !== type) return;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseXInContainer = e.clientX - rect.left;
      const newStartTime = Math.max(
        0,
        (mouseXInContainer - draggedClip.offsetX) / pixelsPerSecond,
      );

      onClipDrop?.(draggedClip.clipId, newStartTime, trackId);
    },
    [draggedClip, type, pixelsPerSecond, onClipDrop, trackId],
  );

  return (
    <section
      aria-label={`${label} track`}
      className={cn(
        "relative h-16 border-2 border-border bg-secondary-background",
        "flex items-center",
        isSelected && "ring-2 ring-main",
        isDropTarget && "ring-2 ring-chart-1 bg-chart-1/10",
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
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
      <div
        ref={containerRef}
        className="relative ml-24 h-full flex-1 overflow-hidden"
      >
        {clips.map((clip) => (
          <button
            type="button"
            key={clip.id}
            className={cn(
              "absolute top-1 bottom-1 text-left",
              "border-2 border-border",
              "cursor-grab select-none",
              "flex items-center",
              "transition-shadow duration-75",
              hoveredClip === clip.id && "ring-2 ring-main ring-offset-1",
              isDragging === clip.id &&
                "cursor-grabbing opacity-80 ring-2 ring-main shadow-lg z-50",
              type === "video" ? "bg-chart-2" : "bg-chart-3",
            )}
            style={getClipStyle(clip)}
            onClick={() => onClipSelect?.(clip.id)}
            onMouseDown={(e) => handleMouseDown(e, clip)}
            onMouseEnter={() => setHoveredClip(clip.id)}
            onMouseLeave={() => setHoveredClip(null)}
          >
            {/* Left Trim Handle */}
            <span
              data-handle="left"
              aria-hidden="true"
              className={cn(
                "absolute left-0 top-0 bottom-0 w-2",
                "bg-black/20 hover:bg-black/40",
                "cursor-ew-resize",
              )}
              onMouseDown={(e) => e.stopPropagation()}
            />

            {/* Clip Content */}
            <span className="flex-1 px-3 overflow-hidden pointer-events-none">
              <span className="text-xs font-heading text-main-foreground truncate block">
                {clip.name}
              </span>
            </span>

            {/* Right Trim Handle */}
            <span
              data-handle="right"
              aria-hidden="true"
              className={cn(
                "absolute right-0 top-0 bottom-0 w-2",
                "bg-black/20 hover:bg-black/40",
                "cursor-ew-resize",
              )}
              onMouseDown={(e) => e.stopPropagation()}
            />
          </button>
        ))}
      </div>
    </section>
  );
}
