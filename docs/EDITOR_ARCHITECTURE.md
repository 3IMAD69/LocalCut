# Editor Architecture

## Overview
The LocalCut editor is built on **Next.js** (React 19) and leverages **@mediafox/core** for browser-based video composition and rendering. The timeline interaction is handled by **@xzdarcy/react-timeline-editor**, customized to fit the application's design key.

## Core Concepts

### 1. State Management (The Brain)
The editor's state is split between high-level React state and low-level Compositor state.

- **`TimelinePlayerProvider`** (`components/editor/preview/timeline-player-context.tsx`):
  - This is the **single source of truth** for playback state (`currentTime`, `playing`, `volume`), loaded assets (`loadedSources`), and the render loop.
  - It wraps the `@mediafox/core` **Compositor** instance.
  - It exposes actions like `play`, `pause`, `seek`, `loadSource`, and `setTracks`.

- **Page Level State** (`app/projects/[id]/page.tsx`):
  - Holds the persistent state of the **Project**, such as the list of `tracks` and `clips`.
  - Passes these tracks to both the `Timeline` (for UI) and the `TimelinePlayerProvider` (for rendering).

### 2. Directory Structure

```
components/editor/
├── preview/
│   ├── timeline-player-context.tsx  # CORE: Context provider, Compositor logic, and Hooks.
│   ├── timeline-player.tsx          # Wrapper for the canvas/preview area.
│   └── video-preview.tsx            # Visual presentation of the video player.
│
├── timeline/
│   ├── timeline.tsx                 # Main Timeline UI using @xzdarcy/react-timeline-editor.
│   ├── timeline-track.tsx           # Custom rendering for timeline tracks.
│   ├── audio-waveform.tsx           # Canvas-based waveform visualizer for audio clips.
│   └── playhead.tsx                 # Playhead visualizations.
│
├── panels/
│   ├── media-library.tsx            # Left panel for importing/selecting media.
│   └── properties-panel.tsx         # Right panel (if applicable) for clip settings.
│
└── editor-header.tsx                # Top bar controls.
```

### 3. Rendering Pipeline
The application uses a "Compositor" pattern:
1.  **Loading**: Media assets are loaded into the Compositor as `CompositorSource` objects.
2.  **Composition**: The `buildCompositorComposition` function maps React `tracks/clips` state into `CompositorLayer` objects.
3.  **Rendering**: The Compositor renders these layers onto a `<canvas>` element 60 times per second during playback.

## Vital Hooks

The **`TimelinePlayerProvider`** exports two essential hooks for interacting with the editor engine.

### `useTimelinePlayer()`
**Use this for:** Controls, Logic, and Non-High-Frequency Updates.

Returns the full context object including:
*   `compositor`: The raw Compositor instance.
*   `state`: Current playback state (`playing`, `duration`, `volume`, `loading`).
*   `play()`, `pause()`, `seek(time)`: Transport controls.
*   `loadSource(asset)`: Method to load media into the engine.
*   `tracks` / `setTracks`: Access to rendering data.

```tsx
const { play, pause, state } = useTimelinePlayer();
```

### `useTimelinePlayerTime()`
**Use this for:** High-Frequency Time Updates (e.g., Progress Bars, Time Displays).

*   **Optimized**: This hook uses `useSyncExternalStore` to subscribe typically to the compositor's time loop without re-rendering the entire component tree.
*   **Performance**: Renders *only* when the time changes. prevents "laggy" UI during playback.

```tsx
const currentTime = useTimelinePlayerTime();
return <div>{formatTime(currentTime)}</div>;
```

## Timeline & Player Synchronization

1.  **Time Update Loop**:
    *   The `Compositor` emits `timeupdate` events.
    *   `TimelinePlayerProvider` catches these and notifies listeners via `useTimelinePlayerTime`.
    *   Most components (like the Timeline cursor) subscribe to this to move smoothly.

2.  **Seeking**:
    *   User drags the playhead in `Timeline`.
    *   `Timeline` calls `onTimeChange`.
    *   Parent calls `seek(time)` from `useTimelinePlayer`.
    *   Compositor updates the canvas immediately.

3.  **Track Updates**:
    *   User moves a clip in `Timeline`.
    *   `Timeline` calls `onTracksChange`.
    *   Parent updates the `tracks` state.
    *   New `tracks` are passed to `TimelinePlayerProvider`.
    *   `TimelinePlayerProvider` calls `compositor.preview()` with the new composition structure, updating the visual output instantly.
