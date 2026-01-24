"use client";

import { Film, Music } from "lucide-react";
import type { TimelineTrackData } from "@/components/editor/preview/timeline-player-context";
import { cn } from "@/lib/utils";
import type { DragState } from "./hooks/use-cross-track-drag";

export interface GhostTrackOverlayProps {
  dragState: DragState;
  tracks: TimelineTrackData[];
  rowHeight: number;
  timeAreaHeight: number;
  rowOffset: number;
  pixelsPerSecond: number;
  labelWidth: number;
  scrollTop: number;
}

/**
 * Visual overlay that shows where a clip will be dropped during cross-track drag.
 * Displays a ghost indicator on the target track with the clip's position.
 *
 * Styled to match professional video editors like Premiere and Final Cut:
 * - Semi-transparent ghost showing the clip outline
 * - Color coding for valid/invalid drop zones
 * - Smooth animations for track highlighting
 */
export function GhostTrackOverlay({
  dragState,
  tracks,
  rowHeight,
  timeAreaHeight,
  rowOffset,
  pixelsPerSecond,
  labelWidth,
  scrollTop,
}: GhostTrackOverlayProps) {
  const {
    isDragging,
    draggedActionId,
    sourceTrackId,
    targetTrackId,
    dropTime,
    isValidDrop,
  } = dragState;

  // Don't render if not dragging or no target track
  if (!isDragging || !draggedActionId || !targetTrackId) {
    return null;
  }

  // Find the action being dragged
  let draggedClip: TimelineTrackData["clips"][number] | null = null;
  let sourceTrackType: "video" | "audio" | null = null;

  for (const track of tracks) {
    const clip = track.clips.find((c) => c.id === draggedActionId);
    if (clip) {
      draggedClip = clip;
      sourceTrackType = track.type;
      break;
    }
  }

  if (!draggedClip) return null;

  const targetTrack = tracks.find((t) => t.id === targetTrackId);
  if (!targetTrack) return null;

  const targetTrackIndex = tracks.findIndex((t) => t.id === targetTrackId);
  const isNewTrack = sourceTrackId !== targetTrackId;
  const isTypeMatch = sourceTrackType === targetTrack.type;

  // Calculate ghost position
  const ghostTop =
    timeAreaHeight + rowOffset + targetTrackIndex * rowHeight - scrollTop;
  const ghostLeft =
    labelWidth + (dropTime ?? draggedClip.startTime) * pixelsPerSecond;
  const ghostWidth = draggedClip.duration * pixelsPerSecond;

  // Determine ghost styling based on validity
  const canDrop = isValidDrop && isTypeMatch;

  return (
    <div
      className="absolute inset-0 pointer-events-none z-30"
      aria-hidden="true"
    >
      {/* Track highlight - shows which track is being targeted */}
      {isNewTrack && (
        <div
          className={cn(
            "absolute left-0 right-0 transition-all duration-150 ease-out",
            canDrop
              ? "bg-primary/10 border-y-2 border-primary/30"
              : "bg-destructive/10 border-y-2 border-destructive/30",
          )}
          style={{
            top: ghostTop,
            height: rowHeight,
          }}
        />
      )}

      {/* Ghost clip indicator */}
      {isNewTrack && (
        <div
          className={cn(
            "absolute rounded-md border-2 border-dashed",
            "flex items-center gap-2 px-3",
            "transition-all duration-100 ease-out",
            canDrop
              ? "bg-primary/20 border-primary/60 shadow-lg shadow-primary/20"
              : "bg-destructive/20 border-destructive/60 shadow-lg shadow-destructive/20",
          )}
          style={{
            top: ghostTop + 4,
            left: ghostLeft,
            width: Math.max(60, ghostWidth),
            height: rowHeight - 8,
          }}
        >
          {/* Icon */}
          {sourceTrackType === "video" ? (
            <Film
              className={cn(
                "h-4 w-4 shrink-0",
                canDrop ? "text-primary" : "text-destructive",
              )}
            />
          ) : (
            <Music
              className={cn(
                "h-4 w-4 shrink-0",
                canDrop ? "text-primary" : "text-destructive",
              )}
            />
          )}

          {/* Clip name */}
          <span
            className={cn(
              "text-xs font-medium truncate",
              canDrop ? "text-primary" : "text-destructive",
            )}
          >
            {draggedClip.name}
          </span>
        </div>
      )}

      {/* Drop zone indicator line */}
      {isNewTrack && canDrop && dropTime !== null && (
        <div
          className="absolute w-0.5 bg-primary shadow-lg"
          style={{
            top: ghostTop,
            left: ghostLeft,
            height: rowHeight,
            boxShadow: "0 0 8px var(--primary)",
          }}
        />
      )}

      {/* Invalid drop feedback tooltip */}
      {isNewTrack && !canDrop && (
        <div
          className={cn(
            "absolute px-2 py-1 rounded-md text-xs font-medium",
            "bg-destructive text-destructive-foreground shadow-lg",
            "animate-in fade-in-50 slide-in-from-bottom-2 duration-150",
          )}
          style={{
            top: ghostTop - 28,
            left: ghostLeft,
          }}
        >
          {!isTypeMatch
            ? `Can't move ${sourceTrackType} to ${targetTrack.type} track`
            : "Overlaps with existing clip"}
        </div>
      )}
    </div>
  );
}
