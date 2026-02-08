"use client";

import { RotateCcw } from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  type ClipFilters,
  DEFAULT_CLIP_FILTERS,
} from "@/components/editor/preview/timeline-player-context";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface FilterControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  onCommit: (value: number) => void;
  /** Custom track color gradient (CSS linear-gradient string) */
  trackGradient?: string;
  /** Display format for the value */
  formatValue?: (value: number) => string;
}

const FilterControl = memo(function FilterControl({
  label,
  value,
  min,
  max,
  onChange,
  onCommit,
  trackGradient,
  formatValue = (v) => String(Math.round(v)),
}: FilterControlProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-foreground/70">{label}</span>
        <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">
          {formatValue(value)}
        </span>
      </div>
      <div className="relative">
        {trackGradient ? (
          <div
            className="absolute inset-0 h-1.5 top-1/2 -translate-y-1/2 rounded-full pointer-events-none"
            style={{ background: trackGradient }}
          />
        ) : null}
        <Slider
          value={[value]}
          min={min}
          max={max}
          step={1}
          onValueChange={([v]) => onChange(v)}
          onValueCommit={([v]) => onCommit(v)}
          className={cn(
            "relative",
            trackGradient &&
              "[&_[data-slot=slider-track]]:bg-transparent [&_[data-slot=slider-range]]:bg-transparent",
          )}
        />
      </div>
    </div>
  );
});

interface FilterControlsProps {
  filters: ClipFilters;
  /** Called on every slider tick for live preview (ref-based, cheap). */
  onPreview: (filters: ClipFilters) => void;
  /** Called once when the slider is released to commit the final value. */
  onCommit: (filters: ClipFilters) => void;
  className?: string;
}

export const FilterControls = memo(function FilterControls({
  filters,
  onPreview,
  onCommit,
  className,
}: FilterControlsProps) {
  // Local state for instant slider feedback without propagating to the whole tree
  const [localFilters, setLocalFilters] = useState(filters);

  // Keep refs to the latest callbacks so we never go stale
  const onPreviewRef = useRef(onPreview);
  onPreviewRef.current = onPreview;
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;

  // Track whether a drag is in progress so we don't sync from parent mid-drag
  const isDraggingRef = useRef(false);

  // Sync local state when parent filters change (e.g. reset, clip selection change)
  // but only when we're NOT in the middle of a drag
  useEffect(() => {
    if (!isDraggingRef.current) {
      setLocalFilters(filters);
    }
  }, [filters]);

  // Called on every slider tick — cheap ref-based preview, no React state tree update
  const handleFilterChange = useCallback(
    (key: keyof ClipFilters, value: number) => {
      isDraggingRef.current = true;
      const next = { ...localFilters, [key]: value };
      setLocalFilters(next);
      onPreviewRef.current(next);
    },
    [localFilters],
  );

  // Called once when the slider is released — commits to the real tracks state
  const handleFilterCommit = useCallback(
    (key: keyof ClipFilters, value: number) => {
      isDraggingRef.current = false;
      const next = { ...localFilters, [key]: value };
      setLocalFilters(next);
      onCommitRef.current(next);
    },
    [localFilters],
  );

  const handleReset = useCallback(() => {
    isDraggingRef.current = false;
    setLocalFilters(DEFAULT_CLIP_FILTERS);
    onCommitRef.current(DEFAULT_CLIP_FILTERS);
  }, []);

  const isDefault =
    localFilters.opacity === DEFAULT_CLIP_FILTERS.opacity &&
    localFilters.brightness === DEFAULT_CLIP_FILTERS.brightness &&
    localFilters.contrast === DEFAULT_CLIP_FILTERS.contrast &&
    localFilters.saturation === DEFAULT_CLIP_FILTERS.saturation &&
    localFilters.hue === DEFAULT_CLIP_FILTERS.hue &&
    localFilters.blur === DEFAULT_CLIP_FILTERS.blur;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Opacity - Blue gradient track */}
      <FilterControl
        label="Opacity"
        value={localFilters.opacity}
        min={0}
        max={100}
        onChange={(v) => handleFilterChange("opacity", v)}
        onCommit={(v) => handleFilterCommit("opacity", v)}
        formatValue={(v) => `${Math.round(v)}%`}
        trackGradient="linear-gradient(to right, transparent, #3b82f6)"
      />

      {/* Brightness - Dark to light gradient */}
      <FilterControl
        label="Brightness"
        value={localFilters.brightness}
        min={-100}
        max={100}
        onChange={(v) => handleFilterChange("brightness", v)}
        onCommit={(v) => handleFilterCommit("brightness", v)}
        trackGradient="linear-gradient(to right, #1a1a1a, #666666, #ffffff)"
      />

      {/* Contrast - Gray centered gradient */}
      <FilterControl
        label="Contrast"
        value={localFilters.contrast}
        min={-100}
        max={100}
        onChange={(v) => handleFilterChange("contrast", v)}
        onCommit={(v) => handleFilterCommit("contrast", v)}
        trackGradient="linear-gradient(to right, #4a4a4a, #666666, #ffffff)"
      />

      {/* Saturation - Gray to colored gradient */}
      <FilterControl
        label="Saturation"
        value={localFilters.saturation}
        min={-100}
        max={100}
        onChange={(v) => handleFilterChange("saturation", v)}
        onCommit={(v) => handleFilterCommit("saturation", v)}
        trackGradient="linear-gradient(to right, #666666, #f97316)"
      />

      {/* Hue - Rainbow gradient */}
      <FilterControl
        label="Hue"
        value={localFilters.hue}
        min={-180}
        max={180}
        onChange={(v) => handleFilterChange("hue", v)}
        onCommit={(v) => handleFilterCommit("hue", v)}
        formatValue={(v) => `${Math.round(v)}°`}
        trackGradient="linear-gradient(to right, #f97316, #eab308, #22c55e, #06b6d4, #3b82f6, #a855f7, #f97316)"
      />

      {/* Blur - Simple dark gradient */}
      <FilterControl
        label="Blur"
        value={localFilters.blur}
        min={0}
        max={100}
        onChange={(v) => handleFilterChange("blur", v)}
        onCommit={(v) => handleFilterCommit("blur", v)}
        trackGradient="linear-gradient(to right, #1a1a1a, #3a3a3a)"
      />

      {/* Reset Button */}
      <div className="pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          disabled={isDefault}
          className="w-full gap-2 text-xs"
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </Button>
      </div>
    </div>
  );
});
