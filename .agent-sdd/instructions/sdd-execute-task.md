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
