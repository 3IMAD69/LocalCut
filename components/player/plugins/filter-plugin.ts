"use client";

import type { MediaFoxPlugin } from "@mediafox/core";
import type { WrappedCanvas } from "mediabunny";

export interface MediaFoxFilterPlugin extends MediaFoxPlugin {
  setFilter: (filter: string) => void;
  getFilter: () => string;
}

function create2dCanvas(width: number, height: number) {
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(width, height);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function get2dContext(canvas: HTMLCanvasElement | OffscreenCanvas) {
  const ctx = canvas.getContext("2d", {
    // Keep output opaque to avoid halo artifacts.
    alpha: false,
  }) as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;

  if (!ctx) {
    throw new Error("Failed to get 2D context for filter plugin canvas");
  }

  return ctx;
}

export function createFilterPlugin(
  initialFilter: string = "none",
): MediaFoxFilterPlugin {
  let filter = initialFilter;

  let scratchCanvas: HTMLCanvasElement | OffscreenCanvas | null = null;
  let scratchCtx:
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D
    | null = null;

  const ensureScratch = (width: number, height: number) => {
    if (!scratchCanvas) {
      scratchCanvas = create2dCanvas(width, height);
      scratchCtx = get2dContext(scratchCanvas);
      return;
    }

    if (scratchCanvas.width !== width || scratchCanvas.height !== height) {
      scratchCanvas.width = width;
      scratchCanvas.height = height;
    }

    if (!scratchCtx) {
      scratchCtx = get2dContext(scratchCanvas);
    }
  };

  const transform = (frame: WrappedCanvas): WrappedCanvas => {
    if (!filter || filter === "none") {
      return frame;
    }

    const src = frame.canvas;
    const width = src.width;
    const height = src.height;

    ensureScratch(width, height);

    if (!scratchCanvas || !scratchCtx) {
      return frame;
    }

    const ctx = scratchCtx;

    // Reset any previous transform & clear.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // Apply filter and draw.
    // `filter` is a CSS filter string, e.g. "saturate(0)" for grayscale.
    (ctx as CanvasRenderingContext2D).filter = filter;
    ctx.drawImage(src, 0, 0);

    // Avoid leaking the filter into subsequent draws when toggling.
    (ctx as CanvasRenderingContext2D).filter = "none";

    return {
      canvas: scratchCanvas,
      timestamp: frame.timestamp,
      duration: frame.duration,
    };
  };

  return {
    name: "filter",

    install() {},

    setFilter(nextFilter) {
      filter = nextFilter;
    },

    getFilter() {
      return filter;
    },

    hooks: {
      render: {
        transformFrame(frame) {
          return transform(frame);
        },
      },
    },
  };
}
