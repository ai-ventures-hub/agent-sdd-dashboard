# Theme Standards

> **Instructions:**  
> - This file defines the **visual design system** for the project.  
> - Update it whenever colors, typography, spacing, or components change.  
> - Keep it accurate so devs & AI tools can copy settings into code without guessing.  
> - All examples use **Tailwind CSS** utilities.  
> - Include **both light and dark mode** values where applicable.  
> - Use only **approved utility classes** unless documented in `decisions.md`.

---

## 1. Colors

### Light Mode
- **Primary:** `#4B5563` (`bg-gray-600`)
- **Secondary:** `#E5E7EB` (`bg-gray-200`)
- **Accent:** `#3B82F6` (`bg-blue-500`)
- **Success:** `#10B981` (`bg-green-500`)
- **Warning:** `#F59E0B` (`bg-yellow-500`)
- **Error:** `#EF4444` (`bg-red-500`)
- **Background:** `#FFFFFF` (`bg-white`)
- **Text:** `#111827` (`text-gray-900`)

### Dark Mode
- **Primary:** `#9CA3AF` (`dark:text-gray-400`)
- **Secondary:** `#374151` (`dark:bg-gray-700`)
- **Accent:** `#60A5FA` (`dark:bg-blue-400`)
- **Success:** `#34D399` (`dark:bg-green-400`)
- **Warning:** `#FBBF24` (`dark:bg-yellow-400`)
- **Error:** `#F87171` (`dark:bg-red-400`)
- **Background:** `#1F2937` (`dark:bg-gray-900`)
- **Text:** `#F9FAFB` (`dark:text-gray-100`)

**Allowed Tailwind Color Classes:**
```txt
bg-gray-600 bg-gray-200 bg-blue-500 bg-green-500 bg-yellow-500 bg-red-500 text-gray-900
dark:text-gray-400 dark:bg-gray-700 dark:bg-blue-400 dark:bg-green-400 dark:bg-yellow-400 dark:bg-red-400 dark:bg-gray-900 dark:text-gray-100
```

**Rule:** Always use Tailwind color utilities — no raw hex unless not available.

---

## 2. Design Tokens

| Token Name     | Light Mode Class    | Dark Mode Class     |
|----------------|--------------------|---------------------|
| color-primary  | bg-gray-600         | dark:bg-gray-400    |
| color-secondary| bg-gray-200         | dark:bg-gray-700    |
| color-accent   | bg-blue-500         | dark:bg-blue-400    |
| color-success  | bg-green-500        | dark:bg-green-400   |
| color-warning  | bg-yellow-500       | dark:bg-yellow-400  |
| color-error    | bg-red-500          | dark:bg-red-400     |
| color-text     | text-gray-900       | dark:text-gray-100  |

---

## 3. Typography

- **Font Family:** `Roboto`, sans-serif  
- **Base Size:** `14px` (`text-sm`)  
- **Line Height:** `1.5` (`leading-relaxed`)  
- **Headings:**
  - H1: `text-3xl font-bold`
  - H2: `text-2xl font-semibold`
  - H3: `text-xl font-medium`

**Allowed Typography Classes:**
```txt
text-sm leading-relaxed text-3xl font-bold text-2xl font-semibold text-xl font-medium
dark:text-gray-100
```

✅ **Correct**  
```tsx
<h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Title</h1>
```
❌ **Incorrect**  
```tsx
<h1 style={{ fontSize: '30px', fontWeight: '700' }}>Title</h1>
```

---

## 4. Spacing & Layout

- **Spacing Unit:** 4px grid (Tailwind scale: `1` = 4px)  
  - Margin: `m-1` = 4px, `m-2` = 8px, `m-3` = 12px  
  - Padding: `p-1` = 4px, `p-2` = 8px, `p-3` = 12px  
  - Gap: `gap-1` = 4px, `gap-2` = 8px

**Responsive Spacing Adjustments:**
```txt
Base: p-4
sm+: p-6
lg+: p-8
```

---

## 5. Mobile-First & Breakpoints

**Approach:** Design for mobile first, then layer larger breakpoints.

**Tailwind Breakpoints:**
```js
theme: {
  screens: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px'
  }
}
```
**Rule:** Default classes = mobile, add `sm:`, `md:`, `lg:` overrides.

---

## 6. Components

### Buttons
```tsx
<Button
  variant="outline"
  className="bg-gray-600 text-white rounded-sm px-4 py-2 hover:bg-gray-700 
             dark:bg-gray-400 dark:text-black dark:hover:bg-gray-300"
>
  Click Me
</Button>
```

### Cards
```tsx
<Card className="p-4 bg-white shadow-md dark:bg-gray-800 dark:text-gray-100">
  <CardContent>Your content here</CardContent>
</Card>
```

### Alerts
```tsx
<Alert className="bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100 p-4 rounded-md">
  <AlertDescription>Warning message here</AlertDescription>
</Alert>
```

---

## 7. State Styles

- Define `hover:`, `focus:`, `active:`, `disabled:` for all interactive elements.
- Ensure focus states are **visible** and meet WCAG AA contrast.

---

## 8. Shadow & Elevation
- `shadow-sm` → subtle
- `shadow-md` → hover states
- `shadow-lg` → modals/dialogs

---

## 9. Border Radius
- **Standard:** `rounded-md`
- **Pills/tags:** `rounded-full`
- Avoid mixed radii in same component group.

---

## 10. Iconography
- Library: `lucide-react`
- Stroke width consistent
- Sizes: `w-4 h-4` inline, `w-6 h-6` standalone

---

## 11. Animation & Motion
**Approved animations:**
```txt
transition-colors duration-200 ease-in-out animate-fade-in animate-slide-up
```
No excessive motion — must be functional.

---

## 12. Image & Media
- Use `<Image>` in Next.js
- Maintain aspect ratios
- Enable `loading="lazy"`

---

## 13. Accessibility
- WCAG 2.1 AA
- ARIA attributes on interactive elements
- Min touch target: 40x40px
- Focus states always visible

**Contrast Ratios:**
- Normal text: ≥ 4.5:1
- Large text (≥ 18px or 14px bold): ≥ 3:1

