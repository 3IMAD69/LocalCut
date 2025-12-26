"use client";

import type MediaFox from "@mediafox/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { Slider } from "@/components/ui/slider";

// Helper to set player properties (workaround for React Compiler)
function setPlayerCurrentTime(player: MediaFox, time: number) {
  player.currentTime = time;
}

interface SeekBarProps {
  playerRef: MediaFox;
}

export function SeekBar({ playerRef }: SeekBarProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  // Use a ref to track seeking state to avoid re-renders and race conditions
  const isSeekingRef = useRef(false);

  useEffect(() => {
    const handleTimeUpdate = () => {
      // Only update if not currently seeking to avoid UI jumps
      if (!isSeekingRef.current) {
        setCurrentTime(playerRef.currentTime);
      }
    };

    const handleDurationChange = () => {
      setDuration(playerRef.duration);
    };

    playerRef.on("timeupdate", handleTimeUpdate);
    playerRef.on("durationchange", handleDurationChange);

    // Initialize state
    setCurrentTime(playerRef.currentTime);
    setDuration(playerRef.duration);

    return () => {
      playerRef.off("timeupdate", handleTimeUpdate);
      playerRef.off("durationchange", handleDurationChange);
    };
  }, [playerRef]);

  const handleSeek = useCallback(
    (values: number[]) => {
      const newTime = values[0];
      isSeekingRef.current = true;
      setCurrentTime(newTime);
      // Seek immediately during drag for responsive feedback
      setPlayerCurrentTime(playerRef, newTime);
    },
    [playerRef],
  );

  const handleSeekEnd = useCallback(
    (values: number[]) => {
      const newTime = values[0];
      // Ensure final position is set
      setPlayerCurrentTime(playerRef, newTime);
      setCurrentTime(newTime);
      // Small delay before allowing timeupdate to take over again
      // This prevents the slider from jumping back momentarily
      requestAnimationFrame(() => {
        isSeekingRef.current = false;
      });
    },
    [playerRef],
  );

  return (
    <div className="flex-1">
      <Slider
        value={[currentTime]}
        onValueChange={handleSeek}
        onValueCommit={handleSeekEnd}
        max={duration}
        step={0.1}
        className="cursor-pointer"
      />
    </div>
  );
}
