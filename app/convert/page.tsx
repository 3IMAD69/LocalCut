"use client";

import { MediaPlayer } from "@/components/player/media-player";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getMediabunnyOutput,
  isAudioOnlyFormat,
  getMimeType,
  getFileExtension,
  type OutputContainer,
  outputContainers,
} from "@/lib/mediabunny";
import { ArrowRight, Download, FileVideo, Loader2, Upload, Video, CheckCircle2, XCircle } from "lucide-react";
import { useState, useCallback, useRef, useEffect } from "react";
import {
  Input as MediaInput,
  Output,
  BufferTarget,
  Conversion,
  BlobSource,
  ALL_FORMATS,
  canEncodeAudio,
} from "mediabunny";
import { registerMp3Encoder } from "@mediabunny/mp3-encoder";

const INPUT_FORMATS = [
  { value: "mp4", label: "MP4", icon: "🎬" },
  { value: "mov", label: "MOV (QuickTime)", icon: "🎥" },
  { value: "webm", label: "WebM", icon: "🌐" },
  { value: "mkv", label: "MKV (Matroska)", icon: "📹" },
  { value: "avi", label: "AVI", icon: "📼" },
  { value: "flv", label: "FLV", icon: "⚡" },
  { value: "wmv", label: "WMV", icon: "🪟" },
  { value: "mpeg", label: "MPEG", icon: "📺" },
];

const OUTPUT_FORMATS = [
  {
    value: "mp4",
    label: "MP4",
    description: "Universal compatibility, best for web & mobile",
    icon: "🎬",
  },
  {
    value: "webm",
    label: "WebM",
    description: "Optimized for web streaming, supports transparency",
    icon: "🌐",
  },
  {
    value: "mkv",
    label: "MKV (Matroska)",
    description: "High quality, supports multiple tracks",
    icon: "📹",
  },
  {
    value: "mov",
    label: "MOV (QuickTime)",
    description: "Apple ecosystem, professional editing",
    icon: "🎥",
  },
  {
    value: "mp3",
    label: "MP3 (Audio only)",
    description: "Extract audio as MP3",
    icon: "🎵",
  },
  {
    value: "wav",
    label: "WAV (Audio only)",
    description: "Lossless audio extraction",
    icon: "🔊",
  },
  {
    value: "aac",
    label: "AAC (Audio only)",
    description: "High-quality audio codec",
    icon: "🎧",
  },
];

type ConversionStatus = "idle" | "converting" | "finalizing" | "completed" | "error";

interface ConversionStats {
  startTime: number;
  lastUpdateTime: number;
  elapsedSeconds: number;
  estimatedTotalSeconds: number | null;
  estimatedRemainingSeconds: number | null;
  currentFileSize: number; // in bytes
}

interface FileMetadata {
  container: string;
  size: number;
  duration: number | null;
  videoCodec: string | null;
  audioCodec: string | null;
  dimensions: { width: number; height: number } | null;
  frameRate: number | null;
  sampleRate: number | null;
  bitDepth: number | null;
}

export default function ConvertPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [inputFormat, setInputFormat] = useState<string>("");
  const [outputFormat, setOutputFormat] = useState<string>("");
  const [conversionStatus, setConversionStatus] = useState<ConversionStatus>("idle");
  const [progress, setProgress] = useState<number>(0);
  const [convertedBlob, setConvertedBlob] = useState<Blob | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [stats, setStats] = useState<ConversionStats | null>(null);
  const [metadata, setMetadata] = useState<FileMetadata | null>(null);
  const [loadingMetadata, setLoadingMetadata] = useState<boolean>(false);
  const conversionRef = useRef<Conversion | null>(null);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
      }
    };
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Auto-detect format from file extension
      const extension = file.name.split(".").pop()?.toLowerCase();
      if (extension) {
        setInputFormat(extension);
      }
      // Reset conversion state when new file is selected
      setConversionStatus("idle");
      setProgress(0);
      setConvertedBlob(null);
      setErrorMessage("");
      setStats(null);
      setMetadata(null);
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }

      // Extract metadata
      extractMetadata(file);
    }
  };

  const extractMetadata = async (file: File) => {
    setLoadingMetadata(true);
    try {
      const input = new MediaInput({
        source: new BlobSource(file),
        formats: ALL_FORMATS,
      });

      const format = await input.getFormat();
      const videoTrack = await input.getPrimaryVideoTrack().catch(() => null);
      const audioTrack = await input.getPrimaryAudioTrack().catch(() => null);

      let duration: number | null = null;
      if (videoTrack) {
        duration = await videoTrack.computeDuration().catch(() => null);
      } else if (audioTrack) {
        duration = await audioTrack.computeDuration().catch(() => null);
      }

      const metadata: FileMetadata = {
        container: format?.name || "Unknown",
        size: file.size,
        duration,
        videoCodec: videoTrack?.codec || null,
        audioCodec: audioTrack?.codec || null,
        dimensions: videoTrack && videoTrack.displayWidth && videoTrack.displayHeight
          ? { width: videoTrack.displayWidth, height: videoTrack.displayHeight }
          : null,
        frameRate: videoTrack?.frameRate || null,
        sampleRate: audioTrack?.sampleRate || null,
        bitDepth: videoTrack?.bitDepth || null,
      };

      setMetadata(metadata);
    } catch (error) {
      console.error("Failed to extract metadata:", error);
    } finally {
      setLoadingMetadata(false);
    }
  };

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || seconds < 0) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const handleConvert = useCallback(async () => {
    console.log("handleConvert called", { selectedFile, outputFormat });
    
    if (!selectedFile || !outputFormat) {
      console.log("Missing file or output format");
      return;
    }

    // Validate output format
    if (!outputContainers.includes(outputFormat as OutputContainer)) {
      console.log("Unsupported output format:", outputFormat);
      setErrorMessage(`Unsupported output format: ${outputFormat}`);
      setConversionStatus("error");
      return;
    }

    setConversionStatus("converting");
    setProgress(0);
    setErrorMessage("");
    setConvertedBlob(null);

    try {
      console.log("Starting conversion to", outputFormat);
      
      // Register MP3 encoder if needed
      if (outputFormat === "mp3" && !(await canEncodeAudio("mp3"))) {
        console.log("Registering MP3 encoder");
        registerMp3Encoder();
      }

      // Create input from file
      console.log("Creating input from file:", selectedFile.name);
      const input = new MediaInput({
        source: new BlobSource(selectedFile),
        formats: ALL_FORMATS,
      });

      // Create output with the selected format
      console.log("Creating output with format:", outputFormat);
      const format = getMediabunnyOutput(outputFormat as OutputContainer);
      const target = new BufferTarget();
      const output = new Output({
        format,
        target,
      });

      // Initialize conversion
      console.log("Initializing conversion...");
      const conversion = await Conversion.init({
        input,
        output,
        // Discard video if output is audio-only
        video: isAudioOnlyFormat(outputFormat as OutputContainer)
          ? { discard: true }
          : undefined,
      });

      conversionRef.current = conversion;
      console.log("Conversion initialized, isValid:", conversion.isValid);
      console.log("Discarded tracks:", conversion.discardedTracks);
      console.log("Utilized tracks:", conversion.utilizedTracks);

      // Check if conversion is valid
      if (!conversion.isValid) {
        const reasons = conversion.discardedTracks
          .map((t) => `${t.track?.type || "unknown"}: ${t.reason}`)
          .join(", ");
        throw new Error(`Conversion invalid: ${reasons || "Unknown reason"}`);
      }

      // Get video duration for time estimation
      let videoDuration: number | null = null;
      try {
        const videoTrack = await input.getPrimaryVideoTrack();
        if (videoTrack) {
          videoDuration = await videoTrack.computeDuration();
          console.log("Video duration:", videoDuration, "seconds");
        }
      } catch (e) {
        console.log("Could not get video duration:", e);
      }

      // Initialize stats
      const startTime = Date.now();
      const initialStats: ConversionStats = {
        startTime,
        lastUpdateTime: startTime,
        elapsedSeconds: 0,
        estimatedTotalSeconds: null,
        estimatedRemainingSeconds: null,
        currentFileSize: 0,
      };
      setStats(initialStats);

      // Track output file size
      target.onwrite = (start: number, end: number) => {
        setStats(prev => prev ? { ...prev, currentFileSize: end } : null);
      };

      // Update elapsed time every 100ms
      statsIntervalRef.current = setInterval(() => {
        const now = Date.now();
        const elapsed = (now - startTime) / 1000;
        setStats(prev => prev ? { ...prev, elapsedSeconds: elapsed, lastUpdateTime: now } : null);
      }, 100);

      // Set up progress tracking
      conversion.onProgress = (p: number) => {
        console.log("Progress:", p);
        const progressPercent = Math.round(p * 100);
        setProgress(progressPercent);

        // Calculate time estimates
        const now = Date.now();
        const elapsed = (now - startTime) / 1000;
        
        let estimatedTotal: number | null = null;
        let estimatedRemaining: number | null = null;

        if (p > 0.01) { // Only estimate after 1% progress
          estimatedTotal = elapsed / p;
          estimatedRemaining = estimatedTotal - elapsed;
        }

        setStats(prev => prev ? {
          ...prev,
          lastUpdateTime: now,
          elapsedSeconds: elapsed,
          estimatedTotalSeconds: estimatedTotal,
          estimatedRemainingSeconds: estimatedRemaining,
        } : null);
      };

      // Execute conversion
      console.log("Executing conversion...");
      await conversion.execute();
      
      // Show finalizing state
      console.log("Conversion encoding complete, finalizing file...");
      setConversionStatus("finalizing");
      
      console.log("Conversion complete!");

      // Get the resulting buffer
      const buffer = target.buffer;
      if (!buffer) {
        throw new Error("Conversion completed but no output buffer was created");
      }

      console.log("Buffer size:", buffer.byteLength);
      
      // Create blob from buffer
      const mimeType = getMimeType(outputFormat as OutputContainer);
      const blob = new Blob([buffer], { type: mimeType });
      
      setConvertedBlob(blob);
      setConversionStatus("completed");
      setProgress(100);

      // Clear the stats interval
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }
    } catch (error) {
      console.error("Conversion error:", error);
      setErrorMessage(error instanceof Error ? error.message : "An unknown error occurred");
      setConversionStatus("error");
      
      // Clear the stats interval on error
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }
    } finally {
      conversionRef.current = null;
    }
  }, [selectedFile, outputFormat]);

  const handleDownload = useCallback(() => {
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
  }, [convertedBlob, selectedFile, outputFormat]);

  const handleCancel = useCallback(async () => {
    if (conversionRef.current) {
      await conversionRef.current.cancel();
      setConversionStatus("idle");
      setProgress(0);
      setStats(null);
      
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }
    }
  }, []);

  const resetConversion = useCallback(() => {
    setConversionStatus("idle");
    setProgress(0);
    setConvertedBlob(null);
    setErrorMessage("");
    setStats(null);
    
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#f5f5f5] p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-3 font-heading text-5xl font-bold tracking-tight">
            MediaBunny Converter
          </h1>
          <p className="text-lg text-foreground/70">
            Convert your videos to any format with ease
          </p>
        </div>

        {/* Main Converter Card */}
        <Card className="mb-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <CardHeader>
            <CardTitle className="text-2xl">Video Converter</CardTitle>
            <CardDescription>
              Upload a video and select your desired output format
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* File Upload / Video Preview Section */}
            <div className="space-y-2">
              <label className="text-sm font-semibold">
                {selectedFile ? "Video Preview" : "Upload Video"}
              </label>
              <input
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
                id="video-upload"
              />
              {!selectedFile ? (
                <label
                  htmlFor="video-upload"
                  className="flex h-32 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-base border-2 border-dashed border-border bg-white transition-all hover:translate-x-1 hover:translate-y-1 hover:bg-main/5"
                >
                  <Upload className="size-8" />
                  <div className="text-center">
                    <p className="font-semibold">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-sm text-foreground/60">
                      MP4, WebM, MKV, MOV, AVI and more
                    </p>
                  </div>
                </label>
              ) : (
                <div className="space-y-3">
                  <MediaPlayer src={selectedFile} />
                  <div className="space-y-3 max-w-3xl mx-auto">
                    {/* File Info Header */}
                    <div className="flex items-center justify-between gap-3 rounded-base border-2 border-border bg-white p-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">
                          {selectedFile.name}
                        </p>
                        <p className="text-sm text-foreground/60">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        variant="neutral"
                        size="sm"
                        onClick={() =>
                          document.getElementById("video-upload")?.click()
                        }
                        className="shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                      >
                        <Upload className="size-4" />
                        Change File
                      </Button>
                    </div>

                    {/* Metadata Display */}
                    {loadingMetadata ? (
                      <div className="flex items-center justify-center gap-2 rounded-base border-2 border-border bg-white p-4">
                        <Loader2 className="size-4 animate-spin" />
                        <span className="text-sm text-foreground/60">Loading metadata...</span>
                      </div>
                    ) : metadata ? (
                      <div className="rounded-base border-2 border-border bg-white p-4">
                        <h4 className="font-semibold mb-3 text-sm">File Information</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="rounded-base border border-border bg-main/5 px-3 py-2">
                            <div className="text-xs text-foreground/60">Container</div>
                            <div className="font-semibold">{metadata.container}</div>
                          </div>
                          {metadata.duration !== null && (
                            <div className="rounded-base border border-border bg-main/5 px-3 py-2">
                              <div className="text-xs text-foreground/60">Duration</div>
                              <div className="font-semibold">{formatTime(metadata.duration)}</div>
                            </div>
                          )}
                          {metadata.dimensions && (
                            <div className="rounded-base border border-border bg-main/5 px-3 py-2">
                              <div className="text-xs text-foreground/60">Dimensions</div>
                              <div className="font-semibold">
                                {metadata.dimensions.width}x{metadata.dimensions.height}
                              </div>
                            </div>
                          )}
                          {metadata.frameRate !== null && (
                            <div className="rounded-base border border-border bg-main/5 px-3 py-2">
                              <div className="text-xs text-foreground/60">Frame Rate</div>
                              <div className="font-semibold">{metadata.frameRate.toFixed(2)} FPS</div>
                            </div>
                          )}
                          {metadata.videoCodec && (
                            <div className="rounded-base border border-border bg-main/5 px-3 py-2">
                              <div className="text-xs text-foreground/60">Video Codec</div>
                              <div className="font-semibold">{metadata.videoCodec}</div>
                            </div>
                          )}
                          {metadata.audioCodec && (
                            <div className="rounded-base border border-border bg-main/5 px-3 py-2">
                              <div className="text-xs text-foreground/60">Audio Codec</div>
                              <div className="font-semibold">{metadata.audioCodec}</div>
                            </div>
                          )}
                          {metadata.sampleRate !== null && (
                            <div className="rounded-base border border-border bg-main/5 px-3 py-2">
                              <div className="text-xs text-foreground/60">Sample Rate</div>
                              <div className="font-semibold">{metadata.sampleRate} Hz</div>
                            </div>
                          )}
                          {metadata.bitDepth !== null && (
                            <div className="rounded-base border border-border bg-main/5 px-3 py-2">
                              <div className="text-xs text-foreground/60">Bit Depth</div>
                              <div className="font-semibold">{metadata.bitDepth} bit</div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </div>

            {/* Format Selection Row */}
            <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr]">
              {/* Input Format */}
              <div className="space-y-2">
                <label className="text-sm font-semibold">Input Format</label>
                <Select value={inputFormat} onValueChange={setInputFormat}>
                  <SelectTrigger className="h-12 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <SelectValue placeholder="Select input format" />
                  </SelectTrigger>
                  <SelectContent>
                    {INPUT_FORMATS.map((format) => (
                      <SelectItem key={format.value} value={format.value}>
                        <span className="flex items-center gap-2">
                          <span>{format.icon}</span>
                          <span>{format.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Arrow Icon */}
              <div className="flex items-end justify-center pb-2 md:pb-0 md:items-center">
                <div className="rounded-full border-2 border-border bg-main p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <ArrowRight className="size-6" />
                </div>
              </div>

              {/* Output Format */}
              <div className="space-y-2">
                <label className="text-sm font-semibold">Output Format</label>
                <Select value={outputFormat} onValueChange={setOutputFormat}>
                  <SelectTrigger className="h-12 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <SelectValue placeholder="Select output format" />
                  </SelectTrigger>
                  <SelectContent>
                    {OUTPUT_FORMATS.map((format) => (
                      <SelectItem key={format.value} value={format.value}>
                        <span className="flex items-center gap-2">
                          <span>{format.icon}</span>
                          <span>{format.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Output Format Description */}
            {outputFormat && (
              <div className="rounded-base border-2 border-border bg-main/10 p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">
                    {OUTPUT_FORMATS.find((f) => f.value === outputFormat)?.icon}
                  </span>
                  <div>
                    <p className="font-semibold">
                      {
                        OUTPUT_FORMATS.find((f) => f.value === outputFormat)
                          ?.label
                      }
                    </p>
                    <p className="text-sm text-foreground/70">
                      {
                        OUTPUT_FORMATS.find((f) => f.value === outputFormat)
                          ?.description
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Conversion Progress */}
            {conversionStatus === "converting" && (
              <div className="space-y-3 rounded-base border-2 border-border bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Loader2 className="size-5 animate-spin text-main" />
                    <span className="font-semibold">Converting...</span>
                  </div>
                  <span className="font-mono text-sm">{progress}%</span>
                </div>
                <Progress value={progress} className="h-3" />

                {/* Stats Display */}
                {stats && (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-base border border-border bg-main/5 px-3 py-2">
                      <div className="text-xs text-foreground/60">Elapsed</div>
                      <div className="font-mono font-semibold">
                        {formatTime(stats.elapsedSeconds)}
                      </div>
                    </div>
                    <div className="rounded-base border border-border bg-main/5 px-3 py-2">
                      <div className="text-xs text-foreground/60">Remaining</div>
                      <div className="font-mono font-semibold">
                        {stats.estimatedRemainingSeconds 
                          ? formatTime(stats.estimatedRemainingSeconds)
                          : "Calculating..."}
                      </div>
                    </div>
                    <div className="col-span-2 rounded-base border border-border bg-main/5 px-3 py-2">
                      <div className="text-xs text-foreground/60">Output Size</div>
                      <div className="font-mono font-semibold">
                        {formatBytes(stats.currentFileSize)}
                      </div>
                    </div>
                  </div>
                )}
                
                <Button
                  variant="neutral"
                  size="sm"
                  onClick={handleCancel}
                  className="w-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                >
                  Cancel
                </Button>
              </div>
            )}

            {/* Finalizing State */}
            {conversionStatus === "finalizing" && (
              <div className="space-y-3 rounded-base border-2 border-border bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Loader2 className="size-5 animate-spin text-main" />
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
            {conversionStatus === "completed" && convertedBlob && (
              <div className="space-y-3 rounded-base border-2 border-green-500 bg-green-50 p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-5 text-green-600" />
                  <span className="font-semibold text-green-700">
                    Conversion Complete!
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-green-700">
                  <div className="rounded-base border border-green-600 bg-green-100 px-3 py-2">
                    <div className="text-xs text-green-600">Output size</div>
                    <div className="font-mono font-semibold">
                      {(convertedBlob.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                  {stats && (
                    <div className="rounded-base border border-green-600 bg-green-100 px-3 py-2">
                      <div className="text-xs text-green-600">Time taken</div>
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
                    className="w-full sm:flex-1 bg-green-600 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-green-700"
                  >
                    <Download className="size-5" />
                    Download File
                  </Button>
                  <Button
                    variant="neutral"
                    size="lg"
                    onClick={resetConversion}
                    className="w-full sm:w-auto shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  >
                    Convert Another
                  </Button>
                </div>
              </div>
            )}

            {/* Conversion Error */}
            {conversionStatus === "error" && (
              <div className="space-y-3 rounded-base border-2 border-red-500 bg-red-50 p-4">
                <div className="flex items-center gap-2">
                  <XCircle className="size-5 text-red-600" />
                  <span className="font-semibold text-red-700">
                    Conversion Failed
                  </span>
                </div>
                <p className="text-sm text-red-700">{errorMessage}</p>
                <Button
                  variant="neutral"
                  size="sm"
                  onClick={resetConversion}
                  className="w-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                >
                  Try Again
                </Button>
              </div>
            )}

            {/* Convert Button */}
            {conversionStatus === "idle" && (
              <Button
                size="lg"
                className="w-full text-base font-bold shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
                disabled={!selectedFile || !inputFormat || !outputFormat}
                onClick={handleConvert}
              >
                <Video className="size-5" />
                Convert {outputFormat && outputContainers.includes(outputFormat as OutputContainer) && isAudioOnlyFormat(outputFormat as OutputContainer) ? "to Audio" : "Video"}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Features Grid */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center">
              <div className="mb-3 rounded-full border-2 border-border bg-main p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <FileVideo className="size-8" />
              </div>
              <h3 className="mb-2 font-heading text-lg font-bold">
                Multiple Formats
              </h3>
              <p className="text-sm text-foreground/70">
                Support for MP4, WebM, MKV, MOV, and many more video & audio
                formats
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center">
              <div className="mb-3 rounded-full border-2 border-border bg-main p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <Upload className="size-8" />
              </div>
              <h3 className="mb-2 font-heading text-lg font-bold">
                Client-Side Processing
              </h3>
              <p className="text-sm text-foreground/70">
                All conversions happen in your browser - your files never leave
                your device
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center">
              <div className="mb-3 rounded-full border-2 border-border bg-main p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <Download className="size-8" />
              </div>
              <h3 className="mb-2 font-heading text-lg font-bold">
                High Quality
              </h3>
              <p className="text-sm text-foreground/70">
                Hardware-accelerated encoding with customizable quality settings
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
