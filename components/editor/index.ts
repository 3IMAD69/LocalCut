// Editor Components - Compositor-based Video Editor
// Using @mediafox/core Compositor API for timeline playback

// Header components
export { EditorHeader } from "./header/editor-header";

// Panel components
export { type MediaAsset, MediaLibrary } from "./panels/media-library";
export {
  type ClipProperties,
  PropertiesPanel,
} from "./panels/properties-panel";

// Preview components - Compositor-based player
export { TimelinePlayer } from "./preview/timeline-player";
export {
  type ActiveClip,
  type ClipTransform,
  type LoadedSource,
  type TimelineClipWithAsset,
  type TimelinePlaybackState,
  TimelinePlayerProvider,
  type TimelineTrackData,
  useTimelinePlayer,
} from "./preview/timeline-player-context";
export { VideoTransformOverlay } from "./preview/video-transform-overlay";

// Timeline components
export { Playhead } from "./timeline/playhead";
export { Timeline } from "./timeline/timeline";
export { TimelineRuler } from "./timeline/timeline-ruler";
export {
  type ClipType,
  type DragData,
  type TimelineClip,
  TimelineTrack,
} from "./timeline/timeline-track";

// Toolbar components
export { Toolbar } from "./toolbar/toolbar";
