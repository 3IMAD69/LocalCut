"use client";

import MediaFox from "@mediafox/core";
import { Music } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { FullscreenButton } from "./fullscreen-button";
import { PlayPauseButton } from "./play-pause-button";
import { SeekBar } from "./seek-bar";
import { TimeDisplay } from "./time-display";
import { VolumeControl } from "./volume-control";

const Separator: React.FC = () => {
  return <div className="border-r-2 border-black h-12" />;
};

interface MediaPlayerProps {
  src: File | string;
}

export function MediaPlayer({ src }: MediaPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mediaFox, setMediaFox] = useState<MediaFox | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);

  const source = useMemo(() => {
    if (typeof src === "string") {
      return src;
    }
    return src;
  }, [src]);

  // Check if file is audio-only based on MIME type
  const isAudioOnly = useMemo(() => {
    if (typeof src === "string") {
      return false;
    } else if (src instanceof File) {
      return src.type.startsWith("audio/");
    }
    return false;
  }, [src]);

  // Reset loaded state when source changes
  if (currentSrc !== src) {
    setCurrentSrc(src);
    setIsLoaded(false);
  }

  // Initialize MediaFox player
  useEffect(() => {
    const player = new MediaFox();

    // Use setTimeout to avoid sync setState warning
    const timeoutId = setTimeout(() => {
      setMediaFox(player);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      player.dispose();
    };
  }, []);

  // Load source when player is ready
  useEffect(() => {
    if (!mediaFox || !canvasRef.current) return;

    mediaFox.setRenderTarget(canvasRef.current);

    mediaFox.load(source).then(() => {
      setIsLoaded(true);
    });
  }, [source, mediaFox]);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) {
      return;
    }

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex",
        "flex-col",
        "group",
        "relative",
        "w-full",
        "max-w-3xl",
        "mx-auto",
        isFullscreen && "max-w-none h-screen bg-black",
      )}
    >
      <div
        className={cn(
          "border-2",
          "rounded-md",
          "border-black",
          "overflow-hidden",
          "bg-black",
          "relative",
          isFullscreen && "flex items-center justify-center flex-1 w-full border-0 rounded-none",
        )}
      >
        {/* Audio-only visual placeholder */}
        {isAudioOnly && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-zinc-800 to-zinc-900 z-10">
            <div className="rounded-full bg-zinc-700 p-6 mb-4">
              <Music className="size-12 text-zinc-400" />
            </div>
            <p className="text-zinc-400 text-sm">Audio File</p>
          </div>
        )}
        <canvas
          ref={canvasRef}
          className={cn(
            "block",
            isFullscreen ? "max-w-full max-h-full w-auto h-auto" : "w-full",
            isAudioOnly && "opacity-0 h-48",
          )}
        />
      </div>
      <div className={cn("h-2", isFullscreen && "hidden")} />
      {mediaFox && isLoaded ? (
        <div
          className={cn(
            "flex",
            "flex-col md:flex-row",
            "border-2",
            "border-b-4",
            "rounded-md",
            "border-black",
            "bg-white",
            "overflow-hidden",
            isFullscreen && "w-full border-0 border-t-2 rounded-none border-b-0",
          )}
        >
          {/* Mobile SeekBar: Top row on mobile only */}
          <div className="w-full h-12 border-b-2 border-black flex items-center px-4 md:hidden">
            <SeekBar playerRef={mediaFox} />
          </div>

          {/* Main Controls Row */}
          <div className="flex flex-1 items-center min-w-0">
            <div className="flex items-center shrink-0">
              <PlayPauseButton playerRef={mediaFox} />
              <Separator />
              <VolumeControl playerRef={mediaFox} />
              <Separator />
            </div>

            {/* Desktop Time + SeekBar */}
            <div className="hidden md:flex flex-1 items-center min-w-0">
              <div className="px-4 shrink-0">
                <TimeDisplay playerRef={mediaFox} />
              </div>
              <div className="w-4" />
              <div className="flex-1">
                <SeekBar playerRef={mediaFox} />
              </div>
              <div className="w-4" />
              <Separator />
            </div>

            {/* Mobile Time: Centered in the remaining space */}
            <div className="flex md:hidden flex-1 items-center justify-center px-1 min-w-0">
              <TimeDisplay playerRef={mediaFox} />
            </div>

            <div className="md:hidden">
              <Separator />
            </div>

            <div className="shrink-0">
              <FullscreenButton
                isFullscreen={isFullscreen}
                onClick={toggleFullscreen}
              />
            </div>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "flex",
            "flex-row",
            "border-2",
            "border-b-4",
            "rounded-md",
            "border-black",
            "items-center",
            "justify-center",
            "bg-white",
            "h-14",
            "text-sm",
            "text-gray-500",
          )}
        >
          Loading player...
        </div>
      )}
    </div>
  );
}
