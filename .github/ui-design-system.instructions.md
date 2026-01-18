# UI Design System - "Caffeine" Modern Theme

This project uses the **Caffeine** design system: a modern, warm, and sophisticated aesthetic inspired by coffee culture. It moves away from harsh lines and high contrast towards soft depth, organic tones, and premium minimalism.

## Design Principles

### Visual Aesthetic
- **Soft Depth:** Use subtle, blurred shadows (`box-shadow`) instead of hard, solid ones.
- **Rounded Elegance:** Larger border-radius for components (default: `12px` or `0.75rem`) to feel friendly and modern.
- **Micro-Gradients:** Subtle background gradients or overlays that add texture without being distracting.
- **Bento Layouts:** Clean, grid-based arrangements for information density with plenty of whitespace.

### Color Palette (Inspired by Caffeine)
- **Background:** Deep Espresso (`#0c0a09`) - a warm, rich black for dark mode.
- **Foreground:** Cream / Caffè Latte (`#ffe0c2`) - a soft, warm white for high readability.
- **Primary:** Caffeine Accent (`#ffe0c2`) - used for buttons and key highlights (often inverts text to dark).
- **Secondary / Surface:** Roasted Bean (`#1c1917`) - used for cards and nested surfaces.
- **Muted Elements:** Cocoa Grey - used for less important text and subtle borders.

### Typography
- **Modern Sans:** Use clean, readable sans-serif fonts (e.g., Inter, DM Sans, or Archivo).
- **Hierarchy:** Strong contrast between bold headlines and legible body text.

## Implementation Guidelines

### shadcn/ui Integration
This project follows `shadcn/ui` patterns. Use standard Tailwind CSS classes and ensure they align with the warm theme.

### Key Aesthetic Requirements
- **Consistency:** All components must share the same `0.75rem` (12px) border radius.
- **Shadows:** Only use blurred shadows for depth. Avoid any `shadow-hard` or neobrutalist variants.
- **Borders:** Thin, subtle borders (`1px`) using low-contrast colors for separation.

## Avoid These Patterns (Anti-Brutalism)
- **NO** thick 2px+ black borders.
- **NO** hard, unblurred box-shadows.
- **NO** 0px border-radius (sharp corners).
- **NO** neon or "acid" color combinations.

## Example Component Pattern
```tsx
<div className="rounded-xl border border-border bg-card p-6 shadow-sm">
  <h2 className="text-2xl font-bold text-foreground">Premium Coffee</h2>
  <p className="mt-2 text-muted-foreground">Modern, warm, and sophisticated aesthetic.</p>
  <button className="mt-4 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground hover:opacity-90 transition-opacity">
    Get Started
  </button>
</div>
```
