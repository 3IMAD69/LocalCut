"use client";

import type MediaFox from "@mediafox/core";
import { useEffect, useState } from "react";

interface TimeDisplayProps {
  playerRef: MediaFox;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || !isFinite(seconds)) return "0:00";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }

  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export function TimeDisplay({ playerRef }: TimeDisplayProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const handleTimeUpdate = () => {
      setCurrentTime(playerRef.currentTime);
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
  }, [playerRef]);

  return (
    <div className="text-sm font-mono whitespace-nowrap">
      {formatTime(currentTime)} / {formatTime(duration)}
    </div>
  );
}
