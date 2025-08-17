# /sdd-review-code <file-path>
Review code for theme standards compliance:
1. Read .agent-sdd/standards/theme-standards.md for rules.
2. Scan <file-path> for non-compliant styles (colors, typography, components).
3. Apply fixes (e.g., replace invalid Tailwind classes).
4. Commit with message "style: Update [file-path] for theme compliance".
5. Notify user with report: issues found, fixes applied.
