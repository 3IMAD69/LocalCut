"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import type MediaFox from "@mediafox/core";
import React, { useEffect, useState } from "react";
import { IsMutedIcon, NotMutedIcon } from "./icons";

// Helper to set player properties (workaround for React Compiler)
function setPlayerVolume(player: MediaFox, volume: number) {
  player.volume = volume;
}

function setPlayerMuted(player: MediaFox, muted: boolean) {
  player.muted = muted;
}

interface VolumeControlProps {
  playerRef: MediaFox;
}

export function VolumeControl({ playerRef }: VolumeControlProps) {
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const onVolumeChange = () => {
      setVolume(playerRef.volume);
      setIsMuted(playerRef.muted);
    };

    playerRef.on("volumechange", onVolumeChange);

    // Initialize
    onVolumeChange();

    return () => {
      playerRef.off("volumechange", onVolumeChange);
    };
  }, [playerRef]);

  const iconStyle: React.CSSProperties = {
    width: 20,
  };

  return (
    <div className="flex items-center">
      <button
        type="button"
        className="appearance-none border-none rounded-none bg-none flex justify-center items-center px-3 md:px-5 cursor-pointer h-12 text-black hover:bg-black/5 transition-colors"
        onClick={() => {
          setPlayerMuted(playerRef, !playerRef.muted);
        }}
      >
        {isMuted ? (
          <IsMutedIcon style={iconStyle} />
        ) : (
          <NotMutedIcon style={iconStyle} />
        )}
      </button>

      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="h-8 px-1 md:px-2 text-[10px] md:text-xs font-mono cursor-pointer bg-transparent border-none"
          >
            {Math.round(volume * 100)}%
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-40">
          <div className="flex items-center gap-2">
            <Slider
              value={[volume * 100]}
              onValueChange={(values) => {
                const newVolume = values[0] / 100;
                setPlayerVolume(playerRef, newVolume);
                if (newVolume === 0) {
                  setPlayerMuted(playerRef, true);
                } else if (playerRef.muted) {
                  setPlayerMuted(playerRef, false);
                }
              }}
              max={100}
              step={1}
              className="flex-1"
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
