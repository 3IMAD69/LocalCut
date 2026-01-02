"use client";

import MediaFox from "@mediafox/core";
import { Music } from "lucide-react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { CropOverlay, type CropRect } from "@/components/editing/crop-overlay";
import { createFilterPlugin } from "@/components/player/plugins/filter-plugin";
import {
  createRotatePlugin,
  type RotationDegrees,
} from "@/components/player/plugins/rotate-plugin";
import { cn } from "@/lib/utils";
import { FullscreenButton } from "./fullscreen-button";
import { PlayPauseButton } from "./play-pause-button";
import { TimeDisplay } from "./time-display";
import { type TrimRange, TrimSeekBar } from "./trim-seek-bar";
import { VolumeControl } from "./volume-control";

const Separator: React.FC = () => {
  return <div className="border-r-2 border-black h-12" />;
};

export interface MediaPlayerHandle {
  /** Scroll the player into view smoothly */
  scrollIntoView: () => void;
  /** Get the video container ref for overlay positioning */
  getContainerRef: () => React.RefObject<HTMLDivElement | null>;
}

interface EditableMediaPlayerProps {
  src: File | string;
  /** Whether crop mode is active */
  cropEnabled?: boolean;
  /** Callback when crop values change */
  onCropChange?: (crop: CropRect) => void;
  /** Initial crop values */
  initialCrop?: CropRect;
  /** Video dimensions (used for resolution display in crop overlay) */
  videoDimensions?: { width: number; height: number };
  /** Whether trim mode is active */
  trimEnabled?: boolean;
  /** Current trim range */
  trimRange?: TrimRange;
  /** Callback when trim range changes */
  onTrimChange?: (range: TrimRange) => void;
  /** Callback when crop should be disabled (e.g., when entering fullscreen) */
  onCropDisable?: () => void;
  /** Clockwise rotation applied in the MediaFox render pipeline (no CSS rotation). */
  rotateDegrees?: RotationDegrees;
  /** CSS filter string applied in the MediaFox render pipeline (e.g. "saturate(0)"). */
  videoFilter?: string;
}

export const EditableMediaPlayer = forwardRef<
  MediaPlayerHandle,
  EditableMediaPlayerProps
>(function EditableMediaPlayer(
  {
    src,
    cropEnabled = false,
    onCropChange,
    initialCrop,
    videoDimensions,
    trimEnabled = false,
    trimRange,
    onTrimChange,
    onCropDisable,
    rotateDegrees,
    videoFilter,
  },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [mediaFox, setMediaFox] = useState<MediaFox | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const rotatePluginRef = useRef(createRotatePlugin(0));
  const rotatePluginInstalledRef = useRef(false);

  const filterPluginRef = useRef(createFilterPlugin("none"));
  const filterPluginInstalledRef = useRef(false);

  const source = src;

  // Check if file is audio-only based on MIME type
  const isAudioOnly = useMemo(() => {
    if (typeof src === "string") {
      return false;
    } else if (src instanceof File) {
      return src.type.startsWith("audio/");
    }
    return false;
  }, [src]);

  const effectiveRotateDegrees: RotationDegrees = useMemo(() => {
    const requested = rotateDegrees ?? 0;
    return isAudioOnly ? 0 : requested;
  }, [rotateDegrees, isAudioOnly]);

  const effectiveVideoFilter = useMemo(() => {
    const requested = videoFilter ?? "none";
    return isAudioOnly ? "none" : requested;
  }, [videoFilter, isAudioOnly]);

  const displayDimensions = useMemo(() => {
    if (!videoDimensions) return null;

    const isQuarterTurn =
      effectiveRotateDegrees === 90 || effectiveRotateDegrees === 270;

    return {
      width: isQuarterTurn ? videoDimensions.height : videoDimensions.width,
      height: isQuarterTurn ? videoDimensions.width : videoDimensions.height,
    };
  }, [videoDimensions, effectiveRotateDegrees]);

  // Expose methods to parent via ref
  useImperativeHandle(
    ref,
    () => ({
      scrollIntoView: () => {
        containerRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      },
      getContainerRef: () => videoContainerRef,
    }),
    [],
  );

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

    const rotatePlugin = rotatePluginRef.current;
    const filterPlugin = filterPluginRef.current;
    const ensurePluginsAndLoad = async () => {
      try {
        if (!rotatePluginInstalledRef.current) {
          await mediaFox.use(rotatePlugin);
          rotatePluginInstalledRef.current = true;
        }

        if (!filterPluginInstalledRef.current) {
          await mediaFox.use(filterPlugin);
          filterPluginInstalledRef.current = true;
        }

        setIsLoaded(false);
        await mediaFox.load(source);
        setIsLoaded(true);
      } catch {
        // Keep existing UX (player will show Loading/error via other parts)
      }
    };

    ensurePluginsAndLoad();
  }, [source, mediaFox]);

  // Apply rotation to the player render pipeline (no CSS transform)
  useEffect(() => {
    rotatePluginRef.current.setDegrees(effectiveRotateDegrees);

    // Ensure the render target pixel buffer matches the rotated dimensions.
    // This prevents letterboxing when rotating 90°/270°.
    if (canvasRef.current && displayDimensions) {
      const nextWidth = displayDimensions.width;
      const nextHeight = displayDimensions.height;

      if (
        canvasRef.current.width !== nextWidth ||
        canvasRef.current.height !== nextHeight
      ) {
        canvasRef.current.width = nextWidth;
        canvasRef.current.height = nextHeight;
      }
    }

    // Force re-render of current frame when rotation changes while paused.
    // Seeking to the current time triggers MediaFox to re-decode and render
    // the frame with the updated rotation applied.
    if (mediaFox && isLoaded) {
      const currentTime = mediaFox.currentTime;
      mediaFox.seek(currentTime);
    }
  }, [effectiveRotateDegrees, displayDimensions, mediaFox, isLoaded]);

  // Apply filter to the player render pipeline (no CSS filter)
  // Debounce the seek to avoid lag during rapid filter changes (e.g., dragging slider)
  const filterSeekTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    filterPluginRef.current.setFilter(effectiveVideoFilter);

    // Clear any pending seek
    if (filterSeekTimeoutRef.current) {
      clearTimeout(filterSeekTimeoutRef.current);
    }

    // Force re-render of current frame when filter changes while paused.
    // Debounce to 100ms to avoid frame decoding on every slider tick.
    if (mediaFox && isLoaded) {
      filterSeekTimeoutRef.current = setTimeout(() => {
        const currentTime = mediaFox.currentTime;
        mediaFox.seek(currentTime);
        filterSeekTimeoutRef.current = null;
      }, 100);
    }

    return () => {
      if (filterSeekTimeoutRef.current) {
        clearTimeout(filterSeekTimeoutRef.current);
      }
    };
  }, [effectiveVideoFilter, mediaFox, isLoaded]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) {
      return;
    }

    if (!document.fullscreenElement) {
      // Disable crop before entering fullscreen
      if (cropEnabled && onCropDisable) {
        onCropDisable();
      }
      containerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, [cropEnabled, onCropDisable]);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNowFullscreen =
        document.fullscreenElement === containerRef.current;
      setIsFullscreen(isNowFullscreen);

      // If entering fullscreen and crop is enabled, disable crop
      if (isNowFullscreen && cropEnabled && onCropDisable) {
        onCropDisable();
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [cropEnabled, onCropDisable]);

  // Handle keyboard shortcuts for fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Spacebar for play/pause
      if (e.code === "Space") {
        e.preventDefault();
        if (mediaFox) {
          if (mediaFox.paused) {
            mediaFox.play();
          } else {
            mediaFox.pause();
          }
        }
        return;
      }

      // F key for fullscreen toggle
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();

        // If crop is enabled, disable it before going fullscreen
        if (!document.fullscreenElement && cropEnabled && onCropDisable) {
          onCropDisable();
        }

        toggleFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [cropEnabled, onCropDisable, toggleFullscreen, mediaFox]);

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
        ref={videoContainerRef}
        className={cn(
          "border-2",
          "rounded-md",
          "border-black",
          "overflow-hidden",
          "bg-black",
          "relative",
          isFullscreen &&
            "flex items-center justify-center flex-1 w-full border-0 rounded-none",
          cropEnabled && "ring-2 ring-main ring-offset-2",
          trimEnabled && !cropEnabled && "ring-2 ring-main ring-offset-2",
        )}
        style={
          !isFullscreen && displayDimensions
            ? {
                aspectRatio: `${displayDimensions.width} / ${displayDimensions.height}`,
              }
            : undefined
        }
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
            isFullscreen
              ? "max-w-full max-h-full w-auto h-auto"
              : "w-full h-full",
            isAudioOnly && "opacity-0 h-48",
          )}
        />

        {/* Crop Overlay */}
        {!isAudioOnly && (
          <CropOverlay
            containerRef={videoContainerRef}
            isActive={cropEnabled}
            onCropChange={onCropChange}
            initialCrop={initialCrop}
            videoDimensions={videoDimensions}
          />
        )}
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
            isFullscreen &&
              "w-full border-0 border-t-2 rounded-none border-b-0",
          )}
        >
          {/* Mobile SeekBar: Top row on mobile only */}
          <div
            className={cn(
              "w-full border-b-2 border-black flex items-center px-4 md:hidden",
              trimEnabled ? "h-20 pt-4" : "h-12",
            )}
          >
            <TrimSeekBar
              playerRef={mediaFox}
              trimEnabled={trimEnabled}
              trimRange={trimRange}
              onTrimChange={onTrimChange}
            />
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
            <div
              className={cn(
                "hidden md:flex flex-1 items-center min-w-0",
                trimEnabled && "pt-4",
              )}
            >
              <div className="px-4 shrink-0">
                <TimeDisplay playerRef={mediaFox} />
              </div>
              <div className="w-4" />
              <div className="flex-1">
                <TrimSeekBar
                  playerRef={mediaFox}
                  trimEnabled={trimEnabled}
                  trimRange={trimRange}
                  onTrimChange={onTrimChange}
                />
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
                disabled={cropEnabled}
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
});
