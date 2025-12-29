"use client";

import { cn } from "@/lib/utils";

interface PlayheadProps {
  position: number;
  pixelsPerSecond: number;
  trackLabelWidth?: number;
  className?: string;
}

export function Playhead({
  position,
  pixelsPerSecond,
  trackLabelWidth = 96,
  className,
}: PlayheadProps) {
  const leftPosition = trackLabelWidth + position * pixelsPerSecond;

  return (
    <div
      className={cn(
        "absolute top-0 bottom-0 z-20 pointer-events-none",
        className,
      )}
      style={{ left: `${leftPosition}px` }}
    >
      {/* Playhead marker (triangle) */}
      <div
        className={cn(
          "absolute -top-1 -translate-x-1/2",
          "w-0 h-0",
          "border-l-[8px] border-l-transparent",
          "border-r-[8px] border-r-transparent",
          "border-t-[10px] border-t-chart-1",
        )}
      />

      {/* Playhead line */}
      <div className="absolute top-2 bottom-0 w-0.5 bg-chart-1 -translate-x-1/2" />
    </div>
  );
}
