"use client";

import { Crop } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

export interface CropRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface CropOverlayProps {
  /** The container element ref (video player container) */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Whether crop mode is active */
  isActive: boolean;
  /** Callback when crop values change */
  onCropChange?: (crop: CropRect) => void;
  /** Initial crop values (normalized 0-1) */
  initialCrop?: CropRect;
  /** Video dimensions for resolution display */
  videoDimensions?: { width: number; height: number };
}

type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | null;

export function CropOverlay({
  containerRef,
  isActive,
  onCropChange,
  initialCrop,
  videoDimensions,
}: CropOverlayProps) {
  // Crop box state (in pixels relative to container)
  const [cropBox, setCropBox] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  // Interaction state
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialBox, setInitialBox] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  const overlayRef = useRef<HTMLDivElement>(null);
  const [containerBounds, setContainerBounds] = useState<DOMRect | null>(null);
  const isInitializedRef = useRef(false);

  // Reset initialization flag when becoming inactive
  useLayoutEffect(() => {
    if (!isActive) {
      isInitializedRef.current = false;
    }
  }, [isActive]);

  // Update container bounds on resize
  useLayoutEffect(() => {
    if (!isActive || !containerRef.current) return;

    const updateBounds = () => {
      if (containerRef.current) {
        const bounds = containerRef.current.getBoundingClientRect();
        setContainerBounds(bounds);
      }
    };

    updateBounds();

    const resizeObserver = new ResizeObserver(updateBounds);
    resizeObserver.observe(containerRef.current);

    window.addEventListener("resize", updateBounds);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateBounds);
    };
  }, [isActive, containerRef]);

  // Initialize crop box when becoming active or container changes
  // Using microtask to defer state update and avoid synchronous setState in effect
  useLayoutEffect(() => {
    if (!isActive || !containerBounds) return;

    // Only initialize once when first activated
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    const containerWidth = containerBounds.width;
    const containerHeight = containerBounds.height;

    // Defer state update to avoid synchronous setState in effect body
    const newCropBox = initialCrop
      ? {
          x: initialCrop.left * containerWidth,
          y: initialCrop.top * containerHeight,
          width: initialCrop.width * containerWidth,
          height: initialCrop.height * containerHeight,
        }
      : {
          // Default: center box with 80% size
          x: (containerWidth - containerWidth * 0.8) / 2,
          y: (containerHeight - containerHeight * 0.8) / 2,
          width: containerWidth * 0.8,
          height: containerHeight * 0.8,
        };

    // Use queueMicrotask to break synchronous execution chain
    queueMicrotask(() => {
      setCropBox(newCropBox);
    });
  }, [isActive, containerBounds, initialCrop]);

  // Compute the actual crop resolution
  const cropResolution = useCallback(() => {
    if (!videoDimensions || !containerBounds) return null;

    const scaleX = videoDimensions.width / containerBounds.width;
    const scaleY = videoDimensions.height / containerBounds.height;

    return {
      width: Math.round(cropBox.width * scaleX),
      height: Math.round(cropBox.height * scaleY),
    };
  }, [cropBox, videoDimensions, containerBounds]);

  // Notify parent of crop changes (normalized 0-1 values)
  useEffect(() => {
    if (!isActive || !containerBounds || !onCropChange) return;

    const normalizedCrop: CropRect = {
      left: cropBox.x / containerBounds.width,
      top: cropBox.y / containerBounds.height,
      width: cropBox.width / containerBounds.width,
      height: cropBox.height / containerBounds.height,
    };

    onCropChange(normalizedCrop);
  }, [cropBox, containerBounds, isActive, onCropChange]);

  // Handle mouse down on crop box (start dragging)
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!containerBounds) return;

      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      setInitialBox({ ...cropBox });
    },
    [containerBounds, cropBox],
  );

  // Handle mouse down on resize handle
  const handleResizeStart = useCallback(
    (e: React.MouseEvent, handle: ResizeHandle) => {
      e.preventDefault();
      e.stopPropagation();

      if (!containerBounds) return;

      setIsResizing(true);
      setResizeHandle(handle);
      setDragStart({ x: e.clientX, y: e.clientY });
      setInitialBox({ ...cropBox });
    },
    [containerBounds, cropBox],
  );

  // Handle mouse move (dragging or resizing)
  useEffect(() => {
    if (!isDragging && !isResizing) return;
    if (!containerBounds) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      if (isDragging) {
        // Move the box
        let newX = initialBox.x + deltaX;
        let newY = initialBox.y + deltaY;

        // Constrain to container bounds
        newX = Math.max(
          0,
          Math.min(newX, containerBounds.width - cropBox.width),
        );
        newY = Math.max(
          0,
          Math.min(newY, containerBounds.height - cropBox.height),
        );

        setCropBox((prev) => ({ ...prev, x: newX, y: newY }));
      } else if (isResizing && resizeHandle) {
        // Resize the box
        const minSize = 50;
        let newX = initialBox.x;
        let newY = initialBox.y;
        let newWidth = initialBox.width;
        let newHeight = initialBox.height;

        // Handle horizontal resizing
        if (resizeHandle.includes("e")) {
          newWidth = Math.max(minSize, initialBox.width + deltaX);
          newWidth = Math.min(newWidth, containerBounds.width - initialBox.x);
        }
        if (resizeHandle.includes("w")) {
          const maxDeltaX = initialBox.width - minSize;
          const constrainedDeltaX = Math.max(
            -initialBox.x,
            Math.min(deltaX, maxDeltaX),
          );
          newX = initialBox.x + constrainedDeltaX;
          newWidth = initialBox.width - constrainedDeltaX;
        }

        // Handle vertical resizing
        if (resizeHandle.includes("s")) {
          newHeight = Math.max(minSize, initialBox.height + deltaY);
          newHeight = Math.min(
            newHeight,
            containerBounds.height - initialBox.y,
          );
        }
        if (resizeHandle.includes("n")) {
          const maxDeltaY = initialBox.height - minSize;
          const constrainedDeltaY = Math.max(
            -initialBox.y,
            Math.min(deltaY, maxDeltaY),
          );
          newY = initialBox.y + constrainedDeltaY;
          newHeight = initialBox.height - constrainedDeltaY;
        }

        setCropBox({ x: newX, y: newY, width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setResizeHandle(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    isDragging,
    isResizing,
    resizeHandle,
    dragStart,
    initialBox,
    containerBounds,
    cropBox.width,
    cropBox.height,
  ]);

  if (!isActive || !containerBounds) return null;

  const resolution = cropResolution();

  // Resize handle positions
  const handles: { position: ResizeHandle; className: string }[] = [
    {
      position: "nw",
      className:
        "top-0 left-0 cursor-nw-resize -translate-x-1/2 -translate-y-1/2",
    },
    {
      position: "n",
      className:
        "top-0 left-1/2 cursor-n-resize -translate-x-1/2 -translate-y-1/2",
    },
    {
      position: "ne",
      className:
        "top-0 right-0 cursor-ne-resize translate-x-1/2 -translate-y-1/2",
    },
    {
      position: "e",
      className:
        "top-1/2 right-0 cursor-e-resize translate-x-1/2 -translate-y-1/2",
    },
    {
      position: "se",
      className:
        "bottom-0 right-0 cursor-se-resize translate-x-1/2 translate-y-1/2",
    },
    {
      position: "s",
      className:
        "bottom-0 left-1/2 cursor-s-resize -translate-x-1/2 translate-y-1/2",
    },
    {
      position: "sw",
      className:
        "bottom-0 left-0 cursor-sw-resize -translate-x-1/2 translate-y-1/2",
    },
    {
      position: "w",
      className:
        "top-1/2 left-0 cursor-w-resize -translate-x-1/2 -translate-y-1/2",
    },
  ];

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 z-20 pointer-events-none"
      style={{ overflow: "hidden" }}
    >
      {/* Dark overlay outside crop area */}
      <div
        className="absolute inset-0 bg-black/60 pointer-events-none"
        style={{
          clipPath: `polygon(
            0 0, 
            100% 0, 
            100% 100%, 
            0 100%, 
            0 0,
            ${cropBox.x}px ${cropBox.y}px,
            ${cropBox.x}px ${cropBox.y + cropBox.height}px,
            ${cropBox.x + cropBox.width}px ${cropBox.y + cropBox.height}px,
            ${cropBox.x + cropBox.width}px ${cropBox.y}px,
            ${cropBox.x}px ${cropBox.y}px
          )`,
        }}
      />

      {/* Crop box */}
      <div
        role="application"
        aria-label="Crop region - drag to move, use handles to resize"
        className={cn(
          "absolute pointer-events-auto",
          "border-2 border-white",
          "shadow-[0_0_0_2px_rgba(0,0,0,0.5)]",
          isDragging && "cursor-grabbing",
          !isDragging && !isResizing && "cursor-grab",
        )}
        style={{
          left: cropBox.x,
          top: cropBox.y,
          width: cropBox.width,
          height: cropBox.height,
        }}
        onMouseDown={handleMouseDown}
      >
        {/* Grid lines */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Horizontal lines */}
          <div className="absolute left-0 right-0 top-1/3 border-t border-white/40" />
          <div className="absolute left-0 right-0 top-2/3 border-t border-white/40" />
          {/* Vertical lines */}
          <div className="absolute top-0 bottom-0 left-1/3 border-l border-white/40" />
          <div className="absolute top-0 bottom-0 left-2/3 border-l border-white/40" />
        </div>

        {/* Resolution display */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-1.5 bg-black/70 text-white px-3 py-1.5 rounded-md text-sm font-mono border border-white/20">
            <Crop className="size-3.5" />
            {resolution ? (
              <span>
                {resolution.width} × {resolution.height}
              </span>
            ) : (
              <span>
                {Math.round(cropBox.width)} × {Math.round(cropBox.height)}
              </span>
            )}
          </div>
        </div>

        {/* Resize handles */}
        {handles.map(({ position, className }) => (
          <button
            key={position}
            type="button"
            aria-label={`Resize handle ${position}`}
            className={cn(
              "absolute pointer-events-auto",
              "size-4 bg-white border-2 border-black rounded-sm",
              "hover:bg-main hover:scale-110 transition-transform",
              className,
            )}
            onMouseDown={(e) => handleResizeStart(e, position)}
          />
        ))}
      </div>
    </div>
  );
}
