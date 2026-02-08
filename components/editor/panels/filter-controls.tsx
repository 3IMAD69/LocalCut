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

/** Throttle interval in ms – balances visual preview responsiveness with render cost */
const THROTTLE_MS = 1000 / 30; // ~30 fps

interface FilterControlsProps {
  filters: ClipFilters;
  onChange: (filters: ClipFilters) => void;
  className?: string;
}

export const FilterControls = memo(function FilterControls({
  filters,
  onChange,
  className,
}: FilterControlsProps) {
  // Local state for instant slider feedback without propagating to the whole tree
  const [localFilters, setLocalFilters] = useState(filters);

  // Keep a ref to the latest onChange so the throttle callback never goes stale
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Throttle handle ref
  const throttleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<ClipFilters | null>(null);

  // Sync local state when parent filters change (e.g. reset, clip selection change)
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // Flush any pending update on unmount
  useEffect(() => {
    return () => {
      if (throttleRef.current) {
        clearTimeout(throttleRef.current);
        if (pendingRef.current) {
          onChangeRef.current(pendingRef.current);
        }
      }
    };
  }, []);

  const handleFilterChange = useCallback(
    (key: keyof ClipFilters, value: number) => {
      const next = { ...localFilters, [key]: value };
      // Update local state immediately for responsive UI
      setLocalFilters(next);

      // Throttle the expensive upstream update
      pendingRef.current = next;
      if (!throttleRef.current) {
        // Fire immediately on the leading edge
        onChangeRef.current(next);
        pendingRef.current = null;
        throttleRef.current = setTimeout(() => {
          throttleRef.current = null;
          // Flush trailing update if there's a pending value
          if (pendingRef.current) {
            onChangeRef.current(pendingRef.current);
            pendingRef.current = null;
          }
        }, THROTTLE_MS);
      }
    },
    [localFilters],
  );

  const handleReset = useCallback(() => {
    // Clear any pending throttled update
    if (throttleRef.current) {
      clearTimeout(throttleRef.current);
      throttleRef.current = null;
      pendingRef.current = null;
    }
    setLocalFilters(DEFAULT_CLIP_FILTERS);
    onChangeRef.current(DEFAULT_CLIP_FILTERS);
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
        trackGradient="linear-gradient(to right, #1a1a1a, #666666, #ffffff)"
      />

      {/* Contrast - Gray centered gradient */}
      <FilterControl
        label="Contrast"
        value={localFilters.contrast}
        min={-100}
        max={100}
        onChange={(v) => handleFilterChange("contrast", v)}
        trackGradient="linear-gradient(to right, #4a4a4a, #666666, #ffffff)"
      />

      {/* Saturation - Gray to colored gradient */}
      <FilterControl
        label="Saturation"
        value={localFilters.saturation}
        min={-100}
        max={100}
        onChange={(v) => handleFilterChange("saturation", v)}
        trackGradient="linear-gradient(to right, #666666, #f97316)"
      />

      {/* Hue - Rainbow gradient */}
      <FilterControl
        label="Hue"
        value={localFilters.hue}
        min={-180}
        max={180}
        onChange={(v) => handleFilterChange("hue", v)}
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
