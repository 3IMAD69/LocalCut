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
  },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
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
