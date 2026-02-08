"use client";

import {
  SiInstagram,
  SiSpotify,
  SiTiktok,
  SiYoutube,
} from "@icons-pack/react-simple-icons";
import type { LucideIcon } from "lucide-react";
import {
  FileIcon,
  FolderOpen,
  Frame,
  ImageIcon,
  LayoutGrid,
  Loader2,
  Maximize2,
  Music,
  Plus,
  Shapes,
  SlidersHorizontal,
  Square,
  Trash2,
  Type,
  Upload,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { memo, useCallback, useEffect, useState } from "react";
import { FilterControls } from "@/components/editor/panels/filter-controls";
import type { FitMode } from "@/components/editor/preview/timeline-player-context";
import {
  type ClipFilters,
  DEFAULT_CLIP_FILTERS,
} from "@/components/editor/preview/timeline-player-context";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Canvas resize presets
type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

interface CanvasPreset {
  id: string;
  label: string;
  ratio: string;
  width: number;
  height: number;
  icon: IconComponent | null;
}

const CANVAS_PRESETS: {
  platforms: CanvasPreset[];
  standard: CanvasPreset[];
} = {
  platforms: [
    {
      id: "youtube",
      label: "YouTube",
      ratio: "16:9",
      width: 1920,
      height: 1080,
      icon: SiYoutube,
    },
    {
      id: "youtube-shorts",
      label: "YouTube Shorts",
      ratio: "9:16",
      width: 1080,
      height: 1920,
      icon: SiYoutube,
    },
    {
      id: "tiktok",
      label: "TikTok",
      ratio: "9:16",
      width: 1080,
      height: 1920,
      icon: SiTiktok,
    },
    {
      id: "instagram-story",
      label: "Instagram Story & Reels",
      ratio: "9:16",
      width: 1080,
      height: 1920,
      icon: SiInstagram,
    },
    {
      id: "instagram-square",
      label: "Instagram Post Square",
      ratio: "1:1",
      width: 1080,
      height: 1080,
      icon: SiInstagram,
    },
    {
      id: "instagram-post",
      label: "Instagram Post",
      ratio: "4:5",
      width: 1080,
      height: 1350,
      icon: SiInstagram,
    },
    {
      id: "spotify-canvas",
      label: "Spotify Canvas",
      ratio: "9:16",
      width: 1080,
      height: 1920,
      icon: SiSpotify,
    },
  ],
  standard: [
    {
      id: "widescreen",
      label: "Widescreen",
      ratio: "16:9",
      width: 1920,
      height: 1080,
      icon: null,
    },
    {
      id: "full-portrait",
      label: "Full Portrait",
      ratio: "9:16",
      width: 1080,
      height: 1920,
      icon: null,
    },
    {
      id: "square",
      label: "Square",
      ratio: "1:1",
      width: 1080,
      height: 1080,
      icon: null,
    },
    {
      id: "landscape",
      label: "Landscape",
      ratio: "4:3",
      width: 1440,
      height: 1080,
      icon: null,
    },
    {
      id: "portrait",
      label: "Portrait",
      ratio: "4:5",
      width: 1080,
      height: 1350,
      icon: null,
    },
    {
      id: "landscape-post",
      label: "Landscape Post",
      ratio: "5:4",
      width: 1350,
      height: 1080,
      icon: null,
    },
    {
      id: "vertical",
      label: "Vertical",
      ratio: "2:3",
      width: 1080,
      height: 1620,
      icon: null,
    },
  ],
};

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
  onResize?: (width: number, height: number) => void;
  fitMode?: FitMode;
  onFitModeChange?: (fitMode: FitMode) => void;
  activeTab?: MediaLibraryTab;
  onTabChange?: (tab: MediaLibraryTab) => void;
  selectedClip?: {
    id: string;
    name: string;
    type: "video" | "image";
    fitMode?: FitMode;
    filters?: ClipFilters;
  } | null;
  onClipFitModeChange?: (clipId: string, fitMode: FitMode | "none") => void;
  onClipFiltersChange?: (clipId: string, filters: ClipFilters) => void;
  className?: string;
}

export type MediaLibraryTab =
  | "media"
  | "text"
  | "shapes"
  | "transitions"
  | "canvas"
  | "media-editor";

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

export const MediaLibrary = memo(function MediaLibrary({
  assets,
  isLoading = false,
  error = null,
  onImport,
  onFileDrop,
  onAssetSelect,
  onAssetAdd,
  onAssetRemove,
  onResize,
  fitMode,
  onFitModeChange,
  activeTab,
  onTabChange,
  selectedClip,
  onClipFitModeChange,
  onClipFiltersChange,
  className,
}: MediaLibraryProps) {
  const [internalTab, setInternalTab] = useState<MediaLibraryTab>("media");
  const resolvedTab = activeTab ?? internalTab;
  const showMediaEditorTab = true;
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState("youtube");
  const activeFitMode = fitMode ?? "contain";

  // Stable callback for filter changes - avoids new closure on every render
  const selectedClipId = selectedClip?.id;
  const handleFiltersChange = useCallback(
    (filters: ClipFilters) => {
      if (selectedClipId) {
        onClipFiltersChange?.(selectedClipId, filters);
      }
    },
    [selectedClipId, onClipFiltersChange],
  );

  const handleTabChange = useCallback(
    (tab: MediaLibraryTab) => {
      onTabChange?.(tab);
      if (activeTab == null) {
        setInternalTab(tab);
      }
    },
    [activeTab, onTabChange],
  );

  // Handle preset change and resize
  const handlePresetChange = useCallback(
    (presetId: string) => {
      setSelectedPreset(presetId);
      const allPresets = [
        ...CANVAS_PRESETS.platforms,
        ...CANVAS_PRESETS.standard,
      ];
      const preset = allPresets.find((p) => p.id === presetId);
      if (preset && onResize) {
        onResize(preset.width, preset.height);
      }
    },
    [onResize],
  );

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
          isActive={resolvedTab === "media"}
          onClick={() => handleTabChange("media")}
        />
        {showMediaEditorTab && (
          <SidebarTab
            icon={SlidersHorizontal}
            isActive={resolvedTab === "media-editor"}
            onClick={() => handleTabChange("media-editor")}
          />
        )}
        <SidebarTab
          icon={Type}
          isActive={resolvedTab === "text"}
          onClick={() => handleTabChange("text")}
        />
        <SidebarTab
          icon={Shapes}
          isActive={resolvedTab === "shapes"}
          onClick={() => handleTabChange("shapes")}
        />
        <SidebarTab
          icon={LayoutGrid}
          isActive={resolvedTab === "transitions"}
          onClick={() => handleTabChange("transitions")}
        />
        <SidebarTab
          icon={Frame}
          isActive={resolvedTab === "canvas"}
          onClick={() => handleTabChange("canvas")}
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
        {resolvedTab === "media" && (
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

        {resolvedTab === "canvas" && (
          <div className="flex-1 flex flex-col p-4">
            <h3 className="text-xs text-muted-foreground mb-3 text-center">
              Resize
            </h3>
            <Select value={selectedPreset} onValueChange={handlePresetChange}>
              <SelectTrigger className="w-full bg-card border-border/50">
                <SelectValue>
                  {(() => {
                    const allPresets = [
                      ...CANVAS_PRESETS.platforms,
                      ...CANVAS_PRESETS.standard,
                    ];
                    const preset = allPresets.find(
                      (p) => p.id === selectedPreset,
                    );
                    if (!preset) return "Select preset";
                    const Icon = preset.icon;
                    return (
                      <span className="flex items-center gap-2">
                        {Icon ? (
                          <Icon className="w-4 h-4" />
                        ) : (
                          <Square className="w-4 h-4 text-muted-foreground" />
                        )}
                        <span>{preset.label}</span>
                        <span className="text-muted-foreground">
                          — {preset.ratio}
                        </span>
                      </span>
                    );
                  })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {/* Platform Presets */}
                {CANVAS_PRESETS.platforms.map((preset) => {
                  const Icon = preset.icon;
                  return (
                    <SelectItem key={preset.id} value={preset.id}>
                      <span className="flex items-center gap-2">
                        <span className="w-5 flex justify-center">
                          {Icon && <Icon className="w-4 h-4" />}
                        </span>
                        <span>{preset.label}</span>
                        <span className="text-muted-foreground ml-auto">
                          {preset.ratio}
                        </span>
                      </span>
                    </SelectItem>
                  );
                })}
                <SelectSeparator />
                {/* Standard Aspect Ratios */}
                {CANVAS_PRESETS.standard.map((preset) => (
                  <SelectItem key={preset.id} value={preset.id}>
                    <span className="flex items-center gap-2">
                      <Square className="w-4 h-4 text-muted-foreground" />
                      <span>{preset.label}</span>
                      <span className="text-muted-foreground ml-auto">
                        {preset.ratio}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="mt-4">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Fill", mode: "fill" as FitMode, icon: Square },
                  { label: "Fit", mode: "contain" as FitMode, icon: Frame },
                  { label: "Cover", mode: "cover" as FitMode, icon: Maximize2 },
                ].map((option) => (
                  <button
                    key={option.mode}
                    type="button"
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-xl py-3",
                      "transition-colors",
                      activeFitMode === option.mode
                        ? "bg-muted ring-1 ring-foreground/20"
                        : "bg-muted/40 hover:bg-muted/70",
                    )}
                    onClick={() => onFitModeChange?.(option.mode)}
                  >
                    <option.icon className="size-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {option.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {resolvedTab === "media-editor" && (
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              <h3 className="text-xs text-muted-foreground text-center">
                Media Editor
              </h3>
              {selectedClip ? (
                <div className="space-y-4">
                  <div className="rounded-lg border border-border/50 bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">Selected</p>
                    <p className="text-sm font-medium text-foreground truncate">
                      {selectedClip.name}
                    </p>
                  </div>

                  {/* Filter Controls */}
                  <FilterControls
                    filters={selectedClip.filters ?? DEFAULT_CLIP_FILTERS}
                    onChange={handleFiltersChange}
                  />

                  {/* Fit Mode - moved below filters */}
                  <div className="space-y-2 pt-2 border-t border-border/30">
                    <Label className="text-xs text-foreground/70">
                      Fit mode
                    </Label>
                    <Select
                      value={selectedClip.fitMode ?? "none"}
                      onValueChange={(value) =>
                        onClipFitModeChange?.(
                          selectedClip.id,
                          value as FitMode | "none",
                        )
                      }
                    >
                      <SelectTrigger className="w-full bg-card border-border/50">
                        <SelectValue placeholder="Select fit mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="contain">Fit (contain)</SelectItem>
                        <SelectItem value="cover">Cover</SelectItem>
                        <SelectItem value="fill">Fill</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm text-center py-8">
                  Please select a media clip to edit its settings.
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {resolvedTab !== "media" &&
          resolvedTab !== "canvas" &&
          resolvedTab !== "media-editor" && (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              Coming Soon
            </div>
          )}
      </div>
    </div>
  );
});
