"use client";

import { cn } from "@/lib/utils";
import MediaFox from "@mediafox/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
        "mx-auto"
      )}
    >
      <div
        className={cn(
          "border-2",
          "rounded-md",
          "border-black",
          "overflow-hidden",
          "bg-black"
        )}
      >
        <canvas
          ref={canvasRef}
          className={cn("w-full", "block", isFullscreen && "flex-1")}
        />
      </div>
      <div className="h-2" />
      {mediaFox && isLoaded ? (
        <div
          className={cn(
            "flex",
            "flex-row",
            "border-2",
            "border-b-4",
            "rounded-md",
            "border-black",
            "items-center",
            "bg-white"
          )}
        >
          <PlayPauseButton playerRef={mediaFox} />
          <Separator />
          <VolumeControl playerRef={mediaFox} />
          <Separator />
          <div className="w-4" />
          <TimeDisplay playerRef={mediaFox} />
          <div className="w-4" />
          <SeekBar playerRef={mediaFox} />
          <div className="w-4" />
          <Separator />
          <FullscreenButton
            isFullscreen={isFullscreen}
            onClick={toggleFullscreen}
          />
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
            "text-gray-500"
          )}
        >
          Loading player...
        </div>
      )}
    </div>
  );
}
