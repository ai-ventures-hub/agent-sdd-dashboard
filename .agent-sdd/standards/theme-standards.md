# Theme Standards
# ✅ Customized for Agent-SDD Desktop Viewer (macOS style, Tailwind + shadcn/ui)

## Colors
- **Background**: `--bg` → Light: `#F9FAFB` | Dark: `#141416`
- **Panel**: `--panel` → Light: `#FFFFFF` | Dark: `#202022`
- **Card**: `--card` → Light: `#F3F4F6` | Dark: `#2C2C2E`
- **Text**: `--text` → Light: `#111827` | Dark: `#E5E7EB`
- **Text Accent**: `--accent` → `#4FAE4A`
- **Error**: `--error` → `#EF4444`
- **Success**: `--success` → `#10B981`
- All colors must be referenced via CSS variables, not hard-coded hex.

## Typography
- Base font: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`
- Font size: 14px base (`text-sm` in Tailwind)
- Headings: use Tailwind scale (`text-lg`, `text-xl`, `text-2xl`)
- Line height: 1.4 for readability
- Ensure accessible contrast (WCAG 2.1 AA)

## Spacing & Layout
- Grid system: **4px** scale (`p-1`, `m-1` = 4px)
- Default padding for cards/panels: `p-4`
- Default gap in flex/grid layouts: `gap-2` or `gap-4`
- Rounded corners: `rounded-xl` (12px)
- Shadows: subtle only (`shadow-sm`, `shadow-md`) — avoid heavy shadows

## Components
- **Button**: Use `shadcn/ui` `<Button>` with Tailwind variants
  - Primary: `bg-[var(--accent)] text-white`
  - Secondary: `bg-[var(--panel)] border border-gray-300`
- **Card**: `<Card>` with `p-4`, background from `--card`
- **Modal**: Centered, rounded-xl, dimmed backdrop
- **Sidebar/Navigation**: Fixed width (`w-64`), collapsible on mobile

## Accessibility
- WCAG 2.1 AA minimum contrast
- All interactive elements must have `aria-label` or visible text
- Keyboard navigable (tab, enter, esc)
- Respect system light/dark mode by default

## Motion
- Use **Framer Motion** for subtle animations:
  - Fade-in for modals, panels
  - Slide-in for sidebar
  - `transition-all duration-200 ease-in-out` for hover/focus states
- Avoid distracting or infinite animations

## Dark Mode
- Auto-detect system preference (`prefers-color-scheme`)
- Provide toggle in settings for manual override
- All colors must be defined in both light and dark palettes (via `:root` CSS variables)
