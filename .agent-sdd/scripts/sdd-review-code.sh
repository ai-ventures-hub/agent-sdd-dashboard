#!/usr/bin/env bash
# Local fallback for sdd-review-code
# Usage: ./sdd-review-code.sh <file-path>

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <file-path>"
  exit 1
fi

FILE="$1"

if [ ! -f "$FILE" ]; then
  echo "❌ File not found: $FILE"
  exit 1
fi

echo "📝 Reviewing $FILE for theme compliance..."

# Simple check for required theme classes
grep -Eq 'bg-primary|text-on-primary|bg-secondary|text-default' "$FILE" \
  && echo "✅ Compliant: Theme classes found" \
  || echo "❌ Non-compliant: No theme classes detected"

echo "Review complete."
