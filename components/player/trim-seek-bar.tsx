"use client";

import type MediaFox from "@mediafox/core";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Helper to set player properties (workaround for React Compiler)
function setPlayerCurrentTime(player: MediaFox, time: number) {
  player.currentTime = time;
}

export interface TrimRange {
  start: number;
  end: number;
}

interface TrimSeekBarProps {
  playerRef: MediaFox;
  /** Whether trim mode is active */
  trimEnabled?: boolean;
  /** Current trim range */
  trimRange?: TrimRange;
  /** Callback when trim range changes */
  onTrimChange?: (range: TrimRange) => void;
}

// Format time for display
function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function TrimSeekBar({
  playerRef,
  trimEnabled = false,
  trimRange,
  onTrimChange,
}: TrimSeekBarProps) {
  const [currentTime, setCurrentTime] = useState(
    () => playerRef.currentTime || 0,
  );
  const [duration, setDuration] = useState(() => playerRef.duration || 0);
  const isSeekingRef = useRef(false);
  const lastSeekedTimeRef = useRef<number | null>(null);

  // Initialize trim range when enabled and no range exists
  const hasInitializedRef = useRef(false);
  useEffect(() => {
    if (
      trimEnabled &&
      duration > 0 &&
      !trimRange &&
      !hasInitializedRef.current
    ) {
      hasInitializedRef.current = true;
      onTrimChange?.({ start: 0, end: duration });
    }
    if (!trimEnabled) {
      hasInitializedRef.current = false;
    }
  }, [trimEnabled, duration, trimRange, onTrimChange]);

  useEffect(() => {
    const handleTimeUpdate = () => {
      if (!isSeekingRef.current) {
        const time = playerRef.currentTime;
        setCurrentTime(time);

        // Constrain playback within trim range when trim is enabled
        if (trimEnabled && duration > 0 && trimRange) {
          // If we've reached or passed the end, stop and seek back to start
          if (time >= trimRange.end) {
            playerRef.pause();
            setPlayerCurrentTime(playerRef, trimRange.start);
          }
        }
      }
    };

    const handleDurationChange = () => {
      const newDuration = playerRef.duration;
      if (newDuration > 0) {
        setDuration(newDuration);
      }
    };

    playerRef.on("timeupdate", handleTimeUpdate);
    playerRef.on("durationchange", handleDurationChange);

    return () => {
      playerRef.off("timeupdate", handleTimeUpdate);
      playerRef.off("durationchange", handleDurationChange);
    };
  }, [playerRef, trimEnabled, trimRange, duration]);

  // Handle regular seek
  const handleSeek = useCallback(
    (values: number[]) => {
      const newTime = values[0];
      isSeekingRef.current = true;
      setCurrentTime(newTime);
      lastSeekedTimeRef.current = newTime;
      setPlayerCurrentTime(playerRef, newTime);
    },
    [playerRef],
  );

  const handleSeekEnd = useCallback(
    (values: number[]) => {
      const newTime = values[0];
      if (lastSeekedTimeRef.current !== newTime) {
        setPlayerCurrentTime(playerRef, newTime);
        setCurrentTime(newTime);
      }
      lastSeekedTimeRef.current = null;
      requestAnimationFrame(() => {
        isSeekingRef.current = false;
      });
    },
    [playerRef],
  );

  // Handle trim range slider changes (dual-thumb)
  const handleTrimSliderChange = useCallback(
    (values: number[]) => {
      const [start, end] = values;
      onTrimChange?.({ start, end });
    },
    [onTrimChange],
  );

  const handleTrimSliderCommit = useCallback(
    (values: number[]) => {
      const [start] = values;
      // Seek to start position when done dragging
      setPlayerCurrentTime(playerRef, start);
      setCurrentTime(start);
    },
    [playerRef],
  );

  // Effective trim values
  const effectiveStart = trimRange?.start ?? 0;
  const effectiveEnd = trimRange?.end ?? duration;

  // Calculate percentages for visual elements
  const trimStartPercent = duration > 0 ? (effectiveStart / duration) * 100 : 0;
  const trimEndPercent = duration > 0 ? (effectiveEnd / duration) * 100 : 100;
  const currentTimePercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!trimEnabled) {
    // Regular seek bar without trim
    return (
      <div className="flex-1">
        <SliderPrimitive.Root
          value={[currentTime]}
          onValueChange={handleSeek}
          onValueCommit={handleSeekEnd}
          max={duration || 100}
          step={0.01}
          className={cn(
            "relative flex w-full touch-none select-none items-center cursor-pointer",
          )}
        >
          <SliderPrimitive.Track className="relative w-full grow overflow-hidden rounded-full bg-muted border border-border h-3">
            <SliderPrimitive.Range className="absolute bg-primary h-full" />
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-border bg-white ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
        </SliderPrimitive.Root>
      </div>
    );
  }

  // Trim-enabled seek bar with start/end handles
  return (
    <div className="flex-1 flex flex-col gap-2">
      {/* Main trim slider with dual thumbs */}
      <div className="relative">
        <SliderPrimitive.Root
          value={[effectiveStart, effectiveEnd]}
          onValueChange={handleTrimSliderChange}
          onValueCommit={handleTrimSliderCommit}
          min={0}
          max={duration || 100}
          step={0.01}
          minStepsBetweenThumbs={1}
          className="relative flex w-full touch-none select-none items-center cursor-pointer h-8"
        >
          <SliderPrimitive.Track className="relative w-full grow overflow-hidden rounded-md bg-muted border border-border h-4">
            {/* Excluded regions (darker) */}
            <div
              className="absolute h-full bg-black/30 dark:bg-black/50"
              style={{ left: 0, width: `${trimStartPercent}%` }}
            />
            <div
              className="absolute h-full bg-black/30 dark:bg-black/50"
              style={{ left: `${trimEndPercent}%`, right: 0 }}
            />
            {/* Active trim region */}
            <SliderPrimitive.Range className="absolute bg-primary/40 h-full" />
          </SliderPrimitive.Track>

          {/* Start thumb */}
          <SliderPrimitive.Thumb className="block w-3 h-8 rounded-l-md bg-primary border border-border cursor-ew-resize hover:bg-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 shadow-md">
            <div className="flex items-center justify-center h-full">
              <div className="w-0.5 h-4 bg-black/40 rounded-full" />
            </div>
          </SliderPrimitive.Thumb>

          {/* End thumb */}
          <SliderPrimitive.Thumb className="block w-3 h-8 rounded-r-md bg-primary border border-border cursor-ew-resize hover:bg-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 shadow-md">
            <div className="flex items-center justify-center h-full">
              <div className="w-0.5 h-4 bg-black/40 rounded-full" />
            </div>
          </SliderPrimitive.Thumb>
        </SliderPrimitive.Root>

        {/* Current playback position indicator */}
        <div
          className="absolute top-0 w-0.5 h-8 bg-black dark:bg-white pointer-events-none z-10"
          style={{
            left: `${currentTimePercent}%`,
            transform: "translateX(-50%)",
          }}
        />
      </div>

      {/* Time labels */}
      <div className="flex justify-between text-xs text-foreground/60 px-1">
        <div className="flex items-center gap-1">
          <span className="font-semibold text-primary">Start:</span>
          <span className="font-mono">{formatTime(effectiveStart)}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-semibold">Duration:</span>
          <span className="font-mono text-primary">
            {formatTime(effectiveEnd - effectiveStart)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-semibold text-primary">End:</span>
          <span className="font-mono">{formatTime(effectiveEnd)}</span>
        </div>
      </div>
    </div>
  );
}
