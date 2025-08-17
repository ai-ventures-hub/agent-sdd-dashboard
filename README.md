# Agent SDD Viewer (Tauri)

Minimal local-only Tauri app that scans a project for `.agent-sdd/` and displays sections and file summaries.

## Prereqs
- Rust toolchain (https://rustup.rs)
- Tauri CLI: `cargo install tauri-cli` (or `npm i -g @tauri-apps/cli`)

## Dev
```bash
cd agent-sdd-viewer
tauri dev        # or: cargo tauri dev
```

## Build
```bash
tauri build      # or: cargo tauri build
```
