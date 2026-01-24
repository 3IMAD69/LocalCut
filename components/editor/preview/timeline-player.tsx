"use client";

import { Play } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import {
  type ClipTransform,
  type TimelineClipWithAsset,
  useTimelinePlayer,
  useTimelinePlayerTime,
} from "./timeline-player-context";
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
  onFullscreen: _onFullscreen,
  selectedClipId,
  onClipTransformChange,
}: TimelinePlayerProps) {
  const {
    canvasRef,
    canvasKey,
    state,
    tracks,
    play,
    pause,
    seek,
    renderFrame,
    setClipTransformOverride,
    clearClipTransformOverride,
    setVolume,
    setMuted,
    exportFrame,
  } = useTimelinePlayer();
  const currentTime = useTimelinePlayerTime();

  const containerRef = useRef<HTMLDivElement>(null);
  const videoAreaWrapperRef = useRef<HTMLDivElement>(null);
  const videoAreaRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const pendingTransformRef = useRef<ClipTransform | null>(null);
  const lastSelectedClipIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (
      lastSelectedClipIdRef.current &&
      lastSelectedClipIdRef.current !== selectedClipId
    ) {
      clearClipTransformOverride(lastSelectedClipIdRef.current);
    }

    lastSelectedClipIdRef.current = selectedClipId ?? null;
    pendingTransformRef.current = null;
  }, [clearClipTransformOverride, selectedClipId]);

  const getDisplayMapping = useCallback(() => {
    if (!videoAreaRef.current || !canvasRef.current) return null;

    const container = videoAreaRef.current.getBoundingClientRect();
    const outputWidth = canvasRef.current.width || 1920;
    const outputHeight = canvasRef.current.height || 1080;

    const scale = Math.min(
      container.width / outputWidth,
      container.height / outputHeight,
    );

    const displayWidth = outputWidth * scale;
    const displayHeight = outputHeight * scale;

    const offsetX = (container.width - displayWidth) / 2;
    const offsetY = (container.height - displayHeight) / 2;

    return {
      scale,
      offsetX,
      offsetY,
      outputWidth,
      outputHeight,
    };
  }, [canvasRef]);

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

  const [overlayRectState, setOverlayRectState] = useState<OverlayRect | null>(
    null,
  );

  const computeOverlayRect = useCallback((): OverlayRect | null => {
    if (!videoAreaRef.current) return null;

    const selected = findSelectedClip();
    if (!selected) return null;

    const mapping = getDisplayMapping();
    if (!mapping) return null;

    const { clip, sourceSize } = selected;

    // Only show overlay if the clip is currently visible.
    const clipEnd = clip.startTime + clip.duration;
    if (currentTime < clip.startTime || currentTime >= clipEnd) return null;

    // Compute where the video is drawn inside the container (object-contain).
    const { scale, offsetX, offsetY, outputWidth, outputHeight } = mapping;

    const transform = clip.transform ?? {
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
    };

    const rectWidth = sourceSize.width * transform.scaleX * scale;
    const rectHeight = sourceSize.height * transform.scaleY * scale;

    const baseX = (outputWidth - sourceSize.width) / 2 + transform.x;
    const baseY = (outputHeight - sourceSize.height) / 2 + transform.y;

    return {
      x: offsetX + baseX * scale,
      y: offsetY + baseY * scale,
      width: rectWidth,
      height: rectHeight,
    };
  }, [currentTime, findSelectedClip, getDisplayMapping]);

  useLayoutEffect(() => {
    if (!videoAreaRef.current) return;

    const update = () => {
      setOverlayRectState(computeOverlayRect());
    };

    update();

    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(videoAreaRef.current);
    window.addEventListener("resize", update);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [computeOverlayRect]);

  useLayoutEffect(() => {
    if (!videoAreaWrapperRef.current) return;

    const updateSize = () => {
      const rect = videoAreaWrapperRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0 || rect.height === 0) return;

      const aspect = 16 / 9;
      let width = rect.width;
      let height = rect.height;

      if (width / height > aspect) {
        width = height * aspect;
      } else {
        height = width / aspect;
      }

      setStageSize({ width, height });
    };

    updateSize();

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(videoAreaWrapperRef.current);
    window.addEventListener("resize", updateSize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, []);

  const handleOverlayMove = useCallback(
    ({ dx, dy }: { dx: number; dy: number }) => {
      if (!selectedClipId) return;
      const selected = findSelectedClip();
      if (!selected) return;

      const mapping = getDisplayMapping();
      if (!mapping) return;

      const { scale } = mapping;
      const normalizedDx = dx / scale;
      const normalizedDy = dy / scale;

      const current = selected.clip.transform ?? {
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
      };

      const baseTransform = pendingTransformRef.current ?? current;

      let newX = baseTransform.x + normalizedDx;
      let newY = baseTransform.y + normalizedDy;

      // Clamping Logic (1920x1080)
      const CANVAS_WIDTH = 1920;
      const CANVAS_HEIGHT = 1080;
      const { width: sourceW, height: sourceH } = selected.sourceSize;

      const currentW = sourceW * Math.abs(baseTransform.scaleX);
      const currentH = sourceH * Math.abs(baseTransform.scaleY);

      // The compositor centers the source, then adds offset (transform.x/y)
      // So AbsoluteLeft = (CanvasW - SourceW)/2 + transform.x
      // Wait: Compositor logic in timeline-player-context usually applies scale from center?
      // Let's assume standard behavior where visual bounding box is controlled by transform.
      // If the overlay rect uses:
      // baseX = (outputWidth - sourceSize.width) / 2 + transform.x;
      // This confirms transform.x is applied to the top-left of the unscaled source relative to the centered slot.
      // BUT if scaling is applied, where is the pivot?
      // The overlayRect calculation suggests scaling happens around the top-left of that positioned box?
      // rectWidth = sourceSize.width * transform.scaleX
      // Overlay X = offsetX + baseX * scale
      // This implies the visual box starts at `baseX`.
      // So `ActualLeft = (CANVAS_WIDTH - sourceW) / 2 + transform.x`.

      const baseX = (CANVAS_WIDTH - sourceW) / 2;
      const baseY = (CANVAS_HEIGHT - sourceH) / 2;

      // Calculate Clamped X
      const proposedLeft = baseX + newX;
      let clampedLeft = proposedLeft;

      if (currentW <= CANVAS_WIDTH) {
        // Must be fully contained [0, CANVAS_WIDTH - currentW]
        clampedLeft = Math.max(
          0,
          Math.min(CANVAS_WIDTH - currentW, proposedLeft),
        );
      } else {
        // Must cover the canvas (no empty space)
        // Left must be <= 0, and Right (Left + W) must be >= CANVAS_WIDTH
        // So Left must be >= CANVAS_WIDTH - currentW
        clampedLeft = Math.max(
          CANVAS_WIDTH - currentW,
          Math.min(0, proposedLeft),
        );
      }
      newX = clampedLeft - baseX;

      // Calculate Clamped Y
      const proposedTop = baseY + newY;
      let clampedTop = proposedTop;

      if (currentH <= CANVAS_HEIGHT) {
        clampedTop = Math.max(
          0,
          Math.min(CANVAS_HEIGHT - currentH, proposedTop),
        );
      } else {
        clampedTop = Math.max(
          CANVAS_HEIGHT - currentH,
          Math.min(0, proposedTop),
        );
      }
      newY = clampedTop - baseY;

      const nextTransform: ClipTransform = {
        ...baseTransform,
        x: newX,
        y: newY,
      };

      pendingTransformRef.current = nextTransform;
      setClipTransformOverride(selectedClipId, nextTransform);

      if (!state.playing) {
        void renderFrame(currentTime);
      }
    },
    [
      currentTime,
      findSelectedClip,
      getDisplayMapping,
      selectedClipId,
      renderFrame,
      setClipTransformOverride,
      state.playing,
    ],
  );

  const handleOverlayMoveEnd = useCallback(() => {
    if (!selectedClipId) return;
    const nextTransform = pendingTransformRef.current;

    if (nextTransform) {
      onClipTransformChange?.(selectedClipId, {
        x: nextTransform.x,
        y: nextTransform.y,
      });
    }

    clearClipTransformOverride(selectedClipId);
    pendingTransformRef.current = null;

    if (!state.playing) {
      void renderFrame(currentTime);
    }
  }, [
    clearClipTransformOverride,
    currentTime,
    onClipTransformChange,
    renderFrame,
    selectedClipId,
    state.playing,
  ]);

  // Handle play/pause
  const handlePlayPause = useCallback(() => {
    if (state.playing) {
      pause();
    } else {
      play();
    }
  }, [state.playing, play, pause]);

  // Screenshot
  const handleScreenshot = useCallback(async () => {
    const blob = await exportFrame();
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `frame-${currentTime.toFixed(2)}s.png`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [currentTime, exportFrame]);

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
            seek(Math.max(0, currentTime - 5));
          } else {
            seek(Math.max(0, currentTime - 1 / 30));
          }
          break;
        case "ArrowRight":
          e.preventDefault();
          if (e.shiftKey) {
            seek(Math.min(state.duration, currentTime + 5));
          } else {
            seek(Math.min(state.duration, currentTime + 1 / 30));
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
    handleScreenshot,
    seek,
    setVolume,
    setMuted,
    state.volume,
    state.muted,
    state.duration,
    currentTime,
  ]);

  // Check if timeline is empty
  const isEmpty = tracks.every((track) => track.clips.length === 0);

  return (
    <div
      ref={containerRef}
      className={cn("flex flex-col bg-background/50", className)}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/40 bg-muted/30">
        <span className="text-xs font-medium uppercase tracking-wide">
          Preview
        </span>
        <div className="flex items-center gap-2 text-xs font-medium">
          <span className="text-chart-1">{formatTime(currentTime)}</span>
          <span className="text-foreground/40">/</span>
          <span className="text-foreground/60">
            {formatTime(state.duration)}
          </span>
        </div>
      </div>

      {/* Video Canvas Area */}
      <div
        ref={videoAreaWrapperRef}
        className="relative flex-1 min-h-[300px] flex items-center justify-center"
      >
        <div
          ref={videoAreaRef}
          className="relative bg-black"
          style={
            stageSize
              ? {
                  width: `${stageSize.width}px`,
                  height: `${stageSize.height}px`,
                }
              : undefined
          }
        >
          {/* Canvas for compositor rendering - key ensures fresh element on remount */}
          <canvas
            key={canvasKey}
            ref={canvasRef}
            width={1920}
            height={1080}
            className={cn("w-full h-full block")}
          />

          <VideoTransformOverlay
            containerRef={videoAreaRef}
            rect={overlayRectState}
            isActive={!isEmpty && !!selectedClipId}
            onMove={handleOverlayMove}
            onMoveEnd={handleOverlayMoveEnd}
          />

          {/* Empty State Overlay */}
          {isEmpty && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center text-foreground/30">
                <div className="text-4xl mb-2">🎬</div>
                <p className="text-sm font-medium">Video Preview</p>
                <p className="text-xs">Add media to see preview</p>
              </div>
            </div>
          )}

          {/* Loading Overlay */}
          {state.loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="text-center text-white">
                <div className="animate-spin text-4xl mb-2">⏳</div>
                <p className="text-sm font-medium">Loading...</p>
              </div>
            </div>
          )}

          {/* Error Overlay */}
          {state.error && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-900/50">
              <div className="text-center text-white max-w-md px-4">
                <div className="text-4xl mb-2">⚠️</div>
                <p className="text-sm font-medium">Error</p>
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
      </div>
    </div>
  );
}
