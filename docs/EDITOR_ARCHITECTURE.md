# Editor Architecture

## Overview
The LocalCut editor is a professional-grade, browser-based video editing environment built on **Next.js 16** (React 19). It orchestrates a high-performance rendering engine with a reactive React UI to provide a seamless editing experience.

The system is designed around a **unidirectional data flow** where the React state acts as the source of truth, fueling a dedicated "Compositor" engine that handles the heavy lifting of video processing and canvas rendering.

---

## Technology Stack & Libraries

The editor relies on a curated set of libraries to handle complex video operations and UI interactions.

### Core Framework
*   **Next.js 16**: The backbone of the application, providing the React framework, routing, and SSR capabilities.
*   **React 19**: Leverages modern features like `use()` and `useSyncExternalStore` for optimized state management.

### Video & Audio Engine
*   **@mediafox/core**: The low-level video processing engine. It handles loading assets, compositing layers, and rendering frames to a canvas.
*   **@mediafox/react**: React bindings for the MediaFox engine.
*   **@wavesurfer/react**: Visualizes audio waveforms on the timeline for precise audio editing.
*   **@mediabunny/mp3-encoder**: Client-side audio encoding for exports.

### Timeline & Interaction
*   **@xzdarcy/react-timeline-editor**: Provides the complex timeline UI grid, enabling drag-and-drop, resizing, and virtualized rendering of tracks and clips.
*   **@dnd-kit** (Core/Modifiers): Used implicitly for complex drag interactions (check `useCrossTrackDrag`).

### UI & Styling
*   **Tailwind CSS v4**: Utility-first styling engine.
*   **Radix UI / Shadcn**: Accessible, unstyled primitive components used for dropdowns, context menus, sliders, and dialogs.
*   **Lucide React**: The comprehensive icon set used throughout the interface.
*   **Motion**: Handles smooth UI transitions and micro-interactions.

### State & Utilities
*   **Zod**: Schema validation for project data and safe typing.
*   **React Hook Form**: Manages form state for property panels and settings.
*   **Nanoid**: Generates unique, URL-safe IDs for tracks and clips.

---

## Architecture Design

### 1. State Management (The Brain)
The editor's state is bifurcated between the high-level React application state and the low-level Compositor engine state.

#### **TimelinePlayerProvider** (`components/editor/preview/timeline-player-context.tsx`)
This component is the heart of the editor. It bridges the gap between React and the MediaFox Compositor.
*   **Single Source of Truth**: Manages `currentTime`, `playing` status, `volume`, and the registry of `loadedSources`.
*   **Compositor Owner**: Instantiates and controls the `@mediafox/core` Compositor instance.
*   **Performance Optimization**: Uses `useSyncExternalStore` to broadcast high-frequency time updates (60fps) to subscribers without triggering full React re-renders.

#### **Page Level State** (`app/projects/[id]/page.tsx`)
*   Holds the persistent **Project Data** (tracks, clips, metadata).
*    Passes state down:
    *   To **`Timeline`** for UI visualization.
    *   To **`TimelinePlayerProvider`** for rendering.

### 2. Directory Structure

```text
components/editor/
├── preview/
│   ├── timeline-player-context.tsx   # CORE: Context, Compositor lifecycle, and Hook exports.
│   ├── timeline-player.tsx           # Wrapper for the canvas/preview area.
│   └── video-preview.tsx             # Visual presentation layer.
│
├── timeline/
│   ├── timeline.tsx                  # Main entry point for the Timeline UI.
│   ├── timeline-track.tsx            # Custom track rendering logic.
│   ├── audio-waveform.tsx            # Waveform visualizer using @wavesurfer.
│   ├── ghost-track-overlay.tsx       # Visual feedback during drag operations.
│   └── hooks/
│       └── use-cross-track-drag.ts   # Complex logic for dragging clips between tracks.
│
├── panels/
│   ├── media-library.tsx             # Asset browser and importer.
│   └── properties-panel.tsx          # Inspector for selected clips.
│
└── editor-header.tsx                 # Global controls (Export, Settings).
```

### 3. Rendering Pipeline
The application implements a "Compositor Pattern" to decouple logic from rendering:

1.  **Loading**: Media assets are imported and loaded asynchronously into the Compositor as `CompositorSource` objects.
2.  **Composition Construction**: The `buildCompositorComposition` function acts as a translator. It takes the React `tracks` array and maps it into a flattened list of `CompositorLayer` objects that the engine understands.
3.  **Visual Output**: The Compositor executes the render loop, drawing these layers onto a `<canvas>` element.
    *   *Note*: The Compositor runs on a dedicated Web Worker (where supported) to prevent UI blocking.

---

## Vital Hooks

The `TimelinePlayerProvider` exposes two specialized hooks to ensure performance.

### `useTimelinePlayer()`
**Purpose**: General controls, logic, and state.
*   **Returns**: `play`, `pause`, `seek`, `state` (playing/paused), `actions`.
*   **Behavior**: Triggers re-renders only on coarse state changes (e.g., play/pause).

```tsx
const { play, pause, state } = useTimelinePlayer();
```

### `useTimelinePlayerTime()`
**Purpose**: High-frequency time synchronization.
*   **Returns**: The precise current time of the playhead (number).
*   **Behavior**: Bypasses standard React state to update components at 60fps without re-rendering the entire tree. Perfect for scrubbers, time codes, and progress bars.

```tsx
const currentTime = useTimelinePlayerTime();
return <span>{formatTime(currentTime)}</span>;
```

---

## Synchronization Flow

The system ensures the UI and the Canvas are always in sync:

1.  **Time Loop (Engine -> UI)**:
    *   Compositor emits `timeupdate`.
    *   `TimelinePlayerProvider` catches this and notifies `useTimelinePlayerTime` consumers.
    *   UI components (playhead, timecode) update instantly.

2.  **User Seeks (UI -> Engine)**:
    *   User drags the playhead in `Timeline`.
    *   `Timeline` calls `onTimeChange`.
    *   Provider calls `compositor.seek(time)`.
    *   Compositor updates the canvas immediately.

3.  **Editing (UI -> React State -> Engine)**:
    *   User moves a clip.
    *   `Timeline` propagates `onTracksChange` up to the page state.
    *   New `tracks` props are passed to `TimelinePlayerProvider`.
    *   Effect hook detects change -> calls `compositor.preview()` with new structure.
    *   Visual output updates instantly to reflect the new edit.
