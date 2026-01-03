"use client";

import { registerMp3Encoder } from "@mediabunny/mp3-encoder";
import { Loader2, Upload } from "lucide-react";
import {
  ALL_FORMATS,
  type AudioCodec,
  BlobSource,
  BufferTarget,
  Conversion,
  type ConversionAudioOptions,
  type ConversionVideoOptions,
  canEncodeAudio,
  getEncodableAudioCodecs,
  getEncodableVideoCodecs,
  Input as MediaInput,
  Output,
  type VideoCodec,
} from "mediabunny";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRightIcon } from "@/components/animate-ui/icons/arrow-right";
import {
  type CropRect,
  defaultEditingState,
  EditingPanel,
  type EditingState,
  fineTuneToCSS,
} from "@/components/editing";
import {
  EditableMediaPlayer,
  type MediaPlayerHandle,
} from "@/components/player/editable-media-player";
import { Button } from "@/components/ui/button";
import { FolderInputIcon } from "@/components/ui/folder-input";
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
  getMediabunnyOutput,
  getMimeType,
  getSupportedVideoCodecs,
  isAudioOnlyFormat,
  type OutputContainer,
  outputContainers,
  VIDEO_CODEC_LABELS,
} from "@/lib/mediabunny";
import {
  type ConversionStats,
  ConversionStatusDisplay,
  type ConversionStatusHandle,
} from "./conversion-status-display";

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
  const [metadata, setMetadata] = useState<FileMetadata | null>(null);
  const [loadingMetadata, setLoadingMetadata] = useState<boolean>(false);
  const [notifyMe, setNotifyMe] = useState<boolean>(false);
  const [editingState, setEditingState] =
    useState<EditingState>(defaultEditingState);
  const conversionRef = useRef<Conversion | null>(null);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mediaPlayerRef = useRef<MediaPlayerHandle>(null);
  const notifyMeRef = useRef<boolean>(false);
  const statusRef = useRef<ConversionStatusHandle>(null);

  // Ref to track editing state without triggering re-renders in callbacks
  const editingStateRef = useRef(editingState);
  useEffect(() => {
    editingStateRef.current = editingState;
  }, [editingState]);

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

  // Handle crop disable (e.g., when entering fullscreen)
  const handleCropDisable = useCallback(() => {
    setEditingState((prev) => ({
      ...prev,
      crop: { ...prev.crop, enabled: false, rect: null },
    }));
  }, []);

  // Handle trim toggle - scroll to player when enabled
  const handleTrimToggle = useCallback((enabled: boolean) => {
    if (enabled && mediaPlayerRef.current) {
      // Small delay to let the trim UI appear before scrolling
      setTimeout(() => {
        mediaPlayerRef.current?.scrollIntoView();
      }, 100);
    }
  }, []);

  // Handle trim range changes from the seek bar
  const handleTrimChange = useCallback(
    (range: { start: number; end: number }) => {
      setEditingState((prev) => ({
        ...prev,
        trim: { ...prev.trim, start: range.start, end: range.end },
      }));
    },
    [],
  );

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
      }
    };
  }, []);

  // Disable crop and rotate when output format is audio-only
  useEffect(() => {
    if (
      outputFormat &&
      outputContainers.includes(outputFormat as OutputContainer) &&
      isAudioOnlyFormat(outputFormat as OutputContainer)
    ) {
      // Disable crop and rotate for audio-only output formats
      setEditingState((prev) => ({
        ...prev,
        crop: { enabled: false, rect: null },
        rotate: { enabled: false, degrees: 0 },
      }));
    }
  }, [outputFormat]);

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

  const extractMetadata = useCallback(async (file: File) => {
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
          videoTrack?.displayWidth && videoTrack.displayHeight
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
      statusRef.current?.reset();
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

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLLabelElement>) => {
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
          statusRef.current?.reset();
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
    },
    [
      // Extract metadata
      extractMetadata,
    ],
  );

  // Handle paste event (Ctrl+V) to accept files from clipboard
  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
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
            statusRef.current?.reset();
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
    },
    [
      // Extract metadata
      extractMetadata,
    ],
  );

  // Add paste event listener
  useEffect(() => {
    document.addEventListener("paste", handlePaste);
    return () => {
      document.removeEventListener("paste", handlePaste);
    };
  }, [handlePaste]);

  const formatTime = useCallback((seconds: number): string => {
    if (!Number.isFinite(seconds) || seconds < 0) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const handleConvert = useCallback(async () => {
    console.log("handleConvert called", { selectedFile, outputFormat });

    if (!selectedFile || !outputFormat) {
      console.log("Missing file or output format");
      return;
    }

    // Validate output format
    if (!outputContainers.includes(outputFormat as OutputContainer)) {
      console.log("Unsupported output format:", outputFormat);
      statusRef.current?.setError(`Unsupported output format: ${outputFormat}`);
      return;
    }

    statusRef.current?.start();

    try {
      // Use the ref for current editing state to avoid dependency on the state variable
      const currentEditingState = editingStateRef.current;

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
        if (
          currentEditingState.rotate.enabled &&
          currentEditingState.rotate.degrees !== 0
        ) {
          videoOptions.rotate = currentEditingState.rotate.degrees;
          console.log(
            "Rotation settings:",
            videoOptions.rotate,
            "degrees clockwise",
          );
        }

        // Add crop if enabled (MediaBunny crop format)
        // Note: Rotation is applied BEFORE crop in MediaBunny's pipeline,
        // so crop coordinates must be in the rotated coordinate space.
        if (
          currentEditingState.crop.enabled &&
          currentEditingState.crop.rect &&
          metadata?.dimensions
        ) {
          // Determine dimensions after rotation is applied
          const rotationDegrees = currentEditingState.rotate.enabled
            ? currentEditingState.rotate.degrees
            : 0;
          const isQuarterTurn =
            rotationDegrees === 90 || rotationDegrees === 270;
          const rotatedWidth = isQuarterTurn
            ? metadata.dimensions.height
            : metadata.dimensions.width;
          const rotatedHeight = isQuarterTurn
            ? metadata.dimensions.width
            : metadata.dimensions.height;

          videoOptions.crop = {
            left: Math.round(currentEditingState.crop.rect.left * rotatedWidth),
            top: Math.round(currentEditingState.crop.rect.top * rotatedHeight),
            width: Math.round(
              currentEditingState.crop.rect.width * rotatedWidth,
            ),
            height: Math.round(
              currentEditingState.crop.rect.height * rotatedHeight,
            ),
          };
          console.log("Crop settings:", videoOptions.crop);
        }

        // Add fine-tune filters if enabled
        if (currentEditingState.fineTune.enabled) {
          const cssFilter = fineTuneToCSS(currentEditingState.fineTune.filters);
          if (cssFilter !== "none") {
            if (!videoOptions) videoOptions = {};

            let ctx: OffscreenCanvasRenderingContext2D | null = null;

            videoOptions.process = (sample) => {
              if (!ctx) {
                const canvas = new OffscreenCanvas(
                  sample.displayWidth,
                  sample.displayHeight,
                );
                const context = canvas.getContext("2d");
                if (!context) throw new Error("Failed to get 2d context");
                ctx = context;

                // Apply the CSS filter from fine-tune settings
                ctx.filter = cssFilter;
              }

              sample.draw(ctx, 0, 0);

              return ctx.canvas;
            };
          }
        }

        // Only set videoOptions if we have something to configure
        if (videoOptions && Object.keys(videoOptions).length === 0) {
          videoOptions = undefined;
        }
      }
      // Build audio options
      // If mute is enabled, discard the audio track entirely
      let audioOptions: ConversionAudioOptions | undefined;

      if (currentEditingState.mute.enabled) {
        audioOptions = { discard: true };
        console.log("Audio will be stripped from output");
      } else if (audioCodec !== "copy") {
        audioOptions = { codec: audioCodec as AudioCodec };
      }

      // Build trim options
      let trimOptions: { start?: number; end?: number } | undefined;
      if (
        currentEditingState.trim.enabled &&
        (currentEditingState.trim.start > 0 ||
          (metadata?.duration &&
            currentEditingState.trim.end < metadata.duration))
      ) {
        trimOptions = {};
        if (currentEditingState.trim.start > 0) {
          trimOptions.start = currentEditingState.trim.start;
        }
        if (
          metadata?.duration &&
          currentEditingState.trim.end < metadata.duration
        ) {
          trimOptions.end = currentEditingState.trim.end;
        }
        console.log("Trim settings:", trimOptions);
      }

      console.log("Video options:", videoOptions);
      console.log("Audio options:", audioOptions);
      console.log("Trim options:", trimOptions);

      const conversion = await Conversion.init({
        input,
        output,
        video: videoOptions,
        audio: audioOptions,
        trim: trimOptions,
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
      let currentStats: ConversionStats = {
        startTime,
        lastUpdateTime: startTime,
        elapsedSeconds: 0,
        estimatedTotalSeconds: null,
        estimatedRemainingSeconds: null,
        currentFileSize: 0,
      };
      statusRef.current?.updateStats(currentStats);

      // Track output file size
      target.onwrite = (_start: number, end: number) => {
        currentStats = { ...currentStats, currentFileSize: end };
        statusRef.current?.updateStats(currentStats);
      };

      // Update elapsed time every 100ms
      statsIntervalRef.current = setInterval(() => {
        const now = Date.now();
        const elapsed = (now - startTime) / 1000;
        currentStats = {
          ...currentStats,
          elapsedSeconds: elapsed,
          lastUpdateTime: now,
        };
        statusRef.current?.updateStats(currentStats);
      }, 100);

      // Set up progress tracking
      conversion.onProgress = (p: number) => {
        console.log("Progress:", p);
        const progressPercent = Math.round(p * 100);
        statusRef.current?.updateProgress(progressPercent);

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

        currentStats = {
          ...currentStats,
          lastUpdateTime: now,
          elapsedSeconds: elapsed,
          estimatedTotalSeconds: estimatedTotal,
          estimatedRemainingSeconds: estimatedRemaining,
        };
        statusRef.current?.updateStats(currentStats);
      };

      // Execute conversion
      console.log("Executing conversion...");
      await conversion.execute();

      // Show finalizing state
      console.log("Conversion encoding complete, finalizing file...");
      statusRef.current?.setFinalizing();

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

      statusRef.current?.setCompleted(blob);

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
      statusRef.current?.setError(
        error instanceof Error ? error.message : "An unknown error occurred",
      );

      // Clear the stats interval on error
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }
    } finally {
      conversionRef.current = null;
    }
  }, [
    selectedFile,
    outputFormat,
    videoCodec,
    audioCodec,
    // Removed editingState dependencies to prevent recreation on every scrub
    metadata?.dimensions,
    metadata?.duration,
  ]);

  const handleCancel = useCallback(async () => {
    if (conversionRef.current) {
      await conversionRef.current.cancel();
      statusRef.current?.reset();

      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }
    }
  }, []);

  const resetConversion = useCallback(() => {
    statusRef.current?.reset();
    setNotifyMe(false);
    setEditingState(defaultEditingState);

    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }
  }, []);

  // Memoize the metadata display to prevent re-renders during scrubbing
  const metadataDisplay = useMemo(() => {
    if (!selectedFile) return null;

    if (loadingMetadata) {
      return (
        <div className="flex items-center justify-center gap-2 rounded-base border-2 border-border bg-white dark:bg-gray-950 p-4">
          <Loader2 className="size-4 animate-spin" />
          <span className="text-sm text-foreground/60">
            Loading metadata...
          </span>
        </div>
      );
    }

    if (!metadata) return null;

    return (
      <div className="rounded-base border-2 border-border bg-white dark:bg-gray-950 p-4">
        <div className="flex items-center gap-2 mb-3">
          <h4 className="font-semibold text-sm">File Information</h4>
          {metadata.isAudioOnly && (
            <span className="rounded-full bg-main/20 px-2 py-0.5 text-xs font-medium">
              Audio Only
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-base border border-border bg-main/5 dark:bg-main/10 px-3 py-2">
            <div className="text-xs text-foreground/60">Container</div>
            <div className="font-semibold">{metadata.container}</div>
          </div>
          {metadata.duration !== null && (
            <div className="rounded-base border border-border bg-main/5 dark:bg-main/10 px-3 py-2">
              <div className="text-xs text-foreground/60">Duration</div>
              <div className="font-semibold">
                {formatTime(metadata.duration)}
              </div>
            </div>
          )}
          {metadata.dimensions && (
            <div className="rounded-base border border-border bg-main/5 dark:bg-main/10 px-3 py-2">
              <div className="text-xs text-foreground/60">Dimensions</div>
              <div className="font-semibold">
                {metadata.dimensions.width}x{metadata.dimensions.height}
              </div>
            </div>
          )}
          {metadata.frameRate !== null && (
            <div className="rounded-base border border-border bg-main/5 dark:bg-main/10 px-3 py-2">
              <div className="text-xs text-foreground/60">Frame Rate</div>
              <div className="font-semibold">
                {metadata.frameRate.toFixed(2)} FPS
              </div>
            </div>
          )}
          {metadata.videoCodec && (
            <div className="rounded-base border border-border bg-main/5 dark:bg-main/10 px-3 py-2">
              <div className="text-xs text-foreground/60">Video Codec</div>
              <div className="font-semibold">
                {VIDEO_CODEC_LABELS[
                  metadata.videoCodec as keyof typeof VIDEO_CODEC_LABELS
                ] || metadata.videoCodec}
              </div>
            </div>
          )}
          {metadata.audioCodec && (
            <div className="rounded-base border border-border bg-main/5 dark:bg-main/10 px-3 py-2">
              <div className="text-xs text-foreground/60">Audio Codec</div>
              <div className="font-semibold">
                {AUDIO_CODEC_LABELS[
                  metadata.audioCodec as keyof typeof AUDIO_CODEC_LABELS
                ] || metadata.audioCodec}
              </div>
            </div>
          )}
          {metadata.sampleRate !== null && (
            <div className="rounded-base border border-border bg-main/5 dark:bg-main/10 px-3 py-2">
              <div className="text-xs text-foreground/60">Sample Rate</div>
              <div className="font-semibold">{metadata.sampleRate} Hz</div>
            </div>
          )}
          {metadata.numberOfChannels !== null && (
            <div className="rounded-base border border-border bg-main/5 dark:bg-main/10 px-3 py-2">
              <div className="text-xs text-foreground/60">Channels</div>
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
              <div className="text-xs text-foreground/60">Color</div>
              <div className="font-semibold">HDR</div>
            </div>
          )}
        </div>
      </div>
    );
  }, [selectedFile, loadingMetadata, metadata, formatTime]);

  // Memoize format selection
  const formatSelection = useMemo(
    () => (
      <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr]">
        {/* Input Format */}
        <div className="space-y-2">
          <span className="text-sm font-semibold block">Input Format</span>
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
            <ArrowRightIcon animateOnHover />
          </div>
        </div>

        {/* Output Format */}
        <div className="space-y-2">
          <span className="text-sm font-semibold block">Output Format</span>
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
    ),
    [inputFormat, outputFormat],
  );

  // Memoize codec selection
  const codecSelection = useMemo(() => {
    if (
      !outputFormat ||
      !outputContainers.includes(outputFormat as OutputContainer)
    ) {
      return null;
    }

    return (
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
                  <span className="text-sm font-medium block">Video Codec</span>
                  <Select value={videoCodec} onValueChange={setVideoCodec}>
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
                            <span>{VIDEO_CODEC_LABELS[codec] || codec}</span>
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
              <span className="text-sm font-medium block">Audio Codec</span>
              <Select value={audioCodec} onValueChange={setAudioCodec}>
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
                        <span>{AUDIO_CODEC_LABELS[codec] || codec}</span>
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
    );
  }, [
    outputFormat,
    loadingCodecs,
    videoCodec,
    audioCodec,
    availableVideoCodecs,
    availableAudioCodecs,
    metadata?.isAudioOnly,
  ]);

  return (
    <div className="min-h-screen bg-background dark:bg-black p-4 md:p-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="mb-3 font-heading text-5xl tracking-tight text-foreground">
          LocalCut - Media Converter
        </h1>
        <p className="text-lg text-foreground/70">
          Convert your videos and audio files to any format with ease
        </p>
      </div>

      {/* Main Converter Section */}
      <div className="mb-6 border-4 border-black dark:border-white rounded-base bg-white dark:bg-gray-950 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.1)] p-6 md:p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Media Converter</h2>
          <p className="text-foreground/70">
            Upload a video or audio file and select your desired output format
          </p>
        </div>
        <div className="space-y-6 lg:space-y-0">
          {/* Two-column layout for desktop */}
          <div className="lg:grid lg:grid-cols-[45%_1fr] lg:gap-8 lg:items-start">
            {/* Left Column: Media & Info (Red Zone) */}
            <div className="space-y-6 lg:sticky lg:top-8 lg:self-start">
              {/* File Upload / Media Preview Section */}
              <div className="space-y-2">
                <span className="text-sm font-semibold block">
                  {selectedFile ? "Media Preview" : "Upload Media"}
                </span>
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
                    {/* <Upload
                      className={`size-8 transition-transform ${isDragging ? "scale-110" : ""}`}
                    /> */}
                    <FolderInputIcon />
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
                      videoFilter={
                        editingState.fineTune.enabled
                          ? fineTuneToCSS(editingState.fineTune.filters)
                          : undefined
                      }
                      cropEnabled={editingState.crop.enabled}
                      onCropChange={handleCropChange}
                      onCropDisable={handleCropDisable}
                      initialCrop={editingState.crop.rect ?? undefined}
                      videoDimensions={metadata?.dimensions ?? undefined}
                      rotateDegrees={
                        editingState.rotate.enabled
                          ? editingState.rotate.degrees
                          : 0
                      }
                      trimEnabled={editingState.trim.enabled}
                      trimRange={
                        editingState.trim.enabled
                          ? {
                              start: editingState.trim.start,
                              end: editingState.trim.end,
                            }
                          : undefined
                      }
                      onTrimChange={handleTrimChange}
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
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* End Left Column */}

            {/* Right Column: Editor & Actions (Black Zone) */}
            <div className="space-y-6 mt-6 lg:mt-7">
              {/* File Information - Metadata Display */}
              {metadataDisplay}

              {/* Format Selection Row */}
              {formatSelection}

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
                          Your input file only contains audio. The output will
                          be a {outputFormat.toUpperCase()} container with audio
                          only (no video track).
                        </p>
                      </div>
                    </div>
                  </div>
                )}

              {/* Codec Selection */}
              {codecSelection}

              {/* Editing Panel - hidden for audio-only output formats */}
              {selectedFile &&
                outputFormat &&
                outputContainers.includes(outputFormat as OutputContainer) &&
                !isAudioOnlyFormat(outputFormat as OutputContainer) && (
                  <EditingPanel
                    state={editingState}
                    onStateChange={setEditingState}
                    onCropToggle={handleCropToggle}
                    onTrimToggle={handleTrimToggle}
                    mediaDuration={metadata?.duration ?? undefined}
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
                              } else if (
                                Notification.permission === "granted"
                              ) {
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

              {/* Conversion Status Display */}
              <ConversionStatusDisplay
                ref={statusRef}
                selectedFile={selectedFile}
                inputFormat={inputFormat}
                outputFormat={outputFormat}
                metadata={metadata}
                onConvert={handleConvert}
                onCancel={handleCancel}
                onReset={resetConversion}
              />
            </div>
            {/* End Right Column */}
          </div>
          {/* End Two-column layout */}
        </div>
      </div>
    </div>
  );
}
