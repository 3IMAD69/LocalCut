"use client";

import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useMemo,
  useState,
} from "react";
import type { CropRect } from "./crop-overlay";
import { defaultEditingState, type EditingState } from "./editing-panel";

// ============================================================================
// Context Interface (state/actions/meta pattern for dependency injection)
// ============================================================================

/** Actions for editing context */
interface EditingActions {
  setState: (state: EditingState) => void;
  setCropRect: (rect: CropRect | null) => void;
  toggleCrop: (enabled?: boolean) => void;
  resetState: () => void;
}

/** Meta helpers for editing context */
interface EditingMeta {
  getMediabunnyCropOptions: () =>
    | { left: number; top: number; width: number; height: number }
    | undefined;
  getVideoConversionOptions: (videoDimensions?: {
    width: number;
    height: number;
  }) => Record<string, unknown>;
}

/** Context value following state/actions/meta pattern */
interface EditingContextValue {
  state: EditingState;
  actions: EditingActions;
  meta: EditingMeta;
}

const EditingContext = createContext<EditingContextValue | null>(null);

interface EditingProviderProps {
  children: ReactNode;
  /** Initial editing state */
  initialState?: EditingState;
}

export function EditingProvider({
  children,
  initialState,
}: EditingProviderProps) {
  const [state, setState] = useState<EditingState>(
    initialState ?? defaultEditingState,
  );

  const setCropRect = useCallback((rect: CropRect | null) => {
    setState((prev) => ({
      ...prev,
      crop: { ...prev.crop, rect },
    }));
  }, []);

  const toggleCrop = useCallback((enabled?: boolean) => {
    setState((prev) => ({
      ...prev,
      crop: {
        ...prev.crop,
        enabled: enabled ?? !prev.crop.enabled,
        // Reset rect when disabling
        rect: enabled === false ? null : prev.crop.rect,
      },
    }));
  }, []);

  const resetState = useCallback(() => {
    setState(defaultEditingState);
  }, []);

  /**
   * Converts the crop rect (normalized 0-1 values) to MediaBunny crop format
   * MediaBunny expects: { left: number; top: number; width: number; height: number }
   * where values are in pixels based on the video dimensions
   */
  const getMediabunnyCropOptions = useCallback(() => {
    if (!state.crop.enabled || !state.crop.rect) {
      return undefined;
    }

    // MediaBunny crop uses normalized values (0-1) that get applied to video dimensions
    // The Conversion API handles the pixel calculation internally
    return {
      left: state.crop.rect.left,
      top: state.crop.rect.top,
      width: state.crop.rect.width,
      height: state.crop.rect.height,
    };
  }, [state.crop]);

  /**
   * Get video conversion options for MediaBunny
   * Combines all enabled editing features into video options
   */
  const getVideoConversionOptions = useCallback(
    (videoDimensions?: { width: number; height: number }) => {
      const options: Record<string, unknown> = {};

      // Add crop if enabled
      if (state.crop.enabled && state.crop.rect && videoDimensions) {
        // MediaBunny crop expects pixel values
        options.crop = {
          left: Math.round(state.crop.rect.left * videoDimensions.width),
          top: Math.round(state.crop.rect.top * videoDimensions.height),
          width: Math.round(state.crop.rect.width * videoDimensions.width),
          height: Math.round(state.crop.rect.height * videoDimensions.height),
        };
      }

      // Add rotation if enabled
      if (state.rotate.enabled && state.rotate.degrees !== 0) {
        options.rotate = state.rotate.degrees;
      }

      return options;
    },
    [state.crop, state.rotate],
  );

  // Build context value following state/actions/meta pattern
  const value = useMemo<EditingContextValue>(
    () => ({
      state,
      actions: {
        setState,
        setCropRect,
        toggleCrop,
        resetState,
      },
      meta: {
        getMediabunnyCropOptions,
        getVideoConversionOptions,
      },
    }),
    [
      state,
      setCropRect,
      toggleCrop,
      resetState,
      getMediabunnyCropOptions,
      getVideoConversionOptions,
    ],
  );

  return <EditingContext value={value}>{children}</EditingContext>;
}

// ============================================================================
// Hooks - React 19 use() API
// ============================================================================

/** Hook to access the full editing context */
export function useEditing(): EditingContextValue {
  const context = use(EditingContext);
  if (!context) {
    throw new Error("useEditing must be used within an EditingProvider");
  }
  return context;
}

/** Hook to get just the crop state and controls */
export function useCrop() {
  const {
    state,
    actions: { setCropRect, toggleCrop },
  } = useEditing();

  return {
    enabled: state.crop.enabled,
    rect: state.crop.rect,
    setCropRect,
    toggleCrop,
  };
}
