"use client";

import { Slider } from "@/components/ui/slider";
import type MediaFox from "@mediafox/core";
import { useCallback, useEffect, useState } from "react";

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
  const [isSeeking, setIsSeeking] = useState(false);

  useEffect(() => {
    const handleTimeUpdate = () => {
      if (!isSeeking) {
        setCurrentTime(playerRef.currentTime);
      }
    };

    const handleDurationChange = () => {
      setDuration(playerRef.duration);
    };

    playerRef.on("timeupdate", handleTimeUpdate);
    playerRef.on("durationchange", handleDurationChange);

    // Initialize state asynchronously
    const timeoutId = setTimeout(() => {
      setCurrentTime(playerRef.currentTime);
      setDuration(playerRef.duration);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      playerRef.off("timeupdate", handleTimeUpdate);
      playerRef.off("durationchange", handleDurationChange);
    };
  }, [playerRef, isSeeking]);

  const handleSeek = useCallback((values: number[]) => {
    const newTime = values[0];
    setCurrentTime(newTime);
    setIsSeeking(true);
  }, []);

  const handleSeekEnd = useCallback(
    (values: number[]) => {
      setPlayerCurrentTime(playerRef, values[0]);
      setIsSeeking(false);
    },
    [playerRef]
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
