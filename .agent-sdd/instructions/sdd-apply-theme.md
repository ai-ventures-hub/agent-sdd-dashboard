# /sdd-apply-theme

---

## What this does
- Lets the user **choose a theme**: Preset (**minimal**, **classic**, **vibrant**) or **custom** (enter Primary, Secondary, Success, Error).
- **Validates colors** strictly:
  - Accepts **short hex** (`#abc`) and **long hex** (`#aabbcc`)
  - Accepts **rgb(r,g,b)** with each component **0–255**
  - Rejects invalid formats before doing any work
- **Auto-detects** common paths (with simple overrides).
- Generates a **tiny theme layer** with CSS variables + Tailwind utilities (no parsing).
- Regenerates `.agent-sdd/standards/theme-standards.md` to mirror chosen colors (with an allow-list).
- Logs a decision in `.agent-sdd/product/decisions.md`.

---

## Usage
Interactive:
```bash
/sdd-apply-theme
```

Non‑interactive (example):
```bash
/sdd-apply-theme --preset minimal \
  --primary "#4B5563" \
  --secondary "#E5E7EB" \
  --success "#10B981" \
  --error "#EF4444" \
  --app-css src/app/globals.css \
  --components src/components/ui \
  --theme-name brand-minimal
```
---

## Steps (what the agent does)
1. Prompt to choose: `minimal` / `classic` / `vibrant` / `custom`.
2. If `custom`: ask for `primary`, `secondary`, `success`, `error` (hex or rgb).
3. Discover paths (with fallbacks):
   - `app.css`: tries `src/app/globals.css`, `src/app.css`, `app/globals.css`
   - `components`: tries `src/components/ui`, `components/ui`
4. Write or update:
   - `.agent-sdd/standards/theme-files/[theme]/theme.css` (CSS variables + small utilities)
   - `.agent-sdd/standards/theme-standards.md` (colors + allow‑list + examples)
5. Append decision to `.agent-sdd/product/decisions.md` with date and chosen settings.
6. Print a short “what changed” summary with import snippet.

---

## Constraints
- Do **not** overwrite user app CSS; the theme lives in **theme.css** (import it once).
- **No CSS parsing. No Markdoc coupling** by default.
- Prefer Tailwind utility mapping to CSS variables:
  - e.g. `bg-[var(--color-primary)]`, `text-[var(--text-default)]`
- If paths aren’t found and not provided, create under `.agent-sdd/standards/theme-files/` and show the import snippet for the user to paste.

---

## After running
Add this line **once** in your app‑level CSS (e.g. `src/app/globals.css`):
```css
@import "../../.agent-sdd/standards/theme-files/[theme]/theme.css";
```

---

## Implementation Script (drop‑in Bash)

Save as: `scripts/sdd-apply-theme.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

# -----------------------------------------------------------------------------
# sdd-apply-theme.sh
# - Choose preset or custom
# - Generate theme.css with CSS variables + Tailwind utilities (no parsing)
# - Refresh theme-standards.md
# - Log in decisions.md
# -----------------------------------------------------------------------------

# Defaults
PRESET=""
PRIMARY=""
SECONDARY=""
SUCCESS=""
ERROR=""
APP_CSS=""
COMP_DIR=""
THEME_NAME=""

ROOT_DIR="$(pwd)"
AGENT_DIR="${ROOT_DIR}/.agent-sdd"
STANDARDS_DIR="${AGENT_DIR}/standards"
THEME_FILES_DIR="${STANDARDS_DIR}/theme-files"
PRODUCT_DIR="${AGENT_DIR}/product"

DATE_STR="$(date +%F)" # YYYY-MM-DD

# Color validation: short hex (#abc), long hex (#aabbcc), or rgb(r,g,b) with 0–255
is_color() {
  local v="$1"
  # Match short or long hex
  if [[ "$v" =~ ^\#[0-9A-Fa-f]{3}$ ]] || [[ "$v" =~ ^\#[0-9A-Fa-f]{6}$ ]]; then
    return 0
  fi
  # Match rgb(r,g,b) and enforce range
  if [[ "$v" =~ ^rgb\(([0-9]{1,3}),\s*([0-9]{1,3}),\s*([0-9]{1,3})\)$ ]]; then
    for comp in "${BASH_REMATCH[@]:1}"; do
      if (( comp < 0 || comp > 255 )); then
        return 1
      fi
    done
    return 0
  fi
  return 1
}

usage() {
  cat <<EOF
Usage: $0 [--preset minimal|classic|vibrant|custom]
          [--primary "#112233" | "#123" | "rgb(0,0,0)"]
          [--secondary "..."] [--success "..."] [--error "..."]
          [--app-css path/to/app.css] [--components path/to/components/ui]
          [--theme-name my-theme]

If no flags are provided, runs interactively.
EOF
}

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --preset) PRESET="${2:-}"; shift 2;;
    --primary) PRIMARY="${2:-}"; shift 2;;
    --secondary) SECONDARY="${2:-}"; shift 2;;
    --success) SUCCESS="${2:-}"; shift 2;;
    --error) ERROR="${2:-}"; shift 2;;
    --app-css) APP_CSS="${2:-}"; shift 2;;
    --components) COMP_DIR="${2:-}"; shift 2;;
    --theme-name) THEME_NAME="${2:-}"; shift 2;;
    -h|--help) usage; exit 0;;
    *) echo "Unknown arg: $1"; usage; exit 1;;
  esac
done

# Early validation for CLI-provided colors
for color_var in PRIMARY SECONDARY SUCCESS ERROR; do
  val="${!color_var}"
  if [[ -n "$val" && ! $(is_color "$val") ]]; then
    echo "❌ Invalid $color_var value: $val"
    echo "   Must be #RGB, #RRGGBB, or rgb(r,g,b) with each component 0–255."
    exit 1
  fi
done

# Interactive flow if needed
if [[ -z "$PRESET" ]]; then
  echo "Select a theme preset:"
  select opt in "minimal" "classic" "vibrant" "custom"; do
    PRESET="$opt"; break
  done
fi

# Preset palettes
case "$PRESET" in
  minimal)
    THEME_NAME="${THEME_NAME:-minimal}"
    PRIMARY="${PRIMARY:-#4B5563}"
    SECONDARY="${SECONDARY:-#E5E7EB}"
    SUCCESS="${SUCCESS:-#10B981}"
    ERROR="${ERROR:-#EF4444}"
    ;;
  classic)
    THEME_NAME="${THEME_NAME:-classic}"
    PRIMARY="${PRIMARY:-#334155}"
    SECONDARY="${SECONDARY:-#CBD5E1}"
    SUCCESS="${SUCCESS:-#16A34A}"
    ERROR="${ERROR:-#DC2626}"
    ;;
  vibrant)
    THEME_NAME="${THEME_NAME:-vibrant}"
    PRIMARY="${PRIMARY:-#2563EB}"
    SECONDARY="${SECONDARY:-#F59E0B}"
    SUCCESS="${SUCCESS:-#22C55E}"
    ERROR="${ERROR:-#EF4444}"
    ;;
  custom)
    THEME_NAME="${THEME_NAME:-custom}"
    if [[ -z "$PRIMARY" ]]; then read -rp "Primary color (hex or rgb): " PRIMARY; fi
    if [[ -z "$SECONDARY" ]]; then read -rp "Secondary color (hex or rgb): " SECONDARY; fi
    if [[ -z "$SUCCESS" ]]; then read -rp "Success color (hex or rgb): " SUCCESS; fi
    if [[ -z "$ERROR" ]]; then read -rp "Error color (hex or rgb): " ERROR; fi
    ;;
  *)
    echo "Invalid preset: $PRESET"; exit 1;;
esac

# Final validation after preset or interactive assignment
for C in "$PRIMARY" "$SECONDARY" "$SUCCESS" "$ERROR"; do
  if ! is_color "$C"; then
    echo "Invalid color value: $C"
    echo "Use #RGB, #RRGGBB, or rgb(r,g,b) with 0–255."
    exit 1
  fi
done

# Discover paths if not provided
if [[ -z "$APP_CSS" ]]; then
  for guess in "src/app/globals.css" "src/app.css" "app/globals.css"; do
    if [[ -f "$guess" ]]; then APP_CSS="$guess"; break; fi
  done
fi

if [[ -z "$COMP_DIR" ]]; then
  for g in "src/components/ui" "components/ui"; do
    if [[ -d "$g" ]]; then COMP_DIR="$g"; break; fi
  done
fi

# Create theme directory
THEME_DIR="${THEME_FILES_DIR}/${THEME_NAME}"
mkdir -p "$THEME_DIR"

# Derive accessible text-on-primary (simple heuristic)
TEXT_ON_PRIMARY="#FFFFFF"

# Write theme.css
cat > "${THEME_DIR}/theme.css" <<EOF
/* Generated by sdd-apply-theme (${DATE_STR}) */
@layer base {
  :root {
    --color-primary: ${PRIMARY};
    --color-secondary: ${SECONDARY};
    --color-success: ${SUCCESS};
    --color-error: ${ERROR};

    --text-on-primary: ${TEXT_ON_PRIMARY};
    --text-default: #111827;
    --bg-default: #FFFFFF;
  }
  .dark {
    --text-default: #F9FAFB;
    --bg-default: #111827;
  }
}

@layer utilities {
  .bg-primary { background-color: var(--color-primary); }
  .bg-secondary { background-color: var(--color-secondary); }
  .bg-success { background-color: var(--color-success); }
  .bg-error { background-color: var(--color-error); }

  .text-on-primary { color: var(--text-on-primary); }
  .text-default { color: var(--text-default); }
  .bg-default { background-color: var(--bg-default); }
}
EOF

# Regenerate theme-standards.md
mkdir -p "$STANDARDS_DIR"
cat > "${STANDARDS_DIR}/theme-standards.md" <<EOF
# Theme Standards (${THEME_NAME})

> Generated on ${DATE_STR}. Update if you change colors/typography/spacing.

## Colors
- **Primary:** \`${PRIMARY}\` (use \`bg-primary\` or \`bg-[var(--color-primary)]\`)
- **Secondary:** \`${SECONDARY}\` (use \`bg-secondary\` or \`bg-[var(--color-secondary)]\`)
- **Success:** \`${SUCCESS}\` (use \`bg-success\` or \`bg-[var(--color-success)]\`)
- **Error:** \`${ERROR}\` (use \`bg-error\` or \`bg-[var(--color-error)]\`)
- **Text Default:** \`#111827\` (use \`text-default\` or \`text-[var(--text-default)]\`)

**Allowed Color Utilities (allow-list):**
\`\`\`txt
bg-primary bg-secondary bg-success bg-error
bg-[var(--color-primary)] bg-[var(--color-secondary)] bg-[var(--color-success)] bg-[var(--color-error)]
text-default text-on-primary
\`\`\`

**Rule:** Prefer Tailwind utilities. Raw hex only in this theme file.

## Typography
- **Font:** Roboto, sans-serif
- **Base:** 14px (\`text-sm\`), **line-height:** 1.5 (\`leading-relaxed\`)
- **Headings:** H1 \`text-3xl font-bold\`, H2 \`text-2xl font-semibold\`, H3 \`text-xl font-medium\`

**Allowed Typography Utilities:**
\`\`\`txt
text-sm leading-relaxed text-3xl font-bold text-2xl font-semibold text-xl font-medium
dark:text-gray-100
\`\`\`

## Components (examples)
\`\`\`tsx
<Button className="bg-primary text-on-primary rounded-sm px-4 py-2 hover:brightness-95">
  Click Me
</Button>
\`\`\`

\`\`\`tsx
<Card className="p-4 bg-default text-default shadow-md dark:bg-gray-800 dark:text-gray-100">
  <CardContent>Your content here</CardContent>
</Card>
\`\`\`

## Accessibility
- WCAG 2.1 AA. Focus visible. Touch target ≥ 40px.
- Contrast: normal ≥ 4.5:1, large ≥ 3:1.

## Notes
- Import your theme once in your app CSS:
\`\`\`css
@import "../../.agent-sdd/standards/theme-files/${THEME_NAME}/theme.css";
\`\`\`
EOF

# Log decision
mkdir -p "$PRODUCT_DIR"
DECISIONS_FILE="${PRODUCT_DIR}/decisions.md"
if [[ ! -f "$DECISIONS_FILE" ]]; then
  echo "# Decisions" > "$DECISIONS_FILE"
fi

cat >> "$DECISIONS_FILE" <<EOF

- ${DATE_STR}: Applied theme "${THEME_NAME}" (DEC-$(date +%y%m%d%H%M), Accepted, Technical)
  - Rationale: Align UI with selected palette
  - Files:
    - ${THEME_DIR}/theme.css
    - ${STANDARDS_DIR}/theme-standards.md
EOF

# Final output
echo ""
echo "✅ Theme applied: ${THEME_NAME}"
echo "📄 Theme CSS: ${THEME_DIR}/theme.css"
echo "📘 Standards: ${STANDARDS_DIR}/theme-standards.md"
if [[ -n "$APP_CSS" ]]; then
  echo "🔗 Add this to ${APP_CSS}:"
else
  echo "🔗 Add this import to your app-level CSS (globals.css):"
fi
echo "@import \"../../.agent-sdd/standards/theme-files/${THEME_NAME}/theme.css\";"
if [[ -n "$COMP_DIR" ]]; then
  echo "📁 Components directory detected: ${COMP_DIR}"
fi
echo "🧾 Decision logged in: ${DECISIONS_FILE}"
```

---

## Line‑by‑line Explanation (Beginner‑friendly)

- `set -euo pipefail` — Exit on errors, undefined variables, or broken pipes for safety.
- **Flag parsing** — Supports non‑interactive runs (CI‑friendly). If omitted, prompts are shown.
- **Interactive preset menu** — Simple `select` to pick `minimal`, `classic`, `vibrant`, or `custom`.
- **Presets** — Each preset has sensible default color values; you can override any via flags.
- **Validation** — `is_color()` accepts either `#RRGGBB` or `rgb(r,g,b)` to reduce user friction.
- **Path discovery** — Guesses common `globals.css` and `components/ui` paths to save time; you can pass your own.
- **CSS generation** — Writes one `theme.css` under `.agent-sdd/standards/theme-files/<theme>` with CSS variables and a few handy utility classes in Tailwind’s layers.
- **Standards regeneration** — Rewrites `.agent-sdd/standards/theme-standards.md` to mirror chosen colors and provide an allow‑list your code reviewer can enforce.
- **Decision logging** — Appends a dated entry to `.agent-sdd/product/decisions.md` so changes are auditable.
- **Helpful output** — Prints the import line to paste once into your app CSS and shows where files were created.

---

## Next Steps
- (Optional) Wrap this script with a tiny Agent‑SDD instruction file (`.agent-sdd/instructions/sdd-apply-theme.md`) that shells out to the script so Claude/agents can run it consistently.
- (Optional) Add more presets later (e.g., `pastel`, `warm`, `high-contrast`)—no changes to the flow required.
