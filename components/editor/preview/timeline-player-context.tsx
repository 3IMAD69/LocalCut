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
  useMemo,
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

/** Properties for a selected clip in the properties panel. */
export interface ClipProperties {
  id: string;
  name: string;
  type: "video" | "audio" | "image";
  fitMode?: FitMode;
  positionX: number;
  positionY: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  cropTop: number;
  cropBottom: number;
  cropLeft: number;
  cropRight: number;
  trimStart: number;
  trimEnd: number;
  duration: number;
  speed: number;
}

// ============================================================================
// Zoom Keyframes – Screen.Studio-style smooth zoom & pan
// ============================================================================

/** Easing function type for zoom transitions */
export type ZoomEasing =
  | "linear"
  | "ease-in"
  | "ease-out"
  | "ease-in-out"
  | "spring"
  | "screen-studio";

/** A single zoom keyframe defining scale and focal point at a point in time */
export interface ZoomKeyframe {
  /** Time offset in seconds relative to the clip start (0 = clip beginning) */
  time: number;
  /** Zoom scale factor (1 = 100%, 2 = 200%, etc.) */
  scale: number;
  /** Focal point X as a fraction of the source (0 = left, 0.5 = center, 1 = right) */
  x: number;
  /** Focal point Y as a fraction of the source (0 = top, 0.5 = center, 1 = bottom) */
  y: number;
  /** Easing to use when transitioning FROM this keyframe to the next */
  easing: ZoomEasing;
}

/** Default zoom keyframe (no zoom, centered) */
export const DEFAULT_ZOOM_KEYFRAME: Omit<ZoomKeyframe, "time"> = {
  scale: 1,
  x: 0.5,
  y: 0.5,
  easing: "ease-in-out",
};

// ============================================================================
// Zoom Effects – standalone blocks on dedicated timeline zoom tracks
// ============================================================================

/**
 * A standalone zoom effect block placed on a zoom track in the timeline.
 *
 * Unlike per-clip keyframes, zoom effects are independent timeline items with
 * their own start time and duration. They show as draggable/resizable blocks
 * (like the Screen Studio UI) below the video track.
 *
 * Each zoom effect defines:
 * - Time range: startTime + duration (absolute timeline time)
 * - Target zoom level and focal point
 * - Easing for the zoom-in and zoom-out transitions
 * - Optional motion blur during zoom transitions
 * - An ease-in and ease-out duration defining how long the transition takes
 */
export interface ZoomEffect {
  /** Unique ID for this zoom effect */
  id: string;
  /** Start time on the timeline in seconds */
  startTime: number;
  /** Duration of the zoom effect in seconds */
  duration: number;
  /** Target zoom scale factor (e.g. 2 = 200% zoom) */
  scale: number;
  /** Focal point X (0 = left, 0.5 = center, 1 = right) */
  x: number;
  /** Focal point Y (0 = top, 0.5 = center, 1 = bottom) */
  y: number;
  /** Easing curve for the zoom-in transition */
  easeIn: ZoomEasing;
  /** Easing curve for the zoom-out transition */
  easeOut: ZoomEasing;
  /** Whether to apply motion blur during zoom transitions */
  motionBlur: boolean;
  /** Motion blur intensity (0-1, default 0.5) */
  motionBlurAmount: number;
}

/** Default values for a new zoom effect */
export const DEFAULT_ZOOM_EFFECT: Omit<
  ZoomEffect,
  "id" | "startTime" | "duration"
> = {
  scale: 2,
  x: 0.5,
  y: 0.5,
  easeIn: "screen-studio",
  easeOut: "screen-studio",
  motionBlur: false,
  motionBlurAmount: 0.5,
};

// ---------------------------------------------------------------------------
// Easing functions
// ---------------------------------------------------------------------------

function easingLinear(t: number): number {
  return t;
}

function easingIn(t: number): number {
  return t * t * t;
}

function easingOut(t: number): number {
  const inv = 1 - t;
  return 1 - inv * inv * inv;
}

function easingInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function easingSpring(t: number): number {
  const c4 = (2 * Math.PI) / 3;
  if (t === 0 || t === 1) return t;
  return 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

// ---------------------------------------------------------------------------
// Cubic-bezier solver — Newton-Raphson with bisection fallback
// Used for the Screen Studio easing: cubic-bezier(0.16, 1, 0.3, 1)
// ---------------------------------------------------------------------------

function sampleCubicBezier(a1: number, a2: number, t: number): number {
  // Evaluate cubic bezier for one axis: B(t) = 3a1(1-t)²t + 3a2(1-t)t² + t³
  return ((1 - 3 * a2 + 3 * a1) * t + (3 * a2 - 6 * a1)) * t * t + 3 * a1 * t;
}

function sampleCubicBezierDerivative(
  a1: number,
  a2: number,
  t: number,
): number {
  return (3 - 9 * a2 + 9 * a1) * t * t + (6 * a2 - 12 * a1) * t + 3 * a1;
}

/**
 * Generic cubic-bezier easing: given control points (x1, y1, x2, y2) and an
 * input progress `t` in [0,1], returns the eased value.
 *
 * Uses Newton-Raphson iteration to invert the X curve, then evaluates Y.
 */
function cubicBezier(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  t: number,
): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;

  // Newton-Raphson: solve sampleCubicBezier(x1, x2, u) = t for u
  let u = t; // initial guess
  for (let i = 0; i < 8; i++) {
    const currentX = sampleCubicBezier(x1, x2, u) - t;
    const derivative = sampleCubicBezierDerivative(x1, x2, u);
    if (Math.abs(currentX) < 1e-7) break;
    if (Math.abs(derivative) < 1e-7) break;
    u -= currentX / derivative;
  }

  // Bisection fallback if Newton wandered out of [0,1]
  if (u < 0 || u > 1) {
    let lo = 0;
    let hi = 1;
    u = t;
    for (let i = 0; i < 20; i++) {
      const currentX = sampleCubicBezier(x1, x2, u);
      if (Math.abs(currentX - t) < 1e-7) break;
      if (currentX > t) {
        hi = u;
      } else {
        lo = u;
      }
      u = (lo + hi) / 2;
    }
  }

  return sampleCubicBezier(y1, y2, u);
}

/**
 * Screen Studio easing — cubic-bezier(0.16, 1, 0.3, 1)
 *
 * Aggressive ease-out with a fast snap at the start and a long, smooth
 * deceleration tail. Replicates the signature ultra-smooth zoom feel from
 * Screen Studio.
 */
function easingScreenStudio(t: number): number {
  return cubicBezier(0.16, 1, 0.3, 1, t);
}

const EASING_FNS: Record<ZoomEasing, (t: number) => number> = {
  linear: easingLinear,
  "ease-in": easingIn,
  "ease-out": easingOut,
  "ease-in-out": easingInOut,
  spring: easingSpring,
  "screen-studio": easingScreenStudio,
};

/**
 * Interpolate zoom keyframes at a given clip-local time.
 *
 * Returns the interpolated { scale, x, y } values.
 * If no keyframes exist, returns the default (scale=1, centered).
 * If time is before the first keyframe, holds the first keyframe value.
 * If time is after the last keyframe, holds the last keyframe value.
 */
export function interpolateZoomKeyframes(
  keyframes: ZoomKeyframe[],
  clipLocalTime: number,
): { scale: number; x: number; y: number } {
  if (keyframes.length === 0) {
    return { scale: 1, x: 0.5, y: 0.5 };
  }

  // Sort by time (should already be sorted, but be safe)
  const sorted = [...keyframes].sort((a, b) => a.time - b.time);

  // Before first keyframe — hold
  if (clipLocalTime <= sorted[0].time) {
    return { scale: sorted[0].scale, x: sorted[0].x, y: sorted[0].y };
  }

  // After last keyframe — hold
  const last = sorted[sorted.length - 1];
  if (clipLocalTime >= last.time) {
    return { scale: last.scale, x: last.x, y: last.y };
  }

  // Find the surrounding pair
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];

    if (clipLocalTime >= a.time && clipLocalTime <= b.time) {
      const segmentDuration = b.time - a.time;
      const rawT =
        segmentDuration > 0 ? (clipLocalTime - a.time) / segmentDuration : 0;
      const easeFn = EASING_FNS[a.easing] ?? easingInOut;
      const t = easeFn(rawT);

      return {
        scale: a.scale + (b.scale - a.scale) * t,
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
      };
    }
  }

  // Fallback (shouldn't reach here)
  return { scale: last.scale, x: last.x, y: last.y };
}

/**
 * Compute the effective zoom state at a given absolute timeline time
 * by evaluating all zoom effect blocks across all zoom tracks.
 *
 * Ease durations are auto-calculated: first 1/3 of the block = ease-in,
 * last 1/3 = ease-out, middle 1/3 = hold at target scale.
 *
 * If multiple zoom effects overlap, the one with the highest scale wins.
 *
 * Returns { scale, x, y, motionBlurAmount } — motionBlurAmount > 0 only
 * during active easing phases when motionBlur is enabled.
 */
export function interpolateZoomEffects(
  zoomTracks: TimelineTrackData[],
  time: number,
): { scale: number; x: number; y: number; motionBlurAmount: number } {
  let resultScale = 1;
  let resultX = 0.5;
  let resultY = 0.5;
  let resultBlur = 0;

  for (const track of zoomTracks) {
    if (track.type !== "zoom" || track.hidden) continue;
    const effects = track.zoomEffects;
    if (!effects) continue;

    for (const fx of effects) {
      const fxEnd = fx.startTime + fx.duration;
      if (time < fx.startTime || time >= fxEnd) continue;

      // Auto-calculate ease durations: first 1/3 ease-in, last 1/3 ease-out
      const easeInDuration = fx.duration / 3;
      const easeOutDuration = fx.duration / 3;

      // Compute phase-based interpolation
      const localTime = time - fx.startTime;
      const easeInEnd = easeInDuration;
      const easeOutStart = fx.duration - easeOutDuration;

      let t: number; // 0 = no zoom, 1 = full zoom
      let isTransitioning = false;

      if (localTime < easeInEnd && easeInDuration > 0) {
        // Ease-in phase: zooming in from 1x to target
        const rawT = localTime / easeInDuration;
        const easeFn = EASING_FNS[fx.easeIn] ?? easingScreenStudio;
        t = easeFn(rawT);
        isTransitioning = true;
      } else if (localTime > easeOutStart && easeOutDuration > 0) {
        // Ease-out phase: zooming out from target to 1x
        const rawT = (localTime - easeOutStart) / easeOutDuration;
        const easeFn = EASING_FNS[fx.easeOut] ?? easingScreenStudio;
        t = 1 - easeFn(rawT);
        isTransitioning = true;
      } else {
        // Hold phase: fully zoomed
        t = 1;
      }

      const scale = 1 + (fx.scale - 1) * t;

      // Use the effect with the highest zoom if multiple overlap
      if (scale > resultScale) {
        resultScale = scale;
        resultX = 0.5 + (fx.x - 0.5) * t;
        resultY = 0.5 + (fx.y - 0.5) * t;
        resultBlur =
          isTransitioning && fx.motionBlur ? fx.motionBlurAmount * t : 0;
      }
    }
  }

  return {
    scale: resultScale,
    x: resultX,
    y: resultY,
    motionBlurAmount: resultBlur,
  };
}
/** Filter settings applied to a clip */
export interface ClipFilters {
  /** Opacity 0-100 (default: 100) */
  opacity: number;
  /** Brightness adjustment -100 to +100 (default: 0) */
  brightness: number;
  /** Contrast adjustment -100 to +100 (default: 0) */
  contrast: number;
  /** Saturation adjustment -100 to +100 (default: 0) */
  saturation: number;
  /** Hue rotation -180 to +180 degrees (default: 0) */
  hue: number;
  /** Blur amount 0-100 (default: 0) */
  blur: number;
}

/** Default filter values */
export const DEFAULT_CLIP_FILTERS: ClipFilters = {
  opacity: 100,
  brightness: 0,
  contrast: 0,
  saturation: 0,
  hue: 0,
  blur: 0,
};

/** Convert ClipFilters to CSS filter string and opacity value */
export function clipFiltersToCSS(filters: ClipFilters): {
  filter: string;
  opacity: number;
} {
  const parts: string[] = [];

  // Brightness: -100 to +100 maps to 0 to 2 (0 = black, 1 = normal, 2 = 2x bright)
  if (filters.brightness !== 0) {
    const brightnessValue = 1 + filters.brightness / 100;
    parts.push(`brightness(${brightnessValue})`);
  }

  // Contrast: -100 to +100 maps to 0 to 2 (0 = gray, 1 = normal, 2 = 2x contrast)
  if (filters.contrast !== 0) {
    const contrastValue = 1 + filters.contrast / 100;
    parts.push(`contrast(${contrastValue})`);
  }

  // Saturation: -100 to +100 maps to 0 to 2 (0 = grayscale, 1 = normal, 2 = 2x saturated)
  if (filters.saturation !== 0) {
    const saturationValue = 1 + filters.saturation / 100;
    parts.push(`saturate(${saturationValue})`);
  }

  // Hue: -180 to +180 degrees rotation
  if (filters.hue !== 0) {
    parts.push(`hue-rotate(${filters.hue}deg)`);
  }

  // Blur: 0-100 maps to 0-20px blur
  if (filters.blur !== 0) {
    const blurPx = (filters.blur / 100) * 20;
    parts.push(`blur(${blurPx}px)`);
  }

  return {
    filter: parts.length > 0 ? parts.join(" ") : "",
    opacity: filters.opacity / 100,
  };
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
  filters?: ClipFilters;
  fitMode?: FitMode;
  /** Zoom keyframes for smooth Screen.Studio-style zoom & pan animations */
  zoomKeyframes?: ZoomKeyframe[];
}

/** Track data structure */
export interface TimelineTrackData {
  id: string;
  type: "video" | "audio" | "image" | "zoom";
  label: string;
  hidden?: boolean;
  muted?: boolean;
  clips: TimelineClipWithAsset[];
  /** Zoom effects for zoom-type tracks */
  zoomEffects?: ZoomEffect[];
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
  fitMode: FitMode;
}

export type FitMode = "contain" | "cover" | "fill";

// ============================================================================
// Context Interface (state/actions/meta pattern for dependency injection)
// ============================================================================

/** Actions for controlling the timeline player */
export interface TimelinePlayerActions {
  setTracks: (tracks: TimelineTrackData[]) => void;
  setClipTransformOverride: (clipId: string, transform: ClipTransform) => void;
  clearClipTransformOverride: (clipId: string) => void;
  setClipFiltersOverride: (clipId: string, filters: ClipFilters) => void;
  clearClipFiltersOverride: (clipId: string) => void;
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
  setFitMode: (fitMode: FitMode) => void;
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
  const filterOverridesRef = useRef<Map<string, ClipFilters>>(new Map());
  const volumeRef = useRef(1);
  const mutedRef = useRef(false);
  const fitModeRef = useRef<FitMode>("contain");
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
    fitMode: "contain",
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

        compositor.setFitMode(fitModeRef.current);

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
        filterOverrides: filterOverridesRef.current,
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

  const setClipFiltersOverride = useCallback(
    (clipId: string, filters: ClipFilters) => {
      filterOverridesRef.current.set(clipId, filters);
    },
    [],
  );

  const clearClipFiltersOverride = useCallback((clipId: string) => {
    filterOverridesRef.current.delete(clipId);
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

  const setFitMode = useCallback(
    (fitMode: FitMode) => {
      fitModeRef.current = fitMode;
      setState((prev) => ({ ...prev, fitMode }));

      const compositor = compositorRef.current;
      if (compositor) {
        compositor.setFitMode(fitMode);
        if (!state.playing) {
          void renderFrame(currentTimeRef.current);
        }
      }
    },
    [renderFrame, state.playing],
  );

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
  const resize = useCallback(
    (newWidth: number, newHeight: number) => {
      const compositor = compositorRef.current;
      if (!compositor) {
        setOutputSize({ width: newWidth, height: newHeight });
        return;
      }

      compositor.resize(newWidth, newHeight);
      setOutputSize({ width: newWidth, height: newHeight });
      if (!state.playing) {
        void renderFrame(currentTimeRef.current);
      }
    },
    [renderFrame, state.playing],
  );

  // Memoize actions to avoid re-creating on every render
  const actions = useMemo<TimelinePlayerActions>(
    () => ({
      setTracks,
      setClipTransformOverride,
      clearClipTransformOverride,
      setClipFiltersOverride,
      clearClipFiltersOverride,
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
      setFitMode,
    }),
    [
      setTracks,
      setClipTransformOverride,
      clearClipTransformOverride,
      setClipFiltersOverride,
      clearClipFiltersOverride,
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
      setFitMode,
    ],
  );

  // Stable subscribe/getCurrentTime refs (never change identity)
  const subscribeCurrentTime = useCallback((listener: () => void) => {
    currentTimeListenersRef.current.add(listener);
    return () => {
      currentTimeListenersRef.current.delete(listener);
    };
  }, []);

  const getCurrentTime = useCallback(() => currentTimeRef.current, []);

  // Memoize meta to avoid re-creating on every render
  const meta = useMemo<TimelinePlayerMeta>(
    () => ({
      canvasRef,
      canvasKey,
      outputSize,
      compositor: compositorRef.current,
      getCurrentTime,
      subscribeCurrentTime,
    }),
    [canvasKey, outputSize, getCurrentTime, subscribeCurrentTime],
  );

  // Memoize the full context value
  const contextValue = useMemo<TimelinePlayerContextValue>(
    () => ({
      state,
      tracks,
      loadedSources,
      actions,
      meta,
    }),
    [state, tracks, loadedSources, actions, meta],
  );

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
  filterOverrides?: Map<string, ClipFilters>;
}): { time: number; layers: CompositorLayer[]; audio?: AudioLayer[] } {
  const { time, tracks, loadedSources, transformOverrides, filterOverrides } =
    params;

  const layers: CompositorLayer[] = [];
  const audio: AudioLayer[] = [];

  // Compute global zoom from zoom-effect tracks (once, applies to all visual layers)
  const zoomTracks = tracks.filter((t) => t.type === "zoom");
  const globalZoom = interpolateZoomEffects(zoomTracks, time);

  for (let trackIndex = 0; trackIndex < tracks.length; trackIndex++) {
    const track = tracks[trackIndex];
    if (track.hidden) continue;
    // Skip zoom tracks — they don't have clips
    if (track.type === "zoom") continue;

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

        // Apply clip filters to get CSS filter string and opacity
        const clipFilters =
          filterOverrides?.get(clip.id) ?? clip.filters ?? DEFAULT_CLIP_FILTERS;
        const { filter, opacity } = clipFiltersToCSS(clipFilters);

        // Apply zoom keyframe interpolation (per-clip)
        let finalScaleX = clipTransform.scaleX;
        let finalScaleY = clipTransform.scaleY;
        let finalX = clipTransform.x;
        let finalY = clipTransform.y;
        let extraFilter = "";

        const zoomKfs = clip.zoomKeyframes;
        if (zoomKfs && zoomKfs.length > 0) {
          const zoom = interpolateZoomKeyframes(zoomKfs, clipLocalTime);

          // Zoom multiplies the existing clip scale
          finalScaleX *= zoom.scale;
          finalScaleY *= zoom.scale;

          // The focal point (zoom.x, zoom.y) in [0,1] space determines the
          // pan offset. At scale=1, focal point doesn't matter. At scale>1,
          // we shift so the focal point stays centered in the output.
          //
          // The compositor centers the source in the output, so the default
          // focal point is (0.5, 0.5). We compute how much the focal point
          // deviates from center and scale that into pixel offsets.
          const outputW = params.width;
          const outputH = params.height;

          // At current zoom, the virtual frame is zoom.scale times larger.
          // The amount we can pan is (zoom.scale - 1) * outputSize.
          // focalOffset ranges from -0.5 to +0.5 (deviation from center).
          const focalOffsetX = -(zoom.x - 0.5) * (zoom.scale - 1) * outputW;
          const focalOffsetY = -(zoom.y - 0.5) * (zoom.scale - 1) * outputH;

          finalX += focalOffsetX;
          finalY += focalOffsetY;
        }

        // Apply global zoom effects from zoom tracks
        if (globalZoom.scale > 1) {
          finalScaleX *= globalZoom.scale;
          finalScaleY *= globalZoom.scale;

          const outputW = params.width;
          const outputH = params.height;
          const focalOffsetX =
            -(globalZoom.x - 0.5) * (globalZoom.scale - 1) * outputW;
          const focalOffsetY =
            -(globalZoom.y - 0.5) * (globalZoom.scale - 1) * outputH;

          finalX += focalOffsetX;
          finalY += focalOffsetY;

          // Motion blur during zoom transitions
          if (globalZoom.motionBlurAmount > 0) {
            const blurPx = globalZoom.motionBlurAmount * 8; // max 8px blur
            extraFilter = `blur(${blurPx.toFixed(1)}px)`;
          }
        }

        // Combine CSS filters
        const combinedFilter = [filter, extraFilter].filter(Boolean).join(" ");

        layers.push({
          source: loadedSource.source,
          sourceTime: effectiveSourceTime,
          transform: {
            opacity,
            x: finalX,
            y: finalY,
            scaleX: finalScaleX,
            scaleY: finalScaleY,
            rotation: (Math.round(clipTransform.rotation / 90) * 90) as
              | 0
              | 90
              | 180
              | 270,
            filter: combinedFilter || undefined,
          },
          fitMode: clip.fitMode ?? "none",
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
