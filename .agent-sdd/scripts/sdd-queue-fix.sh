#!/usr/bin/env bash
set -euo pipefail

# -----------------------------------------------------------------------------
# sdd-queue-fix.sh
# Queue a fix for a task using Agent-SDD instruction
# -----------------------------------------------------------------------------

ROOT_DIR="$(pwd)"
AGENT_DIR="${ROOT_DIR}/.agent-sdd"

usage() {
  cat <<EOF
Usage: $0 <task-id>

Queue a fix for a task using Agent-SDD instruction.

Arguments:
  task-id     The ID of the task to queue fix for (e.g., EXEC-001)

Examples:
  $0 EXEC-001
  $0 TASK-042

EOF
}

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -h|--help) usage; exit 0;;
    -*) echo "❌ Unknown option: $1"; usage; exit 1;;
    *) 
      if [[ -z "${TASK_ID:-}" ]]; then
        TASK_ID="$1"
      else
        echo "❌ Multiple task IDs provided. Only one task ID is allowed."
        usage; exit 1
      fi
      ;;
  esac
  shift
done

if [[ -z "${TASK_ID:-}" ]]; then
    echo "❌ Error: Task ID is required"
    usage; exit 1
fi

echo "📋 Queueing fix for task: $TASK_ID"
echo "   Project path: $ROOT_DIR"

if [[ ! -d "$AGENT_DIR" ]]; then
    echo "❌ Error: Agent-SDD directory not found at $AGENT_DIR"
    exit 1
fi

if ! command -v claude &> /dev/null; then
    echo "❌ Error: Claude Code CLI is not available"
    echo "   Please install Claude Code CLI: https://docs.anthropic.com/claude-code"
    exit 1
fi

echo "🔄 Starting fix queue..."
if claude /sdd-queue-fix "$TASK_ID"; then
    echo "✅ Fix queued successfully for task: $TASK_ID"
else
    echo "❌ Fix queue failed for task: $TASK_ID"
    exit 1
fi