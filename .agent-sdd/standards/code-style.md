# Code Style
# ✅ Extended for Tauri macOS desktop app (Rust + React/TypeScript)

- **Naming**
  - JavaScript/TypeScript:
    - camelCase for variables, functions
    - PascalCase for components and types/interfaces
    - CONSTANT_CASE for environment variables
  - Rust:
    - snake_case for variables, functions, and file names
    - PascalCase for structs, enums, and traits
    - SCREAMING_SNAKE_CASE for constants

- **Formatting**
  - JavaScript/TypeScript:
    - 2-space indentation
    - Prettier enforced (`.prettierrc`)
  - Rust:
    - 4-space indentation
    - Use `cargo fmt` for formatting

- **Comments**
  - JavaScript/TypeScript:
    - JSDoc for functions, inline for clarity
    - Prefer self-documenting code over excessive comments
  - Rust:
    - `///` for public functions and modules (rustdoc style)
    - `//` for inline comments

- **File Organization**
  - Group React components by feature (e.g., `/components/Sidebar/Sidebar.tsx`)
  - Use `index.ts` for re-exports within component folders
  - Rust backend: keep commands in `src-tauri/src/commands/` and utilities in `src-tauri/src/utils/`

- **Imports**
  - Order imports as:
    1. Standard libraries
    2. External dependencies
    3. Internal modules
  - Use absolute imports for top-level modules when possible

- **Linting**
  - Enforce ESLint with TypeScript rules for frontend
  - Enforce Clippy (`cargo clippy`) for Rust backend

- **Commit Messages**
  - Format: `[type]: [description] (task-id)`
    - Examples: `feat: add Installer Wizard (PH3-T1)`, `fix: resolve crash on project scan (BUG-014)`


