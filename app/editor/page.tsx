"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  EditorHeader,
  MediaLibrary,
  PropertiesPanel,
  Timeline,
  Toolbar,
  TimelinePlayer,
  TimelinePlayerProvider,
  useTimelinePlayer,
  type ClipProperties,
  type TimelineTrackData,
  type TimelineClipWithAsset,
} from "@/components/editor";
import type { MediaAsset } from "@/components/editor/panels/media-library";
import { MediaImportProvider, useMediaImport, type ImportedMediaAsset } from "@/lib/media-import";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

// Empty initial state for tracks (using TimelineTrackData format)
const emptyTracks: TimelineTrackData[] = [
  {
    id: "video-1",
    type: "video" as const,
    label: "Video 1",
    clips: [] as TimelineClipWithAsset[],
  },
  {
    id: "audio-1",
    type: "audio" as const,
    label: "Audio 1",
    clips: [] as TimelineClipWithAsset[],
  },
];

function EditorContent() {
  // Media import context
  const {
    assets: importedAssets,
    isImporting,
    importError,
    openFilePicker,
    removeAsset,
    importFiles,
  } = useMediaImport();

  // Timeline player context
  const {
    state: playerState,
    setTracks: setPlayerTracks,
    seek: playerSeek,
  } = useTimelinePlayer();

  // Convert imported assets to MediaAsset format for MediaLibrary
  const mediaAssets: MediaAsset[] = importedAssets.map((asset) => ({
    id: asset.id,
    name: asset.name,
    type: asset.type,
    duration: asset.duration,
    file: asset.file,
    width: asset.width,
    height: asset.height,
    frameRate: asset.frameRate,
    sampleRate: asset.sampleRate,
    channels: asset.channels,
  }));

  // Create asset map for quick lookup
  const assetMap = useMemo(() => {
    const map = new Map<string, ImportedMediaAsset>();
    for (const asset of importedAssets) {
      map.set(asset.id, asset);
    }
    return map;
  }, [importedAssets]);

  // State
  const [tracks, setTracks] = useState<TimelineTrackData[]>(emptyTracks);
  const [selectedClip, setSelectedClip] = useState<ClipProperties | null>(null);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [showWipModal, setShowWipModal] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Sync tracks to player context whenever they change
  useEffect(() => {
    setPlayerTracks(tracks);
  }, [tracks, setPlayerTracks]);

  // Keyboard shortcuts for clip operations
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if focused on an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedClip) {
          e.preventDefault();
          setTracks((prev) =>
            prev.map((track) => ({
              ...track,
              clips: track.clips.filter((c) => c.id !== selectedClip.id),
            }))
          );
          setSelectedClip(null);
          setHasUnsavedChanges(true);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedClip]);

  // Use player state for currentTime (single source of truth)
  const currentTime = playerState.currentTime;

  // Calculate total duration from clips (minimum 60s for empty timeline)
  const duration = Math.max(
    ...tracks.flatMap((t) =>
      t.clips.length > 0 ? t.clips.map((c) => c.startTime + c.duration) : [0]
    ),
    60
  );

  // Handlers
  const handleSeek = useCallback((time: number) => {
    playerSeek(time);
  }, [playerSeek]);
  
  const handleAssetSelect = (asset: MediaAsset) => {
    console.log("Selected asset:", asset.name);
  };

  const handleAssetAdd = useCallback((asset: MediaAsset) => {
    // Get the full imported asset with Input reference
    const fullAsset = assetMap.get(asset.id);

    // Add asset to timeline with asset reference for playback
    const newClip: TimelineClipWithAsset = {
      id: `clip-${Date.now()}`,
      name: asset.name,
      type: asset.type,
      startTime: 0,
      duration: asset.duration,
      color: asset.type === "video" ? "#0099ff" : "#ff7a05",
      asset: fullAsset, // Include full asset reference for playback
      trimStart: 0,
      trimEnd: asset.duration,
    };

    setTracks((prev) => {
      // Find the appropriate track for this asset type
      const trackIndex = prev.findIndex((t) => t.type === asset.type);
      if (trackIndex === -1) return prev;

      // Calculate start time (after last clip in track)
      const track = prev[trackIndex];
      const lastClipEnd = track.clips.reduce(
        (max, clip) => Math.max(max, clip.startTime + clip.duration),
        0
      );
      newClip.startTime = lastClipEnd;

      // Add clip to track
      const updatedTracks = [...prev];
      updatedTracks[trackIndex] = {
        ...track,
        clips: [...track.clips, newClip],
      };

      return updatedTracks;
    });

    setHasUnsavedChanges(true);
    console.log("Added to timeline:", asset.name);
  }, [assetMap]);

  const handleClipSelect = (clipId: string) => {
    // Find the clip in tracks
    for (const track of tracks) {
      const clip = track.clips.find((c) => c.id === clipId);
      if (clip) {
        setSelectedClip({
          id: clip.id,
          name: clip.name,
          type: clip.type,
          positionX: 0,
          positionY: 0,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
          cropTop: 0,
          cropBottom: 0,
          cropLeft: 0,
          cropRight: 0,
          trimStart: 0,
          trimEnd: clip.duration,
          duration: clip.duration,
          speed: 1,
        });
        return;
      }
    }
  };

  const handlePropertiesChange = (props: Partial<ClipProperties>) => {
    if (selectedClip) {
      setSelectedClip({ ...selectedClip, ...props });
      setHasUnsavedChanges(true);
    }
  };

  const handleFileDrop = (files: FileList) => {
    importFiles(Array.from(files));
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      {/* Persistent WIP Alert Banner */}
      <Alert variant="destructive" className="rounded-none border-x-0 border-t-0">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>🚧 Work in Progress</AlertTitle>
        <AlertDescription>
          This editor is under active development. Features may be incomplete or not working.
        </AlertDescription>
      </Alert>

      <EditorHeader
        projectName="Untitled Project"
        hasUnsavedChanges={hasUnsavedChanges}
        onNewProject={() => {
          setTracks(emptyTracks);
          setSelectedClip(null);
          playerSeek(0);
          setHasUnsavedChanges(false);
        }}
        onOpenProject={() => console.log("Open project")}
        onSaveProject={() => {
          console.log("Save project");
          setHasUnsavedChanges(false);
        }}
        onExport={() => console.log("Export")}
        onSettings={() => console.log("Settings")}
        onHelp={() => console.log("Help")}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Media Library */}
        <aside className="w-64 flex-shrink-0 border-r-2 border-border relative">
          <MediaLibrary
            assets={mediaAssets}
            isLoading={isImporting}
            error={importError}
            onImport={openFilePicker}
            onFileDrop={handleFileDrop}
            onAssetSelect={handleAssetSelect}
            onAssetAdd={handleAssetAdd}
            onAssetRemove={removeAsset}
            className="h-full"
          />
        </aside>

        {/* Center: Preview + Timeline */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Toolbar */}
          <Toolbar
            canUndo={false}
            canRedo={false}
            hasSelection={selectedClip !== null}
            snapEnabled={snapEnabled}
            onUndo={() => console.log("Undo")}
            onRedo={() => console.log("Redo")}
            onCut={() => console.log("Cut")}
            onCopy={() => console.log("Copy")}
            onPaste={() => console.log("Paste")}
            onDelete={() => {
              if (selectedClip) {
                setTracks((prev) =>
                  prev.map((track) => ({
                    ...track,
                    clips: track.clips.filter((c) => c.id !== selectedClip.id),
                  }))
                );
                setSelectedClip(null);
                setHasUnsavedChanges(true);
              }
            }}
            onSplit={() => console.log("Split at", currentTime)}
            onZoomIn={() => console.log("Zoom in")}
            onZoomOut={() => console.log("Zoom out")}
            onToggleSnap={() => setSnapEnabled(!snapEnabled)}
          />

          {/* Preview Area */}
          <div className="flex-1 min-h-0 p-4">
            <TimelinePlayer
              className="h-full"
              onFullscreen={() => console.log("Fullscreen")}
            />
          </div>

          {/* Timeline */}
          <div className="h-[280px] flex-shrink-0 border-t-2 border-border">
            <Timeline
              tracks={tracks}
              currentTime={currentTime}
              duration={duration}
              onTimeChange={handleSeek}
              onClipSelect={handleClipSelect}
              className="h-full"
            />
          </div>
        </main>

        {/* Right Panel: Properties */}
        <aside className="w-72 flex-shrink-0 border-l-2 border-border">
          <PropertiesPanel
            clip={selectedClip}
            onChange={handlePropertiesChange}
            className="h-full"
          />
        </aside>
      </div>

      {/* Status Bar */}
      <footer
        className={cn(
          "h-8 flex items-center justify-between px-4",
          "border-t-2 border-border bg-secondary-background",
          "text-xs font-heading"
        )}
      >
        <div className="flex items-center gap-4">
          <span className="text-foreground/60">
            Media: {importedAssets.length} files
          </span>
          <span className="text-foreground/60">
            Timeline: {duration.toFixed(1)}s
          </span>
          <span className="text-foreground/60">
            Clips: {tracks.reduce((sum, t) => sum + t.clips.length, 0)}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span
            className={cn(
              "px-2 py-0.5 border border-border",
              snapEnabled ? "bg-main text-main-foreground" : "bg-transparent"
            )}
          >
            Snap: {snapEnabled ? "ON" : "OFF"}
          </span>
          <span className="text-foreground/60">Ready</span>
        </div>
      </footer>

      {/* Work in Progress Modal */}
      <Dialog open={showWipModal} onOpenChange={setShowWipModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl">🚧 Work in Progress</DialogTitle>
            <DialogDescription className="text-base pt-2">
              The video editor is still under development and is not fully functional yet. 
              Some features may not work as expected or may be incomplete.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-foreground/80">
              We&apos;re working hard to bring you a powerful editing experience. 
              Check back soon for updates!
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowWipModal(false)} className="w-full sm:w-auto">
              I Understand
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Editor() {
  return (
    <MediaImportProvider>
      <TimelinePlayerProvider>
        <EditorContent />
      </TimelinePlayerProvider>
    </MediaImportProvider>
  );
}
