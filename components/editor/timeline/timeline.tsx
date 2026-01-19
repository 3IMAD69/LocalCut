"use client";

import {
  Timeline as ReactTimelineEditor,
  type TimelineAction,
  type TimelineEffect,
  type TimelineRow,
  type TimelineState,
} from "@xzdarcy/react-timeline-editor";
import { Film, Minus, Music, Plus, Video } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { TimelineTrackData } from "../preview/timeline-player-context";

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

  const labelWidth = 96;
  const rowHeight = 56;
  const timeAreaHeight = 32;
  const rowOffset = 10;
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

  useEffect(() => {
    timelineRef.current?.setTime(currentTime);
  }, [currentTime]);

  return (
    <div className={cn("flex flex-col bg-background/50", className)}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-muted/30">
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
        </div>

        <div className="flex items-center gap-1">
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
            const filmstrip = thumbnails.length ? thumbnails : [];
            const backgroundImage = filmstrip
              .map((src) => `url("${src}")`)
              .join(", ");
            const backgroundSize = filmstrip
              .map(() => `${100 / filmstrip.length}% 100%`)
              .join(", ");
            const backgroundPosition = filmstrip
              .map((_, index) => `${(index * 100) / filmstrip.length}% 50%`)
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
                    : "color-mix(in oklch, var(--muted), transparent 20%)",
                }}
              >
                {filmstrip.length > 0 ? (
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
                  <div
                    className={cn(
                      "absolute inset-0",
                      isVideo
                        ? "bg-gradient-to-r from-card/80 via-card/60 to-card/80"
                        : "bg-gradient-to-r from-muted/80 via-muted/60 to-muted/80",
                    )}
                  />
                )}

                <div className="absolute inset-0 bg-gradient-to-r from-background/70 via-transparent to-background/70" />
                <div className="relative z-10 flex items-center h-full px-2">
                  <span className="text-foreground truncate">
                    {clip?.name ?? action.id}
                  </span>
                </div>
              </div>
            );
          }}
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
