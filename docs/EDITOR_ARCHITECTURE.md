# Video Editor Architecture

This document provides a high-level overview of the video editor architecture in LocalCut to assist LLMs in navigating and understanding the codebase.

## Directory Structure & Component Map

```
app/
└── editor/
    └── page.tsx                # MAIN ENTRY POINT. Holds core state (tracks, selection, history). Orchestrates layout.

components/
├── editor/                     # Core Editor UI Components
│   ├── index.ts                # Re-exports all editor components and types
│   ├── header/
│   │   └── editor-header.tsx   # Top navigation bar (Project name, Save, Export buttons)
│   ├── panels/
│   │   ├── media-library.tsx   # Left sidebar. Handles file imports and lists imported assets.
│   │   └── properties-panel.tsx# Right sidebar. Shows/edits properties of selected clips (Transform, Speed, etc).
│   ├── preview/
│   │   ├── timeline-player-context.tsx # Context provider for playback state (playing, time, seek).
│   │   ├── timeline-player.tsx # Container for the video preview area.
│   │   └── video-preview.tsx   # Actual rendering component (Canvas/Video). Handles visual output.
│   ├── timeline/
│   │   ├── timeline.tsx        # Main timeline container. Handles scrolling, zooming, and track management.
│   │   ├── timeline-track.tsx  # Renders a single track (Video/Audio) and its clips. Handles drag & drop.
│   │   ├── timeline-ruler.tsx  # Time scale ruler at the top of the timeline.
│   │   └── playhead.tsx        # Vertical line indicating current playback position.
│   └── toolbar/
│       └── toolbar.tsx         # Action bar above timeline (Split, Delete, Zoom controls).
├── editing/                    # Editor Interaction Logic
│   ├── crop-overlay.tsx        # Visual overlay for cropping video directly in preview.
│   ├── editing-panel.tsx       # (Legacy/Auxiliary) Additional editing controls.
│   ├── index.ts                # Re-exports editing components
│   └── use-editing.tsx         # Hook encapsulating complex editing logic.
└── player/                     # Shared Player Components (used by Editor & Preview)
    ├── media-player.tsx        # Base player component.
    ├── editable-media-player.tsx # Player with editing capabilities
    ├── seek-bar.tsx            # Scrubber for seeking
    ├── volume-control.tsx      # Volume slider
    ├── time-display.tsx        # Current time / duration display
    └── plugins/                # Player plugins (filters, rotation, etc.)

lib/
├── media-import.tsx            # Utilities and Context for importing media files.
├── mediabunny.ts               # Core media processing/FFmpeg wrappers.
└── mediabunny-video.ts         # Video-specific media processing.
```

## Key State Flows

### 1. Source of Truth
- **`app/editor/page.tsx`** is the primary source of truth for the **Timeline State** (`tracks`, `clips`).
- It passes this state down to `Timeline` for rendering and `TimelinePlayer` for playback synchronization.

### 2. Playback State
- Managed by `TimelinePlayerProvider` in `components/editor/preview/timeline-player-context.tsx`.
- Exposes `currentTime`, `isPlaying`, `seek()`, `play()`, `pause()`.
- The Timeline interacts with this context to sync the playhead position.

### 3. Media Assets
- Managed by `MediaImportProvider` in `lib/media-import.tsx`.
- Handles file selection, loading metadata, and maintaining the list of available raw assets in the `MediaLibrary`.

### 4. Track Management
- Tracks are stored in `app/editor/page.tsx` as `TimelineTrackData[]`.
- `handleAddTrack(type)` creates new video/audio tracks dynamically.
- `handleRemoveTrack(trackId)` removes a track from the timeline.
- Each track has: `id`, `type` ("video" | "audio"), `label`, and `clips[]`.

### 5. Drag & Drop System
- **Within-track dragging**: Uses mouse events for smooth horizontal repositioning.
- **Cross-track dragging**: Uses HTML5 Drag API for moving clips between tracks.
- **Type validation**: Video clips can only be dropped on video tracks, audio on audio tracks.
- **Visual feedback**:
  - Green highlight + preview ghost for valid drop targets
  - Red tint + reduced opacity for invalid drop targets
- Key callbacks: `onClipDragStart`, `onClipDragEnd`, `onClipDrop`, `onClipMove`

## Common Tasks & File Locations

| Task | File(s) |
|------|---------|
| **Add/Remove tracks** | `app/editor/page.tsx` (`handleAddTrack`, `handleRemoveTrack`) |
| **Timeline UI (Add Track button)** | `components/editor/timeline/timeline.tsx` |
| **Modify Timeline Logic (Drag/Drop/Move)** | `app/editor/page.tsx` (`handleClipMove`) + `timeline-track.tsx` |
| **Update Rendering/Playback** | `components/editor/preview/video-preview.tsx`, `timeline-player.tsx` |
| **Change Clip Properties Interface** | `components/editor/panels/properties-panel.tsx` |
| **Add Toolbar Action** | `components/editor/toolbar/toolbar.tsx` (UI), `app/editor/page.tsx` (logic) |
| **Handle Media Import** | `lib/media-import.tsx`, `components/editor/panels/media-library.tsx` |

## Type Definitions

Key types are exported from `components/editor/index.ts`:

```typescript
// Track containing clips
interface TimelineTrackData {
  id: string;
  type: "video" | "audio";
  label: string;
  clips: TimelineClipWithAsset[];
}

// Clip on the timeline
interface TimelineClip {
  id: string;
  name: string;
  type: "video" | "audio";
  startTime: number;
  duration: number;
  color: string;
  thumbnail?: string;
}

// Drag operation data
interface DragData {
  clipId: string;
  clip: TimelineClip;
  sourceTrackId: string;
  offsetX: number;
}

// Clip properties (for PropertiesPanel)
interface ClipProperties {
  id: string;
  name: string;
  type: "video" | "audio";
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
```

## Terminology
- **Track**: A horizontal layer in the timeline containing multiple clips.
- **Clip**: An instance of a media asset placed on a track with a specific start time and duration.
- **Asset**: The source media file imported into the project.
