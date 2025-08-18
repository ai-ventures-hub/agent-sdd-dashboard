# Tech Stack
## Core Framework
- **Tauri v2.7.0** - Cross-platform desktop application framework using Rust backend and web frontend
- **Rust** - Backend language for system integration and file operations
- **JavaScript (ES6+ Modules)** - Frontend scripting without additional frameworks

## Frontend Technologies
- **HTML5** - Semantic markup with modern features
- **CSS3** - Modern styling with custom properties and grid/flexbox layouts
- **Tailwind CSS v3.4.1** - Utility-first CSS framework for rapid UI development
- **PostCSS v8.4.33** - CSS processing with Autoprefixer v10.4.16

## Backend Dependencies (Rust)
- **serde/serde_json** - JSON serialization/deserialization
- **tokio** - Async runtime with full features
- **chrono** - Date and time handling with serde support
- **log** - Logging framework

## Tauri Plugins
- **tauri-plugin-fs v2** - File system operations
- **tauri-plugin-dialog v2** - Native dialog support
- **tauri-plugin-log v2** - Logging integration

## Build Tools
- **Tailwind CLI** - CSS compilation and optimization
- **Tauri Build** - Application bundling and packaging
- **Cargo** - Rust package manager and build system

## Architecture
- **Desktop Application** - Native cross-platform desktop app
- **Web-based UI** - HTML/CSS/JS frontend in Tauri webview
- **Local File System** - Direct file system access without external dependencies
- **No External Services** - Completely offline, local-only operation

## Key Features
- ES6 module system for frontend code organization
- Component-based architecture using vanilla JavaScript
- Custom CSS properties for theming
- Rust backend for secure file operations
- Hot reload during development via Tauri dev server
