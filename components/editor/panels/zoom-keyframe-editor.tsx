"use client";

import {
  ChevronDown,
  Diamond,
  Minus,
  MousePointer2,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_ZOOM_KEYFRAME,
  useTimelinePlayerTime,
  type ZoomEasing,
  type ZoomKeyframe,
} from "@/components/editor/preview/timeline-player-context";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface ZoomKeyframeEditorProps {
  /** Zoom keyframes for the selected clip */
  keyframes: ZoomKeyframe[];
  /** Total duration of the clip in seconds */
  clipDuration: number;
  /** Clip start time on the timeline — used to compute clipLocalTime internally via time subscription */
  clipStartTime?: number;
  /** Current playhead time relative to clip start (fallback if clipStartTime is not provided) */
  clipLocalTime?: number;
  /** Called when keyframes are modified */
  onChange: (keyframes: ZoomKeyframe[]) => void;
  /** Called on every slider tick for live preview */
  onPreview?: (keyframes: ZoomKeyframe[]) => void;
  className?: string;
}

// ============================================================================
// Easing labels
// ============================================================================

const EASING_OPTIONS: { value: ZoomEasing; label: string }[] = [
  { value: "screen-studio", label: "Screen Studio" },
  { value: "ease-in-out", label: "Smooth" },
  { value: "ease-in", label: "Ease In" },
  { value: "ease-out", label: "Ease Out" },
  { value: "linear", label: "Linear" },
  { value: "spring", label: "Spring" },
];

// ============================================================================
// Mini Timeline with keyframe diamonds
// ============================================================================

interface KeyframeTimelineProps {
  keyframes: ZoomKeyframe[];
  clipDuration: number;
  clipLocalTime: number;
  selectedIndex: number | null;
  onSelectKeyframe: (index: number | null) => void;
  onMoveKeyframe: (index: number, newTime: number) => void;
}

const KeyframeTimeline = memo(function KeyframeTimeline({
  keyframes,
  clipDuration,
  clipLocalTime,
  selectedIndex,
  onSelectKeyframe,
  onMoveKeyframe,
}: KeyframeTimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const timeToPercent = useCallback(
    (time: number) => {
      if (clipDuration <= 0) return 0;
      return Math.max(0, Math.min(100, (time / clipDuration) * 100));
    },
    [clipDuration],
  );

  const percentToTime = useCallback(
    (percent: number) => {
      return Math.max(
        0,
        Math.min(clipDuration, (percent / 100) * clipDuration),
      );
    },
    [clipDuration],
  );

  // Handle drag
  useEffect(() => {
    if (dragIndex === null) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const percent = ((e.clientX - rect.left) / rect.width) * 100;
      const time = percentToTime(percent);
      // Snap to 0.05s increments for precision
      const snapped = Math.round(time * 20) / 20;
      onMoveKeyframe(dragIndex, snapped);
    };

    const handleMouseUp = () => {
      setDragIndex(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragIndex, percentToTime, onMoveKeyframe]);

  // Playhead position
  const playheadPercent = timeToPercent(clipLocalTime);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground/70 tabular-nums">
          0s
        </span>
        <span className="text-[10px] text-muted-foreground/70 tabular-nums">
          {clipDuration.toFixed(1)}s
        </span>
      </div>

      {/* Track */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: Interactive timeline track for keyframe selection */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: Track area needs click interaction */}
      <div
        ref={trackRef}
        className="relative h-8 bg-muted/60 rounded-md border border-border/40 cursor-crosshair overflow-visible"
        onClick={(e) => {
          // Deselect if clicking on empty space
          if (e.target === trackRef.current) {
            onSelectKeyframe(null);
          }
        }}
      >
        {/* Easing segments between keyframes */}
        {keyframes.length >= 2 &&
          keyframes.map((kf, i) => {
            if (i >= keyframes.length - 1) return null;
            const next = keyframes[i + 1];
            const left = timeToPercent(kf.time);
            const right = timeToPercent(next.time);
            const width = right - left;

            return (
              <div
                key={`seg-${kf.time}-${next.time}`}
                className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full"
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  background:
                    "linear-gradient(90deg, hsl(var(--primary) / 0.4), hsl(var(--primary) / 0.7))",
                }}
              />
            );
          })}

        {/* Keyframe diamonds */}
        {keyframes.map((kf, index) => {
          const left = timeToPercent(kf.time);
          const isSelected = selectedIndex === index;
          const isDragging = dragIndex === index;

          return (
            <button
              key={`kf-${kf.time}`}
              type="button"
              className={cn(
                "absolute top-1/2 -translate-x-1/2 -translate-y-1/2 z-10",
                "w-4 h-4 transition-transform duration-100",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isDragging && "scale-125",
                isSelected && "scale-110",
              )}
              style={{ left: `${left}%` }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectKeyframe(index);
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragIndex(index);
                onSelectKeyframe(index);
              }}
              title={`${kf.time.toFixed(2)}s — ${Math.round(kf.scale * 100)}%`}
            >
              <Diamond
                className={cn(
                  "w-4 h-4 transition-colors",
                  isSelected
                    ? "text-primary fill-primary"
                    : "text-primary/70 fill-primary/30 hover:fill-primary/50",
                )}
              />
            </button>
          );
        })}

        {/* Playhead indicator */}
        <div
          className="absolute top-0 bottom-0 w-px bg-foreground/60 z-20 pointer-events-none"
          style={{ left: `${playheadPercent}%` }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-foreground/60 rounded-full" />
        </div>
      </div>
    </div>
  );
});

// ============================================================================
// Focal Point Picker
// ============================================================================

interface FocalPointPickerProps {
  x: number;
  y: number;
  scale: number;
  onChange: (x: number, y: number) => void;
}

const FocalPointPicker = memo(function FocalPointPicker({
  x,
  y,
  scale,
  onChange,
}: FocalPointPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handlePointerEvent = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newX = Math.max(
        0,
        Math.min(1, (e.clientX - rect.left) / rect.width),
      );
      const newY = Math.max(
        0,
        Math.min(1, (e.clientY - rect.top) / rect.height),
      );
      // Snap to grid of 0.05 for easier editing
      const snappedX = Math.round(newX * 20) / 20;
      const snappedY = Math.round(newY * 20) / 20;
      onChange(snappedX, snappedY);
    },
    [onChange],
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => handlePointerEvent(e);
    const handleMouseUp = () => setIsDragging(false);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handlePointerEvent]);

  // Compute the visible area rectangle for visual feedback
  // At scale > 1, only 1/scale of the frame is visible
  const visibleWidth = Math.min(1, 1 / scale);
  const visibleHeight = Math.min(1, 1 / scale);

  // The focal point determines the center of the visible area
  // Clamp so the visible rect doesn't go out of bounds
  const halfW = visibleWidth / 2;
  const halfH = visibleHeight / 2;
  const clampedX = Math.max(halfW, Math.min(1 - halfW, x));
  const clampedY = Math.max(halfH, Math.min(1 - halfH, y));

  const rectLeft = (clampedX - halfW) * 100;
  const rectTop = (clampedY - halfH) * 100;
  const rectWidth = visibleWidth * 100;
  const rectHeight = visibleHeight * 100;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-foreground/70 flex items-center gap-1">
          <MousePointer2 className="w-3 h-3" />
          Focus Point
        </span>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {Math.round(x * 100)}%, {Math.round(y * 100)}%
        </span>
      </div>

      {/* biome-ignore lint/a11y/noStaticElementInteractions: Focal point picker needs mouse interaction */}
      <div
        ref={containerRef}
        className={cn(
          "relative w-full aspect-video rounded-md border border-border/50",
          "bg-muted/40 cursor-crosshair overflow-hidden",
          "transition-shadow",
          isDragging && "ring-1 ring-primary/40",
        )}
        onMouseDown={(e) => {
          e.preventDefault();
          setIsDragging(true);
          handlePointerEvent(e);
        }}
      >
        {/* Grid lines for visual reference */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-1/3 top-0 bottom-0 w-px bg-foreground/5" />
          <div className="absolute left-2/3 top-0 bottom-0 w-px bg-foreground/5" />
          <div className="absolute top-1/3 left-0 right-0 h-px bg-foreground/5" />
          <div className="absolute top-2/3 left-0 right-0 h-px bg-foreground/5" />
        </div>

        {/* Visible area rectangle (only when zoomed) */}
        {scale > 1.01 && (
          <div
            className="absolute border-2 border-primary/60 rounded-sm bg-primary/5 transition-all duration-75"
            style={{
              left: `${rectLeft}%`,
              top: `${rectTop}%`,
              width: `${rectWidth}%`,
              height: `${rectHeight}%`,
            }}
          />
        )}

        {/* Dimmed area outside visible rect (only when zoomed) */}
        {scale > 1.01 && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `
                linear-gradient(to right,
                  rgba(0,0,0,0.3) ${rectLeft}%,
                  transparent ${rectLeft}%,
                  transparent ${rectLeft + rectWidth}%,
                  rgba(0,0,0,0.3) ${rectLeft + rectWidth}%
                )
              `,
            }}
          />
        )}

        {/* Focal point dot */}
        <div
          className={cn(
            "absolute w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full",
            "bg-primary border-2 border-white shadow-md shadow-black/30",
            "transition-transform duration-75",
            isDragging && "scale-125",
          )}
          style={{
            left: `${x * 100}%`,
            top: `${y * 100}%`,
          }}
        />
      </div>

      {/* Quick position buttons */}
      <div className="grid grid-cols-3 gap-1">
        {[
          { label: "TL", x: 0.25, y: 0.25 },
          { label: "T", x: 0.5, y: 0.25 },
          { label: "TR", x: 0.75, y: 0.25 },
          { label: "L", x: 0.25, y: 0.5 },
          { label: "C", x: 0.5, y: 0.5 },
          { label: "R", x: 0.75, y: 0.5 },
          { label: "BL", x: 0.25, y: 0.75 },
          { label: "B", x: 0.5, y: 0.75 },
          { label: "BR", x: 0.75, y: 0.75 },
        ].map((pos) => (
          <button
            key={pos.label}
            type="button"
            className={cn(
              "h-6 text-[10px] rounded-md border border-border/30",
              "bg-muted/30 text-muted-foreground",
              "hover:bg-muted/60 hover:text-foreground",
              "transition-colors",
              Math.abs(x - pos.x) < 0.06 &&
                Math.abs(y - pos.y) < 0.06 &&
                "bg-primary/10 text-primary border-primary/30",
            )}
            onClick={() => onChange(pos.x, pos.y)}
          >
            {pos.label}
          </button>
        ))}
      </div>
    </div>
  );
});

// ============================================================================
// Main Component
// ============================================================================

export const ZoomKeyframeEditor = memo(function ZoomKeyframeEditor({
  keyframes: externalKeyframes,
  clipDuration,
  clipStartTime,
  clipLocalTime: clipLocalTimeProp,
  onChange,
  onPreview,
  className,
}: ZoomKeyframeEditorProps) {
  // Subscribe to timeline time internally for the playhead & "add at current time"
  const globalTime = useTimelinePlayerTime();
  const clipLocalTime =
    clipLocalTimeProp ??
    (clipStartTime != null ? Math.max(0, globalTime - clipStartTime) : 0);
  const [localKeyframes, setLocalKeyframes] = useState(externalKeyframes);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onPreviewRef = useRef(onPreview);
  onPreviewRef.current = onPreview;

  // Sync from parent
  useEffect(() => {
    setLocalKeyframes(externalKeyframes);
  }, [externalKeyframes]);

  // Sorted keyframes
  const sorted = useMemo(
    () => [...localKeyframes].sort((a, b) => a.time - b.time),
    [localKeyframes],
  );

  // Currently selected keyframe
  const selectedKf =
    selectedIndex !== null && selectedIndex < sorted.length
      ? sorted[selectedIndex]
      : null;

  // Commit changes to parent
  const commit = useCallback((kfs: ZoomKeyframe[]) => {
    const s = [...kfs].sort((a, b) => a.time - b.time);
    setLocalKeyframes(s);
    onChangeRef.current(s);
  }, []);

  // Preview (live, every tick)
  const preview = useCallback((kfs: ZoomKeyframe[]) => {
    const s = [...kfs].sort((a, b) => a.time - b.time);
    setLocalKeyframes(s);
    onPreviewRef.current?.(s);
  }, []);

  // Add keyframe at current time
  const addKeyframe = useCallback(() => {
    const existing = sorted.find(
      (kf) => Math.abs(kf.time - clipLocalTime) < 0.05,
    );
    if (existing) return; // Already exists at this time

    const newKf: ZoomKeyframe = {
      ...DEFAULT_ZOOM_KEYFRAME,
      time: Math.round(clipLocalTime * 20) / 20,
    };

    const next = [...sorted, newKf].sort((a, b) => a.time - b.time);
    commit(next);
    // Select the new keyframe
    const newIndex = next.findIndex(
      (kf) => Math.abs(kf.time - newKf.time) < 0.01,
    );
    setSelectedIndex(newIndex >= 0 ? newIndex : null);
  }, [sorted, clipLocalTime, commit]);

  // Remove selected keyframe
  const removeSelectedKeyframe = useCallback(() => {
    if (selectedIndex === null) return;
    const next = sorted.filter((_, i) => i !== selectedIndex);
    commit(next);
    setSelectedIndex(null);
  }, [sorted, selectedIndex, commit]);

  // Reset all keyframes
  const resetKeyframes = useCallback(() => {
    commit([]);
    setSelectedIndex(null);
  }, [commit]);

  // Move keyframe in timeline
  const handleMoveKeyframe = useCallback(
    (index: number, newTime: number) => {
      const next = sorted.map((kf, i) =>
        i === index ? { ...kf, time: newTime } : kf,
      );
      preview(next);
    },
    [sorted, preview],
  );

  // Update selected keyframe scale
  const handleScaleChange = useCallback(
    (scale: number, commitNow = false) => {
      if (selectedIndex === null) return;
      const next = sorted.map((kf, i) =>
        i === selectedIndex ? { ...kf, scale } : kf,
      );
      if (commitNow) {
        commit(next);
      } else {
        preview(next);
      }
    },
    [sorted, selectedIndex, commit, preview],
  );

  // Update selected keyframe focal point
  const handleFocalChange = useCallback(
    (x: number, y: number) => {
      if (selectedIndex === null) return;
      const next = sorted.map((kf, i) =>
        i === selectedIndex ? { ...kf, x, y } : kf,
      );
      commit(next);
    },
    [sorted, selectedIndex, commit],
  );

  // Update selected keyframe easing
  const handleEasingChange = useCallback(
    (easing: ZoomEasing) => {
      if (selectedIndex === null) return;
      const next = sorted.map((kf, i) =>
        i === selectedIndex ? { ...kf, easing } : kf,
      );
      commit(next);
    },
    [sorted, selectedIndex, commit],
  );

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <button
        type="button"
        className="w-full flex items-center justify-between group"
        onClick={() => setIsExpanded((v) => !v)}
      >
        <span className="text-xs font-medium text-foreground/80 flex items-center gap-1.5">
          <Search className="w-3.5 h-3.5 text-primary/70" />
          Zoom & Pan
          {sorted.length > 0 && (
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full tabular-nums">
              {sorted.length}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 text-muted-foreground transition-transform",
            isExpanded && "rotate-180",
          )}
        />
      </button>

      {isExpanded && (
        <div className="space-y-3">
          {/* Action buttons */}
          <div className="flex items-center gap-1.5">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 text-xs flex-1"
                    onClick={addKeyframe}
                  >
                    <Plus className="w-3 h-3" />
                    Add
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Add keyframe at playhead
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={removeSelectedKeyframe}
                    disabled={selectedIndex === null}
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Remove selected keyframe
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={resetKeyframes}
                    disabled={sorted.length === 0}
                  >
                    <RotateCcw className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Clear all keyframes
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Keyframe timeline */}
          <KeyframeTimeline
            keyframes={sorted}
            clipDuration={clipDuration}
            clipLocalTime={clipLocalTime}
            selectedIndex={selectedIndex}
            onSelectKeyframe={setSelectedIndex}
            onMoveKeyframe={handleMoveKeyframe}
          />

          {/* Keyframe properties (when selected) */}
          {selectedKf && (
            <div className="space-y-3 rounded-lg border border-border/40 bg-muted/20 p-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                  Keyframe {(selectedIndex ?? 0) + 1}
                </span>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {selectedKf.time.toFixed(2)}s
                </span>
              </div>

              {/* Scale slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-foreground/70 flex items-center gap-1">
                    <Search className="w-3 h-3" />
                    Zoom
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums w-12 text-right">
                    {Math.round(selectedKf.scale * 100)}%
                  </span>
                </div>
                <Slider
                  value={[selectedKf.scale * 100]}
                  min={100}
                  max={500}
                  step={5}
                  onValueChange={([v]) => handleScaleChange(v / 100)}
                  onValueCommit={([v]) => handleScaleChange(v / 100, true)}
                />
              </div>

              {/* Focal point picker */}
              <FocalPointPicker
                x={selectedKf.x}
                y={selectedKf.y}
                scale={selectedKf.scale}
                onChange={handleFocalChange}
              />

              {/* Easing selector */}
              <div className="space-y-1.5">
                <span className="text-xs text-foreground/70">Easing</span>
                <Select
                  value={selectedKf.easing}
                  onValueChange={(v) => handleEasingChange(v as ZoomEasing)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EASING_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Delete this keyframe */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-7 text-xs text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                onClick={removeSelectedKeyframe}
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Delete Keyframe
              </Button>
            </div>
          )}

          {/* Empty state */}
          {sorted.length === 0 && (
            <div className="text-center py-4 space-y-2">
              <div className="text-muted-foreground/30">
                <Search className="w-8 h-8 mx-auto" />
              </div>
              <p className="text-xs text-muted-foreground/60">
                Add keyframes to create smooth zoom & pan animations
              </p>
              <p className="text-[10px] text-muted-foreground/40">
                Position the playhead, then click "Add" to create a keyframe
              </p>
            </div>
          )}

          {/* Quick tips */}
          {sorted.length === 1 && (
            <p className="text-[10px] text-muted-foreground/50 text-center">
              Add a second keyframe to animate between zoom levels
            </p>
          )}
        </div>
      )}
    </div>
  );
});
