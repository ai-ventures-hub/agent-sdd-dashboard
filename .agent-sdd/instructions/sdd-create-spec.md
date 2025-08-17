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
