# Tech Stack
# ✅ Updated for Agent-SDD Desktop Viewer (Tauri on macOS)

- **Framework**
  - [Tauri](https://tauri.app) (v2.x) → Lightweight, secure desktop app framework
  - Rust (latest stable) → Backend command handling (filesystem, project scanning)

- **Frontend**
  - React (v18.x)
  - TypeScript (v5.x)

- **Styling**
  - Tailwind CSS (v3.x) → Utility-first styling
  - shadcn/ui (latest) → Component library on top of Tailwind
  - CSS Variables → Theme customization (light/dark, color tokens)

- **Testing**
  - Jest (v29.x) for unit tests (frontend)
  - Playwright (optional, for end-to-end testing desktop UI)
  - cargo test (Rust backend)

- **Build & Tooling**
  - Prettier (v3.x) → Code formatting
  - ESLint (v9.x) → Linting for TypeScript/React
  - Cargo Clippy + cargo fmt → Linting and formatting for Rust
  - Git (CLI + GitHub Desktop) → Version control

- **OS Support**
  - macOS (primary target; signed and notarized builds)
  - Windows/Linux planned for later phases
