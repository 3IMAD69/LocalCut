# AGENTS.md - LocalCut Codebase Guidelines

## Overview

LocalCut is a browser-based video editor built with Next.js 16, React 19, and TypeScript.
Uses Bun for package management and Biome for linting/formatting.

## Tech Stack

| Category        | Technology                                    |
| --------------- | --------------------------------------------- |
| Framework       | Next.js 16.1.1 (App Router)                   |
| Language        | TypeScript 5.9.3 (strict mode)                |
| Runtime         | Bun                                           |
| UI              | React 19, Tailwind CSS 4, Radix UI primitives |
| Design System   | Neobrutalism (bold borders, hard shadows)     |
| Media           | MediaBunny (WebCodecs), MediaFox (playback)   |
| Linting         | Biome 2.3.11                                  |
| Git Hooks       | Lefthook                                      |

## Build/Lint/Test Commands

```bash
bun dev          # Start development server
bun build        # Production build
bun start        # Start production server
bun lint         # Check linting (Biome)
bun lint:fix     # Auto-fix linting issues
bun format       # Format code with Biome
bun typecheck    # TypeScript type checking
bun check        # Run format + lint + typecheck (full check)
```

No test framework is configured. To add tests, consider Vitest.

### Git Hooks (via Lefthook)

- **pre-commit**: Runs `bun run lint:fix` on staged files
- **pre-push**: Runs `bun run typecheck`

## Package Management

Always use Bun (NOT npm/yarn/pnpm):
- `bun install` - Install dependencies
- `bun add <package>` - Add dependency
- `bun run <script>` - Run scripts
- `bunx <package>` - Execute package (NOT npx)
- `bun typecheck` - Prefer over running `tsc` directly

## Code Style Guidelines

### File Naming

- **Components**: kebab-case (`media-player.tsx`, `timeline-track.tsx`)
- **Hooks**: kebab-case with `use-` prefix (`use-editing.tsx`)
- **Utilities**: kebab-case (`get-strict-context.tsx`)
- **Types**: PascalCase (`MediaAsset`, `TimelineTrackData`)

### Import Organization (Auto-organized by Biome)

1. `"use client";` directive (if needed)
2. React imports
3. External packages / type imports
4. Internal components (`@/components/...`)
5. Internal utilities (`@/lib/...`, `@/hooks/...`)
6. Relative imports (`./`)

### Component Patterns

- Use `"use client";` directive for client components
- Use function declarations for exported components (not arrow functions)
- Props interfaces defined inline or above component
- Named exports for reusable components, default exports for pages
- Always accept and spread `className` prop using `cn()` utility

### TypeScript

- Strict mode enabled - all code must pass strict type checking
- Use `type` imports for type-only imports
- Explicit type annotations for function parameters

### Formatting (Biome)

- 2-space indentation, double quotes, no semicolons
- Imports auto-organized

### Error Handling

- Use try/catch for async operations
- Log errors with `console.error`
- Clean up resources in `finally` blocks
- Set user-friendly error state for UI feedback

### React Patterns

- **useCallback**: For functions passed as props or in dependency arrays
- **useMemo**: Only for expensive computations passed to children (don't overuse)
- **useEffectEvent** (React 19): Prefer over useCallback for effect callbacks
- **Inline callbacks**: Prefer over named handlers like `handleClick`
- **Context + Provider**: For global state (`MediaImportProvider`, `TimelinePlayerProvider`)
- **Interactive elements**: Use `<button>` not `<div onClick>`

### Styling (Tailwind + Neobrutalism)

- Use `cn()` utility for conditional classes
- Neobrutalism: bold 2-4px borders, hard shadows, sharp corners, high contrast
- Get components from https://www.neobrutalism.dev/docs/

## Critical Requirements

### Media Playback

**NEVER use native HTML5 `<video>` or `<audio>` elements.**
Always use MediaFox components which render to `<canvas>`.
See `.github/mediafox-react.instructions.md` for React integration patterns.

### MediaBunny (Media Processing)

- All timestamps use **seconds** (not microseconds)
- Always close samples/packets to free resources
- Handle backpressure by awaiting promises
- Documentation: https://mediabunny.dev/llms-full.txt

### Editor Architecture

Source of truth for timeline state: `app/editor/page.tsx`
Read `.github/EDITOR_ARCHITECTURE.md` before modifying editor code.

## Project Structure

```
app/                      # Next.js App Router pages
  editor/page.tsx         # Video editor (main entry)
  convert/                # Media converter feature

components/
  ui/                     # Reusable UI (shadcn/neobrutalism)
  editor/                 # Video editor components
  player/                 # Media player components
  editing/                # Editing overlays and logic

lib/                      # Utilities and contexts
hooks/                    # Custom React hooks
```

## React Anti-Patterns to Avoid

1. **Named handlers**: Don't use `onClick={handleClick}` - prefer inline callbacks
2. **Overusing useMemo**: Only memoize for expensive children, not leaf components
3. **div onClick**: Use `<button>` or proper interactive elements for accessibility

## Additional Documentation

- `.github/copilot-instructions.md` - Main AI instructions
- `.github/mediafox-react.instructions.md` - MediaFox React integration
- `.github/ui-design-system.instructions.md` - Neobrutalism design system
- `.github/use-effect-event.instructions.md` - React 19 useEffectEvent patterns
- `.github/EDITOR_ARCHITECTURE.md` - Video editor architecture overview
