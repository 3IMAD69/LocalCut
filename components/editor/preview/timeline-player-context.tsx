"use client";

import type {
  AudioLayer,
  Compositor,
  CompositorLayer,
  CompositorSource,
} from "@mediafox/core";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

// Worker URL for Next.js - using dynamic URL construction
const CompositorWorkerUrl = new URL(
  "@mediafox/core/compositor-worker",
  import.meta.url,
).href;

import type { ImportedMediaAsset } from "@/lib/media-import";

// ============================================================================
// Types
// ============================================================================

/** A loaded source in the compositor */
export interface LoadedSource {
  id: string;
  source: CompositorSource;
  assetId: string;
  duration: number;
  width: number;
  height: number;
}

/** Transform applied to a clip in compositor coordinates. */
export interface ClipTransform {
  /** Pixel offset from the default centered X position. */
  x: number;
  /** Pixel offset from the default centered Y position. */
  y: number;
  scaleX: number;
  scaleY: number;
  /** Degrees. */
  rotation: number;
}

/** Timeline clip with associated asset reference */
export interface TimelineClipWithAsset {
  id: string;
  name: string;
  type: "video" | "audio";
  startTime: number;
  duration: number;
  color: string;
  thumbnail?: string;
  asset?: ImportedMediaAsset;
  trimStart: number;
  trimEnd: number;
  transform?: ClipTransform;
}

/** Track data structure */
export interface TimelineTrackData {
  id: string;
  type: "video" | "audio";
  label: string;
  clips: TimelineClipWithAsset[];
}

/** Currently active clip during playback */
export interface ActiveClip {
  clipId: string;
  source: CompositorSource;
  sourceTime: number;
  transform: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    scaleX?: number;
    scaleY?: number;
    rotation?: number;
    opacity?: number;
    anchorX?: number;
    anchorY?: number;
  };
  zIndex: number;
}

/** Playback state for the timeline player */
export interface TimelinePlaybackState {
  currentTime: number;
  duration: number;
  playing: boolean;
  volume: number;
  muted: boolean;
  loop: boolean;
  loading: boolean;
  error: Error | null;
}

/** Context value for timeline player */
interface TimelinePlayerContextValue {
  // Canvas ref for rendering
  canvasRef: React.RefObject<HTMLCanvasElement | null>;

  // Compositor instance
  compositor: Compositor | null;

  // Loaded sources map (assetId -> LoadedSource)
  loadedSources: Map<string, LoadedSource>;

  // Playback state
  state: TimelinePlaybackState;

  // Track data
  tracks: TimelineTrackData[];

  // Actions
  setTracks: (tracks: TimelineTrackData[]) => void;
  loadSource: (asset: ImportedMediaAsset) => Promise<LoadedSource | null>;
  unloadSource: (assetId: string) => void;
  play: () => Promise<void>;
  pause: () => void;
  seek: (time: number) => Promise<void>;
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  setLoop: (loop: boolean) => void;
  exportFrame: (time?: number) => Promise<Blob | null>;
  resize: (width: number, height: number) => void;
}

// ============================================================================
// Context
// ============================================================================

const TimelinePlayerContext = createContext<TimelinePlayerContextValue | null>(
  null,
);

// ============================================================================
// Provider Component
// ============================================================================

interface TimelinePlayerProviderProps {
  children: ReactNode;
  width?: number;
  height?: number;
  backgroundColor?: string;
}

export function TimelinePlayerProvider({
  children,
  width = 1920,
  height = 1080,
  backgroundColor = "#000000",
}: TimelinePlayerProviderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const compositorRef = useRef<Compositor | null>(null);
  const loadedSourcesRef = useRef<Map<string, LoadedSource>>(new Map());
  const volumeRef = useRef(1);
  const mutedRef = useRef(false);

  const [loadedSources, setLoadedSources] = useState<Map<string, LoadedSource>>(
    new Map(),
  );
  const [tracks, setTracksState] = useState<TimelineTrackData[]>([]);
  const [state, setState] = useState<TimelinePlaybackState>({
    currentTime: 0,
    duration: 60,
    playing: false,
    volume: 1,
    muted: false,
    loop: true,
    loading: false,
    error: null,
  });

  // Initialize compositor when canvas is ready
  useEffect(() => {
    let compositor: Compositor | null = null;

    const initCompositor = async () => {
      if (!canvasRef.current) return;

      try {
        // Dynamic import for SSR safety
        const { Compositor: CompositorClass } = await import("@mediafox/core");

        compositor = new CompositorClass({
          canvas: canvasRef.current,
          width,
          height,
          backgroundColor,
          worker: {
            enabled: true,
            url: CompositorWorkerUrl,
            type: "module",
          },
        });

        compositorRef.current = compositor;

        // Listen to compositor events
        compositor.on("timeupdate", ({ currentTime }) => {
          setState((prev) => ({ ...prev, currentTime }));
        });

        compositor.on("play", () => {
          setState((prev) => ({ ...prev, playing: true }));
        });

        compositor.on("pause", () => {
          setState((prev) => ({ ...prev, playing: false }));
        });

        compositor.on("ended", () => {
          setState((prev) => ({ ...prev, playing: false }));
        });

        compositor.on("sourceloaded", ({ id, source }) => {
          console.log(`[Compositor] Source loaded: ${id}`, source);
        });
      } catch (error) {
        console.error(
          "[TimelinePlayer] Failed to initialize compositor:",
          error,
        );
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error : new Error(String(error)),
        }));
      }
    };

    initCompositor();

    return () => {
      if (compositor) {
        compositor.dispose();
        compositorRef.current = null;
      }
    };
  }, [width, height, backgroundColor]);

  // Calculate total duration from tracks
  useEffect(() => {
    const maxTime = Math.max(
      ...tracks.flatMap((t) =>
        t.clips.length > 0 ? t.clips.map((c) => c.startTime + c.duration) : [0],
      ),
      10, // Minimum 10 seconds
    );
    setState((prev) => ({ ...prev, duration: maxTime }));
  }, [tracks]);

  // Update preview whenever tracks change
  useEffect(() => {
    const compositor = compositorRef.current;
    if (!compositor) return;

    // Get composition function based on current tracks and sources
    const getComposition = (time: number) => {
      return buildCompositorComposition({
        time,
        tracks,
        loadedSources: loadedSourcesRef.current,
        width,
        height,
      });
    };

    // Set up preview
    compositor.preview({
      duration: state.duration,
      loop: state.loop,
      getComposition,
    });
  }, [tracks, state.duration, state.loop, width, height]);

  // Load a media source into the compositor
  const loadSource = useCallback(
    async (asset: ImportedMediaAsset): Promise<LoadedSource | null> => {
      const compositor = compositorRef.current;
      if (!compositor) {
        console.error("[TimelinePlayer] Compositor not initialized");
        return null;
      }

      // Check if already loaded
      const existing = loadedSourcesRef.current.get(asset.id);
      if (existing) {
        return existing;
      }

      try {
        setState((prev) => ({ ...prev, loading: true }));

        // Load source from file
        const source =
          asset.type === "audio"
            ? await compositor.loadAudio(asset.file)
            : await compositor.loadSource(asset.file);
        console.log(`[TimelinePlayer] Loaded asset: ${asset.name}`, source);
        const loadedSource: LoadedSource = {
          id: `source-${asset.id}`,
          source,
          assetId: asset.id,
          duration: source.duration,
          width: source.width ?? 1920,
          height: source.height ?? 1080,
        };

        // Update refs and state
        loadedSourcesRef.current.set(asset.id, loadedSource);
        setLoadedSources(new Map(loadedSourcesRef.current));

        setState((prev) => ({ ...prev, loading: false }));

        console.log(
          `[TimelinePlayer] Loaded source: ${asset.name}`,
          loadedSource,
        );

        return loadedSource;
      } catch (error) {
        console.error(
          `[TimelinePlayer] Failed to load source: ${asset.name}`,
          error,
        );
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error : new Error(String(error)),
        }));
        return null;
      }
    },
    [],
  );

  // Unload a source from the compositor
  const unloadSource = useCallback((assetId: string) => {
    const loaded = loadedSourcesRef.current.get(assetId);
    if (loaded) {
      loadedSourcesRef.current.delete(assetId);
      setLoadedSources(new Map(loadedSourcesRef.current));
      console.log(`[TimelinePlayer] Unloaded source: ${assetId}`);
    }
  }, []);

  // Set tracks and auto-load sources for clips
  const setTracks = useCallback(
    async (newTracks: TimelineTrackData[]) => {
      setTracksState(newTracks);

      // Auto-load sources for any clips with assets
      for (const track of newTracks) {
        for (const clip of track.clips) {
          if (clip.asset && !loadedSourcesRef.current.has(clip.asset.id)) {
            await loadSource(clip.asset);
          }
        }
      }
    },
    [loadSource],
  );

  // Playback controls
  const play = useCallback(async () => {
    const compositor = compositorRef.current;
    if (compositor) {
      await compositor.play();
    }
  }, []);

  const pause = useCallback(() => {
    const compositor = compositorRef.current;
    if (compositor) {
      compositor.pause();
    }
  }, []);

  const seek = useCallback(async (time: number) => {
    const compositor = compositorRef.current;
    if (compositor) {
      await compositor.seek(time);
      setState((prev) => ({ ...prev, currentTime: time }));
    }
  }, []);

  const setVolume = useCallback((volume: number) => {
    const clamped = Math.max(0, Math.min(1, volume));
    volumeRef.current = clamped;
    setState((prev) => ({ ...prev, volume: clamped }));
    // Apply volume to compositor
    const compositor = compositorRef.current;
    if (compositor) {
      compositor.setVolume(clamped);
    }
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    mutedRef.current = muted;
    setState((prev) => ({ ...prev, muted }));
    // Apply mute to compositor
    const compositor = compositorRef.current;
    if (compositor) {
      compositor.setMuted(muted);
    }
  }, []);

  const setLoop = useCallback((loop: boolean) => {
    setState((prev) => ({ ...prev, loop }));
  }, []);

  // Export current frame as image
  const exportFrame = useCallback(
    async (time?: number): Promise<Blob | null> => {
      const compositor = compositorRef.current;
      if (!compositor) return null;

      try {
        const targetTime = time ?? state.currentTime;
        const blob = await compositor.exportFrame(targetTime, {
          format: "png",
        });
        return blob;
      } catch (error) {
        console.error("[TimelinePlayer] Failed to export frame:", error);
        return null;
      }
    },
    [state.currentTime],
  );

  // Resize compositor
  const resize = useCallback((newWidth: number, newHeight: number) => {
    const compositor = compositorRef.current;
    if (compositor) {
      compositor.resize(newWidth, newHeight);
    }
  }, []);

  const contextValue: TimelinePlayerContextValue = {
    canvasRef,
    compositor: compositorRef.current,
    loadedSources,
    state,
    tracks,
    setTracks,
    loadSource,
    unloadSource,
    play,
    pause,
    seek,
    setVolume,
    setMuted,
    setLoop,
    exportFrame,
    resize,
  };

  return (
    <TimelinePlayerContext.Provider value={contextValue}>
      {children}
    </TimelinePlayerContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useTimelinePlayer(): TimelinePlayerContextValue {
  const context = useContext(TimelinePlayerContext);

  if (!context) {
    throw new Error(
      "useTimelinePlayer must be used within a TimelinePlayerProvider",
    );
  }

  return context;
}

export function buildCompositorComposition(params: {
  time: number;
  tracks: TimelineTrackData[];
  loadedSources: Map<string, LoadedSource>;
  width: number;
  height: number;
}): { time: number; layers: CompositorLayer[]; audio?: AudioLayer[] } {
  const { time, tracks, loadedSources, width, height } = params;

  const layers: CompositorLayer[] = [];
  const audio: AudioLayer[] = [];

  for (let trackIndex = 0; trackIndex < tracks.length; trackIndex++) {
    const track = tracks[trackIndex];

    for (const clip of track.clips) {
      const clipEnd = clip.startTime + clip.duration;
      if (time < clip.startTime || time >= clipEnd) continue;

      const assetId = clip.asset?.id;
      if (!assetId) continue;

      const loadedSource = loadedSources.get(assetId);
      if (!loadedSource) continue;

      const clipLocalTime = time - clip.startTime;
      const sourceTime = clip.trimStart + clipLocalTime;

      if (track.type === "video" && loadedSource.source.type !== "audio") {
        const centerX = (width - loadedSource.width) / 2;
        const centerY = (height - loadedSource.height) / 2;

        const clipTransform = clip.transform ?? {
          x: 0,
          y: 0,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
        };

        layers.push({
          source: loadedSource.source,
          sourceTime,
          transform: {
            opacity: 1,
            x: centerX + clipTransform.x,
            y: centerY + clipTransform.y,
            scaleX: clipTransform.scaleX,
            scaleY: clipTransform.scaleY,
            rotation: (Math.round(clipTransform.rotation / 90) * 90) as
              | 0
              | 90
              | 180
              | 270,
          },
          zIndex: trackIndex,
        });
      }

      const isAudioTrack = track.type === "audio";
      const isVideoWithPossibleAudio = track.type === "video";
      if (isAudioTrack || isVideoWithPossibleAudio) {
        audio.push({
          source: loadedSource.source,
          sourceTime,
          volume: 1,
          muted: false,
        });
      }
    }
  }

  return { time, layers, audio: audio.length > 0 ? audio : undefined };
}
