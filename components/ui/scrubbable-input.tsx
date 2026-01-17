"use client";

import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const [isHovered, setIsHovered] = useState(false);
  const lastX = useRef(0);

  // Motion values for smooth animations
  const rulerOffsetMotion = useMotionValue(-value * 4);
  const scale = useMotionValue(1);

  // iOS-like spring physics - only for ruler, not for scale during drag
  const smoothRulerOffset = useSpring(rulerOffsetMotion, {
    stiffness: isDraggingState ? 500 : 350,
    damping: isDraggingState ? 40 : 30,
    mass: 0.3,
  });

  const smoothScale = useSpring(scale, {
    stiffness: 500,
    damping: 30,
  });

  // Transform must be called at top level, not inside useMemo
  const rulerTransform = useTransform(
    smoothRulerOffset,
    (v) => `calc(-50% + ${v}px)`,
  );

  const clamp = useCallback(
    (v: number) => Math.max(min, Math.min(max, v)),
    [min, max],
  );

  // Update ruler offset when value changes
  useEffect(() => {
    const pixelsPerUnit = 4;
    const rulerOffset = -value * pixelsPerUnit;
    rulerOffsetMotion.set(rulerOffset);
  }, [value, rulerOffsetMotion]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;

      isDragging.current = true;
      setIsDraggingState(true);
      lastX.current = e.clientX;

      // Scale down for press feedback
      scale.set(0.98);

      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      e.preventDefault();
    },
    [disabled, scale],
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

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (isDragging.current) {
        isDragging.current = false;
        setIsDraggingState(false);

        // Return to normal scale
        scale.set(1);

        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      }
    },
    [scale],
  );

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

  // Generate tick marks for the infinite ruler (memoized)
  // We generate more than visible to create the infinite effect
  const tickSpacing = 20; // pixels between ticks
  const containerWidth = 400; // approximate width
  const extraTicks = 20; // extra ticks on each side
  const tickCount = Math.ceil(containerWidth / tickSpacing) + extraTicks * 2;
  const pixelsPerUnit = 4;

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
        <motion.span
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          className="text-xs font-medium text-foreground/70"
        >
          {label}
        </motion.span>
      )}

      <motion.div
        ref={containerRef}
        style={{ scale: smoothScale }}
        className={cn(
          "relative h-14 rounded-md border border-border bg-muted overflow-hidden",
          "cursor-ew-resize select-none touch-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          isDraggingState && "border-primary bg-primary/5",
          disabled && "opacity-50 cursor-not-allowed",
        )}
        tabIndex={disabled ? -1 : 0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerEnter={() => setIsHovered(true)}
        onPointerLeave={() => setIsHovered(false)}
        onKeyDown={handleKeyDown}
        onDoubleClick={handleDoubleClick}
        role="slider"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={label}
        aria-disabled={disabled}
        whileHover={!disabled ? { borderColor: "var(--primary)" } : undefined}
        transition={{
          borderColor: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] },
        }}
      >
        {/* Moving ruler track */}
        <motion.div
          className="absolute inset-y-0 flex items-center will-change-transform"
          style={{
            left: "50%",
            x: rulerTransform,
            width: `${tickCount * tickSpacing}px`,
          }}
        >
          {ticks.map((tick) => {
            // Only animate zero tick and major ticks for performance
            const shouldAnimate = tick.isZero || tick.isMajor;

            if (!shouldAnimate) {
              return (
                <div
                  key={tick.tickIndex}
                  className="absolute flex flex-col items-center"
                  style={{
                    left: `${tick.left}px`,
                    transform: "translateX(-50%)",
                  }}
                >
                  <div className="w-0.5 h-3 bg-foreground/25 rounded-full" />
                </div>
              );
            }

            return (
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
                    "rounded-full transition-all duration-150",
                    tick.isZero
                      ? "w-1 h-5 bg-primary"
                      : "w-1 h-4 bg-foreground/50",
                  )}
                  style={{
                    transform:
                      tick.isZero && isDraggingState
                        ? "scaleY(1.1)"
                        : "scaleY(1)",
                  }}
                />
                {/* Label for zero tick */}
                {tick.isZero && (
                  <span
                    className="absolute top-7 text-[9px] font-mono text-primary font-bold transition-transform duration-150"
                    style={{
                      transform: isDraggingState ? "scale(1.1)" : "scale(1)",
                    }}
                  >
                    0
                  </span>
                )}
              </div>
            );
          })}
        </motion.div>

        {/* Fixed center indicator (cursor) */}
        <div
          className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 flex flex-col items-center justify-center pointer-events-none z-10 transition-all duration-150"
          style={{
            transform: isDraggingState
              ? "translateX(-50%) scale(1.05)"
              : "translateX(-50%) scale(1)",
          }}
        >
          {/* Top triangle */}
          <div
            className={cn(
              "w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px]",
              "border-l-transparent border-r-transparent transition-all duration-150",
              isDraggingState ? "border-t-primary" : "border-t-foreground",
            )}
            style={{
              opacity: isDraggingState || isHovered ? 1 : 0.7,
            }}
          />
          {/* Center line */}
          <div
            className={cn(
              "w-0.5 flex-1 transition-all duration-150",
              isDraggingState ? "bg-primary" : "bg-foreground",
            )}
            style={{
              opacity: isDraggingState || isHovered ? 1 : 0.7,
              transform: isDraggingState ? "scaleX(1.5)" : "scaleX(1)",
            }}
          />
          {/* Bottom triangle */}
          <div
            className={cn(
              "w-0 h-0 border-l-[6px] border-r-[6px] border-b-[8px]",
              "border-l-transparent border-r-transparent transition-all duration-150",
              isDraggingState ? "border-b-primary" : "border-b-foreground",
            )}
            style={{
              opacity: isDraggingState || isHovered ? 1 : 0.7,
            }}
          />
        </div>
      </motion.div>

      {/* Value display */}
      <div className="flex items-center justify-center">
        <span
          className={cn(
            "font-mono text-sm font-bold tabular-nums transition-all duration-150",
            value === 0
              ? "text-foreground/50"
              : value > 0
                ? "text-primary"
                : "text-foreground",
          )}
        >
          {value > 0 ? `+${value}` : value}
        </span>
      </div>
    </div>
  );
}
