# UI Design System - Neobrutalism Style

This project uses **Neobrutalism** design style for all UI components.

## Component Source

Get all components from https://www.neobrutalism.dev/docs/

### Component URLs Pattern

Follow this URL pattern: `https://www.neobrutalism.dev/docs/{component-name}`

**Examples:**
- Accordion: https://www.neobrutalism.dev/docs/accordion
- Button: https://www.neobrutalism.dev/docs/button
- Card: https://www.neobrutalism.dev/docs/card
- Input: https://www.neobrutalism.dev/docs/input
- Dialog: https://www.neobrutalism.dev/docs/dialog
- Checkbox: https://www.neobrutalism.dev/docs/checkbox
- Select: https://www.neobrutalism.dev/docs/select
- Tabs: https://www.neobrutalism.dev/docs/tabs

## Design Principles

### Visual Style
- **Bold, thick borders** (typically 2-4px solid black)
- **High contrast color combinations** (bright colors on light backgrounds)
- **Heavy shadows for depth** (solid color box-shadows, not blurred)
- **Sharp corners** (no border-radius or minimal)
- **Playful, retro aesthetic**
- **Strong visual hierarchy**

### Color Usage
- Use bold, saturated colors
- High contrast between elements
- Black borders as primary element separator
- Solid color fills (avoid gradients)

### Shadows
- Use hard, solid shadows (not blur)
- Offset shadows to create depth
- Typically: `box-shadow: 4px 4px 0px 0px #000`

### Typography
- Bold, clear font weights
- High contrast text
- Clear hierarchy

## Implementation Guidelines

### When Creating Components

1. **Fetch from neobrutalism.dev**
   - Always check the documentation URL first
   - Use the exact component structure provided
   - Maintain their class naming conventions

2. **Maintain Consistency**
   - Match existing neobrutalism components in the project
   - Use the same border thickness across components
   - Apply consistent shadow patterns

3. **Key CSS Properties**
   - `border: 2px solid #000` (or thicker)
   - `box-shadow: 4px 4px 0px 0px #000`
   - `border-radius: 0` or very minimal
   - High contrast colors

4. **Avoid Anti-Patterns**
   - No subtle gradients
   - No soft, blurred shadows
   - No rounded corners (or minimal)
   - No low contrast color schemes

## When to Use This Guide

Apply neobrutalism style when:
- Creating new UI components
- Updating existing components to match the design system
- User requests any UI element or component
- Building forms, buttons, cards, or interactive elements
- Adding new pages or layouts

## Example Component Structure

```tsx
// Typical neobrutalism component structure
<div className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_#000]">
  <button className="border-2 border-black bg-blue-500 text-white font-bold px-4 py-2 shadow-[2px_2px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">
    Click Me
  </button>
</div>
```

## Resources

- Main documentation: https://www.neobrutalism.dev/
- Component library: https://www.neobrutalism.dev/docs/
- Browse all components: https://www.neobrutalism.dev/docs/components
