"use client";

import { cn } from "@/lib/utils";

interface TimelineRulerProps {
  duration: number;
  pixelsPerSecond: number;
  className?: string;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function TimelineRuler({
  duration,
  pixelsPerSecond,
  className,
}: TimelineRulerProps) {
  // Calculate tick interval based on zoom level
  const getTickInterval = () => {
    if (pixelsPerSecond >= 100) return 1;
    if (pixelsPerSecond >= 50) return 2;
    if (pixelsPerSecond >= 25) return 5;
    if (pixelsPerSecond >= 10) return 10;
    return 30;
  };

  const tickInterval = getTickInterval();
  const ticks: number[] = [];

  for (let i = 0; i <= duration; i += tickInterval) {
    ticks.push(i);
  }

  return (
    <div
      className={cn(
        "relative h-8 border border-border bg-background",
        "flex items-end",
        className,
      )}
    >
      {/* Empty space for track labels */}
      <div className="w-24 h-full border-r border-border flex items-center justify-center">
        <span className="text-xs font-medium text-foreground/60">TIME</span>
      </div>

      {/* Ruler ticks */}
      <div className="relative flex-1 h-full">
        {ticks.map((tick) => (
          <div
            key={tick}
            className="absolute bottom-0 flex flex-col items-center"
            style={{ left: `${tick * pixelsPerSecond}px` }}
          >
            <span className="text-[10px] font-medium text-foreground mb-1">
              {formatTime(tick)}
            </span>
            <div className="w-0.5 h-2 bg-border" />
          </div>
        ))}
      </div>
    </div>
  );
}
