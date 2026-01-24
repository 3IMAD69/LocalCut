"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TimelineTrackData } from "@/components/editor/preview/timeline-player-context";

export interface DragState {
  /** Whether a cross-track drag is currently in progress */
  isDragging: boolean;
  /** The ID of the action being dragged */
  draggedActionId: string | null;
  /** The ID of the source track (where the action originated) */
  sourceTrackId: string | null;
  /** The ID of the target track (where the ghost is shown) */
  targetTrackId: string | null;
  /** The horizontal position (time) where the clip would be dropped */
  dropTime: number | null;
  /** Whether the current drop position is valid */
  isValidDrop: boolean;
}

export interface UseCrossTrackDragOptions {
  tracks: TimelineTrackData[];
  rowHeight: number;
  timeAreaHeight: number;
  rowOffset: number;
  pixelsPerSecond: number;
  labelWidth: number;
  scrollTop: number;
  onTracksChange?: (tracks: TimelineTrackData[]) => void;
}

export interface UseCrossTrackDragResult {
  /** Current drag state for rendering ghost indicators */
  dragState: DragState;
  /** Capture the initial mouse offset relative to the action */
  handlePointerDown: (
    actionId: string,
    actionStartTime: number,
    e: React.MouseEvent<HTMLElement, MouseEvent>,
    timelineContainer: HTMLElement | null,
  ) => void;
  /** Handler to call when action drag starts */
  handleDragStart: (actionId: string, rowId: string) => void;
  /** Handler to call during drag to update target track */
  handleDragMove: (
    e: MouseEvent | React.MouseEvent,
    timelineContainer: HTMLElement | null,
  ) => void;
  /** Handler to call when drag ends - performs the track move if needed */
  handleDragEnd: () => void;
  /** Cancel the drag without making changes */
  cancelDrag: () => void;
}

const initialDragState: DragState = {
  isDragging: false,
  draggedActionId: null,
  sourceTrackId: null,
  targetTrackId: null,
  dropTime: null,
  isValidDrop: false,
};

/**
 * Hook to handle cross-track drag and drop of timeline actions.
 *
 * Since react-timeline-editor doesn't natively support moving actions
 * between tracks, this hook provides an overlay system that:
 * 1. Tracks vertical mouse movement during drags
 * 2. Calculates which track the cursor is over
 * 3. Shows ghost indicators on the target track
 * 4. Moves the action to the new track when the drag ends
 */
export function useCrossTrackDrag({
  tracks,
  rowHeight,
  timeAreaHeight,
  rowOffset,
  pixelsPerSecond,
  labelWidth,
  scrollTop,
  onTracksChange,
}: UseCrossTrackDragOptions): UseCrossTrackDragResult {
  const [dragState, setDragState] = useState<DragState>(initialDragState);

  // Refs for values that change during drag but shouldn't trigger re-renders
  const lastMouseYRef = useRef<number>(0);
  const dragStartTimeRef = useRef<number | null>(null);
  const dragOffsetTimeRef = useRef<number>(0);

  /**
   * Calculate which track the cursor is over based on Y position
   */
  const getTrackAtY = useCallback(
    (clientY: number, container: HTMLElement): string | null => {
      const rect = container.getBoundingClientRect();
      const relativeY =
        clientY - rect.top - timeAreaHeight - rowOffset + scrollTop;

      if (relativeY < 0) return tracks[0]?.id ?? null;

      const trackIndex = Math.floor(relativeY / rowHeight);

      if (trackIndex >= tracks.length) {
        return tracks[tracks.length - 1]?.id ?? null;
      }

      return tracks[trackIndex]?.id ?? null;
    },
    [tracks, rowHeight, timeAreaHeight, rowOffset, scrollTop],
  );

  /**
   * Calculate the time position based on X position
   */
  const getTimeAtX = useCallback(
    (clientX: number, container: HTMLElement): number => {
      const rect = container.getBoundingClientRect();
      const relativeX = clientX - rect.left - labelWidth;
      const time = relativeX / pixelsPerSecond;
      return Math.max(0, time);
    },
    [labelWidth, pixelsPerSecond],
  );

  const handlePointerDown = useCallback(
    (
      _actionId: string,
      actionStartTime: number,
      e: React.MouseEvent<HTMLElement, MouseEvent>,
      timelineContainer: HTMLElement | null,
    ) => {
      if (e.button !== 0 || !timelineContainer) return;

      const mouseTime = getTimeAtX(e.clientX, timelineContainer);
      const offsetTime = Math.max(0, mouseTime - actionStartTime);

      dragOffsetTimeRef.current = Number.isFinite(offsetTime) ? offsetTime : 0;
    },
    [getTimeAtX],
  );

  /**
   * Check if dropping at a position would cause overlap
   */
  const checkDropValidity = useCallback(
    (actionId: string, targetTrackId: string, dropTime: number): boolean => {
      const track = tracks.find((t) => t.id === targetTrackId);
      if (!track) return false;

      // Find the action being dragged to get its duration
      let actionDuration = 0;
      for (const t of tracks) {
        const action = t.clips.find((c) => c.id === actionId);
        if (action) {
          actionDuration = action.duration;
          break;
        }
      }

      const dropEnd = dropTime + actionDuration;

      // Check for overlaps with existing clips on target track
      for (const clip of track.clips) {
        // Skip the clip being dragged if it's on the same track
        if (clip.id === actionId) continue;

        const clipEnd = clip.startTime + clip.duration;

        // Check for overlap
        if (dropTime < clipEnd && dropEnd > clip.startTime) {
          return false;
        }
      }

      return true;
    },
    [tracks],
  );

  const handleDragStart = useCallback((actionId: string, rowId: string) => {
    setDragState({
      isDragging: true,
      draggedActionId: actionId,
      sourceTrackId: rowId,
      targetTrackId: rowId,
      dropTime: null,
      isValidDrop: true,
    });
    dragStartTimeRef.current = Date.now();
  }, []);

  const handleDragMove = useCallback(
    (
      e: MouseEvent | React.MouseEvent,
      timelineContainer: HTMLElement | null,
    ) => {
      if (!dragState.isDragging || !timelineContainer) return;

      lastMouseYRef.current = e.clientY;

      const targetTrackId = getTrackAtY(e.clientY, timelineContainer);
      const rawTime = getTimeAtX(e.clientX, timelineContainer);
      const dropTime = Math.max(0, rawTime - dragOffsetTimeRef.current);

      if (targetTrackId && dragState.draggedActionId) {
        const isValidDrop = checkDropValidity(
          dragState.draggedActionId,
          targetTrackId,
          dropTime,
        );

        setDragState((prev) => ({
          ...prev,
          targetTrackId,
          dropTime,
          isValidDrop,
        }));
      }
    },
    [
      dragState.isDragging,
      dragState.draggedActionId,
      getTrackAtY,
      getTimeAtX,
      checkDropValidity,
    ],
  );

  const handleDragEnd = useCallback(() => {
    if (!dragState.isDragging || !onTracksChange) {
      setDragState(initialDragState);
      return;
    }

    const {
      draggedActionId,
      sourceTrackId,
      targetTrackId,
      dropTime,
      isValidDrop,
    } = dragState;

    // Only move if we're targeting a different track and the drop is valid
    if (
      draggedActionId &&
      sourceTrackId &&
      targetTrackId &&
      sourceTrackId !== targetTrackId &&
      isValidDrop
    ) {
      // First, find the clip we need to move
      const sourceTrack = tracks.find((t) => t.id === sourceTrackId);
      const targetTrack = tracks.find((t) => t.id === targetTrackId);
      const clipToMove = sourceTrack?.clips.find(
        (c) => c.id === draggedActionId,
      );

      if (!clipToMove || !sourceTrack || !targetTrack) {
        setDragState(initialDragState);
        return;
      }

      // Validate clip type matches track type
      if (clipToMove.type !== targetTrack.type) {
        setDragState(initialDragState);
        return;
      }

      // Create the moved clip with new start time
      const movedClip = {
        ...clipToMove,
        startTime: dropTime ?? clipToMove.startTime,
      };

      // Build the new tracks array
      const newTracks = tracks.map((track) => {
        if (track.id === sourceTrackId) {
          // Remove from source track
          return {
            ...track,
            clips: track.clips.filter((c) => c.id !== draggedActionId),
          };
        }
        if (track.id === targetTrackId) {
          // Add to target track
          return {
            ...track,
            clips: [...track.clips, movedClip].sort(
              (a, b) => a.startTime - b.startTime,
            ),
          };
        }
        return track;
      });

      onTracksChange(newTracks);
    }

    setDragState(initialDragState);
    dragOffsetTimeRef.current = 0;
  }, [dragState, tracks, onTracksChange]);

  const cancelDrag = useCallback(() => {
    setDragState(initialDragState);
    dragOffsetTimeRef.current = 0;
  }, []);

  // Handle escape key to cancel drag
  useEffect(() => {
    if (!dragState.isDragging) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        cancelDrag();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dragState.isDragging, cancelDrag]);

  return {
    dragState,
    handlePointerDown,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    cancelDrag,
  };
}
