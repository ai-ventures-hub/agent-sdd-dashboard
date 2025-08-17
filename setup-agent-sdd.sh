#!/bin/bash

# Agent-SDD Setup Script
# Initializes project-specific .agent-sdd/ folder for Claude Code

set -e

# Prevent accidental overwrite of existing configuration
if [ -d ".agent-sdd" ]; then
  read -r -p "⚠️  .agent-sdd already exists. Overwrite? This will replace all files. (y/N): " CONFIRM
  if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo "❌ Setup aborted to avoid overwriting existing configuration."
    exit 1
  fi
fi

echo "🚀 Agent-SDD Setup Script"
echo "========================"
echo ""

# Create directories
echo "📁 Creating directories..."
mkdir -p .agent-sdd/standards .agent-sdd/product .agent-sdd/specs .agent-sdd/instructions .agent-sdd/agents

# Standards files (placeholder; update to match project stack after theme integration)
echo "📥 Creating standards files..."
cat << 'EOF' > .agent-sdd/standards/tech-stack.md
# Tech Stack
# ✅ Update this file with your project’s specific tools and versions after integrating a theme via /sdd-apply-theme
- Frontend: React (update version), TypeScript (update version)
- Backend: None (standalone components)
- Styling: Tailwind CSS (update version), shadcn/ui (update version)
- Testing: Jest (optional, requires setup; update if using another framework)
EOF

cat << 'EOF' > .agent-sdd/standards/code-style.md
# Code Style
# ❌ Leave as default unless your team requires different naming or formatting conventions
- Naming: camelCase for variables, PascalCase for components
- Formatting: 2-space indentation, Prettier enforced
- Comments: JSDoc for functions, inline for clarity
EOF

cat << 'EOF' > .agent-sdd/standards/best-practices.md
# Best Practices
# ❌ Retain default practices unless your workflow demands changes
- Keep code simple and readable
- DRY: Extract repeated logic to components/utils
- Use TDD for critical components
- Commit messages: "[type]: [description] (task-id)"
- Accessibility: WCAG 2.1 AA compliance
EOF

cat << 'EOF' > .agent-sdd/standards/theme-standards.md
# Theme Standards
# ✅ Customize this file with theme-specific standards after running /sdd-apply-theme
EOF

# Product files
echo "📥 Creating product files..."
cat << 'EOF' > .agent-sdd/product/overview.md
# Product Overview
- Mission: Simplify component creation
- Target Users: Developers
- Goals: Create reusable UI components
EOF

cat << 'EOF' > .agent-sdd/product/roadmap.md
# Roadmap
- Phase 0: Already Completed
  - [x] Agent-SDD setup
- Phase 1: Current Development (Q3 2025)
  - [ ] Text Display component

## Example Progress Log Entry
**[2025-08-14] – Completed Initial Theme Integration**
- **What:** Applied minimal theme preset and verified color standards.
- **Why:** Ensures consistent design and accessibility from the start.
- **Impact:** All components must use theme variables; old hardcoded colors replaced.
EOF

cat << 'EOF' > .agent-sdd/product/decisions.md
# Decisions
- 2025-08-13: Use Tailwind/shadcn/ui (DEC-001, Accepted, Technical)
  - Rationale: Consistent styling, accessibility
  - Alternatives: Custom CSS (too complex)
EOF

# Instruction files
echo "📥 Creating instruction files..."
cat << 'EOF' > .agent-sdd/instructions/sdd-plan-product.md
# /sdd-plan-product
Create or update product documentation:
1. Prompt user for mission, target users, key features (min 3).
2. Update .agent-sdd/product/overview.md with mission, users, goals.
3. Add new phase to .agent-sdd/product/roadmap.md (3-7 features, effort: XS=1 day, S=2-3 days, M=1 week).
4. Log decisions in .agent-sdd/product/decisions.md (ID: DEC-XXX).
5. Reference .agent-sdd/standards/* for context.
EOF

cat << 'EOF' > .agent-sdd/instructions/sdd-create-spec.md
# /sdd-create-spec [--lite | --ui-only]
Create a Software Design Document:
1. Prompt user for feature name and description.
2. If "what's next?", check .agent-sdd/product/roadmap.md for next item.
3. Create folder .agent-sdd/specs/YYYY-MM-DD-[feature-name]/ (kebab-case, max 5 words).
4. Generate sdd.md with:
   - Overview: Goal, user story, success criteria
   - Technical Specs: UI requirements (skip if --lite)
   - Tasks: List with IDs, dependencies, effort (XS=1 day, S=2-3 days, M=1 week)
   - Test Scenarios
   - Theme Standards Compliance (reference .agent-sdd/standards/theme-standards.md)
5. Create tasks.json with task details.
6. If --lite, include only Overview and Tasks.
7. If --ui-only, focus on UI Requirements and Theme Standards.
8. Check alignment with .agent-sdd/product/*; update decisions.md if needed.
9. Prompt user: "Proceed with Task 1? (yes/no)"
EOF

cat << 'EOF' > .agent-sdd/instructions/sdd-execute-task.md
# /sdd-execute-task <task-id>
Execute a task:
1. Load task from .agent-sdd/specs/*/tasks.json.
2. Reference .agent-sdd/standards/theme-standards.md for style compliance.
3. Write tests (TDD) if applicable.
4. Implement code, commit with message "[task-id]: [description]".
5. Run task-specific tests (if package.json exists).
6. Run /sdd-review-code on modified files to ensure UX/UI compliance.
7. Update task status to "Done" and set ux_ui_reviewed: true in tasks.json.
8. Notify user with summary: tasks completed, issues, commit hash.
EOF

cat << 'EOF' > .agent-sdd/instructions/sdd-fix.md
# /sdd-fix [--no-tests] <description>
Apply a quick fix:
1. Create task in .agent-sdd/specs/YYYY-MM-DD-quick-fix/tasks.json.
2. Implement fix, ensuring .agent-sdd/standards/theme-standards.md compliance.
3. Run /sdd-review-code on modified files to ensure UX/UI compliance.
4. Commit with message "fix: [description]".
5. Update task status to "Done" and set ux_ui_reviewed: true.
6. Notify user with summary.
EOF

cat << 'EOF' > .agent-sdd/instructions/sdd-tweak.md
# /sdd-tweak [--fix-style] [--no-tests] <description>
Apply a minor UI tweak:
1. Create task in .agent-sdd/specs/YYYY-MM-DD-tweak/tasks.json.
2. Implement tweak, strictly following .agent-sdd/standards/theme-standards.md.
3. Run /sdd-review-code on modified files to ensure UX/UI compliance.
4. Commit with message "tweak: [description]".
5. Update task status to "Done" and set ux_ui_reviewed: true.
6. Notify user with summary.
EOF

cat << 'EOF' > .agent-sdd/instructions/sdd-analyze.md
# /sdd-analyze
Analyze project state:
1. Review .agent-sdd/product/roadmap.md for progress.
2. Check .agent-sdd/specs/*/tasks.json for completed tasks.
3. Analyze codebase for theme compliance.
4. Update .agent-sdd/product/decisions.md with insights.
5. Suggest next steps based on roadmap.
6. Notify user with summary: completed features, next tasks.
EOF

cat << 'EOF' > .agent-sdd/instructions/sdd-review-code.md
# /sdd-review-code <file-path>
Review code for theme standards compliance:
1. Read .agent-sdd/standards/theme-standards.md for rules.
2. Scan <file-path> for non-compliant styles (colors, typography, components).
3. Apply fixes (e.g., replace invalid Tailwind classes).
4. Commit with message "style: Update [file-path] for theme compliance".
5. Notify user with report: issues found, fixes applied.
EOF

# Agent files
echo "📥 Creating agent files..."
cat << 'EOF' > .agent-sdd/agents/context-fetcher.md
---
name: context-fetcher
description: Retrieves relevant information from Agent-SDD documentation files.
tools: Read, Grep, Glob
color: blue
---

You are a specialized information retrieval agent for Agent-SDD workflows. Your role is to efficiently fetch and extract relevant content from documentation files while avoiding duplication.

## Core Responsibilities
1. **Context Check First**: Determine if requested information is already in the main agent's context.
2. **Selective Reading**: Extract only the specific sections or information requested.
3. **Smart Retrieval**: Use grep to find relevant sections rather than reading entire files.
4. **Return Efficiently**: Provide only new information not already in context.

## Supported File Types
- Specs: sdd.md, tasks.json
- Product docs: overview.md, roadmap.md, decisions.md
- Standards: theme-standards.md, code-style.md, best-practices.md

## Workflow
1. Check if the requested information is in context.
2. If not, locate the requested file(s).
3. Extract relevant sections using grep.
4. Return specific information needed.

## Output Format
For new information:
\`\`\`
📄 Retrieved from [file-path]
[Extracted content]
\`\`\`
For already-in-context:
\`\`\`
✓ Already in context: [brief description]
\`\`\`

## Constraints
- Never return duplicated information.
- Extract minimal necessary content.
- Use grep for targeted searches.
- Never modify files.
EOF

cat << 'EOF' > .agent-sdd/agents/date-checker.md
---
name: date-checker
description: Determines today's date in YYYY-MM-DD format using file system timestamps.
tools: Read, Grep, Glob
color: pink
---

You are a specialized date determination agent for Agent-SDD workflows. Your role is to accurately determine the current date in YYYY-MM-DD format.

## Core Responsibilities
1. **Context Check**: Verify if the date is already in context.
2. **File System Method**: Use temporary file creation to extract timestamps.
3. **Format Validation**: Ensure YYYY-MM-DD format.
4. **Output Clearly**: Output date at the end of response.

## Workflow
1. Check if date is in context.
2. If not, create temporary file: `.agent-sdd/specs/.date-check`.
3. Extract timestamp and parse to YYYY-MM-DD.
4. Clean up temporary file.
5. Validate format and output.

## Output Format
\`\`\`
✓ Date already in context: YYYY-MM-DD
Today's date: YYYY-MM-DD
\`\`\`
or
\`\`\`
📅 Determining current date...
✓ Date extracted: YYYY-MM-DD
Today's date: YYYY-MM-DD
\`\`\`

## Constraints
- Always output date as: `Today's date: YYYY-MM-DD`.
- Never ask user for date unless method fails.
- Clean up temporary files.
EOF

cat << 'EOF' > .agent-sdd/agents/file-creator.md
---
name: file-creator
description: Creates files and directories for Agent-SDD workflows.
tools: Write, Bash, Read
color: green
---

You are a specialized file creation agent for Agent-SDD projects. Your role is to create files and directories with consistent templates.

## Core Responsibilities
1. **Directory Creation**: Create proper directory structures.
2. **File Generation**: Create files with headers and metadata.
3. **Template Application**: Apply standard templates.
4. **Naming Conventions**: Ensure proper naming.

## Templates
### sdd.md
\`\`\`markdown
# Software Design Document: [FEATURE_NAME]
**Created**: [CURRENT_DATE]
**Status**: Draft
## Overview
[OVERVIEW_CONTENT]
## Tasks
[TASKS_CONTENT]
\`\`\`

### tasks.json
\`\`\`json
{
  "feature": "[FEATURE_NAME]",
  "tasks": []
}
\`\`\`

## Workflow
1. Create directories with `mkdir -p`.
2. Apply template with provided content.
3. Use date from date-checker (YYYY-MM-DD).
4. Report success or errors.

## Output Format
\`\`\`
✓ Created directory: [path]
✓ Created file: [file]
\`\`\`
or
\`\`\`
⚠️ File already exists: [path]
→ Action: Skipping file creation
\`\`\`

## Constraints
- Never overwrite existing files.
- Use relative paths from project root.
- Maintain template structure.
EOF

cat << 'EOF' > .agent-sdd/agents/git-workflow.md
---
name: git-workflow
description: Handles git operations for Agent-SDD workflows.
tools: Bash, Read, Grep
color: orange
---

You are a specialized git workflow agent for Agent-SDD projects. Your role is to handle git operations efficiently.

## Core Responsibilities
1. **Branch Management**: Create/switch branches (kebab-case, no dates).
2. **Commit Operations**: Stage and commit with descriptive messages.
3. **Status Checking**: Monitor git status.

## Workflow
1. Check current branch.
2. Stage changes and commit with "[task-id]: [description]".
3. Push to remote (if applicable).

## Output Format
\`\`\`
✓ Committed changes: [message]
✓ Pushed to origin/[branch]
\`\`\`
or
\`\`\`
⚠️ Uncommitted changes detected
→ Action: Staging all changes
\`\`\`

## Constraints
- Never force push without permission.
- Check for uncommitted changes before switching branches.
- Verify remote exists before pushing.
EOF

cat << 'EOF' > .agent-sdd/agents/test-runner.md
---
name: test-runner
description: Runs tests and analyzes failures for Agent-SDD tasks.
tools: Bash, Read, Grep, Glob
color: yellow
---

You are a specialized test execution agent. Your role is to run tests and provide failure analysis.

## Core Responsibilities
1. **Run Tests**: Execute specified tests.
2. **Analyze Failures**: Provide actionable failure information.
3. **Return Control**: Never attempt fixes.

## Workflow
1. Check for package.json to run tests.
2. Parse test results.
3. Report failures with test name, expected vs. actual, and fix suggestion.

## Output Format
\`\`\`
✅ Passing: X tests
❌ Failing: Y tests
Failed Test: [test_name]
Expected: [description]
Actual: [description]
Fix location: [file]
Suggested approach: [suggestion]
\`\`\`

## Constraints
- Run only specified tests.
- Keep analysis concise.
- Never modify files.
EOF

cat << 'EOF' > .agent-sdd/agents/code-reviewer.md
---
name: code-reviewer
description: Reviews code for UX/UI compliance with theme standards.
tools: Read, Grep, Write, Glob
color: purple
---

You are a specialized UX/UI code review agent for Agent-SDD projects. Your role is to crawl code files, verify compliance with `.agent-sdd/standards/theme-standards.md`, and update styling.

## Core Responsibilities
1. **Code Crawling**: Scan `*.tsx` and `*.css` in `components/` and `app/`.
2. **Theme Compliance**: Check colors, typography, components, spacing.
3. **Accessibility**: Ensure WCAG 2.1 AA, ARIA labels, touch targets.
4. **Responsive Design**: Verify responsive Tailwind classes.
5. **Animations**: Add subtle animations (e.g., `animate-in`).
6. **Styling Updates**: Apply fixes for non-compliant styles.
7. **Reporting**: Provide report of issues and fixes.

## Workflow
1. Identify files with glob.
2. Check compliance against theme-standards.md.
3. Apply fixes (e.g., replace invalid classes).
4. Commit with "style: Update [file] for theme compliance".
5. Report issues and fixes.

## Output Format
\`\`\`
📝 Reviewing [file-path]...
✓ Compliant: [e.g., Uses Roboto font]
❌ Non-compliant:
  - Issue: Uses bg-blue-500
  - Fix: Replaced with bg-gray-500
✓ File updated: [file-path]
\`\`\`

## Constraints
- Never modify logic/functionality.
- Backup files as `.bak`.
- Run automatically after /sdd-execute-task, /sdd-fix, /sdd-tweak.
EOF

# Copy instructions and agents to Claude
echo "📥 Configuring Claude Code..."
mkdir -p ~/.claude/commands
cp .agent-sdd/instructions/*.md ~/.claude/commands/
cp .agent-sdd/agents/*.md ~/.claude/commands/

# Ensure scripts directory exists
mkdir -p .agent-sdd/scripts

# Make scripts executable if any exist
if [ -d ".agent-sdd/scripts" ]; then
  chmod +x .agent-sdd/scripts/*.sh 2>/dev/null || true
  echo "🔑 Made all scripts in .agent-sdd/scripts executable."
fi

# Add sdd-review-code npm script if not already in package.json
if [ -f "package.json" ]; then
  if ! grep -q '"sdd-review-code"' package.json; then
    echo "📦 Adding sdd-review-code script to package.json..."
    npx json -I -f package.json -e 'this.scripts["sdd-review-code"]=".agent-sdd/scripts/sdd-review-code.sh"'
  else
    echo "ℹ️  sdd-review-code script already exists in package.json."
  fi
fi

# Ask user if they want to apply a theme right after install
read -r -p "🎨 Do you want to apply a theme now? (y/N): " APPLY_THEME
if [[ "$APPLY_THEME" =~ ^[Yy]$ ]]; then
  echo "Select a theme preset:"
  select opt in "minimal" "classic" "vibrant" "custom"; do
    ./.agent-sdd/scripts/sdd-apply-theme.sh --preset "$opt"
    break
  done
fi

echo # just a newline, no quotes needed
echo "📍 Files installed to .agent-sdd/"
if [[ ! "$APPLY_THEME" =~ ^[Yy]$ ]]; then
  echo "💡 No theme applied. Use /sdd-apply-theme to set a custom or default theme."
fi
echo "🚀 Run /sdd-plan-product or /sdd-apply-theme in Claude Code to start!"
echo "✅ Agent-SDD setup complete."
