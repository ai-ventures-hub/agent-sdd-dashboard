# Claude Code Instructions for Agent-SDD

This file registers the Agent-SDD instruction system for use with Claude Code.

## Available Instructions

### /sdd-execute-task
Execute a task:
1. Load task from .agent-sdd/specs/*/tasks.json.
2. Reference .agent-sdd/standards/theme-standards.md for style compliance.
3. Write tests (TDD) if applicable.
4. Implement code, commit with message "[task-id]: [description]".
5. Run task-specific tests (if package.json exists).
6. Use Agent-SDD instruction: /sdd-review-code on modified files (NOT bash command) to ensure UX/UI compliance.
7. Update task status to "completed" and set ux_ui_reviewed: true in tasks.json.
8. Notify user with summary: tasks completed, issues, commit hash.

### /sdd-review-code
Review code for Agent-SDD compliance:
1. Load .agent-sdd/standards/theme-standards.md.
2. Review provided files for compliance.
3. Generate detailed feedback on violations.
4. Suggest specific fixes for issues found.
5. Mark as compliant if no issues exist.

### /sdd-fix
Fix bugs in Agent-SDD projects:
1. Load .agent-sdd/standards/ for context.
2. Identify root cause of the issue.
3. Implement minimal fix following standards.
4. Test the fix thoroughly.
5. Commit with descriptive message.
6. Use /sdd-review-code on modified files.

### /sdd-tweak
Make small improvements to Agent-SDD projects:
1. Load .agent-sdd/standards/ for context.
2. Implement requested enhancement.
3. Follow existing patterns and standards.
4. Test the changes.
5. Commit with descriptive message.
6. Use /sdd-review-code on modified files.

### /sdd-create-spec
Create new Agent-SDD specification:
1. Generate unique spec ID and date.
2. Break down requirements into tasks.
3. Follow Agent-SDD spec format.
4. Create tasks.json with proper structure.
5. Save to .agent-sdd/specs/[spec-name]-[date]/.

### /sdd-apply-theme
Apply Agent-SDD theme standards:
1. Load .agent-sdd/standards/theme-standards.md.
2. Review existing UI components.
3. Apply consistent styling and theming.
4. Update CSS/styling files.
5. Test visual consistency.
6. Commit changes with theme message.

### /sdd-analyze
Analyze Agent-SDD project structure:
1. Examine .agent-sdd/ directory structure.
2. Review specs, standards, and scripts.
3. Identify patterns and conventions.
4. Generate analysis report.
5. Suggest improvements if needed.

### /sdd-plan-product
Plan product features for Agent-SDD:
1. Review .agent-sdd/product/ directory.
2. Analyze existing roadmap and decisions.
3. Create new feature specifications.
4. Generate implementation timeline.
5. Update product documentation.

### /sdd-check-task
Check task status and dependencies:
1. Load task from .agent-sdd/specs/*/tasks.json.
2. Verify task exists and is valid.
3. Check dependency requirements.
4. Report current status and blockers.
5. Suggest next actions.

### /sdd-queue-fix
Queue a bug fix for later execution:
1. Create fix specification.
2. Add to appropriate spec file.
3. Generate task ID and metadata.
4. Set dependencies if needed.
5. Notify user of queued fix.

### /sdd-queue-tweak
Queue an improvement for later execution:
1. Create tweak specification.
2. Add to appropriate spec file.
3. Generate task ID and metadata.
4. Set dependencies if needed.
5. Notify user of queued tweak.