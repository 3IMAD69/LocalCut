"use client";

import { cn } from "@/lib/utils";
import {
  RotateCw,
  Crop,
  Maximize2,
  Scissors,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export interface ClipProperties {
  id: string;
  name: string;
  type: "video" | "audio";
  // Transform properties
  positionX: number;
  positionY: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  // Crop properties
  cropTop: number;
  cropBottom: number;
  cropLeft: number;
  cropRight: number;
  // Trim properties
  trimStart: number;
  trimEnd: number;
  duration: number;
  // Resample properties
  speed: number;
}

interface PropertiesPanelProps {
  clip: ClipProperties | null;
  onChange?: (properties: Partial<ClipProperties>) => void;
  className?: string;
}

interface PropertySectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function PropertySection({
  title,
  icon,
  children,
  defaultOpen = true,
}: PropertySectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={cn(
            "w-full flex items-center justify-between",
            "px-3 py-2 border-b-2 border-border",
            "bg-secondary-background hover:bg-main/10",
            "text-xs font-heading uppercase tracking-wide"
          )}
        >
          <div className="flex items-center gap-2">
            {icon}
            {title}
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="p-3 space-y-3 border-b-2 border-border">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

interface PropertyRowProps {
  label: string;
  children: React.ReactNode;
}

function PropertyRow({ label, children }: PropertyRowProps) {
  return (
    <div className="flex items-center gap-2">
      <Label className="w-20 text-xs text-foreground/70 shrink-0">{label}</Label>
      <div className="flex-1">{children}</div>
    </div>
  );
}

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}

function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
}: NumberInputProps) {
  return (
    <div className="relative">
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="h-8 text-xs pr-8"
      />
      {suffix && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-foreground/50">
          {suffix}
        </span>
      )}
    </div>
  );
}

export function PropertiesPanel({
  clip,
  onChange,
  className,
}: PropertiesPanelProps) {
  if (!clip) {
    return (
      <div
        className={cn(
          "flex flex-col border-2 border-border bg-background h-full",
          className
        )}
      >
        <div className="flex items-center px-3 py-2 border-b-2 border-border bg-secondary-background">
          <span className="text-xs font-heading uppercase tracking-wide">
            Properties
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-sm text-foreground/40 text-center">
            Select a clip to edit its properties
          </p>
        </div>
      </div>
    );
  }

  const handleChange = (key: keyof ClipProperties, value: number) => {
    onChange?.({ [key]: value });
  };

  return (
    <div
      className={cn(
        "flex flex-col border-2 border-border bg-background h-full",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b-2 border-border bg-secondary-background">
        <span className="text-xs font-heading uppercase tracking-wide">
          Properties
        </span>
        <span
          className={cn(
            "px-2 py-0.5 border-2 border-border text-[10px] font-heading uppercase",
            clip.type === "video" ? "bg-chart-2" : "bg-chart-3"
          )}
        >
          {clip.type}
        </span>
      </div>

      {/* Clip Name */}
      <div className="px-3 py-2 border-b-2 border-border">
        <p className="text-sm font-heading truncate" title={clip.name}>
          {clip.name}
        </p>
      </div>

      {/* Properties Sections */}
      <div className="flex-1 overflow-y-auto">
        {/* Transform Section - Video only */}
        {clip.type === "video" && (
          <PropertySection
            title="Transform"
            icon={<Maximize2 className="h-3 w-3" />}
          >
            <PropertyRow label="Position X">
              <NumberInput
                value={clip.positionX}
                onChange={(v) => handleChange("positionX", v)}
                suffix="px"
              />
            </PropertyRow>
            <PropertyRow label="Position Y">
              <NumberInput
                value={clip.positionY}
                onChange={(v) => handleChange("positionY", v)}
                suffix="px"
              />
            </PropertyRow>
            <PropertyRow label="Scale X">
              <div className="flex items-center gap-2">
                <Slider
                  value={[clip.scaleX * 100]}
                  onValueChange={([v]) => handleChange("scaleX", v / 100)}
                  min={10}
                  max={200}
                  className="flex-1"
                />
                <span className="text-xs w-12 text-right">
                  {Math.round(clip.scaleX * 100)}%
                </span>
              </div>
            </PropertyRow>
            <PropertyRow label="Scale Y">
              <div className="flex items-center gap-2">
                <Slider
                  value={[clip.scaleY * 100]}
                  onValueChange={([v]) => handleChange("scaleY", v / 100)}
                  min={10}
                  max={200}
                  className="flex-1"
                />
                <span className="text-xs w-12 text-right">
                  {Math.round(clip.scaleY * 100)}%
                </span>
              </div>
            </PropertyRow>
          </PropertySection>
        )}

        {/* Rotation Section - Video only */}
        {clip.type === "video" && (
          <PropertySection
            title="Rotation"
            icon={<RotateCw className="h-3 w-3" />}
          >
            <PropertyRow label="Angle">
              <div className="flex items-center gap-2">
                <Slider
                  value={[clip.rotation]}
                  onValueChange={([v]) => handleChange("rotation", v)}
                  min={-180}
                  max={180}
                  className="flex-1"
                />
                <span className="text-xs w-12 text-right">{clip.rotation}°</span>
              </div>
            </PropertyRow>
            <div className="flex gap-1 mt-2">
              {[0, 90, 180, 270].map((angle) => (
                <Button
                  key={angle}
                  variant="noShadow"
                  size="sm"
                  className="flex-1 h-7 text-xs"
                  onClick={() => handleChange("rotation", angle)}
                >
                  {angle}°
                </Button>
              ))}
            </div>
          </PropertySection>
        )}

        {/* Crop Section - Video only */}
        {clip.type === "video" && (
          <PropertySection title="Crop" icon={<Crop className="h-3 w-3" />}>
            <PropertyRow label="Top">
              <NumberInput
                value={clip.cropTop}
                onChange={(v) => handleChange("cropTop", v)}
                min={0}
                max={100}
                suffix="%"
              />
            </PropertyRow>
            <PropertyRow label="Bottom">
              <NumberInput
                value={clip.cropBottom}
                onChange={(v) => handleChange("cropBottom", v)}
                min={0}
                max={100}
                suffix="%"
              />
            </PropertyRow>
            <PropertyRow label="Left">
              <NumberInput
                value={clip.cropLeft}
                onChange={(v) => handleChange("cropLeft", v)}
                min={0}
                max={100}
                suffix="%"
              />
            </PropertyRow>
            <PropertyRow label="Right">
              <NumberInput
                value={clip.cropRight}
                onChange={(v) => handleChange("cropRight", v)}
                min={0}
                max={100}
                suffix="%"
              />
            </PropertyRow>
            <Button
              variant="noShadow"
              size="sm"
              className="w-full h-7 text-xs mt-2"
              onClick={() => {
                onChange?.({
                  cropTop: 0,
                  cropBottom: 0,
                  cropLeft: 0,
                  cropRight: 0,
                });
              }}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Reset Crop
            </Button>
          </PropertySection>
        )}

        {/* Trim Section */}
        <PropertySection title="Trim" icon={<Scissors className="h-3 w-3" />}>
          <PropertyRow label="Start">
            <NumberInput
              value={clip.trimStart}
              onChange={(v) => handleChange("trimStart", v)}
              min={0}
              max={clip.duration}
              step={0.1}
              suffix="s"
            />
          </PropertyRow>
          <PropertyRow label="End">
            <NumberInput
              value={clip.trimEnd}
              onChange={(v) => handleChange("trimEnd", v)}
              min={0}
              max={clip.duration}
              step={0.1}
              suffix="s"
            />
          </PropertyRow>
          <div className="text-xs text-foreground/50 text-center mt-1">
            Duration: {(clip.trimEnd - clip.trimStart).toFixed(1)}s
          </div>
        </PropertySection>

        {/* Speed/Resample Section */}
        <PropertySection
          title="Speed"
          icon={<RefreshCw className="h-3 w-3" />}
          defaultOpen={false}
        >
          <PropertyRow label="Speed">
            <div className="flex items-center gap-2">
              <Slider
                value={[clip.speed * 100]}
                onValueChange={([v]) => handleChange("speed", v / 100)}
                min={25}
                max={400}
                className="flex-1"
              />
              <span className="text-xs w-12 text-right">
                {Math.round(clip.speed * 100)}%
              </span>
            </div>
          </PropertyRow>
          <div className="flex gap-1 mt-2">
            {[0.5, 1, 1.5, 2].map((speed) => (
              <Button
                key={speed}
                variant="noShadow"
                size="sm"
                className="flex-1 h-7 text-xs"
                onClick={() => handleChange("speed", speed)}
              >
                {speed}x
              </Button>
            ))}
          </div>
        </PropertySection>
      </div>
    </div>
  );
}
