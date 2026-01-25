"use client";

import { Eye, EyeOff, GripVertical } from "lucide-react";
import { motion } from "motion/react"; // Using motion v12
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import type { TimelineTrackData } from "../preview/timeline-player-context";

interface TrackDragOverlayProps {
  track: TimelineTrackData | null;
}

export function TrackDragOverlay({ track }: TrackDragOverlayProps) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(
    null,
  );

  useEffect(() => {
    if (!track) return;

    const handleDragOver = (e: DragEvent) => {
      // Update position based on cursor coordinates
      // Browsers fire dragover very frequently
      setPosition({ x: e.clientX, y: e.clientY });
    };

    // Also listen to drag end/drop to cleanup if needed, but unmounting does that
    window.addEventListener("dragover", handleDragOver);
    return () => {
      window.removeEventListener("dragover", handleDragOver);
    };
  }, [track]);

  if (!track || !position || typeof document === "undefined") return null;

  return createPortal(
    <motion.div
      initial={{ scale: 0.95, opacity: 0.8, rotate: -2 }}
      animate={{ scale: 1.05, opacity: 1, rotate: 2 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        // Using motion values would be even more performant but state is likely fine for this overlay
        x: position.x - 20,
        y: position.y - 28,
        width: 160,
        height: 56,
        zIndex: 99999,
        pointerEvents: "none",
        transformOrigin: "center center",
      }}
      className={cn(
        "flex items-center gap-2 px-2",
        "text-[11px] font-semibold uppercase tracking-wide",
        "bg-background border border-border/50",
        "rounded-lg shadow-2xl backdrop-blur-sm",
        "ring-2 ring-primary/20",
        track.type === "video"
          ? "border-l-4 border-l-chart-2"
          : "border-l-4 border-l-chart-3",
      )}
    >
      <div
        className={cn(
          "h-7 w-7 rounded-md border border-border/40",
          "bg-background/60 text-foreground/70",
          "flex items-center justify-center",
        )}
      >
        <GripVertical className="h-4 w-4" />
      </div>

      <span
        className={cn(
          "flex-1 min-w-0 truncate",
          track.type === "video" ? "text-chart-2" : "text-chart-3",
        )}
      >
        {track.label}
      </span>

      <div
        className={cn(
          "h-7 w-7 rounded-md border border-border/40",
          "bg-background/60 text-foreground/70",
          "flex items-center justify-center opacity-50",
        )}
      >
        {track.hidden ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </div>
    </motion.div>,
    document.body,
  );
}
