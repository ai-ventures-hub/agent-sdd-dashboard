# /sdd-fix [--no-tests] <description>
Apply a quick fix:
1. Use date-checker agent to get current date, then create task in .agent-sdd/specs/fix-[task-id]-[CURRENT-DATE]/tasks.json.
2. Implement fix, ensuring .agent-sdd/standards/theme-standards.md compliance.
3. Use Agent-SDD instruction: /sdd-review-code on modified files (NOT bash command) to ensure UX/UI compliance.
4. Commit with message "fix: [description]".
5. Update task status to "completed" and set ux_ui_reviewed: true.
6. Notify user with summary.
