"use client";

import { Download, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { TimelineTrackData } from "@/components/editor/preview/timeline-player-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type ExportTimelineOptions,
  exportTimelineToBlob,
} from "@/lib/export-video";
import type { OutputContainer } from "@/lib/mediabunny";

// Preset resolutions
const RESOLUTION_PRESETS = [
  { label: "4K (3840×2160)", width: 3840, height: 2160 },
  { label: "1080p (1920×1080)", width: 1920, height: 1080 },
  { label: "720p (1280×720)", width: 1280, height: 720 },
  { label: "480p (854×480)", width: 854, height: 480 },
  { label: "360p (640×360)", width: 640, height: 360 },
  { label: "Custom", width: 0, height: 0 },
] as const;

// Frame rate options
const FPS_OPTIONS = [24, 25, 30, 50, 60] as const;

// Container format options
const FORMAT_OPTIONS: { label: string; value: OutputContainer }[] = [
  { label: "MP4 (H.264)", value: "mp4" },
  { label: "WebM (VP9)", value: "webm" },
  { label: "MKV", value: "mkv" },
  { label: "MOV", value: "mov" },
];

export interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tracks: TimelineTrackData[];
}

type ExportState = "idle" | "exporting" | "done" | "error";

export function ExportModal({ open, onOpenChange, tracks }: ExportModalProps) {
  // Settings state
  const [resolutionPreset, setResolutionPreset] = useState("1920x1080");
  const [customWidth, setCustomWidth] = useState(1920);
  const [customHeight, setCustomHeight] = useState(1080);
  const [fps, setFps] = useState<number>(30);
  const [format, setFormat] = useState<OutputContainer>("mp4");
  const [filename, setFilename] = useState("localcut-export");

  // Export state
  const [exportState, setExportState] = useState<ExportState>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [finalElapsedTime, setFinalElapsedTime] = useState(0);
  const [exportedBlob, setExportedBlob] = useState<Blob | null>(null);
  const [exportedFileName, setExportedFileName] = useState<string | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Track elapsed time during export
  useEffect(() => {
    if (exportState === "exporting") {
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setElapsedTime(
            Math.floor((Date.now() - startTimeRef.current) / 1000),
          );
        }
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [exportState]);

  // Format elapsed time as mm:ss
  const formatElapsedTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Get effective resolution
  const getResolution = useCallback(() => {
    if (resolutionPreset === "custom") {
      return { width: customWidth, height: customHeight };
    }
    const [w, h] = resolutionPreset.split("x").map(Number);
    return { width: w, height: h };
  }, [resolutionPreset, customWidth, customHeight]);

  // Calculate timeline duration for display
  const timelineDuration = Math.max(
    ...tracks.flatMap((t) =>
      t.clips.length > 0 ? t.clips.map((c) => c.startTime + c.duration) : [0],
    ),
    0,
  );

  const clipCount = tracks.reduce((sum, t) => sum + t.clips.length, 0);

  const handleExport = useCallback(async () => {
    if (clipCount === 0) {
      setErrorMessage("Nothing to export: add clips to the timeline first.");
      setExportState("error");
      return;
    }

    setElapsedTime(0);
    setExportState("exporting");
    setProgress(0);
    setErrorMessage(null);

    const { width, height } = getResolution();

    const options: ExportTimelineOptions = {
      tracks,
      width,
      height,
      fps,
      container: format,
      filenameBase: filename || "localcut-export",
      onProgress: (p) => setProgress(Math.round(p * 100)),
    };

    try {
      const { blob, fileName } = await exportTimelineToBlob(options);

      // Store blob for manual download
      setExportedBlob(blob);
      setExportedFileName(fileName);
      // Calculate final elapsed time from start time ref
      const finalTime = startTimeRef.current
        ? Math.floor((Date.now() - startTimeRef.current) / 1000)
        : 0;
      setFinalElapsedTime(finalTime);

      setExportState("done");
    } catch (error) {
      console.error("Export failed:", error);
      setErrorMessage(error instanceof Error ? error.message : "Export failed");
      setExportState("error");
    }
  }, [tracks, clipCount, getResolution, fps, format, filename]);

  const handleClose = useCallback(() => {
    if (exportState === "exporting") return; // Prevent closing during export
    // Clear blob if exists
    if (exportedBlob) {
      setExportedBlob(null);
      setExportedFileName(null);
    }
    setExportState("idle");
    setProgress(0);
    setErrorMessage(null);
    setFinalElapsedTime(0);
    onOpenChange(false);
  }, [exportState, exportedBlob, onOpenChange]);

  const handleResolutionChange = (value: string) => {
    setResolutionPreset(value);
    if (value !== "custom") {
      const [w, h] = value.split("x").map(Number);
      setCustomWidth(w);
      setCustomHeight(h);
    }
  };

  const isCustomResolution = resolutionPreset === "custom";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Download className="h-5 w-5" />
            Export Video
          </DialogTitle>
          <DialogDescription>
            Configure your export settings and render the timeline to a video
            file.
          </DialogDescription>
        </DialogHeader>

        {exportState === "exporting" ? (
          <div className="py-8 space-y-4">
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-main" />
              <span className="text-lg font-medium">Exporting...</span>
            </div>
            <Progress value={progress} className="h-3" />
            <div className="flex justify-between text-sm text-foreground/60">
              <span>{progress}% complete</span>
              <span>Elapsed: {formatElapsedTime(elapsedTime)}</span>
            </div>
          </div>
        ) : exportState === "done" ? (
          <div className="py-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
              <Download className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Export Complete!</h3>
              <p className="text-sm text-foreground/60 mt-1">
                Completed in {formatElapsedTime(finalElapsedTime)}
              </p>
            </div>
            <div className="flex gap-3 justify-center mt-4">
              <Button
                onClick={() => {
                  if (exportedBlob && exportedFileName) {
                    const url = URL.createObjectURL(exportedBlob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = exportedFileName;
                    a.click();
                    URL.revokeObjectURL(url);
                  }
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button onClick={handleClose} variant="neutral">
                Close
              </Button>
            </div>
          </div>
        ) : exportState === "error" ? (
          <div className="py-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
              <X className="h-8 w-8 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Export Failed</h3>
              <p className="text-sm text-foreground/60 mt-1">{errorMessage}</p>
            </div>
            <Button
              onClick={() => setExportState("idle")}
              variant="neutral"
              className="mt-4"
            >
              Try Again
            </Button>
          </div>
        ) : (
          <>
            {/* Settings Form */}
            <div className="space-y-5 py-4">
              {/* Timeline Info */}
              <div className="p-3 bg-secondary-background border-2 border-border rounded-md">
                <div className="flex justify-between text-sm">
                  <span className="text-foreground/60">Duration:</span>
                  <span className="font-medium">
                    {timelineDuration.toFixed(1)}s
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-foreground/60">Clips:</span>
                  <span className="font-medium">{clipCount}</span>
                </div>
              </div>

              {/* Filename */}
              <div className="space-y-2">
                <Label htmlFor="filename">Filename</Label>
                <Input
                  id="filename"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  placeholder="localcut-export"
                />
              </div>

              {/* Format */}
              <div className="space-y-2">
                <Label>Format</Label>
                <Select
                  value={format}
                  onValueChange={(v) => setFormat(v as OutputContainer)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMAT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Resolution */}
              <div className="space-y-2">
                <Label>Resolution</Label>
                <Select
                  value={resolutionPreset}
                  onValueChange={handleResolutionChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RESOLUTION_PRESETS.map((preset) => (
                      <SelectItem
                        key={preset.label}
                        value={
                          preset.width === 0
                            ? "custom"
                            : `${preset.width}x${preset.height}`
                        }
                      >
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {isCustomResolution && (
                  <div className="flex gap-2 mt-2">
                    <div className="flex-1">
                      <Label htmlFor="custom-width" className="text-xs">
                        Width
                      </Label>
                      <Input
                        id="custom-width"
                        type="number"
                        min={128}
                        max={7680}
                        value={customWidth}
                        onChange={(e) =>
                          setCustomWidth(Number(e.target.value) || 1920)
                        }
                      />
                    </div>
                    <div className="flex-1">
                      <Label htmlFor="custom-height" className="text-xs">
                        Height
                      </Label>
                      <Input
                        id="custom-height"
                        type="number"
                        min={128}
                        max={4320}
                        value={customHeight}
                        onChange={(e) =>
                          setCustomHeight(Number(e.target.value) || 1080)
                        }
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Frame Rate */}
              <div className="space-y-2">
                <Label>Frame Rate</Label>
                <Select
                  value={String(fps)}
                  onValueChange={(v) => setFps(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FPS_OPTIONS.map((fpsOpt) => (
                      <SelectItem key={fpsOpt} value={String(fpsOpt)}>
                        {fpsOpt} fps
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="neutral" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleExport} disabled={clipCount === 0}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
