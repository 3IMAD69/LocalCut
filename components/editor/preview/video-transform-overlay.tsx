"use client";

import { Move } from "lucide-react";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
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
  onMoveEnd?: () => void;
}

export function VideoTransformOverlay({
  containerRef,
  rect,
  isActive,
  onMove,
  onMoveEnd,
}: VideoTransformOverlayProps) {
  const [containerBounds, setContainerBounds] = useState<DOMRect | null>(null);
  const isDraggingRef = useRef(false);
  // Accumulated drag offset in screen pixels (only meaningful during drag)
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const lastPointerRef = useRef({ x: 0, y: 0 });

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

  // Derive displayed rect synchronously: external rect + drag offset during drag
  const displayRect =
    rect && isDraggingRef.current
      ? { ...rect, x: rect.x + dragOffset.x, y: rect.y + dragOffset.y }
      : rect;

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!rect) return;

      e.currentTarget.setPointerCapture(e.pointerId);
      isDraggingRef.current = true;
      dragOffsetRef.current = { x: 0, y: 0 };
      setDragOffset({ x: 0, y: 0 });
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
    },
    [rect],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current) return;

      const dx = e.clientX - lastPointerRef.current.x;
      const dy = e.clientY - lastPointerRef.current.y;

      lastPointerRef.current = { x: e.clientX, y: e.clientY };

      dragOffsetRef.current = {
        x: dragOffsetRef.current.x + dx,
        y: dragOffsetRef.current.y + dy,
      };
      setDragOffset({ ...dragOffsetRef.current });

      onMove?.({ dx, dy });
    },
    [onMove],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current) return;

      e.currentTarget.releasePointerCapture(e.pointerId);
      isDraggingRef.current = false;
      dragOffsetRef.current = { x: 0, y: 0 };
      setDragOffset({ x: 0, y: 0 });
      onMoveEnd?.();
    },
    [onMoveEnd],
  );

  if (!isActive || !containerBounds || !displayRect) return null;

  const handles = ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const;

  return (
    <div className="absolute inset-0 z-30 pointer-events-none">
      <div
        role="application"
        aria-label="Video transform region"
        className={cn(
          "absolute pointer-events-auto",
          "border-2 border-primary",
          "shadow-[0_0_0_2px_rgba(0,0,0,0.35)]",
          isDraggingRef.current ? "cursor-grabbing" : "cursor-grab",
        )}
        style={{
          left: displayRect.x,
          top: displayRect.y,
          width: displayRect.width,
          height: displayRect.height,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="absolute -top-9 left-0 flex items-center gap-2 px-2 py-1 border border-border bg-background shadow-md rounded-md text-xs font-medium">
          <Move className="h-3.5 w-3.5" />
          Drag to move
        </div>

        {handles.map((handle) => (
          <div
            key={handle}
            className={cn(
              "absolute size-3 bg-primary border-2 border-border rounded-sm",
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
