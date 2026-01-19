"use client";

import { ALL_FORMATS, BlobSource, CanvasSink, Input } from "mediabunny";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

// Types for imported media assets
export interface ImportedMediaAsset {
  id: string;
  name: string;
  type: "video" | "audio";
  file: File;
  duration: number;
  thumbnails?: string[];
  // Video-specific metadata
  width?: number;
  height?: number;
  frameRate?: number;
  videoCodec?: string;
  // Audio-specific metadata
  sampleRate?: number;
  channels?: number;
  audioCodec?: string;
  // MediaBunny Input reference for further processing
  input: Input;
}

interface MediaImportContextType {
  // State
  assets: ImportedMediaAsset[];
  isImporting: boolean;
  importError: string | null;

  // Actions
  importFiles: (files: FileList | File[]) => Promise<void>;
  removeAsset: (assetId: string) => void;
  clearAllAssets: () => void;
  openFilePicker: () => void;

  // File input ref for triggering file picker
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

const MediaImportContext = createContext<MediaImportContextType | null>(null);

// Accepted file types
const ACCEPTED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-matroska",
];

const ACCEPTED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/wave",
  "audio/ogg",
  "audio/aac",
  "audio/flac",
  "audio/x-m4a",
  "audio/mp4",
];

const ACCEPTED_TYPES = [...ACCEPTED_VIDEO_TYPES, ...ACCEPTED_AUDIO_TYPES];

// Generate unique ID
function generateId(): string {
  return `asset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Determine media type from file
function getMediaType(file: File): "video" | "audio" | null {
  if (
    ACCEPTED_VIDEO_TYPES.some((type) =>
      file.type.startsWith(type.split("/")[0]),
    )
  ) {
    if (file.type.startsWith("video/")) return "video";
  }
  if (
    ACCEPTED_AUDIO_TYPES.some((type) =>
      file.type.startsWith(type.split("/")[0]),
    )
  ) {
    if (file.type.startsWith("audio/")) return "audio";
  }

  // Fallback: check by extension
  const ext = file.name.split(".").pop()?.toLowerCase();
  const videoExtensions = ["mp4", "webm", "mov", "mkv", "avi"];
  const audioExtensions = ["mp3", "wav", "ogg", "aac", "flac", "m4a"];

  if (ext && videoExtensions.includes(ext)) return "video";
  if (ext && audioExtensions.includes(ext)) return "audio";

  return null;
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Read failed"));
    reader.readAsDataURL(blob);
  });
}

async function canvasToDataUrl(
  canvas: HTMLCanvasElement | OffscreenCanvas,
): Promise<string> {
  if ("toDataURL" in canvas) {
    return canvas.toDataURL("image/jpeg", 0.75);
  }

  if ("convertToBlob" in canvas) {
    const blob = await canvas.convertToBlob({
      type: "image/jpeg",
      quality: 0.75,
    });
    return blobToDataUrl(blob);
  }

  throw new Error("Unsupported canvas type");
}

interface MediaImportProviderProps {
  children: ReactNode;
}

export function MediaImportProvider({ children }: MediaImportProviderProps) {
  const [assets, setAssets] = useState<ImportedMediaAsset[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Process a single file and extract metadata using MediaBunny
  const processFile = useCallback(
    async (file: File): Promise<ImportedMediaAsset | null> => {
      const mediaType = getMediaType(file);
      if (!mediaType) {
        console.warn(`Unsupported file type: ${file.type} (${file.name})`);
        return null;
      }

      try {
        // Create MediaBunny Input from file
        const input = new Input({
          formats: ALL_FORMATS,
          source: new BlobSource(file),
        });

        // Get duration
        const duration = await input.computeDuration();

        // Build base asset
        const asset: ImportedMediaAsset = {
          id: generateId(),
          name: file.name,
          type: mediaType,
          file,
          duration,
          input,
        };

        // Get track-specific metadata
        if (mediaType === "video") {
          const videoTrack = await input.getPrimaryVideoTrack();
          if (videoTrack) {
            asset.width = videoTrack.displayWidth;
            asset.height = videoTrack.displayHeight;
            asset.videoCodec = videoTrack.codec ?? undefined;
          }

          // Also check for audio track in video files
          const audioTrack = await input.getPrimaryAudioTrack();
          if (audioTrack) {
            asset.sampleRate = audioTrack.sampleRate;
            asset.channels = audioTrack.numberOfChannels;
            asset.audioCodec = audioTrack.codec ?? undefined;
          }

          if (videoTrack && (await videoTrack.canDecode())) {
            try {
              const thumbnailEverySeconds = 2;
              const thumbnailCount = Math.min(
                12,
                Math.max(3, Math.ceil(duration / thumbnailEverySeconds)),
              );
              const startTimestamp = await videoTrack.getFirstTimestamp();
              const endTimestamp = await videoTrack.computeDuration();
              const span = Math.max(0.001, endTimestamp - startTimestamp);
              const timestamps = Array.from(
                { length: thumbnailCount },
                (_, index) =>
                  startTimestamp +
                  (span * index) / Math.max(1, thumbnailCount - 1),
              );

              const sink = new CanvasSink(videoTrack, {
                width: 160,
                height: 90,
                fit: "cover",
                poolSize: 1,
              });

              const thumbnails: string[] = [];
              for await (const result of sink.canvasesAtTimestamps(
                timestamps,
              )) {
                if (result) {
                  const dataUrl = await canvasToDataUrl(result.canvas);
                  thumbnails.push(dataUrl);
                }
              }

              if (thumbnails.length > 0) {
                asset.thumbnails = thumbnails;
              }
            } catch (error) {
              console.error("Failed to generate thumbnails:", error);
            }
          }
        } else {
          const audioTrack = await input.getPrimaryAudioTrack();
          if (audioTrack) {
            asset.sampleRate = audioTrack.sampleRate;
            asset.channels = audioTrack.numberOfChannels;
            asset.audioCodec = audioTrack.codec ?? undefined;
          }
        }

        return asset;
      } catch (error) {
        console.error(`Failed to process file ${file.name}:`, error);
        return null;
      }
    },
    [],
  );

  // Import multiple files
  const importFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      if (fileArray.length === 0) return;

      setIsImporting(true);
      setImportError(null);

      try {
        const results = await Promise.all(
          fileArray.map((file) => processFile(file)),
        );

        const successfulImports = results.filter(
          (asset): asset is ImportedMediaAsset => asset !== null,
        );

        if (successfulImports.length === 0) {
          setImportError(
            "No valid media files found. Please select video or audio files.",
          );
        } else {
          setAssets((prev) => [...prev, ...successfulImports]);

          if (successfulImports.length < fileArray.length) {
            const skipped = fileArray.length - successfulImports.length;
            console.warn(`${skipped} file(s) could not be imported`);
          }
        }
      } catch (error) {
        console.error("Import failed:", error);
        setImportError("Failed to import media files. Please try again.");
      } finally {
        setIsImporting(false);
      }
    },
    [processFile],
  );

  // Remove a single asset
  const removeAsset = useCallback((assetId: string) => {
    setAssets((prev) => {
      const asset = prev.find((a) => a.id === assetId);
      if (asset) {
        // Dispose MediaBunny Input to free resources
        asset.input.dispose();
      }
      return prev.filter((a) => a.id !== assetId);
    });
  }, []);

  // Clear all assets
  const clearAllAssets = useCallback(() => {
    // Dispose all MediaBunny Inputs
    for (const asset of assets) {
      asset.input.dispose();
    }
    setAssets([]);
  }, [assets]);

  // Open file picker
  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Handle file input change
  const handleFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (files && files.length > 0) {
        importFiles(files);
      }
      // Reset input value to allow re-selecting same files
      event.target.value = "";
    },
    [importFiles],
  );

  const value: MediaImportContextType = {
    assets,
    isImporting,
    importError,
    importFiles,
    removeAsset,
    clearAllAssets,
    openFilePicker,
    fileInputRef,
  };

  return (
    <MediaImportContext.Provider value={value}>
      {children}
      {/* Hidden file input for file picker */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_TYPES.join(",")}
        onChange={handleFileInputChange}
        className="hidden"
        tabIndex={-1}
      />
    </MediaImportContext.Provider>
  );
}

// Hook to use media import context
export function useMediaImport() {
  const context = useContext(MediaImportContext);
  if (!context) {
    throw new Error("useMediaImport must be used within a MediaImportProvider");
  }
  return context;
}

// Helper hook to convert ImportedMediaAsset to the UI MediaAsset type
export function useMediaAssets() {
  const { assets } = useMediaImport();

  return assets.map((asset) => ({
    id: asset.id,
    name: asset.name,
    type: asset.type,
    duration: asset.duration,
    file: asset.file,
    // Additional metadata for display
    width: asset.width,
    height: asset.height,
    frameRate: asset.frameRate,
    sampleRate: asset.sampleRate,
    channels: asset.channels,
  }));
}
