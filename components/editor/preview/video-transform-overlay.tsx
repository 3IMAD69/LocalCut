"use client";

import { Move } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

export interface OverlayRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface VideoTransformOverlayProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  rect: OverlayRect | null;
  isActive: boolean;
  onMove?: (delta: { dx: number; dy: number }) => void;
}

export function VideoTransformOverlay({
  containerRef,
  rect,
  isActive,
  onMove,
}: VideoTransformOverlayProps) {
  const [containerBounds, setContainerBounds] = useState<DOMRect | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const initialRectRef = useRef<OverlayRect | null>(null);

  useLayoutEffect(() => {
    if (!isActive || !containerRef.current) return;

    const updateBounds = () => {
      if (!containerRef.current) return;
      setContainerBounds(containerRef.current.getBoundingClientRect());
    };

    updateBounds();

    const resizeObserver = new ResizeObserver(updateBounds);
    resizeObserver.observe(containerRef.current);

    window.addEventListener("resize", updateBounds);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateBounds);
    };
  }, [containerRef, isActive]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!rect) return;

      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      initialRectRef.current = rect;
    },
    [rect],
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!initialRectRef.current) return;

      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      onMove?.({ dx, dy });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      initialRectRef.current = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragStart, isDragging, onMove]);

  if (!isActive || !containerBounds || !rect) return null;

  const handles = ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const;

  return (
    <div className="absolute inset-0 z-30 pointer-events-none">
      <div
        role="application"
        aria-label="Video transform region"
        className={cn(
          "absolute pointer-events-auto",
          "border-2 border-main",
          "shadow-[0_0_0_2px_rgba(0,0,0,0.35)]",
          isDragging ? "cursor-grabbing" : "cursor-grab",
        )}
        style={{
          left: rect.x,
          top: rect.y,
          width: rect.width,
          height: rect.height,
        }}
        onMouseDown={handleMouseDown}
      >
        <div className="absolute -top-9 left-0 flex items-center gap-2 px-2 py-1 border-2 border-border bg-background shadow-shadow text-xs font-heading">
          <Move className="h-3.5 w-3.5" />
          Drag to move
        </div>

        {handles.map((handle) => (
          <div
            key={handle}
            className={cn(
              "absolute size-3 bg-main border-2 border-border",
              // Corners
              handle === "nw" &&
                "left-0 top-0 -translate-x-1/2 -translate-y-1/2",
              handle === "ne" &&
                "right-0 top-0 translate-x-1/2 -translate-y-1/2",
              handle === "sw" &&
                "left-0 bottom-0 -translate-x-1/2 translate-y-1/2",
              handle === "se" &&
                "right-0 bottom-0 translate-x-1/2 translate-y-1/2",
              // Edges
              handle === "n" &&
                "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2",
              handle === "s" &&
                "left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2",
              handle === "w" &&
                "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2",
              handle === "e" &&
                "right-0 top-1/2 translate-x-1/2 -translate-y-1/2",
            )}
          />
        ))}
      </div>
    </div>
  );
}
