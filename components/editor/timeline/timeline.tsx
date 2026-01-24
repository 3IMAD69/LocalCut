"use client";

import {
  Timeline as ReactTimelineEditor,
  type TimelineAction,
  type TimelineEffect,
  type TimelineRow,
  type TimelineState,
} from "@xzdarcy/react-timeline-editor";
import {
  Film,
  Minus,
  Music,
  Pause,
  Play,
  Plus,
  Scissors,
  SkipBack,
  SkipForward,
  Video,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  type TimelineTrackData,
  useTimelinePlayer,
} from "../preview/timeline-player-context";
import { AudioWaveform } from "./audio-waveform";

interface TimelineProps {
  tracks: TimelineTrackData[];
  currentTime: number;
  duration: number;
  selectedClipId?: string | null;
  onTimeChange?: (time: number) => void;
  onClipSelect?: (clipId: string) => void;
  onTracksChange?: (tracks: TimelineTrackData[]) => void;
  onAddTrack?: (type: "video" | "audio") => void;
  onRemoveTrack?: (trackId: string) => void;
  className?: string;
}

function TimelineEmptyOverlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      <div className="text-center">
        <div
          className={cn(
            "w-16 h-16 border border-dashed border-border rounded-2xl",
            "flex items-center justify-center mx-auto mb-3",
            "bg-muted/50",
          )}
        >
          <Film className="h-8 w-8 text-foreground/30" />
        </div>
        <p className="text-sm font-medium text-foreground/40">
          No clips on timeline
        </p>
        <p className="text-xs text-foreground/30">
          Drag media from library or double-click to add
        </p>
      </div>
    </div>
  );
}

export function Timeline({
  tracks,
  currentTime,
  duration,
  selectedClipId,
  onTimeChange,
  onClipSelect,
  onTracksChange,
  onAddTrack,
  onRemoveTrack: _onRemoveTrack,
  className,
}: TimelineProps) {
  const [pixelsPerSecond, setPixelsPerSecond] = useState(50);
  const [rowScrollTop, setRowScrollTop] = useState(0);
  const timelineRef = useRef<TimelineState>(null);

  const {
    state: playerState,
    play,
    pause,
    seek,
    setMuted,
  } = useTimelinePlayer();

  const labelWidth = 80;
  const rowHeight = 36;
  const timeAreaHeight = 24;
  const rowOffset = 4;
  const scale = 1;
  const minScaleCount = Math.max(20, Math.ceil(duration / scale));
  const maxScaleCount = Math.max(minScaleCount, 5000);

  const clipById = useMemo(() => {
    const map = new Map<string, TimelineTrackData["clips"][number]>();
    for (const track of tracks) {
      for (const clip of track.clips) {
        map.set(clip.id, clip);
      }
    }
    return map;
  }, [tracks]);

  const editorData = useMemo<TimelineRow[]>(() => {
    return tracks.map((track) => ({
      id: track.id,
      rowHeight,
      classNames: [
        "lc-timeline-row",
        track.type === "video"
          ? "lc-timeline-row-video"
          : "lc-timeline-row-audio",
      ],
      actions: track.clips.map<TimelineAction>((clip) => ({
        id: clip.id,
        start: clip.startTime,
        end: clip.startTime + clip.duration,
        effectId: clip.type,
        movable: true,
        flexible: false,
        selected: clip.id === selectedClipId,
      })),
    }));
  }, [selectedClipId, tracks]);

  const effects = useMemo<Record<string, TimelineEffect>>(
    () => ({
      video: { id: "video", name: "Video" },
      audio: { id: "audio", name: "Audio" },
    }),
    [],
  );

  // Split clip at playhead position
  const splitClipAtPlayhead = useCallback(() => {
    if (!onTracksChange) return;

    // Find clips that the playhead is currently over
    const clipsToSplit: Array<{
      trackId: string;
      clip: TimelineTrackData["clips"][number];
    }> = [];

    for (const track of tracks) {
      for (const clip of track.clips) {
        const clipEnd = clip.startTime + clip.duration;
        // Check if playhead is within this clip (not at the very edges)
        if (currentTime > clip.startTime && currentTime < clipEnd) {
          clipsToSplit.push({ trackId: track.id, clip });
        }
      }
    }

    if (clipsToSplit.length === 0) return;

    // Create new tracks with split clips
    const newTracks = tracks.map((track) => {
      const clipToSplit = clipsToSplit.find((c) => c.trackId === track.id);
      if (!clipToSplit) return track;

      const { clip } = clipToSplit;
      const splitPoint = currentTime - clip.startTime; // Time within the clip where we split

      // First part: from clip start to playhead
      const firstPart: TimelineTrackData["clips"][number] = {
        ...clip,
        id: `${clip.id}-part1-${Date.now()}`,
        duration: splitPoint,
        trimEnd: clip.trimStart + splitPoint,
      };

      // Second part: from playhead to clip end
      const secondPart: TimelineTrackData["clips"][number] = {
        ...clip,
        id: `${clip.id}-part2-${Date.now()}`,
        startTime: currentTime,
        duration: clip.duration - splitPoint,
        trimStart: clip.trimStart + splitPoint,
      };

      // Replace the original clip with the two parts
      return {
        ...track,
        clips: track.clips.flatMap((c) =>
          c.id === clip.id ? [firstPart, secondPart] : [c],
        ),
      };
    });

    onTracksChange(newTracks);
  }, [tracks, currentTime, onTracksChange]);

  // Keyboard shortcut for split (Ctrl+B)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if focused on an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Ctrl/Cmd + B for split
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        splitClipAtPlayhead();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [splitClipAtPlayhead]);

  useEffect(() => {
    timelineRef.current?.setTime(currentTime);
  }, [currentTime]);

  return (
    <div className={cn("flex flex-col bg-background/50", className)}>
      <div className="relative flex items-center justify-between px-4 py-3 border-b border-border/40 bg-muted/30">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-foreground/50 bg-foreground/5 px-2 py-1 rounded-md">
            Timeline
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 rounded-full px-3 text-xs bg-background/50 border-border/50 shadow-sm hover:bg-background"
              >
                <Plus className="h-3 w-3" />
                <span className="text-xs">Add Track</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => onAddTrack?.("video")}>
                <Video className="h-4 w-4 mr-2 text-chart-2" />
                Video Track
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddTrack?.("audio")}>
                <Music className="h-4 w-4 mr-2 text-chart-3" />
                Audio Track
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 rounded-full px-3 text-xs bg-background/50 border-border/50 shadow-sm hover:bg-background"
                  onClick={splitClipAtPlayhead}
                >
                  <Scissors className="h-3 w-3" />
                  <span className="text-xs">Split</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Split clip at playhead (Ctrl+B)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Playback Controls - Centered */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full hover:bg-background/80"
                  onClick={() => seek(Math.max(0, currentTime - 5))}
                >
                  <SkipBack className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Skip Back 5s</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8 rounded-full hover:bg-background/80",
                    playerState.playing && "bg-primary/20 text-primary",
                  )}
                  onClick={() => (playerState.playing ? pause() : play())}
                >
                  {playerState.playing ? (
                    <Pause className="h-4 w-4 fill-current" />
                  ) : (
                    <Play className="h-4 w-4 fill-current ml-0.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Play/Pause (Space)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full hover:bg-background/80"
                  onClick={() => seek(Math.min(duration, currentTime + 5))}
                >
                  <SkipForward className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Skip Forward 5s</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="flex items-center gap-2">
          {/* Volume Control */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full hover:bg-background/80"
                  onClick={() => setMuted(!playerState.muted)}
                >
                  {playerState.muted || playerState.volume === 0 ? (
                    <VolumeX className="h-3 w-3" />
                  ) : (
                    <Volume2 className="h-3 w-3" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Toggle Mute (M)</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="h-4 w-px bg-border/50 mx-1" />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full hover:bg-background/80"
            onClick={() =>
              setPixelsPerSecond((prev) => Math.max(prev / 1.5, 10))
            }
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="text-xs font-medium w-12 text-center">
            {Math.round(pixelsPerSecond)}px/s
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full hover:bg-background/80"
            onClick={() =>
              setPixelsPerSecond((prev) => Math.min(prev * 1.5, 200))
            }
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden lc-timeline">
        <ReactTimelineEditor
          ref={timelineRef}
          editorData={editorData}
          effects={effects}
          scale={scale}
          scaleWidth={pixelsPerSecond}
          scaleSplitCount={10}
          startLeft={labelWidth}
          rowHeight={rowHeight}
          minScaleCount={minScaleCount}
          maxScaleCount={maxScaleCount}
          dragLine={true}
          autoScroll
          onScroll={({ scrollTop }) => setRowScrollTop(scrollTop)}
          onChange={(nextData) => {
            if (!onTracksChange) return;

            const trackMap = new Map(tracks.map((track) => [track.id, track]));

            const nextTracks = nextData.map((row) => {
              const baseTrack = trackMap.get(row.id);
              const type = baseTrack?.type ?? "video";
              const label = baseTrack?.label ?? row.id;

              return {
                id: row.id,
                type,
                label,
                clips: row.actions.map((action) => {
                  const existing = clipById.get(action.id);
                  const start = Math.max(0, action.start);
                  const end = Math.max(start, action.end);
                  const duration = end - start;

                  if (existing) {
                    return {
                      ...existing,
                      startTime: start,
                      duration,
                    };
                  }

                  return {
                    id: action.id,
                    name: action.id,
                    type,
                    startTime: start,
                    duration,
                    color: type === "video" ? "#0099ff" : "#ff7a05",
                    trimStart: 0,
                    trimEnd: duration,
                  };
                }),
              };
            });

            onTracksChange(nextTracks);
          }}
          onClickTimeArea={(time) => {
            onTimeChange?.(Math.max(0, Math.min(time, duration)));
            return true;
          }}
          onCursorDrag={(time) => {
            onTimeChange?.(Math.max(0, Math.min(time, duration)));
          }}
          onCursorDragEnd={(time) => {
            onTimeChange?.(Math.max(0, Math.min(time, duration)));
          }}
          onClickActionOnly={(_, { action }) => onClipSelect?.(action.id)}
          getActionRender={(action) => {
            const clip = clipById.get(action.id);
            const isVideo = (clip?.type ?? "video") === "video";
            const thumbnails = clip?.thumbnails ?? [];

            // Calculate clip's visual pixel width on the timeline
            const clipDuration = action.end - action.start;
            const clipPixelWidth = clipDuration * pixelsPerSecond;

            // Only show thumbnails that fit at minimum 60px each
            // This prevents cramped appearance on short/zoomed-out clips
            const minThumbnailWidth = 60;
            const maxVisibleThumbnails = Math.max(
              1,
              Math.floor(clipPixelWidth / minThumbnailWidth),
            );

            // Take evenly-spaced thumbnails from the available set
            const selectEvenly = (arr: string[], count: number): string[] => {
              if (arr.length === 0 || count <= 0) return [];
              if (count === 1) return [arr[Math.floor(arr.length / 2)]]; // Return middle thumbnail
              if (arr.length <= count) return arr;
              const step = (arr.length - 1) / (count - 1);
              return Array.from(
                { length: count },
                (_, i) => arr[Math.round(i * step)],
              );
            };

            const filmstrip =
              thumbnails.length > 0
                ? selectEvenly(thumbnails, maxVisibleThumbnails)
                : [];

            // For single thumbnail: use cover to fill naturally
            // For multiple: tile them evenly
            const isSingle = filmstrip.length === 1;
            const backgroundImage = filmstrip
              .map((src) => `url("${src}")`)
              .join(", ");
            const backgroundSize = isSingle
              ? "cover"
              : filmstrip
                  .map(() => `${100 / filmstrip.length}% 100%`)
                  .join(", ");
            const backgroundPosition = isSingle
              ? "center"
              : filmstrip
                  .map((_, i) => `${(i * 100) / filmstrip.length}% 50%`)
                  .join(", ");

            return (
              <div
                className={cn(
                  "relative h-full w-full rounded-xl border border-border/50",
                  "shadow-sm overflow-hidden",
                  "text-[11px] font-medium",
                  action.selected && "ring-2 ring-primary ring-offset-1",
                )}
                style={{
                  backgroundColor: isVideo
                    ? "color-mix(in oklch, var(--card), transparent 10%)"
                    : "color-mix(in oklch, var(--background), transparent 10%)",
                }}
              >
                {isVideo ? (
                  filmstrip.length > 0 ? (
                    <div
                      className="absolute inset-0 opacity-90"
                      style={{
                        backgroundImage,
                        backgroundRepeat: "no-repeat",
                        backgroundSize,
                        backgroundPosition,
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-r from-card/80 via-card/60 to-card/80" />
                  )
                ) : clip?.asset ? (
                  <AudioWaveform
                    asset={clip.asset}
                    trimStart={clip.trimStart}
                    pixelsPerSecond={pixelsPerSecond}
                    height={rowHeight}
                    color="rgb(255, 223, 181)"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-r from-muted/80 via-muted/60 to-muted/80" />
                )}

                <div className="absolute inset-0 bg-gradient-to-r from-background/70 via-transparent to-background/70 pointer-events-none" />
                <div className="relative z-10 flex items-center h-full px-2 pointer-events-none">
                  <span className="text-foreground truncate shadow-sm">
                    {clip?.name ?? action.id}
                  </span>
                </div>
              </div>
            );
          }}
          style={{ width: "100%", height: "100%" }}
        />

        <div
          className="absolute left-0 top-0 z-20 h-full"
          style={{ width: `${labelWidth}px` }}
          aria-hidden
        >
          <div className="h-8 border-b border-border/40 bg-background/70" />
          <div
            className="absolute left-0 right-0"
            style={{
              top: timeAreaHeight + rowOffset,
              height: `calc(100% - ${timeAreaHeight + rowOffset}px)`,
            }}
          >
            <div
              className="absolute left-0 right-0"
              style={{ transform: `translateY(-${rowScrollTop}px)` }}
            >
              {tracks.map((track) => (
                <div
                  key={track.id}
                  className={cn(
                    "h-14 flex items-center justify-center",
                    "text-[11px] font-semibold uppercase tracking-wide",
                    "border-b border-border/30",
                    "bg-background/70",
                    track.type === "video" ? "text-chart-2" : "text-chart-3",
                  )}
                >
                  {track.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {tracks.every((track) => track.clips.length === 0) && (
          <TimelineEmptyOverlay />
        )}
      </div>
    </div>
  );
}
