"use client";

import type { LucideIcon } from "lucide-react";
import {
  FileIcon,
  FolderOpen,
  ImageIcon,
  LayoutGrid,
  Music,
  Plus,
  Shapes,
  Trash2,
  Type,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
        "w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200",
        isActive
          ? "text-primary bg-primary/10 shadow-sm scale-110"
          : "text-muted-foreground hover:text-foreground hover:bg-muted",
      )}
    >
      <Icon className="w-5 h-5" />
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

// Media Thumbnail Component - shows actual video/audio preview
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
      ) : (
        <Music className="w-8 h-8" />
      )}
    </div>
  );
}

// Context Menu Component
interface ContextMenuProps {
  asset: MediaAsset;
  position: { x: number; y: number };
  onAdd: (asset: MediaAsset) => void;
  onRemove: (assetId: string) => void;
  onClose: () => void;
}

function ContextMenu({
  asset,
  position,
  onAdd,
  onRemove,
  onClose,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Handle clicks outside the context menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-56 bg-zinc-900/95 backdrop-blur-md rounded-2xl border border-zinc-700/50 shadow-2xl overflow-hidden"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      {/* Media Preview */}
      <div className="aspect-video bg-zinc-800/50 border-b border-zinc-700/50 relative overflow-hidden">
        <MediaThumbnail asset={asset} />
        {/* Asset Name Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm p-1.5">
          <p className="text-xs text-white/90 truncate">{asset.name}</p>
        </div>
      </div>

      {/* Menu Actions */}
      <div className="p-1">
        <button
          type="button"
          onClick={() => {
            onAdd(asset);
            onClose();
          }}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
        <button
          type="button"
          onClick={() => {
            onRemove(asset.id);
            onClose();
          }}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-zinc-800 rounded transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Remove
        </button>
      </div>
    </div>
  );
}

export function MediaLibrary({
  assets,
  isLoading: _isLoading = false,
  error: _error = null,
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
  const [contextMenu, setContextMenu] = useState<{
    asset: MediaAsset;
    position: { x: number; y: number };
  } | null>(null);

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
            {assets.length === 0 ? (
              <EmptyState onImport={onImport} />
            ) : (
              <div className="grid grid-cols-2 gap-2 p-2">
                <button
                  type="button"
                  onClick={onImport}
                  className="aspect-video bg-muted/30 border border-border/50 border-dashed rounded-xl flex flex-col items-center justify-center hover:bg-muted/50 transition-all group hover:scale-[1.02] duration-200"
                >
                  <Upload className="w-5 h-5 text-muted-foreground group-hover:text-foreground mb-1" />
                  <span className="text-[10px] text-muted-foreground group-hover:text-foreground">
                    Import
                  </span>
                </button>
                {assets.map((asset) => (
                  // biome-ignore lint/a11y/useSemanticElements: Needs to be div for draggable attribute support
                  <div
                    key={asset.id}
                    role="button"
                    tabIndex={0}
                    className="aspect-video bg-muted/20 border border-border/40 rounded-xl relative group cursor-pointer overflow-hidden shadow-sm hover:shadow-md transition-all hover:ring-2 ring-primary/20"
                    onClick={() => onAssetSelect?.(asset)}
                    onDoubleClick={() => onAssetAdd?.(asset)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onAssetSelect?.(asset);
                      }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({
                        asset,
                        position: { x: e.clientX, y: e.clientY },
                      });
                    }}
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
                      className="absolute inset-0"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-[2px] p-1.5 flex justify-between items-center text-[10px] text-white/90">
                      <span className="truncate max-w-[70%]">{asset.name}</span>
                      <span className="opacity-70">
                        {Math.round(asset.duration)}s
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        )}

        {activeTab !== "media" && (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Coming Soon
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          asset={contextMenu.asset}
          position={contextMenu.position}
          onAdd={(asset) => {
            onAssetAdd?.(asset);
          }}
          onRemove={(assetId) => {
            onAssetRemove?.(assetId);
          }}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
