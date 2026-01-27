"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type ClipType = "video" | "audio" | "image";

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
  onClipDragStart,
  onClipDragEnd,
  onClipDrop,
  draggedClip,
  pixelsPerSecond,
}: TimelineTrackProps) {
  const [hoveredClip, setHoveredClip] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [isDropTarget, setIsDropTarget] = useState(false);
  const [dropPosition, setDropPosition] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check if this track can accept the dragged clip (type must match)
  const canAcceptDrop = draggedClip ? draggedClip.clip.type === type : false;

  const getClipStyle = (clip: TimelineClip) => {
    return {
      left: `${clip.startTime * pixelsPerSecond}px`,
      width: `${clip.duration * pixelsPerSecond}px`,
    };
  };

  // Handle drag over for cross-track drops
  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();

      // Check if the dragged clip matches this track type
      if (draggedClip && canAcceptDrop) {
        setIsDropTarget(true);
        e.dataTransfer.dropEffect = "move";

        // Calculate and show drop position preview
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          const mouseXInContainer = e.clientX - rect.left;
          const previewPosition = Math.max(
            0,
            (mouseXInContainer - draggedClip.offsetX) / pixelsPerSecond,
          );
          setDropPosition(previewPosition);
        }
      } else if (draggedClip) {
        // Show "not allowed" cursor for incompatible track types
        e.dataTransfer.dropEffect = "none";
      }
    },
    [draggedClip, canAcceptDrop, pixelsPerSecond],
  );

  const handleDragLeave = useCallback(() => {
    setIsDropTarget(false);
    setDropPosition(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDropTarget(false);
      setDropPosition(null);

      if (!draggedClip || !canAcceptDrop) return;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseXInContainer = e.clientX - rect.left;
      const newStartTime = Math.max(
        0,
        (mouseXInContainer - draggedClip.offsetX) / pixelsPerSecond,
      );

      onClipDrop?.(draggedClip.clipId, newStartTime, trackId);
    },
    [draggedClip, canAcceptDrop, pixelsPerSecond, onClipDrop, trackId],
  );

  // HTML5 Drag handlers for clips
  const handleClipDragStart = useCallback(
    (e: React.DragEvent, clip: TimelineClip) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const clipLeftPx = clip.startTime * pixelsPerSecond;
      const mouseXInContainer = e.clientX - rect.left;
      const offsetWithinClip = mouseXInContainer - clipLeftPx;

      // Set drag data
      e.dataTransfer.effectAllowed = "move";
      // Some browsers require at least one data item to start a drag.
      e.dataTransfer.setData(
        "application/json",
        JSON.stringify({ clipId: clip.id, type: clip.type }),
      );
      e.dataTransfer.setData("text/plain", clip.id);

      // Hide the native browser drag preview (blue drag image) by using a
      // transparent 1x1 image as the drag image.
      const transparentImg = new Image();
      transparentImg.src =
        "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
      e.dataTransfer.setDragImage(transparentImg, 0, 0);

      setIsDragging(clip.id);

      // Notify parent about drag start
      onClipDragStart?.({
        clipId: clip.id,
        clip,
        sourceTrackId: trackId,
        offsetX: offsetWithinClip,
      });
    },
    [pixelsPerSecond, onClipDragStart, trackId],
  );

  const handleClipDragEnd = useCallback(() => {
    setIsDragging(null);
    onClipDragEnd?.();
  }, [onClipDragEnd]);

  return (
    <section
      aria-label={`${label} track`}
      className={cn(
        "relative h-16 border border-border bg-muted rounded-md",
        "flex items-center transition-colors duration-150",
        isSelected && "ring-2 ring-primary",
        // Valid drop target - green highlight
        isDropTarget &&
          canAcceptDrop &&
          "ring-2 ring-green-500 bg-green-500/10",
        // Invalid drop target - red highlight (dragging incompatible clip type)
        draggedClip && !canAcceptDrop && "bg-red-500/5 opacity-60",
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Track Label */}
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 w-24 z-10 rounded-l-md",
          "flex items-center justify-center",
          "border-r border-border",
          "bg-background font-medium text-xs uppercase tracking-wide",
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
        {/* Drop position preview indicator */}
        {isDropTarget && dropPosition !== null && draggedClip && (
          <div
            className={cn(
              "absolute top-1 bottom-1 pointer-events-none",
              "border-2 border-dashed border-green-500 bg-green-500/20",
              "rounded-sm",
            )}
            style={{
              left: `${dropPosition * pixelsPerSecond}px`,
              width: `${draggedClip.clip.duration * pixelsPerSecond}px`,
            }}
          />
        )}

        {clips.map((clip) => (
          <button
            type="button"
            key={clip.id}
            draggable
            className={cn(
              "absolute top-1 bottom-1 text-left rounded-sm",
              "border border-border",
              "cursor-grab select-none",
              "flex items-center",
              "transition-shadow duration-75",
              hoveredClip === clip.id && "ring-2 ring-primary ring-offset-1",
              isDragging === clip.id &&
                "cursor-grabbing opacity-50 ring-2 ring-primary shadow-lg z-50",
              type === "video" ? "bg-chart-2" : "bg-chart-3",
            )}
            style={getClipStyle(clip)}
            onClick={() => onClipSelect?.(clip.id)}
            onDragStart={(e) => handleClipDragStart(e, clip)}
            onDragEnd={handleClipDragEnd}
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
              <span className="text-xs font-medium text-primary-foreground truncate block">
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
