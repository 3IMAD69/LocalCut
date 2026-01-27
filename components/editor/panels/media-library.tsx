"use client";

import type { LucideIcon } from "lucide-react";
import {
  FileIcon,
  FolderOpen,
  ImageIcon,
  LayoutGrid,
  Loader2,
  Music,
  Plus,
  Shapes,
  Trash2,
  Type,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface MediaAsset {
  id: string;
  name: string;
  type: "video" | "audio" | "image";
  duration: number;
  thumbnail?: string;
  thumbnails?: string[];
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

// Sidebar Tab Item
function SidebarTab({
  icon: Icon,
  isActive,
  onClick,
}: {
  icon: LucideIcon;
  isActive?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200",
        isActive
          ? "text-primary bg-primary/10 shadow-sm scale-110"
          : "text-muted-foreground hover:text-foreground hover:bg-muted",
      )}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

// Empty state matching the image
function EmptyState({ onImport }: { onImport?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center bg-card rounded-xl border border-border/50 border-dashed p-8 text-center h-[300px] m-4">
      <div className="mb-4 text-muted-foreground/30">
        <FileIcon className="w-16 h-16" />
      </div>
      <h3 className="text-sm text-foreground/80 font-medium mb-2 max-w-[200px] leading-relaxed">
        Add your image, video, music, and voiceover collection to compose your
        project.
      </h3>
      <Button
        variant="outline"
        size="sm"
        onClick={onImport}
        className="mt-4 border-border/60 hover:bg-white/5 hover:text-foreground transition-all rounded-full px-6"
      >
        <Upload className="w-4 h-4 mr-2" />
        Import
      </Button>
    </div>
  );
}

// Media Thumbnail Component - shows actual video/audio/image preview
function MediaThumbnail({
  asset,
  className,
}: {
  asset: MediaAsset;
  className?: string;
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (asset.file) {
      const url = URL.createObjectURL(asset.file);
      setObjectUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [asset.file]);

  if (asset.type === "image" && objectUrl) {
    return (
      // biome-ignore lint/performance/noImgElement: Using native img because Next.js Image doesn't support object URLs
      <img
        src={objectUrl}
        alt={asset.name}
        className={cn("w-full h-full object-cover", className)}
      />
    );
  }

  if (asset.type === "video" && objectUrl) {
    return (
      <video
        src={objectUrl}
        className={cn("w-full h-full object-cover", className)}
        muted
        playsInline
      />
    );
  }

  // Fallback to icon
  return (
    <div
      className={cn(
        "w-full h-full flex items-center justify-center text-muted-foreground/40",
        className,
      )}
    >
      {asset.type === "video" ? (
        <ImageIcon className="w-8 h-8" />
      ) : asset.type === "image" ? (
        <ImageIcon className="w-8 h-8" />
      ) : (
        <Music className="w-8 h-8" />
      )}
    </div>
  );
}

// Context Menu Component

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
  const [activeTab, setActiveTab] = useState<
    "media" | "text" | "shapes" | "transitions"
  >("media");
  const [isDragOver, setIsDragOver] = useState(false);

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

  return (
    <div className={cn("flex flex-col h-full bg-background/50", className)}>
      {/* Top Tabs Bar */}
      <div className="flex items-center gap-1 p-2 border-b border-border">
        <SidebarTab
          icon={FolderOpen}
          isActive={activeTab === "media"}
          onClick={() => setActiveTab("media")}
        />
        <SidebarTab
          icon={Type}
          isActive={activeTab === "text"}
          onClick={() => setActiveTab("text")}
        />
        <SidebarTab
          icon={Shapes}
          isActive={activeTab === "shapes"}
          onClick={() => setActiveTab("shapes")}
        />
        <SidebarTab
          icon={LayoutGrid}
          isActive={activeTab === "transitions"}
          onClick={() => setActiveTab("transitions")}
        />
        <div className="flex-1" />
      </div>

      {/* Main Content Area */}
      {/* biome-ignore lint/a11y/useSemanticElements: div required for flex layout and drag-drop functionality */}
      <div
        role="region"
        aria-label="Media drop zone"
        className="flex-1 flex flex-col relative"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onKeyDown={(e) => {
          // Suppress keyboard interaction warning for drag-drop zone
          if (e.key === "Escape" && isDragOver) {
            setIsDragOver(false);
          }
        }}
      >
        {isDragOver && (
          <div className="absolute inset-0 z-50 bg-primary/10 backdrop-blur-[1px] flex items-center justify-center border-2 border-primary m-2 rounded-lg">
            <div className="text-primary font-medium flex flex-col items-center gap-2">
              <Upload className="w-8 h-8" />
              Drop to Import
            </div>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === "media" && (
          <ScrollArea className="flex-1">
            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-center justify-center gap-2 p-3 m-2 bg-primary/5 rounded-lg border border-primary/20">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">
                  Importing media...
                </span>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-3 m-2 bg-destructive/10 rounded-lg border border-destructive/30">
                <span className="text-sm text-destructive">{error}</span>
              </div>
            )}

            {assets.length === 0 && !isLoading ? (
              <EmptyState onImport={onImport} />
            ) : assets.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 p-2">
                <button
                  type="button"
                  onClick={onImport}
                  className="aspect-video bg-muted/30 border border-border/50 border-dashed rounded-xl flex flex-col items-center justify-center hover:bg-muted/50 transition-all group hover:scale-[1.02] duration-200"
                >
                  <Upload className="w-4 h-4 text-muted-foreground group-hover:text-foreground mb-1" />
                  <span className="text-[9px] text-muted-foreground group-hover:text-foreground">
                    Import
                  </span>
                </button>
                {assets.map((asset) => (
                  // biome-ignore lint/a11y/noStaticElementInteractions: Needs to be div for draggable attribute support
                  // biome-ignore lint/a11y/useKeyWithClickEvents: Mouse events needed for drag and drop
                  <div
                    key={asset.id}
                    className="aspect-video bg-muted/20 border border-border/40 rounded-xl relative group cursor-pointer overflow-hidden shadow-sm hover:shadow-md transition-all hover:ring-2 ring-primary/20"
                    onClick={() => onAssetSelect?.(asset)}
                    onDoubleClick={() => onAssetAdd?.(asset)}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData(
                        "application/json",
                        JSON.stringify(asset),
                      );
                    }}
                  >
                    <MediaThumbnail
                      asset={asset}
                      className="absolute inset-0 transition-transform duration-300 group-hover:scale-105"
                    />

                    {/* Hover Actions Overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3 z-10 backdrop-blur-[2px]">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAssetAdd?.(asset);
                        }}
                        className="w-10 h-10 rounded-full bg-emerald-500/50 hover:bg-emerald-500 flex items-center justify-center text-white shadow-sm ring-1 ring-white/20 transition-all hover:scale-110 backdrop-blur-sm"
                        title="Add to timeline"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAssetRemove?.(asset.id);
                        }}
                        className="w-10 h-10 rounded-full bg-red-500/50 hover:bg-red-500 flex items-center justify-center text-white shadow-sm ring-1 ring-white/20 transition-all hover:scale-110 backdrop-blur-sm"
                        title="Remove asset"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-[2px] p-1.5 flex justify-between items-center text-[10px] text-white/90 translate-y-0 group-hover:translate-y-full transition-transform duration-200">
                      <span className="truncate max-w-[70%]">{asset.name}</span>
                      <span className="opacity-70">
                        {Math.round(asset.duration)}s
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </ScrollArea>
        )}

        {activeTab !== "media" && (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Coming Soon
          </div>
        )}
      </div>
    </div>
  );
}
