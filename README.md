# Agent SDD Dashboard

A minimal **local-only Tauri desktop app** for exploring and managing [Agent-SDD](../README.md) projects.  
The dashboard provides a visual interface for `.agent-sdd/` projects, making it easier to view standards, specs, and progress logs without digging through raw files.

## ✨ Features
- **Project Scanner** → Detects projects that have `.agent-sdd/` installed.  
- **Dashboard View** → Displays key sections: specs, standards, product docs, and instructions.  
- **File Viewer** → Preview `.md`, `.json`, and `.txt` files in a modal with markdown rendering.  
- **Installer Wizard** *(Planned)* → Install `.agent-sdd/` into an existing project via guided setup (based on `update-guide.md`).  
- **Theme Enforcement** *(Planned)* → Auto-fix non-compliant Tailwind classes using `scripts/fix-theme-style.sh`.  
- **Navigation UI** *(Planned)* → Sidebar tree view with search and filtering.  

## 🛠️ Prerequisites
- [Rust toolchain](https://rustup.rs)  
- Tauri CLI:  
  ```bash
  cargo install tauri-cli
  # or
  npm i -g @tauri-apps/cli
