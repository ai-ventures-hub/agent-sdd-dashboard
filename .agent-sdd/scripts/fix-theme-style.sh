
#!/usr/bin/env bash
set -euo pipefail

# fix-theme-style.sh
# Scans for non-compliant Tailwind classes in components and replaces them
# with theme-compliant equivalents from theme-standards.md.

COMPONENTS_DIR="src/components"
THEME_FILE=".agent-sdd/standards/theme-standards.md"

if [[ ! -d "$COMPONENTS_DIR" ]]; then
  echo "❌ Components directory not found: $COMPONENTS_DIR"
  exit 1
fi

if [[ ! -f "$THEME_FILE" ]]; then
  echo "❌ Theme standards file not found: $THEME_FILE"
  exit 1
fi

echo "🔍 Scanning $COMPONENTS_DIR for non-compliant classes..."

# Map: non-compliant → compliant
declare -A REPLACEMENTS=(
  ["bg-blue-500"]="bg-primary"
  ["text-white"]="text-on-primary"
  ["bg-green-500"]="bg-success"
  ["bg-red-500"]="bg-error"
)

CHANGED_FILES=()

for from in "${!REPLACEMENTS[@]}"; do
  to="${REPLACEMENTS[$from]}"
  matches=$(grep -rl "$from" "$COMPONENTS_DIR" || true)
  if [[ -n "$matches" ]]; then
    while IFS= read -r file; do
      sed -i '' "s/${from}/${to}/g" "$file"
      CHANGED_FILES+=("$file")
      echo "✅ Replaced '$from' → '$to' in $file"
    done <<< "$matches"
  fi
done

if [[ ${#CHANGED_FILES[@]} -eq 0 ]]; then
  echo "🎉 No non-compliant classes found."
else
  echo "📦 Fixed ${#CHANGED_FILES[@]} file(s) for theme compliance."
  echo "💡 Review changes and commit:"
  printf '   git add %s\n' "${CHANGED_FILES[@]}"
  echo "   git commit -m \"style: fix theme compliance\""
fi
