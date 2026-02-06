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
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
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
  type: "video" | "audio" | "image";
  startTime: number;
  duration: number;
  color: string;
  thumbnail?: string;
  thumbnails?: string[];
  asset?: ImportedMediaAsset;
  trimStart: number;
  trimEnd: number;
  transform?: ClipTransform;
}

/** Track data structure */
export interface TimelineTrackData {
  id: string;
  type: "video" | "audio" | "image";
  label: string;
  hidden?: boolean;
  muted?: boolean;
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

// ============================================================================
// Context Interface (state/actions/meta pattern for dependency injection)
// ============================================================================

/** Actions for controlling the timeline player */
export interface TimelinePlayerActions {
  setTracks: (tracks: TimelineTrackData[]) => void;
  setClipTransformOverride: (clipId: string, transform: ClipTransform) => void;
  clearClipTransformOverride: (clipId: string) => void;
  loadSource: (asset: ImportedMediaAsset) => Promise<LoadedSource | null>;
  unloadSource: (assetId: string) => void;
  play: () => Promise<void>;
  pause: () => void;
  seek: (time: number) => Promise<void>;
  renderFrame: (time: number) => Promise<void>;
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  setLoop: (loop: boolean) => void;
  exportFrame: (time?: number) => Promise<Blob | null>;
  resize: (width: number, height: number) => void;
}

/** Meta information for the timeline player (refs, subscriptions, etc.) */
export interface TimelinePlayerMeta {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  canvasKey: number;
  outputSize: { width: number; height: number };
  compositor: Compositor | null;
  getCurrentTime: () => number;
  subscribeCurrentTime: (listener: () => void) => () => void;
}

/** Context value for timeline player - follows state/actions/meta pattern */
export interface TimelinePlayerContextValue {
  state: TimelinePlaybackState;
  tracks: TimelineTrackData[];
  loadedSources: Map<string, LoadedSource>;
  actions: TimelinePlayerActions;
  meta: TimelinePlayerMeta;
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

// Counter to generate unique canvas keys
let canvasKeyCounter = 0;

export function TimelinePlayerProvider({
  children,
  width = 1920,
  height = 1080,
  backgroundColor = "#000000",
}: TimelinePlayerProviderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const compositorRef = useRef<Compositor | null>(null);
  const loadedSourcesRef = useRef<Map<string, LoadedSource>>(new Map());
  const transformOverridesRef = useRef<Map<string, ClipTransform>>(new Map());
  const volumeRef = useRef(1);
  const mutedRef = useRef(false);
  const currentTimeRef = useRef(0);
  const currentTimeListenersRef = useRef(new Set<() => void>());
  const suppressTimeUpdateRef = useRef(false);
  // Unique key to force fresh canvas on each mount (prevents transferControlToOffscreen errors)
  const [canvasKey] = useState(() => ++canvasKeyCounter);
  const [outputSize, setOutputSize] = useState(() => ({
    width,
    height,
  }));

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
          if (suppressTimeUpdateRef.current) return;
          currentTimeRef.current = currentTime;
          for (const listener of currentTimeListenersRef.current) {
            listener();
          }
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

  // Update preview whenever tracks or loaded sources change
  useEffect(() => {
    const compositor = compositorRef.current;
    if (!compositor) return;

    // Get composition function based on current tracks and sources
    const getComposition = (time: number) => {
      return buildCompositorComposition({
        time,
        tracks,
        loadedSources,
        width: outputSize.width,
        height: outputSize.height,
        transformOverrides: transformOverridesRef.current,
      });
    };

    // Set up preview
    compositor.preview({
      duration: state.duration,
      loop: state.loop,
      getComposition,
    });

    // Re-render the current frame to reflect track changes immediately
    // (e.g., when adding or removing clips from the timeline)
    if (!state.playing) {
      compositor.seek(currentTimeRef.current);
    }
  }, [
    tracks,
    loadedSources,
    state.duration,
    state.loop,
    state.playing,
    outputSize.width,
    outputSize.height,
  ]);

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

        // Load source based on asset type
        let source: CompositorSource;
        if (asset.type === "audio") {
          source = await compositor.loadAudio(asset.file);
        } else if (asset.type === "image") {
          source = await compositor.loadImage(asset.file);
        } else {
          source = await compositor.loadSource(asset.file);
        }

        console.log(`[TimelinePlayer] Loaded asset: ${asset.name}`, source);
        const loadedSource: LoadedSource = {
          id: `source-${asset.id}`,
          source,
          assetId: asset.id,
          duration: asset.type === "image" ? asset.duration : source.duration,
          width: source.width ?? asset.width ?? 1920,
          height: source.height ?? asset.height ?? 1080,
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

  const setClipTransformOverride = useCallback(
    (clipId: string, transform: ClipTransform) => {
      transformOverridesRef.current.set(clipId, transform);
    },
    [],
  );

  const clearClipTransformOverride = useCallback((clipId: string) => {
    transformOverridesRef.current.delete(clipId);
  }, []);

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
      currentTimeRef.current = time;
      for (const listener of currentTimeListenersRef.current) {
        listener();
      }
      setState((prev) => ({ ...prev, currentTime: time }));
    }
  }, []);

  const renderFrame = useCallback(async (time: number) => {
    const compositor = compositorRef.current;
    if (!compositor) return;

    suppressTimeUpdateRef.current = true;
    try {
      await compositor.seek(time);
      currentTimeRef.current = time;
      for (const listener of currentTimeListenersRef.current) {
        listener();
      }
    } finally {
      suppressTimeUpdateRef.current = false;
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
        const targetTime = time ?? currentTimeRef.current;
        const blob = await compositor.exportFrame(targetTime, {
          format: "png",
        });
        return blob;
      } catch (error) {
        console.error("[TimelinePlayer] Failed to export frame:", error);
        return null;
      }
    },
    [],
  );

  // Resize compositor
  const resize = useCallback((newWidth: number, newHeight: number) => {
    const compositor = compositorRef.current;
    if (!compositor) {
      setOutputSize({ width: newWidth, height: newHeight });
      return;
    }

    const anyCompositor = compositor as unknown as {
      workerClient?: {
        resize: (width: number, height: number) => Promise<boolean> | boolean;
      };
      width?: number;
      height?: number;
    };

    if (anyCompositor.workerClient) {
      anyCompositor.width = newWidth;
      anyCompositor.height = newHeight;
      void anyCompositor.workerClient.resize(newWidth, newHeight);
      setOutputSize({ width: newWidth, height: newHeight });
      return;
    }

    compositor.resize(newWidth, newHeight);
    setOutputSize({ width: newWidth, height: newHeight });
  }, []);

  // Build context value following state/actions/meta pattern
  const contextValue: TimelinePlayerContextValue = {
    state,
    tracks,
    loadedSources,
    actions: {
      setTracks,
      setClipTransformOverride,
      clearClipTransformOverride,
      loadSource,
      unloadSource,
      play,
      pause,
      seek,
      renderFrame,
      setVolume,
      setMuted,
      setLoop,
      exportFrame,
      resize,
    },
    meta: {
      canvasRef,
      canvasKey,
      outputSize,
      compositor: compositorRef.current,
      getCurrentTime: () => currentTimeRef.current,
      subscribeCurrentTime: (listener) => {
        currentTimeListenersRef.current.add(listener);
        return () => {
          currentTimeListenersRef.current.delete(listener);
        };
      },
    },
  };

  return (
    <TimelinePlayerContext value={contextValue}>
      {children}
    </TimelinePlayerContext>
  );
}

// ============================================================================
// Hooks - React 19 use() API
// ============================================================================

export function useTimelinePlayer(): TimelinePlayerContextValue {
  const context = use(TimelinePlayerContext);

  if (!context) {
    throw new Error(
      "useTimelinePlayer must be used within a TimelinePlayerProvider",
    );
  }

  return context;
}

export function useTimelinePlayerTime(): number {
  const context = use(TimelinePlayerContext);

  if (!context) {
    throw new Error(
      "useTimelinePlayerTime must be used within a TimelinePlayerProvider",
    );
  }

  return useSyncExternalStore(
    context.meta.subscribeCurrentTime,
    context.meta.getCurrentTime,
    context.meta.getCurrentTime,
  );
}

export function buildCompositorComposition(params: {
  time: number;
  tracks: TimelineTrackData[];
  loadedSources: Map<string, LoadedSource>;
  width: number;
  height: number;
  transformOverrides?: Map<string, ClipTransform>;
}): { time: number; layers: CompositorLayer[]; audio?: AudioLayer[] } {
  const { time, tracks, loadedSources, transformOverrides } = params;

  const layers: CompositorLayer[] = [];
  const audio: AudioLayer[] = [];

  for (let trackIndex = 0; trackIndex < tracks.length; trackIndex++) {
    const track = tracks[trackIndex];
    if (track.hidden) continue;

    for (const clip of track.clips) {
      const clipEnd = clip.startTime + clip.duration;
      if (time < clip.startTime || time >= clipEnd) continue;

      const assetId = clip.asset?.id;
      if (!assetId) continue;

      const loadedSource = loadedSources.get(assetId);
      if (!loadedSource) continue;

      const clipLocalTime = time - clip.startTime;
      const sourceTime = clip.trimStart + clipLocalTime;

      if (
        (track.type === "video" || track.type === "image") &&
        loadedSource.source.type !== "audio"
      ) {
        const clipTransform = transformOverrides?.get(clip.id) ??
          clip.transform ?? {
            x: 0,
            y: 0,
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
          };

        const zIndex = tracks.length - 1 - trackIndex;

        // For images, sourceTime is always 0 since they don't have temporal duration
        const effectiveSourceTime = track.type === "image" ? 0 : sourceTime;

        layers.push({
          source: loadedSource.source,
          sourceTime: effectiveSourceTime,
          transform: {
            opacity: 1,
            x: clipTransform.x,
            y: clipTransform.y,
            scaleX: clipTransform.scaleX,
            scaleY: clipTransform.scaleY,
            rotation: (Math.round(clipTransform.rotation / 90) * 90) as
              | 0
              | 90
              | 180
              | 270,
          },
          fitMode: "none",
          zIndex,
        });
      }

      const isAudioTrack = track.type === "audio";
      const isVideoWithPossibleAudio = track.type === "video";
      const isTrackMuted = track.muted ?? false;
      if ((isAudioTrack || isVideoWithPossibleAudio) && !isTrackMuted) {
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
