"use client";

import { useWavesurfer } from "@wavesurfer/react";
import { useEffect, useRef, useState } from "react";
import type { ImportedMediaAsset } from "@/lib/media-import";

interface AudioWaveformProps {
  asset: ImportedMediaAsset;
  trimStart: number;
  pixelsPerSecond: number;
  height: number;
  color?: string;
}

export function AudioWaveform({
  asset,
  trimStart,
  pixelsPerSecond,
  height,
  color = "rgb(255, 223, 181)",
}: AudioWaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState<string | null>(null);

  // Create Object URL for the file to prevent re-reading effectively
  useEffect(() => {
    if (!asset.file) return;
    const objectUrl = URL.createObjectURL(asset.file);
    setUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [asset.file]);

  // Calculate the total width required for the full waveform
  // We use the asset duration to determine how wide the full wave should be
  const totalWidth = Math.max(1, asset.duration * pixelsPerSecond);

  // Calculate the left offset based on trimStart to shift the waveform
  const leftOffset = -trimStart * pixelsPerSecond;

  useWavesurfer({
    container: containerRef,
    height: height,
    waveColor: color,
    progressColor: color,
    cursorWidth: 0,
    barWidth: 2,
    barGap: 1,
    barRadius: 2,
    url: url || undefined,
    interact: false,
    normalize: false,
    minPxPerSec: 0,
    fillParent: true,
    autoScroll: false,
  });

  return (
    <div className="absolute inset-0 overflow-hidden rounded-xl">
      <div
        ref={containerRef}
        style={{
          position: "absolute",
          left: `${leftOffset}px`,
          width: `${totalWidth}px`,
          height: "100%",
          top: 0,
          pointerEvents: "none", // Let clicks pass through to the timeline action handler
        }}
      />
    </div>
  );
}
