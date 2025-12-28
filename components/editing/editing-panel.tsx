"use client";

import { Crop, RotateCcw, Scissors, Volume2 } from "lucide-react";
import { useCallback, useId } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { CropRect } from "./crop-overlay";

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
}

export const defaultEditingState: EditingState = {
  crop: { enabled: false, rect: null },
  trim: { enabled: false, start: 0, end: 0 },
  rotate: { enabled: false, degrees: 0 },
  mute: { enabled: false },
};

interface EditingPanelProps {
  state: EditingState;
  onStateChange: (state: EditingState) => void;
  /** Callback when crop toggle changes - used for scrolling to player */
  onCropToggle?: (enabled: boolean) => void;
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
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex items-center justify-center size-10 rounded-base",
            "border-2 border-border bg-secondary-background",
            "transition-all duration-200",
            checked && "border-main bg-main text-white"
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
  isAudioOnly,
  className,
}: EditingPanelProps) {
  const idPrefix = useId();

  const handleCropToggle = useCallback(
    (enabled: boolean) => {
      onStateChange({
        ...state,
        crop: { ...state.crop, enabled },
      });
      onCropToggle?.(enabled);
    },
    [state, onStateChange, onCropToggle]
  );

  const handleTrimToggle = useCallback(
    (enabled: boolean) => {
      onStateChange({
        ...state,
        trim: { ...state.trim, enabled },
      });
    },
    [state, onStateChange]
  );

  const handleRotateToggle = useCallback(
    (enabled: boolean) => {
      onStateChange({
        ...state,
        rotate: { enabled, degrees: enabled ? 90 : 0 },
      });
    },
    [state, onStateChange]
  );

  const handleRotateDegreeChange = useCallback(
    (degrees: 0 | 90 | 180 | 270) => {
      onStateChange({
        ...state,
        rotate: { enabled: true, degrees },
      });
    },
    [state, onStateChange]
  );

  const handleMuteToggle = useCallback(
    (enabled: boolean) => {
      onStateChange({
        ...state,
        mute: { enabled },
      });
    },
    [state, onStateChange]
  );

  return (
    <Card
      className={cn(
        "shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.1)]",
        className
      )}
    >
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Scissors className="size-5" />
          Editing
        </CardTitle>
        <CardDescription>
          Enable editing features to transform your media
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Crop Toggle - only for video */}
        {!isAudioOnly && (
          <ToggleItem
            id={`${idPrefix}-crop`}
            icon={<Crop className="size-5" />}
            label="Crop"
            description="Select a region to crop from the video"
            checked={state.crop.enabled}
            onCheckedChange={handleCropToggle}
          />
        )}

        {/* Trim Toggle */}
        <ToggleItem
          id={`${idPrefix}-trim`}
          icon={<Scissors className="size-5" />}
          label="Trim"
          description="Set start and end points"
          checked={state.trim.enabled}
          onCheckedChange={handleTrimToggle}
          disabled // TODO: Implement trim controls
        />

        {/* Rotate Toggle - only for video */}
        {!isAudioOnly && (
          <>
            <ToggleItem
              id={`${idPrefix}-rotate`}
              icon={<RotateCcw className="size-5" />}
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
                      variant={state.rotate.degrees === degree ? "default" : "neutral"}
                      onClick={() => handleRotateDegreeChange(degree)}
                      className={cn(
                        "flex-1 font-mono font-bold",
                        state.rotate.degrees === degree && "ring-2 ring-offset-2 ring-main"
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
          icon={<Volume2 className="size-5" />}
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
              <div>
                Left: {Math.round(state.crop.rect.left * 100)}%
              </div>
              <div>
                Top: {Math.round(state.crop.rect.top * 100)}%
              </div>
              <div>
                Width: {Math.round(state.crop.rect.width * 100)}%
              </div>
              <div>
                Height: {Math.round(state.crop.rect.height * 100)}%
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
