"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type ClipProperties,
  type ClipTransform,
  EditorHeader,
  MediaLibrary,
  PropertiesPanel,
  Timeline,
  type TimelineClipWithAsset,
  TimelinePlayer,
  TimelinePlayerProvider,
  type TimelineTrackData,
  Toolbar,
  useTimelinePlayer,
} from "@/components/editor";
import { ExportModal } from "@/components/editor/export";
import type { MediaAsset } from "@/components/editor/panels/media-library";
import {
  type ImportedMediaAsset,
  MediaImportProvider,
  useMediaImport,
} from "@/lib/media-import";
import { cn } from "@/lib/utils";

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
  // const [showWipModal, setShowWipModal] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

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
            })),
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
      t.clips.length > 0 ? t.clips.map((c) => c.startTime + c.duration) : [0],
    ),
    60,
  );

  // Handlers
  const handleSeek = useCallback(
    (time: number) => {
      playerSeek(time);
    },
    [playerSeek],
  );

  // Add new track handler
  const handleAddTrack = useCallback((type: "video" | "audio") => {
    setTracks((prev) => {
      // Count existing tracks of this type to generate label
      const existingCount = prev.filter((t) => t.type === type).length;
      const newTrack: TimelineTrackData = {
        id: `${type}-${Date.now()}`,
        type,
        label: `${type === "video" ? "Video" : "Audio"} ${existingCount + 1}`,
        clips: [],
      };
      return [...prev, newTrack];
    });
    setHasUnsavedChanges(true);
  }, []);

  // Remove track handler
  const handleRemoveTrack = useCallback((trackId: string) => {
    setTracks((prev) => prev.filter((t) => t.id !== trackId));
    setHasUnsavedChanges(true);
  }, []);

  const handleAssetSelect = (asset: MediaAsset) => {
    console.log("Selected asset:", asset.name);
  };

  const handleAssetAdd = useCallback(
    (asset: MediaAsset) => {
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
          0,
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
    },
    [assetMap],
  );

  const handleClipSelect = (clipId: string) => {
    // Find the clip in tracks
    for (const track of tracks) {
      const clip = track.clips.find((c) => c.id === clipId);
      if (clip) {
        const transform: ClipTransform = clip.transform ?? {
          x: 0,
          y: 0,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
        };

        setSelectedClip({
          id: clip.id,
          name: clip.name,
          type: clip.type,
          positionX: transform.x,
          positionY: transform.y,
          scaleX: transform.scaleX,
          scaleY: transform.scaleY,
          rotation: transform.rotation,
          cropTop: 0,
          cropBottom: 0,
          cropLeft: 0,
          cropRight: 0,
          trimStart: clip.trimStart,
          trimEnd: clip.trimEnd,
          duration: clip.duration,
          speed: 1,
        });
        return;
      }
    }
  };

  const handleClipMove = useCallback(
    (
      clipId: string,
      newStartTime: number,
      sourceTrackId: string,
      targetTrackId: string,
    ) => {
      setTracks((prev) => {
        // If moving within the same track
        if (sourceTrackId === targetTrackId) {
          return prev.map((track) => {
            if (track.id !== sourceTrackId) return track;
            return {
              ...track,
              clips: track.clips.map((clip) =>
                clip.id === clipId
                  ? { ...clip, startTime: Math.max(0, newStartTime) }
                  : clip,
              ),
            };
          });
        }

        // Moving between tracks
        let movedClip: TimelineClipWithAsset | null = null;

        // Find and remove from source track
        const tracksWithoutClip = prev.map((track) => {
          if (track.id !== sourceTrackId) return track;
          const clipToMove = track.clips.find((c) => c.id === clipId);
          if (clipToMove) {
            movedClip = { ...clipToMove, startTime: Math.max(0, newStartTime) };
          }
          return {
            ...track,
            clips: track.clips.filter((c) => c.id !== clipId),
          };
        });

        // Add to target track
        if (!movedClip) return prev;

        return tracksWithoutClip.map((track) => {
          if (track.id !== targetTrackId) return track;
          return {
            ...track,
            clips: [...track.clips, movedClip as TimelineClipWithAsset],
          };
        });
      });
      setHasUnsavedChanges(true);
    },
    [],
  );

  const handlePropertiesChange = (props: Partial<ClipProperties>) => {
    if (!selectedClip) return;

    const nextSelectedClip = { ...selectedClip, ...props };
    setSelectedClip(nextSelectedClip);

    setTracks((prev) =>
      prev.map((track) => ({
        ...track,
        clips: track.clips.map((clip) => {
          if (clip.id !== selectedClip.id) return clip;

          const existingTransform: ClipTransform = clip.transform ?? {
            x: 0,
            y: 0,
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
          };

          return {
            ...clip,
            trimStart: nextSelectedClip.trimStart,
            trimEnd: nextSelectedClip.trimEnd,
            transform: {
              ...existingTransform,
              x: nextSelectedClip.positionX,
              y: nextSelectedClip.positionY,
              scaleX: nextSelectedClip.scaleX,
              scaleY: nextSelectedClip.scaleY,
              rotation: nextSelectedClip.rotation,
            },
          };
        }),
      })),
    );

    setHasUnsavedChanges(true);
  };

  const handleFileDrop = (files: FileList) => {
    importFiles(Array.from(files));
  };

  const handleExport = useCallback(() => {
    setShowExportModal(true);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Export Modal */}
      <ExportModal
        open={showExportModal}
        onOpenChange={setShowExportModal}
        tracks={tracks}
      />

      {/* Header */}
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
        onExport={handleExport}
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
                  })),
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
              selectedClipId={selectedClip?.id ?? null}
              onClipTransformChange={(clipId, transform) => {
                setTracks((prev) =>
                  prev.map((track) => ({
                    ...track,
                    clips: track.clips.map((clip) => {
                      if (clip.id !== clipId) return clip;

                      const existingTransform: ClipTransform =
                        clip.transform ?? {
                          x: 0,
                          y: 0,
                          scaleX: 1,
                          scaleY: 1,
                          rotation: 0,
                        };

                      return {
                        ...clip,
                        transform: {
                          ...existingTransform,
                          x: transform.x,
                          y: transform.y,
                        },
                      };
                    }),
                  })),
                );

                setSelectedClip((prev) => {
                  if (!prev || prev.id !== clipId) return prev;
                  return {
                    ...prev,
                    positionX: transform.x,
                    positionY: transform.y,
                  };
                });

                setHasUnsavedChanges(true);
              }}
              onFullscreen={() => console.log("Fullscreen")}
            />
          </div>

          {/* Timeline */}
          <div className="h-[280px] flex-shrink-0 border-t border-border">
            <Timeline
              tracks={tracks}
              currentTime={currentTime}
              duration={duration}
              onTimeChange={handleSeek}
              onClipSelect={handleClipSelect}
              onClipMove={handleClipMove}
              onAddTrack={handleAddTrack}
              onRemoveTrack={handleRemoveTrack}
              className="h-full"
            />
          </div>
        </main>

        {/* Right Panel: Properties */}
        <aside className="w-72 flex-shrink-0 border-l border-border">
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
          "border-t border-border bg-muted",
          "text-xs font-medium",
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
              "px-2 py-0.5 border border-border rounded",
              snapEnabled
                ? "bg-primary text-primary-foreground"
                : "bg-transparent",
            )}
          >
            Snap: {snapEnabled ? "ON" : "OFF"}
          </span>
          <span className="text-foreground/60">Ready</span>
        </div>
      </footer>
    </div>
  );
}

export default function ProjectEditor() {
  return (
    <MediaImportProvider>
      <TimelinePlayerProvider>
        <EditorContent />
      </TimelinePlayerProvider>
    </MediaImportProvider>
  );
}
