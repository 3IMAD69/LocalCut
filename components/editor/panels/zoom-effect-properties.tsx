"use client";

import { RotateCcw } from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_ZOOM_EFFECT,
  type ZoomEasing,
  type ZoomEffect,
} from "@/components/editor/preview/timeline-player-context";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

// ── Easing presets ─────────────────────────────────────────────────────
const EASING_OPTIONS: { value: ZoomEasing; label: string }[] = [
  { value: "screen-studio", label: "Screen Studio" },
  { value: "ease-in-out", label: "Ease In/Out" },
  { value: "ease-in", label: "Ease In" },
  { value: "ease-out", label: "Ease Out" },
  { value: "linear", label: "Linear" },
  { value: "spring", label: "Spring" },
];

// ── Slider row ─────────────────────────────────────────────────────────
function SliderRow({
  label,
  value,
  min,
  max,
  step,
  formatValue,
  onChange,
  onCommit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  formatValue?: (v: number) => string;
  onChange: (v: number) => void;
  onCommit: (v: number) => void;
}) {
  const display = formatValue ? formatValue(value) : String(value);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-foreground/70">{label}</span>
        <span className="text-xs text-muted-foreground tabular-nums w-14 text-right">
          {display}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
        onValueCommit={([v]) => onCommit(v)}
      />
    </div>
  );
}

// ── Focal point picker ────────────────────────────────────────────────
function FocalPointPicker({
  x,
  y,
  onChange,
}: {
  x: number;
  y: number;
  onChange: (x: number, y: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointer = useCallback(
    (e: React.MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const ny = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
      onChange(Math.round(nx * 100) / 100, Math.round(ny * 100) / 100);
    },
    [onChange],
  );

  return (
    <div className="space-y-2">
      <Label className="text-xs text-foreground/70">Focal Point</Label>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: focal point picker needs mouse interaction */}
      <div
        ref={containerRef}
        className="relative w-full h-24 rounded-lg border border-border/50 bg-muted/40 cursor-crosshair overflow-hidden"
        onMouseDown={(e) => {
          handlePointer(e);
          const handleMove = (ev: MouseEvent) =>
            handlePointer(ev as unknown as React.MouseEvent);
          const handleUp = () => {
            window.removeEventListener("mousemove", handleMove);
            window.removeEventListener("mouseup", handleUp);
          };
          window.addEventListener("mousemove", handleMove);
          window.addEventListener("mouseup", handleUp);
        }}
      >
        {/* Grid lines */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-1/3 top-0 bottom-0 w-px bg-border/30" />
          <div className="absolute left-2/3 top-0 bottom-0 w-px bg-border/30" />
          <div className="absolute top-1/3 left-0 right-0 h-px bg-border/30" />
          <div className="absolute top-2/3 left-0 right-0 h-px bg-border/30" />
        </div>
        {/* Focal point indicator */}
        <div
          className="absolute w-3 h-3 rounded-full border-2 border-purple-400 bg-purple-400/30 -translate-x-1/2 -translate-y-1/2 shadow-sm"
          style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>X: {x.toFixed(2)}</span>
        <span>Y: {y.toFixed(2)}</span>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────
interface ZoomEffectPropertiesProps {
  effect: ZoomEffect;
  onChange: (effect: ZoomEffect) => void;
  className?: string;
}

export const ZoomEffectProperties = memo(function ZoomEffectProperties({
  effect,
  onChange,
  className,
}: ZoomEffectPropertiesProps) {
  // Local state for instant slider feedback
  const [local, setLocal] = useState(effect);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const isDraggingRef = useRef(false);

  // Sync from parent when not dragging
  useEffect(() => {
    if (!isDraggingRef.current) {
      setLocal(effect);
    }
  }, [effect]);

  const update = useCallback(
    (patch: Partial<ZoomEffect>, commit: boolean) => {
      const next = { ...local, ...patch };
      setLocal(next);
      if (commit) {
        isDraggingRef.current = false;
        onChangeRef.current(next);
      } else {
        isDraggingRef.current = true;
      }
    },
    [local],
  );

  const handleReset = useCallback(() => {
    isDraggingRef.current = false;
    const reset: ZoomEffect = {
      ...local,
      ...DEFAULT_ZOOM_EFFECT,
    };
    setLocal(reset);
    onChangeRef.current(reset);
  }, [local]);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-purple-400 uppercase tracking-wider">
          Zoom Effect
        </h4>
      </div>

      {/* Scale */}
      <SliderRow
        label="Zoom Scale"
        value={local.scale}
        min={1}
        max={5}
        step={0.1}
        formatValue={(v) => `${v.toFixed(1)}x`}
        onChange={(v) => update({ scale: v }, false)}
        onCommit={(v) => update({ scale: v }, true)}
      />

      {/* Focal point */}
      <FocalPointPicker
        x={local.x}
        y={local.y}
        onChange={(nx, ny) => update({ x: nx, y: ny }, true)}
      />

      {/* Ease In */}
      <div className="space-y-2 pt-2 border-t border-border/30">
        <Label className="text-xs text-foreground/70">Ease In</Label>
        <Select
          value={local.easeIn}
          onValueChange={(v) => update({ easeIn: v as ZoomEasing }, true)}
        >
          <SelectTrigger className="w-full bg-card border-border/50 h-8 text-xs">
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

      {/* Ease Out */}
      <div className="space-y-2 pt-2 border-t border-border/30">
        <Label className="text-xs text-foreground/70">Ease Out</Label>
        <Select
          value={local.easeOut}
          onValueChange={(v) => update({ easeOut: v as ZoomEasing }, true)}
        >
          <SelectTrigger className="w-full bg-card border-border/50 h-8 text-xs">
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

      {/* Motion Blur */}
      <div className="space-y-3 pt-2 border-t border-border/30">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-foreground/70">Motion Blur</Label>
          <Switch
            checked={local.motionBlur}
            onCheckedChange={(v) => update({ motionBlur: v }, true)}
          />
        </div>
        {local.motionBlur && (
          <SliderRow
            label="Intensity"
            value={local.motionBlurAmount}
            min={0}
            max={1}
            step={0.05}
            formatValue={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => update({ motionBlurAmount: v }, false)}
            onCommit={(v) => update({ motionBlurAmount: v }, true)}
          />
        )}
      </div>

      {/* Reset */}
      <div className="pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          className="w-full gap-2 text-xs"
        >
          <RotateCcw className="w-3 h-3" />
          Reset Zoom
        </Button>
      </div>
    </div>
  );
});
