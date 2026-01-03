"use client";

import { Crop, RotateCcw, SlidersHorizontal } from "lucide-react";
import { useCallback, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ScrubbableInput } from "@/components/ui/scrubbable-input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { CropIcon } from "../animate-ui/icons/crop";
import { RotateCcwIcon } from "../animate-ui/icons/rotate-ccw";
import { ScissorsIcon } from "../animate-ui/icons/scissors";
import { VolumeOffIcon } from "../animate-ui/icons/volume-off";
import {
  SlidersHorizontalIcon,
  type SlidersHorizontalIconHandle,
} from "../ui/sliders-horizontal";
import type { CropRect } from "./crop-overlay";

/** Fine-tune filter values (-100 to +100) */
export interface FineTuneFilters {
  brightness: number;
  contrast: number;
  saturation: number;
  exposure: number;
  temperature: number;
  gamma: number;
}

export const defaultFineTuneFilters: FineTuneFilters = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  exposure: 0,
  temperature: 0,
  gamma: 0,
};

export interface EditingState {
  crop: {
    enabled: boolean;
    rect: CropRect | null;
  };
  trim: {
    enabled: boolean;
    start: number;
    end: number;
  };
  rotate: {
    enabled: boolean;
    degrees: 0 | 90 | 180 | 270;
  };
  mute: {
    enabled: boolean;
  };
  fineTune: {
    enabled: boolean;
    filters: FineTuneFilters;
  };
}

export const defaultEditingState: EditingState = {
  crop: { enabled: false, rect: null },
  trim: { enabled: false, start: 0, end: 0 },
  rotate: { enabled: false, degrees: 0 },
  mute: { enabled: false },
  fineTune: { enabled: false, filters: defaultFineTuneFilters },
};

/** Filter type for the scrubbable input selection */
type FilterType = keyof FineTuneFilters;

const FILTER_OPTIONS: { key: FilterType; label: string }[] = [
  { key: "brightness", label: "Brightness" },
  { key: "contrast", label: "Contrast" },
  { key: "saturation", label: "Saturation" },
  { key: "exposure", label: "Exposure" },
  { key: "temperature", label: "Temperature" },
  { key: "gamma", label: "Gamma" },
];

/**
 * Convert fine-tune filter values to a CSS filter string.
 * Each value is in the range -100 to +100.
 */
export function fineTuneToCSS(filters: FineTuneFilters): string {
  const parts: string[] = [];

  // Brightness: -100 → 0 (black), 0 → 1, +100 → 2
  if (filters.brightness !== 0) {
    const brightness = 1 + filters.brightness / 100;
    parts.push(`brightness(${brightness.toFixed(2)})`);
  }

  // Contrast: -100 → 0, 0 → 1, +100 → 2
  if (filters.contrast !== 0) {
    const contrast = 1 + filters.contrast / 100;
    parts.push(`contrast(${contrast.toFixed(2)})`);
  }

  // Saturation: -100 → 0 (grayscale), 0 → 1, +100 → 2
  if (filters.saturation !== 0) {
    const saturation = 1 + filters.saturation / 100;
    parts.push(`saturate(${saturation.toFixed(2)})`);
  }

  // Exposure: simulated via brightness boost
  // -100 → 0.5, 0 → 1, +100 → 1.5
  if (filters.exposure !== 0) {
    const exposure = 1 + filters.exposure / 200;
    parts.push(`brightness(${exposure.toFixed(2)})`);
  }

  // Temperature: warm (+) = sepia + saturate, cool (-) = hue-rotate to blue
  if (filters.temperature !== 0) {
    if (filters.temperature > 0) {
      // Warm: add sepia
      const sepia = filters.temperature / 100;
      parts.push(`sepia(${(sepia * 0.4).toFixed(2)})`);
    } else {
      // Cool: shift hue towards blue
      const hue = (filters.temperature / 100) * 30; // up to -30deg
      parts.push(`hue-rotate(${hue.toFixed(0)}deg)`);
    }
  }

  // Gamma: approximated via contrast adjustment
  // -100 → 0.5, 0 → 1, +100 → 1.5
  if (filters.gamma !== 0) {
    const gamma = 1 + filters.gamma / 200;
    parts.push(`contrast(${gamma.toFixed(2)})`);
  }

  return parts.length > 0 ? parts.join(" ") : "none";
}

interface EditingPanelProps {
  state: EditingState;
  onStateChange: (state: EditingState) => void;
  /** Callback when crop toggle changes - used for scrolling to player */
  onCropToggle?: (enabled: boolean) => void;
  /** Callback when trim toggle changes - used for scrolling to player */
  onTrimToggle?: (enabled: boolean) => void;
  /** The duration of the media in seconds (used for trim initialization) */
  mediaDuration?: number;
  /** Whether the video is audio-only (hides video-only features) */
  isAudioOnly?: boolean;
  /** Optional class name */
  className?: string;
}

interface ToggleItemProps {
  id: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

// Helper to format time in mm:ss format
function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function ToggleItem({
  id,
  icon,
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: ToggleItemProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 p-3 rounded-base",
        "border-2 border-border bg-white dark:bg-gray-950",
        "transition-all duration-200",
        checked && "border-main bg-main/5 dark:bg-main/10",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex items-center justify-center size-10 rounded-base",
            "border-2 border-border bg-secondary-background",
            "transition-all duration-200",
            checked && "border-main bg-main text-white",
          )}
        >
          {icon}
        </div>
        <div className="flex flex-col">
          <Label htmlFor={id} className="cursor-pointer font-semibold">
            {label}
          </Label>
          <span className="text-xs text-foreground/60">{description}</span>
        </div>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}

export function EditingPanel({
  state,
  onStateChange,
  onCropToggle,
  onTrimToggle,
  mediaDuration,
  isAudioOnly,
  className,
}: EditingPanelProps) {
  const idPrefix = useId();
  const [selectedFilter, setSelectedFilter] =
    useState<FilterType>("brightness");
  const slidersIconRef = useRef<SlidersHorizontalIconHandle>(null);

  const handleCropToggle = useCallback(
    (enabled: boolean) => {
      onStateChange({
        ...state,
        crop: { ...state.crop, enabled },
      });
      onCropToggle?.(enabled);
    },
    [state, onStateChange, onCropToggle],
  );

  const handleTrimToggle = useCallback(
    (enabled: boolean) => {
      onStateChange({
        ...state,
        trim: {
          ...state.trim,
          enabled,
          // Initialize start/end when enabling
          start: enabled ? 0 : state.trim.start,
          end: enabled ? (mediaDuration ?? 0) : state.trim.end,
        },
      });
      onTrimToggle?.(enabled);
    },
    [state, onStateChange, onTrimToggle, mediaDuration],
  );

  const handleRotateToggle = useCallback(
    (enabled: boolean) => {
      onStateChange({
        ...state,
        rotate: { enabled, degrees: enabled ? 90 : 0 },
      });
    },
    [state, onStateChange],
  );

  const handleRotateDegreeChange = useCallback(
    (degrees: 0 | 90 | 180 | 270) => {
      onStateChange({
        ...state,
        rotate: { enabled: true, degrees },
      });
    },
    [state, onStateChange],
  );

  const handleMuteToggle = useCallback(
    (enabled: boolean) => {
      onStateChange({
        ...state,
        mute: { enabled },
      });
    },
    [state, onStateChange],
  );

  const handleFineTuneToggle = useCallback(
    (enabled: boolean) => {
      onStateChange({
        ...state,
        fineTune: { ...state.fineTune, enabled },
      });
    },
    [state, onStateChange],
  );

  const handleFilterChange = useCallback(
    (filterKey: FilterType, value: number) => {
      onStateChange({
        ...state,
        fineTune: {
          enabled: true, // Auto-enable when adjusting
          filters: {
            ...state.fineTune.filters,
            [filterKey]: value,
          },
        },
      });
    },
    [state, onStateChange],
  );

  const handleResetFilters = useCallback(() => {
    onStateChange({
      ...state,
      fineTune: {
        enabled: false,
        filters: defaultFineTuneFilters,
      },
    });
  }, [state, onStateChange]);

  // Check if any filter has a non-zero value
  const hasActiveFilters = Object.values(state.fineTune.filters).some(
    (v) => v !== 0,
  );

  return (
    <Card
      className={cn(
        "shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.1)]",
        className,
      )}
    >
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          {/* <Scissors className="size-5" /> */}
          <ScissorsIcon animateOnHover />
          Editing
        </CardTitle>
        <CardDescription>
          Enable editing features to transform your media
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="transform" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="transform">
              <ScissorsIcon animateOnHover size={20} />
              Transform
            </TabsTrigger>
            <TabsTrigger
              value="fine-tunes"
              disabled={isAudioOnly}
              onMouseEnter={() => slidersIconRef.current?.startAnimation()}
              onMouseLeave={() => slidersIconRef.current?.stopAnimation()}
            >
              <SlidersHorizontalIcon ref={slidersIconRef} size={20} />
              Fine-Tunes
            </TabsTrigger>
          </TabsList>

          {/* Transform Tab */}
          <TabsContent value="transform" className="space-y-3 mt-4">
            {/* Crop Toggle - only for video */}
            {!isAudioOnly && (
              <ToggleItem
                id={`${idPrefix}-crop`}
                icon={<CropIcon size={20} animateOnHover animateOnView />}
                label="Crop"
                description="Select a region to crop from the video"
                checked={state.crop.enabled}
                onCheckedChange={handleCropToggle}
              />
            )}

            {/* Trim Toggle */}
            <ToggleItem
              id={`${idPrefix}-trim`}
              icon={<ScissorsIcon animateOnView animateOnHover size={20} />}
              label="Trim"
              description="Set start and end points"
              checked={state.trim.enabled}
              onCheckedChange={handleTrimToggle}
            />

            {/* Trim info when active */}
            {state.trim.enabled && (
              <div className="p-3 rounded-base border-2 border-main bg-main/10 text-sm">
                <div className="font-semibold mb-1 flex items-center gap-2">
                  <ScissorsIcon animateOnHover />
                  Trim Range
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div>Start: {formatTime(state.trim.start)}</div>
                  <div>End: {formatTime(state.trim.end)}</div>
                </div>
                <div className="mt-2 text-xs text-foreground/60">
                  Duration: {formatTime(state.trim.end - state.trim.start)}
                </div>
                <p className="text-xs text-foreground/60 mt-2">
                  Drag the handles on the seek bar to adjust
                </p>
              </div>
            )}

            {/* Rotate Toggle - only for video */}
            {!isAudioOnly && (
              <>
                <ToggleItem
                  id={`${idPrefix}-rotate`}
                  icon={
                    <RotateCcwIcon size={20} animateOnHover animateOnView />
                  }
                  label="Rotate"
                  description="Rotate the video 90°, 180°, or 270°"
                  checked={state.rotate.enabled}
                  onCheckedChange={handleRotateToggle}
                />

                {/* Rotation degree selector */}
                {state.rotate.enabled && (
                  <div className="p-3 rounded-base border-2 border-main bg-main/10">
                    <div className="font-semibold mb-2 flex items-center gap-2 text-sm">
                      <RotateCcw className="size-4" />
                      Rotation Angle
                    </div>
                    <div className="flex gap-2">
                      {([90, 180, 270] as const).map((degree) => (
                        <Button
                          key={degree}
                          size="sm"
                          variant={
                            state.rotate.degrees === degree
                              ? "default"
                              : "neutral"
                          }
                          onClick={() => handleRotateDegreeChange(degree)}
                          className={cn(
                            "flex-1 font-mono font-bold",
                            state.rotate.degrees === degree &&
                              "ring-2 ring-offset-2 ring-main",
                          )}
                        >
                          {degree}°
                        </Button>
                      ))}
                    </div>
                    <p className="text-xs text-foreground/60 mt-2">
                      Video will be rotated {state.rotate.degrees}° clockwise
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Mute Toggle */}
            <ToggleItem
              id={`${idPrefix}-mute`}
              icon={<VolumeOffIcon size={20} animateOnHover animateOnView />}
              label="Remove Audio"
              description="Strip the audio track from output"
              checked={state.mute.enabled}
              onCheckedChange={handleMuteToggle}
            />

            {/* Crop info when active */}
            {state.crop.enabled && state.crop.rect && (
              <div className="p-3 rounded-base border-2 border-main bg-main/10 text-sm">
                <div className="font-semibold mb-1 flex items-center gap-2">
                  <Crop className="size-4" />
                  Crop Region
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div>Left: {Math.round(state.crop.rect.left * 100)}%</div>
                  <div>Top: {Math.round(state.crop.rect.top * 100)}%</div>
                  <div>Width: {Math.round(state.crop.rect.width * 100)}%</div>
                  <div>Height: {Math.round(state.crop.rect.height * 100)}%</div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Fine-Tunes Tab */}
          <TabsContent value="fine-tunes" className="space-y-4 mt-4">
            {/* Enable/Disable Toggle */}
            <ToggleItem
              id={`${idPrefix}-fine-tune`}
              icon={<SlidersHorizontal className="size-5" />}
              label="Color Adjustments"
              description="Fine-tune brightness, contrast, and more"
              checked={state.fineTune.enabled}
              onCheckedChange={handleFineTuneToggle}
            />

            {/* Filter Selector Buttons */}
            <div className="flex flex-wrap gap-1.5">
              {FILTER_OPTIONS.map(({ key, label }) => {
                const value = state.fineTune.filters[key];
                const isActive = value !== 0;

                return (
                  <Button
                    key={key}
                    size="sm"
                    variant={selectedFilter === key ? "default" : "neutral"}
                    onClick={() => setSelectedFilter(key)}
                    className={cn(
                      "text-xs px-2 py-1 h-auto",
                      isActive && selectedFilter !== key && "border-main",
                    )}
                  >
                    {label}
                    {isActive && (
                      <span className="ml-1 text-[10px] opacity-70">
                        {value > 0 ? `+${value}` : value}
                      </span>
                    )}
                  </Button>
                );
              })}
            </div>

            {/* Scrubbable Input */}
            <ScrubbableInput
              value={state.fineTune.filters[selectedFilter]}
              onChange={(value) => handleFilterChange(selectedFilter, value)}
              label={
                FILTER_OPTIONS.find((f) => f.key === selectedFilter)?.label
              }
              min={-100}
              max={100}
            />

            {/* Reset Button */}
            {hasActiveFilters && (
              <Button
                variant="neutral"
                size="sm"
                onClick={handleResetFilters}
                className="w-full"
              >
                Reset All Filters
              </Button>
            )}

            {/* Active filters summary */}
            {state.fineTune.enabled && hasActiveFilters && (
              <div className="p-3 rounded-base border-2 border-main bg-main/10 text-sm">
                <div className="font-semibold mb-2 flex items-center gap-2">
                  <SlidersHorizontal className="size-4" />
                  Active Adjustments
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs font-mono">
                  {FILTER_OPTIONS.map(({ key, label }) => {
                    const value = state.fineTune.filters[key];
                    if (value === 0) return null;
                    return (
                      <div key={key} className="flex justify-between">
                        <span>{label}:</span>
                        <span className={value > 0 ? "text-main" : ""}>
                          {value > 0 ? `+${value}` : value}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
