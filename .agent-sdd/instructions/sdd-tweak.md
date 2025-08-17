# /sdd-tweak [--fix-style] [--no-tests] <description>
Apply a minor UI tweak:
1. Create task in .agent-sdd/specs/YYYY-MM-DD-tweak/tasks.json.
2. Implement tweak, strictly following .agent-sdd/standards/theme-standards.md.
3. Run /sdd-review-code on modified files to ensure UX/UI compliance.
4. Commit with message "tweak: [description]".
5. Update task status to "Done" and set ux_ui_reviewed: true.
6. Notify user with summary.
