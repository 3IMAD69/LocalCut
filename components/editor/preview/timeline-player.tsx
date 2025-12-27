"use client";

import { cn } from "@/lib/utils";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize,
  Film,
  Loader2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import MediaFox from "@mediafox/core";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTimelinePlayer } from "./timeline-player-context";

interface TimelinePlayerProps {
  className?: string;
  onFullscreen?: () => void;
}

function formatTime(seconds: number): string {
  if (Number.isNaN(seconds) || !Number.isFinite(seconds)) return "00:00.00";

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
}

// Empty state when no clips are on timeline
function EmptyPreview() {
  return (
    <div
      className={cn(
        "absolute inset-0 flex flex-col items-center justify-center",
        "bg-gradient-to-br from-zinc-900 to-zinc-800"
      )}
    >
      <div
        className={cn(
          "w-20 h-20 border-4 border-border bg-main/20",
          "flex items-center justify-center mb-4"
        )}
      >
        <Film className="h-10 w-10 text-foreground/30" />
      </div>
      <p className="text-sm font-heading text-foreground/40">Video Preview</p>
      <p className="text-xs text-foreground/30 mt-1">
        Add clips to timeline to preview
      </p>
    </div>
  );
}

// Loading state
function LoadingOverlay() {
  return (
    <div
      className={cn(
        "absolute inset-0 flex flex-col items-center justify-center",
        "bg-black/60 backdrop-blur-sm z-20"
      )}
    >
      <Loader2 className="h-8 w-8 animate-spin text-main mb-2" />
      <p className="text-sm font-heading text-foreground/60">
        Loading media...
      </p>
    </div>
  );
}

export function TimelinePlayer({
  className,
  onFullscreen,
}: TimelinePlayerProps) {
  const {
    state,
    tracks,
    activeVideoClip,
    activeAudioClips,
    togglePlayPause,
    seek,
    skipForward,
    skipBackward,
    setVolume,
    toggleMute,
    canvasRef,
    syncTimeFromMedia,
    setLoading,
    setError,
  } = useTimelinePlayer();

  const containerRef = useRef<HTMLDivElement>(null);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Single video player instance
  const videoPlayerRef = useRef<MediaFox | null>(null);
  const videoLoadedAssetRef = useRef<string | null>(null);

  // Single audio player instance (for primary audio)
  const audioPlayerRef = useRef<MediaFox | null>(null);
  const audioLoadedAssetRef = useRef<string | null>(null);

  // Sync loop ref
  const syncLoopRef = useRef<number | null>(null);
  const lastSyncTimeRef = useRef(0);

  // Check if timeline has any clips
  const hasClips = tracks.some((track) => track.clips.length > 0);

  // Get current video and audio info
  const videoAsset = activeVideoClip?.clip.asset;
  const videoMediaTime = activeVideoClip?.mediaTime ?? 0;
  const videoClipStartTime = activeVideoClip?.clip.startTime ?? 0;
  const videoTrimStart = activeVideoClip?.clip.trimStart ?? 0;

  // First active audio clip
  const firstAudioClip = activeAudioClips[0];
  const audioAsset = firstAudioClip?.clip.asset;
  const audioMediaTime = firstAudioClip?.mediaTime ?? 0;

  // Compute effective volume
  const effectiveVolume = state.isMuted ? 0 : state.volume;

  // Track if players are initialized
  const videoInitRef = useRef(false);
  const audioInitRef = useRef(false);

  // Initialize video player once
  useEffect(() => {
    if (videoInitRef.current) return;
    videoInitRef.current = true;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const player = new MediaFox({
      // volume: 1, // Default volume, will be updated by volume sync effect
      renderer: "webgl", // Use WebGL for better performance
    });

    videoPlayerRef.current = player;

    // Set render target
    player
      .setRenderTarget(canvas)
      .catch((err: Error) =>
        console.error("Failed to set video render target:", err)
      );

    return () => {
      player.dispose();
      videoPlayerRef.current = null;
      videoInitRef.current = false;
    };
  }, [canvasRef]);

  // Initialize audio player once
  useEffect(() => {
    if (audioInitRef.current) return;
    audioInitRef.current = true;

    const player = new MediaFox({
      volume: 1, // Default volume, will be updated by volume sync effect
      renderer: "webgl",
    });

    audioPlayerRef.current = player;

    return () => {
      player.dispose();
      audioPlayerRef.current = null;
      audioInitRef.current = false;
    };
  }, []);

  // Set render target when canvas is available
  useEffect(() => {
    const player = videoPlayerRef.current;
    const canvas = canvasRef.current;

    if (player && canvas) {
      player
        .setRenderTarget(canvas)
        .catch((err: Error) =>
          console.error("Failed to set render target:", err)
        );
    }
  }, [canvasRef]);

  // Load video when asset changes
  useEffect(() => {
    const player = videoPlayerRef.current;
    if (!player) return;

    if (!videoAsset?.file) {
      // Stop current video when no active video clip
      if (videoLoadedAssetRef.current) {
        player.pause();
        videoLoadedAssetRef.current = null;
      }
      // Clear canvas when no video
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#000";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }
      return;
    }

    // Only load if asset changed
    if (videoAsset.id === videoLoadedAssetRef.current) {
      return;
    }

    videoLoadedAssetRef.current = videoAsset.id;
    setLoading(true);

    player
      .load(videoAsset.file)
      .then(() => {
        setLoading(false);
        setError(null);
        // Seek to correct position after loading
        player.seek(videoMediaTime).catch(() => {});
      })
      .catch((err: Error) => {
        setLoading(false);
        setError(err.message || "Failed to load video");
        videoLoadedAssetRef.current = null;
      });
  }, [videoAsset, videoMediaTime, canvasRef, setLoading, setError]);

  // Load audio when asset changes
  useEffect(() => {
    const player = audioPlayerRef.current;
    if (!player) return;

    if (!audioAsset?.file) {
      // Stop current audio when no active audio clip
      if (audioLoadedAssetRef.current) {
        player.pause();
        audioLoadedAssetRef.current = null;
      }
      return;
    }

    // Only load if asset changed
    if (audioAsset.id === audioLoadedAssetRef.current) {
      return;
    }

    audioLoadedAssetRef.current = audioAsset.id;

    player
      .load(audioAsset.file)
      .then(() => {
        // Seek to correct position after loading
        player.seek(audioMediaTime).catch(() => {});
      })
      .catch((err: Error) => {
        console.error("Failed to load audio:", err);
        audioLoadedAssetRef.current = null;
      });
  }, [audioAsset, audioMediaTime]);

  // Sync playback state (play/pause)
  useEffect(() => {
    const videoPlayer = videoPlayerRef.current;
    const audioPlayer = audioPlayerRef.current;

    if (state.isPlaying) {
      if (videoPlayer?.paused && videoLoadedAssetRef.current) {
        videoPlayer.play().catch(() => {});
      }
      if (audioPlayer?.paused && audioLoadedAssetRef.current) {
        audioPlayer.play().catch(() => {});
      }
    } else {
      if (videoPlayer && !videoPlayer.paused) {
        videoPlayer.pause();
      }
      if (audioPlayer && !audioPlayer.paused) {
        audioPlayer.pause();
      }
    }
  }, [state.isPlaying]);

  // Sync volume
  useEffect(() => {
    const videoPlayer = videoPlayerRef.current;
    const audioPlayer = audioPlayerRef.current;

    if (videoPlayer) {
      videoPlayer.volume = effectiveVolume;
    }
    if (audioPlayer) {
      audioPlayer.volume = effectiveVolume;
    }
  }, [effectiveVolume]);

  // Sync position when timeline time changes significantly (seeking/scrubbing)
  useEffect(() => {
    const videoPlayer = videoPlayerRef.current;
    const audioPlayer = audioPlayerRef.current;

    const timeDiff = Math.abs(state.currentTime - lastSyncTimeRef.current);

    // Only sync if significant time jump (scrubbing/seeking) or paused
    if (timeDiff > 0.15 || !state.isPlaying) {
      if (videoPlayer && videoLoadedAssetRef.current) {
        const currentDiff = Math.abs(videoPlayer.currentTime - videoMediaTime);
        if (currentDiff > 0.1) {
          videoPlayer.seek(videoMediaTime).catch(() => {});
        }
      }

      if (audioPlayer && audioLoadedAssetRef.current) {
        const currentDiff = Math.abs(audioPlayer.currentTime - audioMediaTime);
        if (currentDiff > 0.1) {
          audioPlayer.seek(audioMediaTime).catch(() => {});
        }
      }
    }

    lastSyncTimeRef.current = state.currentTime;
  }, [state.currentTime, state.isPlaying, videoMediaTime, audioMediaTime]);

  // Get first audio clip info for sync
  const audioClipStartTime = firstAudioClip?.clip.startTime ?? 0;
  const audioTrimStart = firstAudioClip?.clip.trimStart ?? 0;

  // Sync timeline from media player during playback
  useEffect(() => {
    if (!state.isPlaying) {
      if (syncLoopRef.current !== null) {
        cancelAnimationFrame(syncLoopRef.current);
        syncLoopRef.current = null;
      }
      return;
    }

    const syncLoop = () => {
      const videoPlayer = videoPlayerRef.current;
      const audioPlayer = audioPlayerRef.current;

      // Prefer video for sync if available, otherwise use audio
      if (videoPlayer && videoLoadedAssetRef.current && activeVideoClip) {
        const clipTime = videoPlayer.currentTime - videoTrimStart;
        const timelineTime = videoClipStartTime + clipTime;
        syncTimeFromMedia(timelineTime);
      } else if (audioPlayer && audioLoadedAssetRef.current && firstAudioClip) {
        // Sync from audio when no video is playing
        const clipTime = audioPlayer.currentTime - audioTrimStart;
        const timelineTime = audioClipStartTime + clipTime;
        syncTimeFromMedia(timelineTime);
      }

      syncLoopRef.current = requestAnimationFrame(syncLoop);
    };

    syncLoopRef.current = requestAnimationFrame(syncLoop);

    return () => {
      if (syncLoopRef.current !== null) {
        cancelAnimationFrame(syncLoopRef.current);
        syncLoopRef.current = null;
      }
    };
  }, [
    state.isPlaying,
    activeVideoClip,
    firstAudioClip,
    videoClipStartTime,
    videoTrimStart,
    audioClipStartTime,
    audioTrimStart,
    syncTimeFromMedia,
  ]);

  // Handle fullscreen
  const handleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }

    onFullscreen?.();
  }, [onFullscreen]);

  // Handle keyboard shortcuts
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
          togglePlayPause();
          break;
        case "ArrowLeft":
          e.preventDefault();
          skipBackward(e.shiftKey ? 10 : 1);
          break;
        case "ArrowRight":
          e.preventDefault();
          skipForward(e.shiftKey ? 10 : 1);
          break;
        case "f":
        case "F":
          e.preventDefault();
          handleFullscreen();
          break;
        case "m":
        case "M":
          e.preventDefault();
          toggleMute();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    togglePlayPause,
    skipBackward,
    skipForward,
    toggleMute,
    handleFullscreen,
  ]);

  // Track fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Handle seek from slider
  const handleSeek = useCallback(
    (values: number[]) => {
      seek(values[0]);
    },
    [seek]
  );

  return (
    <TooltipProvider>
      <div
        ref={containerRef}
        className={cn(
          "flex flex-col border-2 border-border bg-background",
          isFullscreen && "fixed inset-0 z-50 border-0",
          className
        )}
      >
        {/* Header */}
        <div
          className={cn(
            "flex items-center justify-between px-3 py-2",
            "border-b-2 border-border bg-secondary-background",
            isFullscreen && "hidden"
          )}
        >
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
          className={cn(
            "relative flex-1 bg-black min-h-[300px] flex items-center justify-center",
            isFullscreen && "min-h-0"
          )}
        >
          {/* Canvas for video rendering */}
          <canvas
            ref={canvasRef}
            className={cn(
              "aspect-video w-full max-w-full max-h-full",
              "border-2 border-border",
              isFullscreen && "border-0",
              !hasClips && "hidden"
            )}
            width={1920}
            height={1080}
          />

          {/* Empty state */}
          {!hasClips && <EmptyPreview />}

          {/* Loading overlay */}
          {state.isLoading && hasClips && <LoadingOverlay />}

          {/* Error display */}
          {state.error && (
            <div className="absolute bottom-4 left-4 right-4 bg-red-500/90 text-white px-3 py-2 text-sm font-heading border-2 border-black">
              {state.error}
            </div>
          )}

          {/* Center Play Button Overlay */}
          {hasClips && !state.isLoading && (
            <button
              type="button"
              className={cn(
                "absolute inset-0 flex items-center justify-center",
                "bg-black/20 opacity-0 hover:opacity-100 transition-opacity",
                "cursor-pointer"
              )}
              onClick={togglePlayPause}
            >
              <div
                className={cn(
                  "w-16 h-16 border-4 border-white bg-black/50",
                  "flex items-center justify-center"
                )}
              >
                {state.isPlaying ? (
                  <Pause className="h-8 w-8 text-white" />
                ) : (
                  <Play className="h-8 w-8 text-white ml-1" />
                )}
              </div>
            </button>
          )}

          {/* Active clip info */}
          {activeVideoClip && (
            <div
              className={cn(
                "absolute top-2 left-2 px-2 py-1",
                "bg-black/70 text-white text-xs font-heading",
                "border border-white/20"
              )}
            >
              {activeVideoClip.clip.name}
            </div>
          )}
        </div>

        {/* Seek Bar */}
        <div
          className={cn(
            "px-3 py-2 border-t-2 border-border bg-secondary-background",
            isFullscreen && "border-t-0"
          )}
        >
          <Slider
            value={[state.currentTime]}
            onValueChange={handleSeek}
            min={0}
            max={state.duration || 1}
            step={0.01}
            className="w-full"
          />
        </div>

        {/* Controls */}
        <div
          className={cn(
            "flex items-center justify-between px-3 py-2",
            "border-t-2 border-border bg-secondary-background",
            isFullscreen && "border-t-0"
          )}
        >
          {/* Left: Transport Controls */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="noShadow"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => skipBackward(1)}
                >
                  <SkipBack className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Previous Frame (←)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  size="icon"
                  className="h-10 w-10"
                  onClick={togglePlayPause}
                >
                  {state.isPlaying ? (
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
                  onClick={() => skipForward(1)}
                >
                  <SkipForward className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Next Frame (→)</TooltipContent>
            </Tooltip>
          </div>

          {/* Center: Time Display (fullscreen only) */}
          {isFullscreen && (
            <div className="text-sm font-heading text-white">
              <span className="text-chart-1">
                {formatTime(state.currentTime)}
              </span>
              <span className="text-white/40 mx-2">/</span>
              <span className="text-white/60">
                {formatTime(state.duration)}
              </span>
            </div>
          )}

          {/* Right: Volume & Fullscreen */}
          <div className="flex items-center gap-2">
            {/* Volume Control */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="noShadow"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setShowVolumeSlider(!showVolumeSlider)}
                >
                  {state.isMuted ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Volume (M to mute)</TooltipContent>
            </Tooltip>

            {showVolumeSlider && (
              <div className="flex items-center gap-2 px-2">
                <Slider
                  value={[state.volume * 100]}
                  onValueChange={([value]) => setVolume(value / 100)}
                  min={0}
                  max={100}
                  className="w-20"
                />
                <span className="text-xs w-8">
                  {Math.round(state.volume * 100)}%
                </span>
              </div>
            )}

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
