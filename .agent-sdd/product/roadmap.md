# Roadmap
- Phase 0: Already Completed
  - [x] Agent-SDD setup
- Phase 1: Completed (Q3 2025)
  - [x] Text Display component (Core functionality completed)
- Phase 2: Completed (Q1 2025)
  - [x] Backend API Commands (Enable file system access)
- Phase 3: Current Development (Q2 2025)
  - [ ] Agent-SDD Installer Wizard (Install `.agent-sdd/` into existing projects via guided setup)
- Phase 4: Planned (Q3 2025)
  - [ ] File Navigation UI (Sidebar tree view, collapse/expand, search)
  - [ ] File Actions (Open in editor, copy path, search across specs)
- Phase 5: Planned (Q4 2025)
  - [ ] Advanced Features (Cross-project search, theme switcher, markdown enhancements, cloud sync)

## Progress Log

**[2025-01-17] – Started Backend API Commands Phase**  
- **What:** Created specification for Tauri backend implementation  
- **Why:** Frontend UI is complete but non-functional without backend API  
- **Impact:** Will enable full application functionality - directory browsing, project scanning, file viewing  

**[2025-08-17] – Completed Text Display Component**  
- **What:** Implemented modal-based text display with markdown rendering  
- **Why:** Core feature for viewing `.agent-sdd` documentation files inline  
- **Impact:** Users can now click on .md, .json, and .txt files to preview content  

**[2025-08-14] – Completed Initial Theme Integration**  
- **What:** Applied minimal theme preset and verified color standards.  
- **Why:** Ensures consistent design and accessibility from the start.  
- **Impact:** All components must use theme variables; old hardcoded colors replaced.  
