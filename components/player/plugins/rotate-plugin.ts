"use client";

import type { MediaFoxPlugin } from "@mediafox/core";
import type { WrappedCanvas } from "mediabunny";

export type RotationDegrees = 0 | 90 | 180 | 270;

export interface MediaFoxRotatePlugin extends MediaFoxPlugin {
  setDegrees: (degrees: RotationDegrees) => void;
  getDegrees: () => RotationDegrees;
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
    // No need for alpha here; we want opaque output to avoid halos.
    alpha: false,
  }) as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;

  if (!ctx) {
    throw new Error("Failed to get 2D context for rotate plugin canvas");
  }

  return ctx;
}

export function createRotatePlugin(
  initialDegrees: RotationDegrees = 0,
): MediaFoxRotatePlugin {
  let degrees: RotationDegrees = initialDegrees;

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
    if (degrees === 0) {
      return frame;
    }

    const src = frame.canvas;
    const srcWidth = src.width;
    const srcHeight = src.height;

    const isQuarterTurn = degrees === 90 || degrees === 270;
    const dstWidth = isQuarterTurn ? srcHeight : srcWidth;
    const dstHeight = isQuarterTurn ? srcWidth : srcHeight;

    ensureScratch(dstWidth, dstHeight);

    if (!scratchCanvas || !scratchCtx) {
      return frame;
    }

    const ctx = scratchCtx;

    // Reset any previous transform & clear
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, dstWidth, dstHeight);

    // Rotate around center so the output fills the canvas (no black bars)
    ctx.save();
    ctx.translate(dstWidth / 2, dstHeight / 2);
    ctx.rotate((degrees * Math.PI) / 180);
    ctx.drawImage(src, -srcWidth / 2, -srcHeight / 2);
    ctx.restore();

    return {
      canvas: scratchCanvas,
      timestamp: frame.timestamp,
      duration: frame.duration,
    };
  };

  return {
    name: "rotate",

    install() {},

    setDegrees(nextDegrees) {
      degrees = nextDegrees;
    },

    getDegrees() {
      return degrees;
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
