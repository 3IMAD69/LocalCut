"use client";

import { CheckCircle2, Loader2, Video, XCircle } from "lucide-react";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import {
  DownloadIcon,
  type DownloadIconHandle,
} from "@/components/ui/download";
import { Progress } from "@/components/ui/progress";
import {
  getFileExtension,
  isAudioOnlyFormat,
  type OutputContainer,
  outputContainers,
} from "@/lib/mediabunny";

export interface ConversionStats {
  startTime: number;
  lastUpdateTime: number;
  elapsedSeconds: number;
  estimatedTotalSeconds: number | null;
  estimatedRemainingSeconds: number | null;
  currentFileSize: number; // in bytes
}

export interface ConversionStatusHandle {
  start: () => void;
  updateProgress: (progress: number) => void;
  updateStats: (stats: ConversionStats) => void;
  setFinalizing: () => void;
  setCompleted: (blob: Blob) => void;
  setError: (message: string) => void;
  reset: () => void;
}

interface ConversionStatusDisplayProps {
  selectedFile: File | null;
  inputFormat: string;
  outputFormat: string;
  metadata: { isAudioOnly: boolean } | null;
  onConvert: () => void;
  onCancel: () => void;
  onReset: () => void;
}

type ConversionStatus =
  | "idle"
  | "converting"
  | "finalizing"
  | "completed"
  | "error";

export const ConversionStatusDisplay = forwardRef<
  ConversionStatusHandle,
  ConversionStatusDisplayProps
>(
  (
    {
      selectedFile,
      inputFormat,
      outputFormat,
      metadata,
      onConvert,
      onCancel,
      onReset,
    },
    ref,
  ) => {
    const [status, setStatus] = useState<ConversionStatus>("idle");
    const [progress, setProgress] = useState<number>(0);
    const [stats, setStats] = useState<ConversionStats | null>(null);
    const [convertedBlob, setConvertedBlob] = useState<Blob | null>(null);
    const [errorMessage, setErrorMessage] = useState<string>("");
    const downloadIconRef = useRef<DownloadIconHandle>(null);

    useImperativeHandle(ref, () => ({
      start: () => {
        setStatus("converting");
        setProgress(0);
        setStats(null);
        setConvertedBlob(null);
        setErrorMessage("");
      },
      updateProgress: (p: number) => {
        setProgress(p);
      },
      updateStats: (s: ConversionStats) => {
        setStats(s);
      },
      setFinalizing: () => {
        setStatus("finalizing");
        setProgress(99);
      },
      setCompleted: (blob: Blob) => {
        setConvertedBlob(blob);
        setStatus("completed");
        setProgress(100);
      },
      setError: (msg: string) => {
        setErrorMessage(msg);
        setStatus("error");
      },
      reset: () => {
        setStatus("idle");
        setProgress(0);
        setStats(null);
        setConvertedBlob(null);
        setErrorMessage("");
      },
    }));

    // Update page title based on conversion status
    useEffect(() => {
      if (status === "converting" || status === "finalizing") {
        document.title = `${progress}% - Converting...`;
      } else {
        document.title = "LocalCut - Converter";
      }
    }, [status, progress]);

    const formatTime = (seconds: number): string => {
      if (!Number.isFinite(seconds) || seconds < 0) return "--:--";
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const formatBytes = (bytes: number): string => {
      if (bytes === 0) return "0 B";
      const k = 1024;
      const sizes = ["B", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return `${(bytes / k ** i).toFixed(2)} ${sizes[i]}`;
    };

    const handleDownload = () => {
      if (!convertedBlob || !selectedFile) return;

      const extension = getFileExtension(outputFormat as OutputContainer);
      const originalName = selectedFile.name.replace(/\.[^/.]+$/, "");
      const fileName = `${originalName}_converted.${extension}`;

      const url = URL.createObjectURL(convertedBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    return (
      <>
        {/* Conversion Progress */}
        {status === "converting" && (
          <div className="space-y-3 rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Loader2 className="size-5 animate-spin text-primary" />
                <span className="font-semibold">Converting...</span>
              </div>
              <span className="font-mono text-sm">{progress}%</span>
            </div>
            <Progress value={progress} className="h-3" />

            {/* Stats Display */}
            {stats && (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-md border border-border bg-muted px-3 py-2">
                  <div className="text-xs text-foreground/60">Elapsed</div>
                  <div className="font-mono font-semibold">
                    {formatTime(stats.elapsedSeconds)}
                  </div>
                </div>
                <div className="rounded-md border border-border bg-muted px-3 py-2">
                  <div className="text-xs text-foreground/60">Remaining</div>
                  <div className="font-mono font-semibold">
                    {stats.estimatedRemainingSeconds
                      ? formatTime(stats.estimatedRemainingSeconds)
                      : "Calculating..."}
                  </div>
                </div>
                <div className="col-span-2 rounded-md border border-border bg-muted px-3 py-2">
                  <div className="text-xs text-foreground/60">Output Size</div>
                  <div className="font-mono font-semibold">
                    {formatBytes(stats.currentFileSize)}
                  </div>
                </div>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        )}

        {/* Finalizing State */}
        {status === "finalizing" && (
          <div className="space-y-3 rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Loader2 className="size-5 animate-spin text-primary" />
                <span className="font-semibold">Finalizing file...</span>
              </div>
              <span className="font-mono text-sm">99%</span>
            </div>
            <Progress value={99} className="h-3" />
            <p className="text-xs text-foreground/60">
              Writing file metadata and optimizing structure...
            </p>
          </div>
        )}

        {/* Conversion Complete */}
        {status === "completed" && convertedBlob && (
          <div className="space-y-3 rounded-lg border border-green-500 bg-green-50 dark:bg-green-950 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-green-600" />
              <span className="font-semibold text-green-700 dark:text-green-300">
                Conversion Complete!
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-green-700 dark:text-green-300">
              <div className="rounded-md border border-green-600 bg-green-100 px-3 py-2">
                <div className="text-xs text-green-600">Output size</div>
                <div className="font-mono font-semibold">
                  {(convertedBlob.size / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
              {stats && (
                <div className="rounded-md border border-green-600 bg-green-100 dark:bg-green-900 px-3 py-2">
                  <div className="text-xs text-green-600 dark:text-green-400">
                    Time taken
                  </div>
                  <div className="font-mono font-semibold">
                    {formatTime(stats.elapsedSeconds)}
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                size="lg"
                onClick={handleDownload}
                onMouseEnter={() => downloadIconRef.current?.startAnimation()}
                onMouseLeave={() => downloadIconRef.current?.stopAnimation()}
                className="w-full sm:flex-1 bg-green-600 text-white hover:bg-green-700"
              >
                <DownloadIcon ref={downloadIconRef} />
                Download File
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={onReset}
                className="w-full sm:w-auto"
              >
                Convert Another
              </Button>
            </div>
          </div>
        )}

        {/* Conversion Error */}
        {status === "error" && (
          <div className="space-y-3 rounded-lg border border-red-500 bg-red-50 dark:bg-red-950 p-4">
            <div className="flex items-center gap-2">
              <XCircle className="size-5 text-red-600" />
              <span className="font-semibold text-red-700 dark:text-red-300">
                Conversion Failed
              </span>
            </div>
            <p className="text-sm text-red-700 dark:text-red-300">
              {errorMessage}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              className="w-full"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Convert Button */}
        {status === "idle" && (
          <Button
            size="lg"
            className="w-full text-base font-bold"
            disabled={!selectedFile || !inputFormat || !outputFormat}
            onClick={onConvert}
          >
            <Video className="size-5" />
            {outputFormat &&
            outputContainers.includes(outputFormat as OutputContainer) &&
            isAudioOnlyFormat(outputFormat as OutputContainer)
              ? "Convert to Audio"
              : metadata?.isAudioOnly
                ? "Convert Audio"
                : "Convert Media"}
          </Button>
        )}
      </>
    );
  },
);

ConversionStatusDisplay.displayName = "ConversionStatusDisplay";
