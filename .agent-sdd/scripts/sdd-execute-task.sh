#!/usr/bin/env bash
set -euo pipefail

# -----------------------------------------------------------------------------
# sdd-execute-task.sh
# Execute a task by calling Claude Code with the proper Agent-SDD instruction
# -----------------------------------------------------------------------------

ROOT_DIR="$(pwd)"
AGENT_DIR="${ROOT_DIR}/.agent-sdd"
DATE_STR="$(date +%F)"

usage() {
  cat <<EOF
Usage: $0 <task-id>

Execute a task using Agent-SDD instruction:
1. Load task from .agent-sdd/specs/*/tasks.json
2. Reference .agent-sdd/standards/theme-standards.md for style compliance
3. Write tests (TDD) if applicable
4. Implement code, commit with message "[task-id]: [description]"
5. Run task-specific tests (if package.json exists)
6. Use Agent-SDD instruction: /sdd-review-code on modified files
7. Update task status to "completed" and set ux_ui_reviewed: true in tasks.json
8. Notify user with summary

Arguments:
  task-id     The ID of the task to execute (e.g., EXEC-001)

Examples:
  $0 EXEC-001
  $0 TASK-042

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -h|--help)
      usage
      exit 0
      ;;
    -*)
      echo "❌ Unknown option: $1"
      usage
      exit 1
      ;;
    *)
      if [[ -z "${TASK_ID:-}" ]]; then
        TASK_ID="$1"
      else
        echo "❌ Multiple task IDs provided. Only one task ID is allowed."
        usage
        exit 1
      fi
      ;;
  esac
  shift
done

# Validate required arguments
if [[ -z "${TASK_ID:-}" ]]; then
    echo "❌ Error: Task ID is required"
    usage
    exit 1
fi

# Validate task ID format (basic check)
if [[ ! "$TASK_ID" =~ ^[A-Z]+-[0-9]+$ ]]; then
    echo "⚠️  Warning: Task ID '$TASK_ID' doesn't follow expected format (e.g., EXEC-001)"
fi

echo "🚀 Executing task: $TASK_ID"
echo "   Project path: $ROOT_DIR"

# Check if Agent-SDD directory exists
if [[ ! -d "$AGENT_DIR" ]]; then
    echo "❌ Error: Agent-SDD directory not found at $AGENT_DIR"
    echo "   Make sure you're running this from a project with Agent-SDD initialized."
    exit 1
fi

# Check if Claude Code CLI is available
if ! command -v claude &> /dev/null; then
    echo "❌ Error: Claude Code CLI is not available"
    echo "   Please install Claude Code CLI: https://docs.anthropic.com/claude-code"
    exit 1
fi

# Execute the task using Claude Code with the Agent-SDD instruction
echo "🔄 Starting task execution..."
if claude /sdd-execute-task "$TASK_ID"; then
    echo "✅ Task execution completed successfully for: $TASK_ID"
else
    echo "❌ Task execution failed for: $TASK_ID"
    echo "   Check the output above for details."
    exit 1
fi