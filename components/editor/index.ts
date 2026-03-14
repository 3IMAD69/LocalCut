// Editor Components - Compositor-based Video Editor
// Using @mediafox/core Compositor API for timeline playback

// Header components
export { EditorHeader } from "./header/editor-header";

// Panel components
export {
  type MediaAsset,
  MediaLibrary,
  type MediaLibraryTab,
} from "./panels/media-library";

// Preview components - Compositor-based player
export { TimelinePlayer } from "./preview/timeline-player";
export {
  type ClipFilters,
  type ClipProperties,
  type ClipTransform,
  DEFAULT_CLIP_FILTERS,
  DEFAULT_ZOOM_EFFECT,
  DEFAULT_ZOOM_KEYFRAME,
  type FitMode,
  type LoadedSource,
  type TimelineClipWithAsset,
  TimelinePlayerProvider,
  type TimelineTrackData,
  useTimelinePlayer,
  useTimelinePlayerTime,
  type ZoomEasing,
  type ZoomEffect,
  type ZoomKeyframe,
} from "./preview/timeline-player-context";
export { VideoTransformOverlay } from "./preview/video-transform-overlay";

// Timeline components
export { Timeline } from "./timeline/timeline";
