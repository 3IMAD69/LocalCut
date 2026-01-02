"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ScrubbableInputProps {
  /** Current value (-100 to +100) */
  value: number;
  /** Called when value changes */
  onChange: (value: number) => void;
  /** Minimum value (default: -100) */
  min?: number;
  /** Maximum value (default: 100) */
  max?: number;
  /** Step size for keyboard/fine adjustment (default: 1) */
  step?: number;
  /** Label shown above the control */
  label?: string;
  /** Disable the control */
  disabled?: boolean;
  /** Additional class name */
  className?: string;
}

/**
 * A virtual ruler / tape scrubber input.
 * - Fixed center indicator (cursor)
 * - Ruler track moves left/right when dragging
 * - Drag left = increase value, drag right = decrease value
 * - Infinite tape effect with tick marks appearing from edges
 */
export function ScrubbableInput({
  value,
  onChange,
  min = -100,
  max = 100,
  step = 1,
  label,
  disabled = false,
  className,
}: ScrubbableInputProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const [isDraggingState, setIsDraggingState] = useState(false);
  const lastX = useRef(0);

  const clamp = useCallback(
    (v: number) => Math.max(min, Math.min(max, v)),
    [min, max],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;

      isDragging.current = true;
      setIsDraggingState(true);
      lastX.current = e.clientX;

      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      e.preventDefault();
    },
    [disabled],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current || disabled) return;

      // Sensitivity: pixels per unit change
      // Higher = more precise control
      const sensitivity = 3;
      const deltaX = e.clientX - lastX.current;

      // Only update if we've moved enough
      if (Math.abs(deltaX) >= sensitivity) {
        // Drag right = increase, drag left = decrease
        const deltaValue = -Math.round(deltaX / sensitivity);
        const newValue = clamp(value + deltaValue);

        if (newValue !== value) {
          onChange(newValue);
        }

        lastX.current = e.clientX;
      }
    },
    [disabled, clamp, onChange, value],
  );

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (isDragging.current) {
      isDragging.current = false;
      setIsDraggingState(false);
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;

      let newValue = value;

      switch (e.key) {
        case "ArrowLeft":
        case "ArrowDown":
          newValue = clamp(value - step);
          break;
        case "ArrowRight":
        case "ArrowUp":
          newValue = clamp(value + step);
          break;
        case "Home":
          newValue = min;
          break;
        case "End":
          newValue = max;
          break;
        default:
          return;
      }

      e.preventDefault();
      onChange(newValue);
    },
    [disabled, value, step, min, max, clamp, onChange],
  );

  // Double-click to reset to 0
  const handleDoubleClick = useCallback(() => {
    if (disabled) return;
    onChange(0);
  }, [disabled, onChange]);

  // Calculate the offset for the ruler based on current value
  // Each unit = some pixels of offset
  // Negative because dragging right (increasing value) should move ruler left
  const pixelsPerUnit = 4;
  const rulerOffset = -value * pixelsPerUnit;

  // Generate tick marks for the infinite ruler (memoized)
  // We generate more than visible to create the infinite effect
  const tickSpacing = 20; // pixels between ticks
  const containerWidth = 400; // approximate width
  const extraTicks = 20; // extra ticks on each side
  const tickCount = Math.ceil(containerWidth / tickSpacing) + extraTicks * 2;

  const ticks = useMemo(() => {
    return Array.from({ length: tickCount }, (_, i) => {
      const tickIndex = i - Math.floor(tickCount / 2);
      const tickValue = -tickIndex * (tickSpacing / pixelsPerUnit);
      const isZero = Math.abs(tickValue) < 0.5;
      const isMajor = Math.abs(tickValue % 25) < 0.5;
      return { tickIndex, tickValue, isZero, isMajor, left: i * tickSpacing };
    });
  }, [tickCount]);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label && (
        <span className="text-xs font-medium text-foreground/70">{label}</span>
      )}

      <div
        ref={containerRef}
        className={cn(
          "relative h-14 rounded-base border-2 border-border bg-secondary-background overflow-hidden",
          "cursor-ew-resize select-none touch-none",
          "transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-main focus-visible:ring-offset-2",
          isDraggingState && "border-main bg-main/5",
          disabled && "opacity-50 cursor-not-allowed",
        )}
        tabIndex={disabled ? -1 : 0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
        onDoubleClick={handleDoubleClick}
        role="slider"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={label}
        aria-disabled={disabled}
      >
        {/* Moving ruler track */}
        <div
          className="absolute inset-y-0 flex items-center"
          style={{
            left: "50%",
            transform: `translateX(calc(-50% + ${rulerOffset}px))`,
            width: `${tickCount * tickSpacing}px`,
            transition: isDraggingState ? "none" : "transform 0.1s ease-out",
          }}
        >
          {ticks.map((tick) => (
            <div
              key={tick.tickIndex}
              className="absolute flex flex-col items-center"
              style={{
                left: `${tick.left}px`,
                transform: "translateX(-50%)",
              }}
            >
              {/* Tick mark */}
              <div
                className={cn(
                  "rounded-full",
                  tick.isZero
                    ? "w-1 h-5 bg-main"
                    : tick.isMajor
                      ? "w-1 h-4 bg-foreground/50"
                      : "w-0.5 h-3 bg-foreground/25",
                )}
              />
              {/* Label for zero tick */}
              {tick.isZero && (
                <span className="absolute top-7 text-[9px] font-mono text-main font-bold">
                  0
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Fixed center indicator (cursor) */}
        <div className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 flex flex-col items-center justify-center pointer-events-none z-10">
          {/* Top triangle */}
          <div
            className={cn(
              "w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px]",
              "border-l-transparent border-r-transparent",
              isDraggingState ? "border-t-main" : "border-t-foreground",
            )}
          />
          {/* Center line */}
          <div
            className={cn(
              "w-0.5 flex-1",
              isDraggingState ? "bg-main" : "bg-foreground",
            )}
          />
          {/* Bottom triangle */}
          <div
            className={cn(
              "w-0 h-0 border-l-[6px] border-r-[6px] border-b-[8px]",
              "border-l-transparent border-r-transparent",
              isDraggingState ? "border-b-main" : "border-b-foreground",
            )}
          />
        </div>
      </div>

      {/* Value display */}
      <div className="flex items-center justify-center">
        <span
          className={cn(
            "font-mono text-sm font-bold tabular-nums",
            value === 0
              ? "text-foreground/50"
              : value > 0
                ? "text-main"
                : "text-foreground",
          )}
        >
          {value > 0 ? `+${value}` : value}
        </span>
      </div>
    </div>
  );
}
