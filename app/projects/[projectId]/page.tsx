"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type ClipProperties,
  type ClipTransform,
  EditorHeader,
  MediaLibrary,
  Timeline,
  type TimelineClipWithAsset,
  TimelinePlayer,
  TimelinePlayerProvider,
  type TimelineTrackData,
  useTimelinePlayer,
} from "@/components/editor";
import { ExportModal } from "@/components/editor/export";
import type { MediaAsset } from "@/components/editor/panels/media-library";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  type ImportedMediaAsset,
  MediaImportProvider,
  useMediaImport,
} from "@/lib/media-import";

// Empty initial state for tracks
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
  const [_hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // History state for Undo/Redo (placeholder)
  const [canUndo, _setCanUndo] = useState(false);
  const [canRedo, _setCanRedo] = useState(false);

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

  const handleAssetAdd = useCallback(
    (asset: MediaAsset) => {
      const fullAsset = assetMap.get(asset.id);

      const newClip: TimelineClipWithAsset = {
        id: `clip-${Date.now()}`,
        name: asset.name,
        type: asset.type,
        startTime: 0,
        duration: asset.duration,
        color: asset.type === "video" ? "#0099ff" : "#ff7a05",
        asset: fullAsset,
        trimStart: 0,
        trimEnd: asset.duration,
      };

      setTracks((prev) => {
        const trackIndex = prev.findIndex((t) => t.type === asset.type);
        if (trackIndex === -1) return prev;

        const track = prev[trackIndex];
        const lastClipEnd = track.clips.reduce(
          (max, clip) => Math.max(max, clip.startTime + clip.duration),
          0,
        );
        newClip.startTime = lastClipEnd;

        const updatedTracks = [...prev];
        updatedTracks[trackIndex] = {
          ...track,
          clips: [...track.clips, newClip],
        };

        return updatedTracks;
      });

      setHasUnsavedChanges(true);
    },
    [assetMap],
  );

  const handleClipSelect = (clipId: string) => {
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
    // Deselect if not found (clicked empty space usually handles this too)
    setSelectedClip(null);
  };

  const handleClipMove = useCallback(
    (
      clipId: string,
      newStartTime: number,
      sourceTrackId: string,
      targetTrackId: string,
    ) => {
      setTracks((prev) => {
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

        let movedClip: TimelineClipWithAsset | null = null;

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

  const handleFileDrop = (files: FileList) => {
    importFiles(Array.from(files));
  };

  const handleExport = useCallback(() => {
    setShowExportModal(true);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-muted/10 text-foreground overflow-hidden font-sans">
      <ExportModal
        open={showExportModal}
        onOpenChange={setShowExportModal}
        tracks={tracks}
      />

      <EditorHeader
        projectName="Calm Forest 19 Jan"
        onUndo={() => console.log("Undo")}
        onRedo={() => console.log("Redo")}
        canUndo={canUndo}
        canRedo={canRedo}
        onExport={handleExport}
        className="h-16 px-6 bg-background/50 backdrop-blur-sm border-b-0"
      />

      <div className="flex-1 overflow-hidden px-4 pb-4">
        <ResizablePanelGroup direction="vertical" className="h-full">
          {/* Top Section: Sidebar + Preview */}
          <ResizablePanel defaultSize={70} minSize={40}>
            <div className="h-full pb-3">
              <ResizablePanelGroup direction="horizontal" className="h-full">
                {/* Left Sidebar: Media Library */}
                <ResizablePanel defaultSize={25} minSize={15} maxSize={50}>
                  <aside className="h-full bg-card rounded-2xl border border-border/40 shadow-sm z-10 flex flex-col overflow-hidden">
                    <MediaLibrary
                      assets={mediaAssets}
                      isLoading={isImporting}
                      error={importError}
                      onImport={openFilePicker}
                      onFileDrop={handleFileDrop}
                      onAssetSelect={(asset) =>
                        console.log("Selected asset", asset)
                      }
                      onAssetAdd={handleAssetAdd}
                      onAssetRemove={removeAsset}
                      className="h-full border-none"
                    />
                  </aside>
                </ResizablePanel>

                <ResizableHandle className="mx-1 w-1 bg-transparent hover:bg-primary/30 data-[resize-handle-state=drag]:bg-primary/50 transition-all duration-200 rounded-full" />

                {/* Main Content: Preview Area */}
                <ResizablePanel defaultSize={75} minSize={40}>
                  <main className="h-full bg-black rounded-2xl border border-border/40 shadow-sm relative overflow-hidden ring-1 ring-white/5">
                    <TimelinePlayer
                      className="w-full h-full"
                      selectedClipId={selectedClip?.id ?? null}
                      onClipTransformChange={(clipId, transform) => {
                        setTracks((prev) =>
                          prev.map((track) => ({
                            ...track,
                            clips: track.clips.map((clip) => {
                              if (clip.id !== clipId) return clip;
                              const existing: ClipTransform =
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
                                  ...existing,
                                  x: transform.x,
                                  y: transform.y,
                                },
                              };
                            }),
                          })),
                        );
                      }}
                      onFullscreen={() => console.log("Fullscreen")}
                    />
                  </main>
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
          </ResizablePanel>

          <ResizableHandle className="my-1 h-1 bg-transparent hover:bg-primary/30 data-[resize-handle-state=drag]:bg-primary/50 transition-all duration-200 rounded-full" />

          {/* Bottom Section: Timeline */}
          <ResizablePanel defaultSize={30} minSize={15} maxSize={60}>
            <div className="h-full bg-background rounded-2xl border border-border/40 shadow-sm z-20 overflow-hidden">
              <Timeline
                tracks={tracks}
                currentTime={currentTime}
                duration={duration}
                onTimeChange={handleSeek}
                onClipSelect={handleClipSelect}
                onClipMove={handleClipMove}
                onAddTrack={handleAddTrack}
                onRemoveTrack={handleRemoveTrack}
                className="h-full border-none"
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
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
