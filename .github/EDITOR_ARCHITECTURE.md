# Video Editor Architecture

This document provides a high-level overview of the video editor architecture in LocalCut to assist LLMs in navigating and understanding the codebase.

## Directory Structure & Component Map

```
app/
└── editor/
    └── page.tsx                # MAIN ENTRY POINT. Holds core state (tracks, selection, history). Orchestrates layout.

components/
├── editor/                     # Core Editor UI Components
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
│   │   ├── timeline.tsx        # Main timeline container. Handles scrolling and zooming.
│   │   ├── timeline-track.tsx  # Renders a single track (Video/Audio) and its clips.
│   │   ├── timeline-ruler.tsx  # Time scale ruler at the top of the timeline.
│   │   └── playhead.tsx        # vertical line indicating current playback position.
│   └── toolbar/
│       └── toolbar.tsx         # Action bar above timeline (Split, Delete, Zoom controls).
├── editing/                    # Editor Interaction Logic
│   ├── crop-overlay.tsx        # Visual overlay for cropping video directly in preview.
│   ├── editing-panel.tsx       # (Legacy/Auxiliary) Additional editing controls.
│   └── use-editing.tsx         # Hook encapsulating complex editing logic.
└── player/                     # Shared Player Components (used by Editor & Preview)
    ├── media-player.tsx        # Base player component.
    └── ... (various player controls like scrubbers, volume)

lib/
├── media-import.tsx            # Utilities and Context for importing media files.
└── mediabunny.ts               # (and mediabunny-video.ts) Core media processing/FFmpeg wrappers.
```

## Key State Flows

### 1. Source of Truth
- **`app/editor/page.tsx`** is the primary source of truth for the **Timeline State** (`tracks`, `clips`).
- It passes this state down to `Timeline` for rendering and `TimelinePlayer` for playback synchronization.

### 2. Playback State
- Managed by `TimelinePlayerProvider` in `components/editor/preview/timeline-player-context.tsx`.
- exposes `currentTime`, `isPlaying`, `seek()`, `play()`, `pause()`.
- The Timeline interacts with this context to sync the playhead position.

### 3. Media Assets
- Managed by `MediaImportProvider` in `lib/media-import.tsx`.
- Handles file selection, loading metadata, and maintaining the list of available raw assets in the `MediaLibrary`.

## Common Tasks & File Locations

- **Modify Timeline Logic (Drag/Drop/Move):**
  - Check `app/editor/page.tsx` (handlers like `handleClipMove`) and `components/editor/timeline/timeline.tsx`.
- **Update Rendering/Playback:**
  - `components/editor/preview/video-preview.tsx` or `timeline-player.tsx`.
- **Change Clip Properties Interface:**
  - `components/editor/panels/properties-panel.tsx`.
- **Add Toolbar Action:**
  - `components/editor/toolbar/toolbar.tsx` (UI) and `app/editor/page.tsx` (Implementation).

## Terminology
- **Track**: A horizontal layer in the timeline containing multiple clips.
- **Clip**: An instance of a media asset placed on a track with a specific start time and duration.
- **Asset**: The source media file imported into the project.
