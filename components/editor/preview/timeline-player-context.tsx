"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { TimelineClip } from "../timeline/timeline-track";
import type { ImportedMediaAsset } from "@/lib/media-import";

// Timeline track definition with clips and their associated assets
export interface TimelineTrackData {
  id: string;
  type: "video" | "audio";
  label: string;
  clips: TimelineClipWithAsset[];
}

// Extended clip that includes the source asset reference
export interface TimelineClipWithAsset extends TimelineClip {
  asset?: ImportedMediaAsset;
  trimStart?: number; // In-point within the source media
  trimEnd?: number; // Out-point within the source media
}

// Playback state shared across the editor
export interface TimelinePlaybackState {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
}

// Active clips at current playhead position
export interface ActiveClip {
  clip: TimelineClipWithAsset;
  trackId: string;
  trackType: "video" | "audio";
  clipTime: number;
  mediaTime: number;
}

// Default frame rate for frame-stepping
const DEFAULT_FRAME_RATE = 30;

interface TimelinePlayerContextType {
  // State
  state: TimelinePlaybackState;
  // Current tracks data
  tracks: TimelineTrackData[];
  // Currently active clips at playhead
  activeClips: ActiveClip[];
  // Active video clip (convenience)
  activeVideoClip: ActiveClip | null;
  // Active audio clips (convenience)
  activeAudioClips: ActiveClip[];

  // Playback controls
  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
  seek: (time: number) => void;
  skipForward: (frames?: number) => void;
  skipBackward: (frames?: number) => void;

  // Volume controls
  setVolume: (volume: number) => void;
  toggleMute: () => void;

  // Timeline data management
  setTracks: (tracks: TimelineTrackData[]) => void;

  // Canvas ref for rendering
  canvasRef: React.RefObject<HTMLCanvasElement | null>;

  // Internal: sync time from media player (used by TimelinePlayer)
  syncTimeFromMedia: (time: number) => void;

  // Internal: set loading state
  setLoading: (loading: boolean) => void;

  // Internal: set error state
  setError: (error: string | null) => void;
}

const TimelinePlayerContext = createContext<TimelinePlayerContextType | null>(
  null
);

interface TimelinePlayerProviderProps {
  children: ReactNode;
  initialTracks?: TimelineTrackData[];
}

export function TimelinePlayerProvider({
  children,
  initialTracks = [],
}: TimelinePlayerProviderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [tracks, setTracksState] = useState<TimelineTrackData[]>(initialTracks);
  const [state, setState] = useState<TimelinePlaybackState>({
    currentTime: 0,
    duration: 0,
    isPlaying: false,
    volume: 1,
    isMuted: false,
    isReady: true,
    isLoading: false,
    error: null,
  });

  // Calculate total duration from tracks
  const calculatedDuration = useMemo(() => {
    return Math.max(
      ...tracks.flatMap((track) =>
        track.clips.length > 0
          ? track.clips.map((clip) => clip.startTime + clip.duration)
          : [0]
      ),
      0.1 // Minimum duration
    );
  }, [tracks]);

  // Keep a ref to the current duration for callbacks
  const durationRef = useRef(calculatedDuration);
  useEffect(() => {
    durationRef.current = calculatedDuration;
  }, [calculatedDuration]);

  // Merge calculated duration with state
  const stateWithDuration: TimelinePlaybackState = useMemo(
    () => ({
      ...state,
      duration: calculatedDuration,
    }),
    [state, calculatedDuration]
  );

  // Get active clips at a specific time
  const getActiveClipsAt = useCallback(
    (time: number): ActiveClip[] => {
      const active: ActiveClip[] = [];

      for (const track of tracks) {
        for (const clip of track.clips) {
          const clipEnd = clip.startTime + clip.duration;

          if (time >= clip.startTime && time < clipEnd) {
            const clipTime = time - clip.startTime;
            const trimStart = clip.trimStart ?? 0;
            const mediaTime = trimStart + clipTime;

            active.push({
              clip,
              trackId: track.id,
              trackType: track.type,
              clipTime,
              mediaTime,
            });
          }
        }
      }

      return active;
    },
    [tracks]
  );

  // Active clips at current playhead
  const activeClips = useMemo(
    () => getActiveClipsAt(state.currentTime),
    [getActiveClipsAt, state.currentTime]
  );

  // Convenience: first active video clip
  const activeVideoClip = useMemo(
    () => activeClips.find((c) => c.trackType === "video") ?? null,
    [activeClips]
  );

  // Convenience: all active audio clips
  const activeAudioClips = useMemo(
    () => activeClips.filter((c) => c.trackType === "audio"),
    [activeClips]
  );

  // Playback controls
  const play = useCallback(() => {
    const currentDuration = durationRef.current;
    setState((prev) => {
      // If at end, restart from beginning
      if (prev.currentTime >= currentDuration - 0.01) {
        return { ...prev, currentTime: 0, isPlaying: true };
      }
      return { ...prev, isPlaying: true };
    });
  }, []);

  const pause = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: false }));
  }, []);

  const togglePlayPause = useCallback(() => {
    const currentDuration = durationRef.current;
    setState((prev) => {
      if (prev.isPlaying) {
        return { ...prev, isPlaying: false };
      }
      // If at end, restart from beginning
      if (prev.currentTime >= currentDuration - 0.01) {
        return { ...prev, currentTime: 0, isPlaying: true };
      }
      return { ...prev, isPlaying: true };
    });
  }, []);

  const seek = useCallback((time: number) => {
    const currentDuration = durationRef.current;
    const clampedTime = Math.max(0, Math.min(time, currentDuration));
    setState((prev) => ({
      ...prev,
      currentTime: clampedTime,
    }));
  }, []);

  const skipForward = useCallback((frames = 1) => {
    const frameTime = frames / DEFAULT_FRAME_RATE;
    const currentDuration = durationRef.current;
    setState((prev) => ({
      ...prev,
      currentTime: Math.min(prev.currentTime + frameTime, currentDuration),
    }));
  }, []);

  const skipBackward = useCallback((frames = 1) => {
    const frameTime = frames / DEFAULT_FRAME_RATE;
    setState((prev) => ({
      ...prev,
      currentTime: Math.max(prev.currentTime - frameTime, 0),
    }));
  }, []);

  // Volume controls
  const setVolume = useCallback((volume: number) => {
    setState((prev) => ({
      ...prev,
      volume: Math.max(0, Math.min(1, volume)),
      isMuted: volume === 0,
    }));
  }, []);

  const toggleMute = useCallback(() => {
    setState((prev) => ({ ...prev, isMuted: !prev.isMuted }));
  }, []);

  // Track management
  const setTracks = useCallback((newTracks: TimelineTrackData[]) => {
    setTracksState(newTracks);
  }, []);

  // Sync time from media player - called during playback
  const syncTimeFromMedia = useCallback((time: number) => {
    const currentDuration = durationRef.current;
    setState((prev) => {
      if (!prev.isPlaying) return prev;

      const clampedTime = Math.max(0, Math.min(time, currentDuration));

      // Stop at end
      if (clampedTime >= currentDuration - 0.01) {
        return {
          ...prev,
          currentTime: currentDuration,
          isPlaying: false,
        };
      }

      return {
        ...prev,
        currentTime: clampedTime,
      };
    });
  }, []);

  // Loading state
  const setLoading = useCallback((loading: boolean) => {
    setState((prev) => ({ ...prev, isLoading: loading }));
  }, []);

  // Error state
  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  const contextValue: TimelinePlayerContextType = {
    state: stateWithDuration,
    tracks,
    activeClips,
    activeVideoClip,
    activeAudioClips,
    play,
    pause,
    togglePlayPause,
    seek,
    skipForward,
    skipBackward,
    setVolume,
    toggleMute,
    setTracks,
    canvasRef,
    syncTimeFromMedia,
    setLoading,
    setError,
  };

  return (
    <TimelinePlayerContext.Provider value={contextValue}>
      {children}
    </TimelinePlayerContext.Provider>
  );
}

export function useTimelinePlayer() {
  const context = useContext(TimelinePlayerContext);
  if (!context) {
    throw new Error(
      "useTimelinePlayer must be used within a TimelinePlayerProvider"
    );
  }
  return context;
}
