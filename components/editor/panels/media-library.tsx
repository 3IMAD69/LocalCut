"use client";

import {
  Film,
  FolderOpen,
  Loader2,
  Music,
  Plus,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export interface MediaAsset {
  id: string;
  name: string;
  type: "video" | "audio";
  duration: number;
  thumbnail?: string;
  file?: File;
  // Additional metadata
  width?: number;
  height?: number;
  frameRate?: number;
  sampleRate?: number;
  channels?: number;
}

interface MediaLibraryProps {
  assets: MediaAsset[];
  isLoading?: boolean;
  error?: string | null;
  onImport?: () => void;
  onFileDrop?: (files: FileList) => void;
  onAssetSelect?: (asset: MediaAsset) => void;
  onAssetAdd?: (asset: MediaAsset) => void;
  onAssetRemove?: (assetId: string) => void;
  className?: string;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// Main empty state for when no media is imported
function MainEmptyState({ onImport }: { onImport?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div
        className={cn(
          "w-20 h-20 border-4 border-border bg-main/20",
          "flex items-center justify-center mb-4",
        )}
      >
        <Film className="h-10 w-10 text-foreground/40" />
      </div>
      <h3 className="text-sm font-heading mb-1">No media imported</h3>
      <p className="text-xs text-foreground/50 mb-4 max-w-[180px]">
        Import video or audio files to start editing your project
      </p>
      <Button variant="default" size="sm" onClick={onImport}>
        <Upload className="h-4 w-4 mr-2" />
        Import Media
      </Button>
    </div>
  );
}

// Empty state for filtered tabs
function FilteredEmptyState({ type }: { type: "video" | "audio" }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-foreground/40">
      {type === "video" ? (
        <Film className="h-12 w-12 mb-2" />
      ) : (
        <Music className="h-12 w-12 mb-2" />
      )}
      <p className="text-sm font-heading">No {type} files</p>
      <p className="text-xs">Import {type} to see it here</p>
    </div>
  );
}

// Loading state
function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-foreground/40">
      <Loader2 className="h-8 w-8 animate-spin mb-2" />
      <p className="text-sm font-heading">Importing media...</p>
      <p className="text-xs">Analyzing files</p>
    </div>
  );
}

// Error state
function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div
        className={cn(
          "w-12 h-12 border-2 border-red-400 bg-red-400/20",
          "flex items-center justify-center mb-2",
        )}
      >
        <X className="h-6 w-6 text-red-500" />
      </div>
      <p className="text-sm font-heading text-red-500 mb-1">Import Failed</p>
      <p className="text-xs text-foreground/50">{message}</p>
    </div>
  );
}

export function MediaLibrary({
  assets,
  isLoading = false,
  error = null,
  onImport,
  onFileDrop,
  onAssetSelect,
  onAssetAdd,
  onAssetRemove,
  className,
}: MediaLibraryProps) {
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const videoAssets = assets.filter((a) => a.type === "video");
  const audioAssets = assets.filter((a) => a.type === "audio");

  const handleAssetClick = (asset: MediaAsset) => {
    setSelectedAssetId(asset.id);
    onAssetSelect?.(asset);
  };

  const handleAddToTimeline = (asset: MediaAsset) => {
    onAssetAdd?.(asset);
  };

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const files = e.dataTransfer.files;
      if (files && files.length > 0 && onFileDrop) {
        onFileDrop(files);
      }
    },
    [onFileDrop],
  );

  const renderAssetCard = (asset: MediaAsset) => (
    <button
      key={asset.id}
      type="button"
      className={cn(
        "group relative border-2 border-border bg-secondary-background",
        "cursor-pointer transition-all text-left w-full",
        "hover:shadow-shadow hover:-translate-x-boxShadowX hover:-translate-y-boxShadowY",
        selectedAssetId === asset.id && "ring-2 ring-main",
      )}
      onClick={() => handleAssetClick(asset)}
      onDoubleClick={() => handleAddToTimeline(asset)}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("application/json", JSON.stringify(asset));
      }}
    >
      {/* Thumbnail */}
      <div
        className={cn(
          "aspect-video w-full border-b-2 border-border",
          "flex items-center justify-center",
          asset.type === "video" ? "bg-chart-2/20" : "bg-chart-3/20",
        )}
      >
        <div className="flex flex-col items-center gap-1 text-foreground/40">
          {asset.type === "video" ? (
            <Film className="h-8 w-8" />
          ) : (
            <Music className="h-8 w-8" />
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-2">
        <p className="text-xs font-heading truncate" title={asset.name}>
          {asset.name}
        </p>
        <p className="text-[10px] text-foreground/60">
          {formatDuration(asset.duration)}
        </p>
      </div>

      {/* Quick Actions (visible on hover) */}
      <div
        className={cn(
          "absolute top-1 right-1 flex gap-1",
          "opacity-0 group-hover:opacity-100 transition-opacity",
        )}
      >
        <button
          type="button"
          className={cn(
            "h-6 w-6 flex items-center justify-center",
            "border-2 border-border bg-main",
            "hover:bg-chart-1 cursor-pointer",
          )}
          onClick={(e) => {
            e.stopPropagation();
            handleAddToTimeline(asset);
          }}
          title="Add to timeline"
        >
          <Plus className="h-3 w-3" />
        </button>
        <button
          type="button"
          className={cn(
            "h-6 w-6 flex items-center justify-center",
            "border-2 border-border bg-secondary-background",
            "hover:bg-red-400 cursor-pointer",
          )}
          onClick={(e) => {
            e.stopPropagation();
            onAssetRemove?.(asset.id);
          }}
          title="Remove"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </button>
  );

  return (
    <section
      aria-label="Media library"
      className={cn(
        "flex flex-col border-2 border-border bg-background h-full relative",
        isDragOver && "ring-2 ring-main ring-inset",
        className,
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b-2 border-border bg-secondary-background">
        <span className="text-xs font-heading uppercase tracking-wide">
          Media {assets.length > 0 && `(${assets.length})`}
        </span>
        <div className="flex gap-1">
          <Button
            variant="noShadow"
            size="sm"
            className="h-7 text-xs"
            onClick={onImport}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Upload className="h-3 w-3 mr-1" />
            )}
            Import
          </Button>
        </div>
      </div>

      {/* Drag overlay */}
      {isDragOver && (
        <div
          className={cn(
            "absolute inset-0 z-50 bg-main/20 border-4 border-dashed border-main",
            "flex items-center justify-center",
          )}
        >
          <div className="text-center">
            <Upload className="h-12 w-12 text-main mx-auto mb-2" />
            <p className="font-heading text-main">Drop files to import</p>
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : assets.length === 0 ? (
        <MainEmptyState onImport={onImport} />
      ) : (
        <Tabs defaultValue="all" className="flex-1 flex flex-col">
          <TabsList className="mx-2 mt-2 h-9">
            <TabsTrigger value="all" className="text-xs">
              All ({assets.length})
            </TabsTrigger>
            <TabsTrigger value="video" className="text-xs">
              <Film className="h-3 w-3 mr-1" />
              {videoAssets.length}
            </TabsTrigger>
            <TabsTrigger value="audio" className="text-xs">
              <Music className="h-3 w-3 mr-1" />
              {audioAssets.length}
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            <TabsContent value="all" className="m-0 p-2">
              <div className="grid grid-cols-2 gap-2">
                {assets.map(renderAssetCard)}
              </div>
            </TabsContent>

            <TabsContent value="video" className="m-0 p-2">
              {videoAssets.length === 0 ? (
                <FilteredEmptyState type="video" />
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {videoAssets.map(renderAssetCard)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="audio" className="m-0 p-2">
              {audioAssets.length === 0 ? (
                <FilteredEmptyState type="audio" />
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {audioAssets.map(renderAssetCard)}
                </div>
              )}
            </TabsContent>
          </ScrollArea>

          {/* Drop Zone - only show when there are assets */}
          <button
            type="button"
            className={cn(
              "mx-2 mb-2 p-3 border-2 border-dashed border-border",
              "flex flex-col items-center justify-center gap-1 w-[calc(100%-1rem)]",
              "text-foreground/40 text-xs bg-transparent",
              "cursor-pointer hover:border-main hover:text-foreground/60",
            )}
            onClick={onImport}
          >
            <FolderOpen className="h-4 w-4" />
            <span>Add more files</span>
          </button>
        </Tabs>
      )}
    </section>
  );
}
