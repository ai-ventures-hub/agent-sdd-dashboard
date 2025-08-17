# Roadmap
- Phase 0: Already Completed
  - [x] Agent-SDD setup
- Phase 1: Completed (Q3 2025)
  - [x] Text Display component (Core functionality completed)
- Phase 2: Completed (Q1 2025)
  - [x] Backend API Commands (Enable file system access)
- Phase 3: Completed Development (Q2 2025)
  - [x] Agent-SDD Installer Wizard (Install `.agent-sdd/` into existing projects via guided setup)
- Phase 4: Current Development (Q3 2025)
  - [ ] Specs Management Window
    - Dedicated window pane for managing all `.agent-sdd/specs/`
    - **Specs Table View**: Show specs (`sdd.md` + `tasks.json`) with metadata (date, feature, size, modified time)
    - **Spec Details Panel**: Clicking a row reveals spec overview, tasks, and status
    - **Task Progress Tracking**: Inline indicators for tasks (✅ done, ⏳ in-progress, ❌ not started)
    - **Filters & Search**: Filter by phase, status, or keywords
    - **Quick Actions**:
      - Open `sdd.md` in viewer/editor
      - Mark tasks as done (update `tasks.json`)
      - Create new spec (`/sdd-create-spec`)
      - Run spec analysis (`/sdd-analyze`)
    - **Phase Awareness**: Group specs by roadmap phase (Phase 1, Phase 2, etc.)
    - **Inline Editing (future)**: Edit tasks directly without leaving the UI
    - **UI Design Goal**: Left → table list, Right → details panel for selected spec

## Progress Log
**[2025-01-17] – Completed Agent-SDD Installer Wizard**  
- Guided Setup: Step-by-step wizard with validation  
- Customizable: Users can choose which directories to create  
- Template Generation: Pre-populated files with helpful content  
- Error Prevention: Checks for existing `.agent-sdd` directories  
- Progress Tracking: Visual feedback during installation  
- Professional Templates: Structured markdown files with best practices  

**[2025-01-17] – Completed Backend API Commands Phase**  
- **What:** Created specification for Tauri backend implementation  
- **Why:** Frontend UI is complete but non-functional without backend API  
- **Impact:** Will enable full application functionality - directory browsing, project scanning, file viewing  

**[2025-08-17] – Completed Text Display Component**  
- **What:** Implemented modal-based text display with markdown rendering  
- **Why:** Core feature for viewing `.agent-sdd` documentation files inline  
- **Impact:** Users can now click on `.md`, `.json`, and `.txt` files to preview content  

**[2025-08-14] – Completed Initial Theme Integration**  
- **What:** Applied minimal theme preset and verified color standards.  
- **Why:** Ensures consistent design and accessibility from the start.  
- **Impact:** All components must use theme variables; old hardcoded colors replaced.  