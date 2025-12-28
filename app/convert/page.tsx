"use client";

import { registerMp3Encoder } from "@mediabunny/mp3-encoder";
import {
  ArrowRight,
  CheckCircle2,
  Download,
  FileVideo,
  Loader2,
  Upload,
  Video,
  XCircle,
} from "lucide-react";
import {
  ALL_FORMATS,
  type AudioCodec,
  BlobSource,
  BufferTarget,
  Conversion,
  canEncodeAudio,
  getEncodableAudioCodecs,
  getEncodableVideoCodecs,
  Input as MediaInput,
  Output,
  type VideoCodec,
  ConversionVideoOptions,
  ConversionAudioOptions,
} from "mediabunny";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  EditingPanel,
  type EditingState,
  defaultEditingState,
  type CropRect,
} from "@/components/editing";
import {
  EditableMediaPlayer,
  type MediaPlayerHandle,
} from "@/components/player/editable-media-player";
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
  AUDIO_CODEC_LABELS,
  getCommonAudioCodecs,
  getFileExtension,
  getMediabunnyOutput,
  getMimeType,
  getSupportedVideoCodecs,
  isAudioOnlyFormat,
  type OutputContainer,
  outputContainers,
  VIDEO_CODEC_LABELS,
} from "@/lib/mediabunny";

const INPUT_FORMATS = [
  // Video formats
  { value: "mp4", label: "MP4", icon: "🎬" },
  { value: "mov", label: "MOV (QuickTime)", icon: "🎥" },
  { value: "webm", label: "WebM", icon: "🌐" },
  { value: "mkv", label: "MKV (Matroska)", icon: "📹" },
  { value: "avi", label: "AVI", icon: "📼" },
  { value: "flv", label: "FLV", icon: "⚡" },
  { value: "wmv", label: "WMV", icon: "🪟" },
  { value: "mpeg", label: "MPEG", icon: "📺" },
  // Audio formats
  { value: "mp3", label: "MP3", icon: "🎵" },
  { value: "wav", label: "WAV", icon: "🔊" },
  { value: "aac", label: "AAC", icon: "🎧" },
  { value: "ogg", label: "OGG", icon: "🎶" },
  { value: "flac", label: "FLAC", icon: "💿" },
  { value: "m4a", label: "M4A", icon: "🎼" },
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

type ConversionStatus =
  | "idle"
  | "converting"
  | "finalizing"
  | "completed"
  | "error";

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
  numberOfChannels: number | null;
  isHdr: boolean | null;
  isAudioOnly: boolean;
}

export default function ConvertPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [inputFormat, setInputFormat] = useState<string>("");
  const [outputFormat, setOutputFormat] = useState<string>("");
  const [videoCodec, setVideoCodec] = useState<string>("copy");
  const [audioCodec, setAudioCodec] = useState<string>("copy");
  const [availableVideoCodecs, setAvailableVideoCodecs] = useState<
    VideoCodec[]
  >([]);
  const [availableAudioCodecs, setAvailableAudioCodecs] = useState<
    AudioCodec[]
  >([]);
  const [loadingCodecs, setLoadingCodecs] = useState<boolean>(false);
  const [conversionStatus, setConversionStatus] =
    useState<ConversionStatus>("idle");
  const [progress, setProgress] = useState<number>(0);
  const [convertedBlob, setConvertedBlob] = useState<Blob | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [stats, setStats] = useState<ConversionStats | null>(null);
  const [metadata, setMetadata] = useState<FileMetadata | null>(null);
  const [loadingMetadata, setLoadingMetadata] = useState<boolean>(false);
  const [notifyMe, setNotifyMe] = useState<boolean>(false);
  const [editingState, setEditingState] =
    useState<EditingState>(defaultEditingState);
  const conversionRef = useRef<Conversion | null>(null);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mediaPlayerRef = useRef<MediaPlayerHandle>(null);
  const notifyMeRef = useRef<boolean>(false);

  // Keep notifyMeRef in sync with notifyMe state
  useEffect(() => {
    notifyMeRef.current = notifyMe;
  }, [notifyMe]);

  // Handle crop toggle - scroll to player when enabled
  const handleCropToggle = useCallback((enabled: boolean) => {
    if (enabled && mediaPlayerRef.current) {
      // Small delay to let the overlay appear before scrolling
      setTimeout(() => {
        mediaPlayerRef.current?.scrollIntoView();
      }, 100);
    }
  }, []);

  // Handle crop rect changes from the overlay
  const handleCropChange = useCallback((crop: CropRect) => {
    setEditingState((prev) => ({
      ...prev,
      crop: { ...prev.crop, rect: crop },
    }));
  }, []);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
      }
    };
  }, []);

  // Update page title based on conversion status
  useEffect(() => {
    if (
      conversionStatus === "converting" ||
      conversionStatus === "finalizing"
    ) {
      document.title = `${progress}% - Converting...`;
    } else {
      document.title = "LocalCut - Converter";
    }
  }, [conversionStatus, progress]);

  // Load available codecs when output format changes
  useEffect(() => {
    if (
      !outputFormat ||
      !outputContainers.includes(outputFormat as OutputContainer)
    ) {
      setAvailableVideoCodecs([]);
      setAvailableAudioCodecs([]);
      return;
    }

    const loadCodecs = async () => {
      setLoadingCodecs(true);
      try {
        const container = outputFormat as OutputContainer;

        // Get codecs supported by the container format
        const supportedVideoCodecs = getSupportedVideoCodecs(container);
        const supportedAudioCodecs = getCommonAudioCodecs(container);

        // Filter to only encodable codecs (check browser support)
        const [encodableVideo, encodableAudio] = await Promise.all([
          getEncodableVideoCodecs(supportedVideoCodecs),
          getEncodableAudioCodecs(supportedAudioCodecs),
        ]);

        setAvailableVideoCodecs(encodableVideo);
        setAvailableAudioCodecs(encodableAudio);

        // Reset codec selection to "copy" when format changes
        setVideoCodec("copy");
        setAudioCodec("copy");
      } catch (error) {
        console.error("Failed to load codecs:", error);
        setAvailableVideoCodecs([]);
        setAvailableAudioCodecs([]);
      } finally {
        setLoadingCodecs(false);
      }
    };

    loadCodecs();
  }, [outputFormat]);

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
      setEditingState(defaultEditingState);
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }

      // Extract metadata
      extractMetadata(file);
    }
  };

  const handleDragEnter = useCallback(
    (e: React.DragEvent<HTMLLabelElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    },
    [],
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent<HTMLLabelElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    },
    [],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      // Check if it's a video or audio file
      if (file.type.startsWith("video/") || file.type.startsWith("audio/")) {
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
        setEditingState(defaultEditingState);
        if (statsIntervalRef.current) {
          clearInterval(statsIntervalRef.current);
          statsIntervalRef.current = null;
        }
        // Extract metadata
        extractMetadata(file);
      }
    }
  }, []);

  // Handle paste event (Ctrl+V) to accept files from clipboard
  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (
          file &&
          (file.type.startsWith("video/") || file.type.startsWith("audio/"))
        ) {
          e.preventDefault();
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
          setEditingState(defaultEditingState);
          if (statsIntervalRef.current) {
            clearInterval(statsIntervalRef.current);
            statsIntervalRef.current = null;
          }
          // Extract metadata
          extractMetadata(file);
          break;
        }
      }
    }
  }, []);

  // Add paste event listener
  useEffect(() => {
    document.addEventListener("paste", handlePaste);
    return () => {
      document.removeEventListener("paste", handlePaste);
    };
  }, [handlePaste]);

  const extractMetadata = async (file: File) => {
    setLoadingMetadata(true);
    try {
      const input = new MediaInput({
        source: new BlobSource(file),
        formats: ALL_FORMATS,
      });

      const format = await input.getFormat();
      const tracks = await input.getTracks();

      let videoTrack = null;
      let audioTrack = null;
      let frameRate: number | null = null;
      let isHdr: boolean | null = null;

      // Find video and audio tracks
      for (const track of tracks) {
        if (track.isVideoTrack()) {
          videoTrack = track;
          // Get frame rate from packet stats
          const stats = await track.computePacketStats(50).catch(() => null);
          frameRate = stats?.averagePacketRate || null;
          // Check for HDR
          isHdr = await track.hasHighDynamicRange().catch(() => null);
        } else if (track.isAudioTrack()) {
          audioTrack = track;
        }
      }

      // Get duration from input, not from tracks
      const duration = await input.computeDuration().catch(() => null);

      // Determine if this is an audio-only file
      const isAudioOnly = !videoTrack && !!audioTrack;

      const metadata: FileMetadata = {
        container: format?.name || "Unknown",
        size: file.size,
        duration,
        videoCodec: videoTrack?.codec || null,
        audioCodec: audioTrack?.codec || null,
        dimensions:
          videoTrack && videoTrack.displayWidth && videoTrack.displayHeight
            ? {
                width: videoTrack.displayWidth,
                height: videoTrack.displayHeight,
              }
            : null,
        frameRate,
        sampleRate: audioTrack?.sampleRate || null,
        numberOfChannels: audioTrack?.numberOfChannels || null,
        isHdr,
        isAudioOnly,
      };

      setMetadata(metadata);

      // Clean up
      input.dispose();
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
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / k ** i).toFixed(2)} ${sizes[i]}`;
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

      // Build video options including editing features
      const isAudioOnly = isAudioOnlyFormat(outputFormat as OutputContainer);
      
      // Start with base video options
      let videoOptions: ConversionVideoOptions | undefined;
      if (isAudioOnly) {
        videoOptions = { discard: true as const };
      } else {
        videoOptions = {};
        
        // Add codec if not copying
        if (videoCodec !== "copy") {
          videoOptions.codec = videoCodec as VideoCodec;
        }
        
        // Add rotation if enabled (MediaBunny rotate format: 0 | 90 | 180 | 270)
        if (editingState.rotate.enabled && editingState.rotate.degrees !== 0) {
          videoOptions.rotate = editingState.rotate.degrees;
          console.log("Rotation settings:", videoOptions.rotate, "degrees clockwise");
        }

        // Add crop if enabled (MediaBunny crop format)
        if (editingState.crop.enabled && editingState.crop.rect && metadata?.dimensions) {
          videoOptions.crop = {
            left: Math.round(editingState.crop.rect.left * metadata.dimensions.width),
            top: Math.round(editingState.crop.rect.top * metadata.dimensions.height),
            width: Math.round(editingState.crop.rect.width * metadata.dimensions.width),
            height: Math.round(editingState.crop.rect.height * metadata.dimensions.height),
          };
          console.log("Crop settings:", videoOptions.crop);
        }
        
        // Only set videoOptions if we have something to configure
        if (Object.keys(videoOptions).length === 0) {
          videoOptions = undefined;
        }
      }

      // Build audio options
      // If mute is enabled, discard the audio track entirely
      let audioOptions: ConversionAudioOptions;
      
      if (editingState.mute.enabled) {
        audioOptions = { discard: true };
        console.log("Audio will be stripped from output");
      } else if (audioCodec !== "copy") {
        audioOptions = { codec: audioCodec as AudioCodec };
      }

      console.log("Video options:", videoOptions);
      console.log("Audio options:", audioOptions);

      const conversion = await Conversion.init({
        input,
        output,
        video: videoOptions,
        audio: audioOptions,
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

      // Get media duration for time estimation (try video first, then audio)
      let mediaDuration: number | null = null;
      try {
        const videoTrack = await input.getPrimaryVideoTrack();
        if (videoTrack) {
          mediaDuration = await videoTrack.computeDuration();
          console.log("Video duration:", mediaDuration, "seconds");
        }
      } catch (e) {
        console.log("Could not get video duration:", e);
      }

      // If no video track, try to get audio duration
      if (mediaDuration === null) {
        try {
          const audioTrack = await input.getPrimaryAudioTrack();
          if (audioTrack) {
            mediaDuration = await audioTrack.computeDuration();
            console.log("Audio duration:", mediaDuration, "seconds");
          }
        } catch (e) {
          console.log("Could not get audio duration:", e);
        }
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
        setStats((prev) => (prev ? { ...prev, currentFileSize: end } : null));
      };

      // Update elapsed time every 100ms
      statsIntervalRef.current = setInterval(() => {
        const now = Date.now();
        const elapsed = (now - startTime) / 1000;
        setStats((prev) =>
          prev
            ? { ...prev, elapsedSeconds: elapsed, lastUpdateTime: now }
            : null,
        );
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

        if (p > 0.01) {
          // Only estimate after 1% progress
          estimatedTotal = elapsed / p;
          estimatedRemaining = estimatedTotal - elapsed;
        }

        setStats((prev) =>
          prev
            ? {
                ...prev,
                lastUpdateTime: now,
                elapsedSeconds: elapsed,
                estimatedTotalSeconds: estimatedTotal,
                estimatedRemainingSeconds: estimatedRemaining,
              }
            : null,
        );
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
        throw new Error(
          "Conversion completed but no output buffer was created",
        );
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

      // Send notification if enabled (use ref to get latest value)
      if (
        notifyMeRef.current &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        new Notification("Conversion Complete!", {
          body: `Your file has been successfully converted to ${outputFormat.toUpperCase()}.`,
          icon: "/favicon.ico",
        });
      }
    } catch (error) {
      console.error("Conversion error:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "An unknown error occurred",
      );
      setConversionStatus("error");

      // Clear the stats interval on error
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }
    } finally {
      conversionRef.current = null;
    }
  }, [selectedFile, outputFormat, videoCodec, audioCodec, editingState.crop, editingState.mute.enabled, editingState.rotate.enabled, editingState.rotate.degrees, metadata?.dimensions]);

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
    setNotifyMe(false);
    setEditingState(defaultEditingState);

    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }
  }, []);

  return (
    <div className="min-h-screen bg-background dark:bg-black p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-3 font-heading text-5xl tracking-tight text-foreground">
            LocalCut - Media Converter
          </h1>
          <p className="text-lg text-foreground/70">
            Convert your videos and audio files to any format with ease
          </p>
        </div>

        {/* Main Converter Card */}
        <Card className="mb-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.1)]">
          <CardHeader>
            <CardTitle className="text-2xl">Media Converter</CardTitle>
            <CardDescription>
              Upload a video or audio file and select your desired output format
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* File Upload / Media Preview Section */}
            <div className="space-y-2">
              <label className="text-sm font-semibold">
                {selectedFile ? "Media Preview" : "Upload Media"}
              </label>
              <input
                type="file"
                accept="video/*,audio/*"
                onChange={handleFileSelect}
                className="hidden"
                id="video-upload"
              />
              {!selectedFile ? (
                <label
                  htmlFor="video-upload"
                  className={`flex h-32 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-base border-2 border-dashed transition-all hover:translate-x-1 hover:translate-y-1 ${
                    isDragging
                      ? "border-main bg-main/10 scale-[1.02]"
                      : "border-border bg-white dark:bg-gray-950 hover:bg-main/5 dark:hover:bg-main/10"
                  }`}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <Upload
                    className={`size-8 transition-transform ${isDragging ? "scale-110" : ""}`}
                  />
                  <div className="text-center">
                    <p className="font-semibold">
                      {isDragging
                        ? "Drop your file here"
                        : "Click to upload, drag and drop, or paste (Ctrl+V)"}
                    </p>
                    <p className="text-sm text-foreground/60">
                      MP4, WebM, MKV, MOV, MP3, WAV, AAC and more
                    </p>
                  </div>
                </label>
              ) : (
                <div className="space-y-3">
                  <EditableMediaPlayer
                    ref={mediaPlayerRef}
                    src={selectedFile}
                    cropEnabled={editingState.crop.enabled}
                    onCropChange={handleCropChange}
                    initialCrop={editingState.crop.rect ?? undefined}
                    videoDimensions={metadata?.dimensions ?? undefined}
                  />
                  <div className="space-y-3 max-w-3xl mx-auto">
                    {/* File Info Header */}
                    <div className="flex items-center justify-between gap-3 rounded-base border-2 border-border bg-white dark:bg-gray-950 p-3">
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
                        className="shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]"
                      >
                        <Upload className="size-4" />
                        Change File
                      </Button>
                    </div>

                    {/* Metadata Display */}
                    {loadingMetadata ? (
                      <div className="flex items-center justify-center gap-2 rounded-base border-2 border-border bg-white dark:bg-gray-950 p-4">
                        <Loader2 className="size-4 animate-spin" />
                        <span className="text-sm text-foreground/60">
                          Loading metadata...
                        </span>
                      </div>
                    ) : metadata ? (
                      <div className="rounded-base border-2 border-border bg-white dark:bg-gray-950 p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <h4 className="font-semibold text-sm">
                            File Information
                          </h4>
                          {metadata.isAudioOnly && (
                            <span className="rounded-full bg-main/20 px-2 py-0.5 text-xs font-medium">
                              Audio Only
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="rounded-base border border-border bg-main/5 dark:bg-main/10 px-3 py-2">
                            <div className="text-xs text-foreground/60">
                              Container
                            </div>
                            <div className="font-semibold">
                              {metadata.container}
                            </div>
                          </div>
                          {metadata.duration !== null && (
                            <div className="rounded-base border border-border bg-main/5 dark:bg-main/10 px-3 py-2">
                              <div className="text-xs text-foreground/60">
                                Duration
                              </div>
                              <div className="font-semibold">
                                {formatTime(metadata.duration)}
                              </div>
                            </div>
                          )}
                          {metadata.dimensions && (
                            <div className="rounded-base border border-border bg-main/5 dark:bg-main/10 px-3 py-2">
                              <div className="text-xs text-foreground/60">
                                Dimensions
                              </div>
                              <div className="font-semibold">
                                {metadata.dimensions.width}x
                                {metadata.dimensions.height}
                              </div>
                            </div>
                          )}
                          {metadata.frameRate !== null && (
                            <div className="rounded-base border border-border bg-main/5 dark:bg-main/10 px-3 py-2">
                              <div className="text-xs text-foreground/60">
                                Frame Rate
                              </div>
                              <div className="font-semibold">
                                {metadata.frameRate.toFixed(2)} FPS
                              </div>
                            </div>
                          )}
                          {metadata.videoCodec && (
                            <div className="rounded-base border border-border bg-main/5 dark:bg-main/10 px-3 py-2">
                              <div className="text-xs text-foreground/60">
                                Video Codec
                              </div>
                              <div className="font-semibold">
                                {VIDEO_CODEC_LABELS[
                                  metadata.videoCodec as keyof typeof VIDEO_CODEC_LABELS
                                ] || metadata.videoCodec}
                              </div>
                            </div>
                          )}
                          {metadata.audioCodec && (
                            <div className="rounded-base border border-border bg-main/5 dark:bg-main/10 px-3 py-2">
                              <div className="text-xs text-foreground/60">
                                Audio Codec
                              </div>
                              <div className="font-semibold">
                                {AUDIO_CODEC_LABELS[
                                  metadata.audioCodec as keyof typeof AUDIO_CODEC_LABELS
                                ] || metadata.audioCodec}
                              </div>
                            </div>
                          )}
                          {metadata.sampleRate !== null && (
                            <div className="rounded-base border border-border bg-main/5 dark:bg-main/10 px-3 py-2">
                              <div className="text-xs text-foreground/60">
                                Sample Rate
                              </div>
                              <div className="font-semibold">
                                {metadata.sampleRate} Hz
                              </div>
                            </div>
                          )}
                          {metadata.numberOfChannels !== null && (
                            <div className="rounded-base border border-border bg-main/5 dark:bg-main/10 px-3 py-2">
                              <div className="text-xs text-foreground/60">
                                Channels
                              </div>
                              <div className="font-semibold">
                                {metadata.numberOfChannels === 1
                                  ? "Mono"
                                  : metadata.numberOfChannels === 2
                                    ? "Stereo"
                                    : `${metadata.numberOfChannels} channels`}
                              </div>
                            </div>
                          )}
                          {metadata.isHdr && (
                            <div className="rounded-base border border-border bg-main/5 dark:bg-main/10 px-3 py-2">
                              <div className="text-xs text-foreground/60">
                                Color
                              </div>
                              <div className="font-semibold">HDR</div>
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
                  <SelectTrigger className="h-12 bg-white dark:bg-gray-950 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]">
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
                <div className="rounded-full border-2 border-border bg-main p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]">
                  <ArrowRight className="size-6" />
                </div>
              </div>

              {/* Output Format */}
              <div className="space-y-2">
                <label className="text-sm font-semibold">Output Format</label>
                <Select value={outputFormat} onValueChange={setOutputFormat}>
                  <SelectTrigger className="h-12 bg-white dark:bg-gray-950 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]">
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

            {/* Audio to Video Format Notice */}
            {metadata?.isAudioOnly &&
              outputFormat &&
              outputContainers.includes(outputFormat as OutputContainer) &&
              !isAudioOnlyFormat(outputFormat as OutputContainer) && (
                <div className="rounded-base border-2 border-amber-500 bg-amber-50 dark:bg-amber-950 p-4">
                  <div className="flex items-start gap-2">
                    <span className="text-lg">ℹ️</span>
                    <div>
                      <p className="font-semibold text-amber-700 dark:text-amber-300">
                        Audio-only input file
                      </p>
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        Your input file only contains audio. The output will be
                        a {outputFormat.toUpperCase()} container with audio only
                        (no video track).
                      </p>
                    </div>
                  </div>
                </div>
              )}

            {/* Codec Selection */}
            {outputFormat &&
              outputContainers.includes(outputFormat as OutputContainer) && (
                <div className="rounded-base border-2 border-border bg-white dark:bg-gray-950 p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <h4 className="font-semibold text-sm">Encoding Options</h4>
                    <span className="text-xs text-foreground/70">
                      (Confused? Leave the default)
                    </span>
                  </div>
                  {loadingCodecs ? (
                    <div className="flex items-center justify-center gap-2 py-4">
                      <Loader2 className="size-4 animate-spin" />
                      <span className="text-sm text-foreground/60">
                        Loading available codecs...
                      </span>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {/* Video Codec Selection - only show for non-audio formats and non-audio-only input */}
                      {!isAudioOnlyFormat(outputFormat as OutputContainer) &&
                        !metadata?.isAudioOnly && (
                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              Video Codec
                            </label>
                            <Select
                              value={videoCodec}
                              onValueChange={setVideoCodec}
                            >
                              <SelectTrigger className="bg-white dark:bg-gray-950 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]">
                                <SelectValue placeholder="Select video codec" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="copy">
                                  <span className="flex items-center gap-2">
                                    <span>📋</span>
                                    <span>Copy (No re-encoding)</span>
                                  </span>
                                </SelectItem>
                                {availableVideoCodecs.map((codec) => (
                                  <SelectItem key={codec} value={codec}>
                                    <span className="flex items-center gap-2">
                                      <span>🎬</span>
                                      <span>
                                        {VIDEO_CODEC_LABELS[codec] || codec}
                                      </span>
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-foreground/60">
                              {videoCodec === "copy"
                                ? "Copies video stream without re-encoding (fastest)"
                                : `Re-encodes video using ${VIDEO_CODEC_LABELS[videoCodec as VideoCodec] || videoCodec}`}
                            </p>
                          </div>
                        )}

                      {/* Audio Codec Selection */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Audio Codec
                        </label>
                        <Select
                          value={audioCodec}
                          onValueChange={setAudioCodec}
                        >
                          <SelectTrigger className="bg-white dark:bg-gray-950 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]">
                            <SelectValue placeholder="Select audio codec" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="copy">
                              <span className="flex items-center gap-2">
                                <span>📋</span>
                                <span>Copy (No re-encoding)</span>
                              </span>
                            </SelectItem>
                            {availableAudioCodecs.map((codec) => (
                              <SelectItem key={codec} value={codec}>
                                <span className="flex items-center gap-2">
                                  <span>🎵</span>
                                  <span>
                                    {AUDIO_CODEC_LABELS[codec] || codec}
                                  </span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-foreground/60">
                          {audioCodec === "copy"
                            ? "Copies audio stream without re-encoding (fastest)"
                            : `Re-encodes audio using ${AUDIO_CODEC_LABELS[audioCodec as AudioCodec] || audioCodec}`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

            {/* Editing Panel - hidden for audio-only output formats */}
            {selectedFile &&
              outputFormat &&
              outputContainers.includes(outputFormat as OutputContainer) &&
              !isAudioOnlyFormat(outputFormat as OutputContainer) && (
                <EditingPanel
                  state={editingState}
                  onStateChange={setEditingState}
                  onCropToggle={handleCropToggle}
                  isAudioOnly={metadata?.isAudioOnly}
                />
              )}

            {/* Notify Me Option */}
            {outputFormat &&
              outputContainers.includes(outputFormat as OutputContainer) && (
                <div className="rounded-base border-2 border-border bg-white dark:bg-gray-950 p-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="notifyMe"
                      checked={notifyMe}
                      onChange={async (e) => {
                        console.log(
                          "Notify me checkbox changed:",
                          e.target.checked,
                        );
                        if (e.target.checked) {
                          // Request notification permission if not granted
                          if ("Notification" in window) {
                            if (Notification.permission === "default") {
                              const permission =
                                await Notification.requestPermission();
                              setNotifyMe(permission === "granted");
                            } else if (Notification.permission === "granted") {
                              setNotifyMe(true);
                            } else {
                              // Permission denied
                              setNotifyMe(false);
                              alert(
                                "Notification permission is denied. Please enable it in your browser settings.",
                              );
                            }
                          } else {
                            alert(
                              "Notifications are not supported in your browser.",
                            );
                            setNotifyMe(false);
                          }
                        } else {
                          console.log("Notifications unchecked");
                          setNotifyMe(false);
                        }
                      }}
                      className="size-4 cursor-pointer accent-main"
                    />
                    <label
                      htmlFor="notifyMe"
                      className="text-sm font-medium cursor-pointer"
                    >
                      Notify me when conversion is complete
                    </label>
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
                    <div className="rounded-base border border-border bg-main/5 dark:bg-main/10 px-3 py-2">
                      <div className="text-xs text-foreground/60">Elapsed</div>
                      <div className="font-mono font-semibold">
                        {formatTime(stats.elapsedSeconds)}
                      </div>
                    </div>
                    <div className="rounded-base border border-border bg-main/5 dark:bg-main/10 px-3 py-2">
                      <div className="text-xs text-foreground/60">
                        Remaining
                      </div>
                      <div className="font-mono font-semibold">
                        {stats.estimatedRemainingSeconds
                          ? formatTime(stats.estimatedRemainingSeconds)
                          : "Calculating..."}
                      </div>
                    </div>
                    <div className="col-span-2 rounded-base border border-border bg-main/5 dark:bg-main/10 px-3 py-2">
                      <div className="text-xs text-foreground/60">
                        Output Size
                      </div>
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
                  className="w-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]"
                >
                  Cancel
                </Button>
              </div>
            )}

            {/* Finalizing State */}
            {conversionStatus === "finalizing" && (
              <div className="space-y-3 rounded-base border-2 border-border bg-white dark:bg-gray-950 p-4">
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
              <div className="space-y-3 rounded-base border-2 border-green-500 bg-green-50 dark:bg-green-950 p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-5 text-green-600" />
                  <span className="font-semibold text-green-700 dark:text-green-300">
                    Conversion Complete!
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-green-700 dark:text-green-300">
                  <div className="rounded-base border border-green-600 bg-green-100 px-3 py-2">
                    <div className="text-xs text-green-600">Output size</div>
                    <div className="font-mono font-semibold">
                      {(convertedBlob.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                  {stats && (
                    <div className="rounded-base border border-green-600 bg-green-100 dark:bg-green-900 px-3 py-2">
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
                    className="w-full sm:flex-1 bg-green-600 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] hover:bg-green-700"
                  >
                    <Download className="size-5" />
                    Download File
                  </Button>
                  <Button
                    variant="neutral"
                    size="lg"
                    onClick={resetConversion}
                    className="w-full sm:w-auto shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]"
                  >
                    Convert Another
                  </Button>
                </div>
              </div>
            )}

            {/* Conversion Error */}
            {conversionStatus === "error" && (
              <div className="space-y-3 rounded-base border-2 border-red-500 bg-red-50 dark:bg-red-950 p-4">
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
                  variant="neutral"
                  size="sm"
                  onClick={resetConversion}
                  className="w-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]"
                >
                  Try Again
                </Button>
              </div>
            )}

            {/* Convert Button */}
            {conversionStatus === "idle" && (
              <Button
                size="lg"
                className="w-full text-base font-bold shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.1)]"
                disabled={!selectedFile || !inputFormat || !outputFormat}
                onClick={handleConvert}
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
          </CardContent>
        </Card>

        {/* Features Grid */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.1)]">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center">
              <div className="mb-3 rounded-full border-2 border-border bg-main p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]">
                <FileVideo className="size-8" />
              </div>
              <h3 className="mb-2 font-heading text-lg">Multiple Formats</h3>
              <p className="text-sm text-foreground/70">
                Support for MP4, WebM, MKV, MOV, and many more video & audio
                formats
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.1)]">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center">
              <div className="mb-3 rounded-full border-2 border-border bg-main p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]">
                <Upload className="size-8" />
              </div>
              <h3 className="mb-2 font-heading text-lg">
                Client-Side Processing
              </h3>
              <p className="text-sm text-foreground/70">
                All conversions happen in your browser - your files never leave
                your device
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.1)]">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center">
              <div className="mb-3 rounded-full border-2 border-border bg-main p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]">
                <Download className="size-8" />
              </div>
              <h3 className="mb-2 font-heading text-lg">High Quality</h3>
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
