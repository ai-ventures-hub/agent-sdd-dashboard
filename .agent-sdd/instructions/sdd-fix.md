# /sdd-fix [--no-tests] <description>
Apply a quick fix:
1. Create task in .agent-sdd/specs/YYYY-MM-DD-quick-fix/tasks.json.
2. Implement fix, ensuring .agent-sdd/standards/theme-standards.md compliance.
3. Run /sdd-review-code on modified files to ensure UX/UI compliance.
4. Commit with message "fix: [description]".
5. Update task status to "Done" and set ux_ui_reviewed: true.
6. Notify user with summary.
