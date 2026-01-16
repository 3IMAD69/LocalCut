"use client";

import {
  Maximize,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { TimelineClipWithAsset } from "./timeline-player-context";
import { useTimelinePlayer } from "./timeline-player-context";
import {
  type OverlayRect,
  VideoTransformOverlay,
} from "./video-transform-overlay";

// ============================================================================
// Utilities
// ============================================================================

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
}

// ============================================================================
// Component Props
// ============================================================================

interface TimelinePlayerProps {
  className?: string;
  onFullscreen?: () => void;
  selectedClipId?: string | null;
  onClipTransformChange?: (
    clipId: string,
    transform: { x: number; y: number },
  ) => void;
}

// ============================================================================
// Main Component
// ============================================================================

export function TimelinePlayer({
  className,
  onFullscreen,
  selectedClipId,
  onClipTransformChange,
}: TimelinePlayerProps) {
  const {
    canvasRef,
    state,
    tracks,
    play,
    pause,
    seek,
    setVolume,
    setMuted,
    exportFrame,
  } = useTimelinePlayer();

  const containerRef = useRef<HTMLDivElement>(null);
  const videoAreaRef = useRef<HTMLDivElement>(null);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  const findSelectedClip = useCallback((): {
    clip: TimelineClipWithAsset;
    sourceSize: { width: number; height: number };
  } | null => {
    if (!selectedClipId) return null;

    for (const track of tracks) {
      if (track.type !== "video") continue;
      for (const clip of track.clips) {
        if (clip.id !== selectedClipId) continue;
        if (!clip.asset) return null;

        return {
          clip,
          sourceSize: {
            width: clip.asset.width ?? 1920,
            height: clip.asset.height ?? 1080,
          },
        };
      }
    }

    return null;
  }, [selectedClipId, tracks]);

  const overlayRect = useCallback((): OverlayRect | null => {
    if (!videoAreaRef.current) return null;

    const selected = findSelectedClip();
    if (!selected) return null;

    const { clip, sourceSize } = selected;

    // Only show overlay if the clip is currently visible.
    const clipEnd = clip.startTime + clip.duration;
    if (state.currentTime < clip.startTime || state.currentTime >= clipEnd)
      return null;

    // Compute where the video is drawn inside the container (object-contain).
    const container = videoAreaRef.current.getBoundingClientRect();
    const containerWidth = container.width;
    const containerHeight = container.height;

    const videoAspect = sourceSize.width / sourceSize.height;
    const containerAspect = containerWidth / containerHeight;

    const baseHeight =
      containerAspect > videoAspect
        ? containerHeight
        : containerWidth / videoAspect;
    const baseWidth = baseHeight * videoAspect;

    const offsetX = (containerWidth - baseWidth) / 2;
    const offsetY = (containerHeight - baseHeight) / 2;

    const transform = clip.transform ?? {
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
    };

    const rectWidth = baseWidth * transform.scaleX;
    const rectHeight = baseHeight * transform.scaleY;

    return {
      x: offsetX + (baseWidth - rectWidth) / 2 + transform.x,
      y: offsetY + (baseHeight - rectHeight) / 2 + transform.y,
      width: rectWidth,
      height: rectHeight,
    };
  }, [findSelectedClip, state.currentTime]);

  const handleOverlayMove = useCallback(
    ({ dx, dy }: { dx: number; dy: number }) => {
      if (!selectedClipId) return;
      const selected = findSelectedClip();
      if (!selected) return;

      const current = selected.clip.transform ?? {
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
      };

      onClipTransformChange?.(selectedClipId, {
        x: current.x + dx,
        y: current.y + dy,
      });
    },
    [findSelectedClip, onClipTransformChange, selectedClipId],
  );

  // Handle play/pause
  const handlePlayPause = useCallback(() => {
    if (state.playing) {
      pause();
    } else {
      play();
    }
  }, [state.playing, play, pause]);

  // Skip frames (5 seconds)
  const handleSkipBack = useCallback(() => {
    seek(Math.max(0, state.currentTime - 5));
  }, [seek, state.currentTime]);

  const handleSkipForward = useCallback(() => {
    seek(Math.min(state.duration, state.currentTime + 5));
  }, [seek, state.currentTime, state.duration]);

  // Frame-by-frame navigation (1/30 second per frame, assuming 30fps)
  const handleFrameBack = useCallback(() => {
    seek(Math.max(0, state.currentTime - 1 / 30));
  }, [seek, state.currentTime]);

  const handleFrameForward = useCallback(() => {
    seek(Math.min(state.duration, state.currentTime + 1 / 30));
  }, [seek, state.currentTime, state.duration]);

  // Fullscreen toggle
  const handleFullscreen = useCallback(() => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        containerRef.current.requestFullscreen();
      }
    }
    onFullscreen?.();
  }, [onFullscreen]);

  // Screenshot
  const handleScreenshot = useCallback(async () => {
    const blob = await exportFrame();
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `frame-${state.currentTime.toFixed(2)}s.png`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [exportFrame, state.currentTime]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if focused on an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case " ":
          e.preventDefault();
          handlePlayPause();
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (e.shiftKey) {
            handleSkipBack();
          } else {
            handleFrameBack();
          }
          break;
        case "ArrowRight":
          e.preventDefault();
          if (e.shiftKey) {
            handleSkipForward();
          } else {
            handleFrameForward();
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          setVolume(Math.min(1, state.volume + 0.1));
          break;
        case "ArrowDown":
          e.preventDefault();
          setVolume(Math.max(0, state.volume - 0.1));
          break;
        case "m":
        case "M":
          e.preventDefault();
          setMuted(!state.muted);
          break;
        case "f":
        case "F":
          e.preventDefault();
          handleFullscreen();
          break;
        case "s":
        case "S":
          if (e.ctrlKey || e.metaKey) {
            // Avoid conflict with save
            return;
          }
          e.preventDefault();
          handleScreenshot();
          break;
        case "Home":
          e.preventDefault();
          seek(0);
          break;
        case "End":
          e.preventDefault();
          seek(state.duration);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    handlePlayPause,
    handleSkipBack,
    handleSkipForward,
    handleFrameBack,
    handleFrameForward,
    handleFullscreen,
    handleScreenshot,
    seek,
    setVolume,
    setMuted,
    state.volume,
    state.muted,
    state.duration,
  ]);

  // Check if timeline is empty
  const isEmpty = tracks.every((track) => track.clips.length === 0);

  return (
    <TooltipProvider>
      <div
        ref={containerRef}
        className={cn(
          "flex flex-col border-2 border-border bg-background",
          className,
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b-2 border-border bg-secondary-background">
          <span className="text-xs font-heading uppercase tracking-wide">
            Preview
          </span>
          <div className="flex items-center gap-2 text-xs font-heading">
            <span className="text-chart-1">
              {formatTime(state.currentTime)}
            </span>
            <span className="text-foreground/40">/</span>
            <span className="text-foreground/60">
              {formatTime(state.duration)}
            </span>
          </div>
        </div>

        {/* Video Canvas Area */}
        <div
          ref={videoAreaRef}
          className="relative flex-1 bg-black min-h-[300px] flex items-center justify-center"
        >
          {/* Canvas for compositor rendering */}
          <canvas
            ref={canvasRef}
            className={cn(
              "aspect-video w-full max-w-full max-h-full",
              "border-2 border-border",
            )}
            style={{
              maxHeight: "100%",
              objectFit: "contain",
            }}
          />

          <VideoTransformOverlay
            containerRef={videoAreaRef}
            rect={overlayRect()}
            isActive={!isEmpty && !!selectedClipId}
            onMove={handleOverlayMove}
          />

          {/* Empty State Overlay */}
          {isEmpty && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center text-foreground/30">
                <div className="text-4xl mb-2">🎬</div>
                <p className="text-sm font-heading">Video Preview</p>
                <p className="text-xs">Add media to see preview</p>
              </div>
            </div>
          )}

          {/* Loading Overlay */}
          {state.loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="text-center text-white">
                <div className="animate-spin text-4xl mb-2">⏳</div>
                <p className="text-sm font-heading">Loading...</p>
              </div>
            </div>
          )}

          {/* Error Overlay */}
          {state.error && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-900/50">
              <div className="text-center text-white max-w-md px-4">
                <div className="text-4xl mb-2">⚠️</div>
                <p className="text-sm font-heading">Error</p>
                <p className="text-xs mt-1 opacity-80">{state.error.message}</p>
              </div>
            </div>
          )}

          {/* Center Play Button Overlay (only when paused and has content) */}
          {!isEmpty && !state.playing && (
            <button
              type="button"
              className={cn(
                "absolute inset-0 flex items-center justify-center",
                "bg-black/20 opacity-0 hover:opacity-100 transition-opacity",
                "cursor-pointer",
              )}
              onClick={handlePlayPause}
            >
              <div
                className={cn(
                  "w-16 h-16 rounded-full",
                  "border-4 border-white bg-black/50",
                  "flex items-center justify-center",
                )}
              >
                <Play className="h-8 w-8 text-white ml-1" />
              </div>
            </button>
          )}
        </div>

        {/* Seek Bar */}
        <div className="px-3 py-2 border-t-2 border-border bg-secondary-background">
          <Slider
            value={[state.currentTime]}
            onValueChange={([value]) => seek(value)}
            min={0}
            max={state.duration || 100}
            step={0.01}
            className="w-full"
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between px-3 py-2 border-t-2 border-border bg-secondary-background">
          {/* Left: Transport Controls */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="noShadow"
                  size="icon"
                  className="h-9 w-9"
                  onClick={handleSkipBack}
                >
                  <SkipBack className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Skip Back 5s (Shift+←)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  size="icon"
                  className="h-10 w-10"
                  onClick={handlePlayPause}
                >
                  {state.playing ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5 ml-0.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Play/Pause (Space)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="noShadow"
                  size="icon"
                  className="h-9 w-9"
                  onClick={handleSkipForward}
                >
                  <SkipForward className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Skip Forward 5s (Shift+→)</TooltipContent>
            </Tooltip>
          </div>

          {/* Right: Volume & Fullscreen */}
          <div className="flex items-center gap-2">
            {/* Volume Control */}
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="noShadow"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setMuted(!state.muted)}
                    onDoubleClick={() => setShowVolumeSlider(!showVolumeSlider)}
                  >
                    {state.muted || state.volume === 0 ? (
                      <VolumeX className="h-4 w-4" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Toggle Mute (M)</TooltipContent>
              </Tooltip>

              {showVolumeSlider && (
                <div className="flex items-center gap-2 px-2">
                  <Slider
                    value={[state.muted ? 0 : state.volume * 100]}
                    onValueChange={([value]) => {
                      setVolume(value / 100);
                      if (value > 0 && state.muted) {
                        setMuted(false);
                      }
                    }}
                    min={0}
                    max={100}
                    className="w-20"
                  />
                  <span className="text-xs w-8">
                    {Math.round(state.volume * 100)}%
                  </span>
                </div>
              )}
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="noShadow"
                  size="icon"
                  className="h-9 w-9"
                  onClick={handleFullscreen}
                >
                  <Maximize className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Fullscreen (F)</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
