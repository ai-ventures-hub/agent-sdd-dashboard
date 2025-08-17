# Decisions

- 2025-08-13: Use Tailwind/shadcn/ui (DEC-001, Accepted, Technical)  
  - Rationale: Consistent styling, accessibility  
  - Alternatives: Custom CSS (too complex)  

- 2025-08-17: CSS Variables Theme Implementation (DEC-002, Accepted, Technical)  
  - Rationale: Successfully implemented minimal dark theme using CSS variables  
  - Implementation: styles.css with root variables for colors (--bg, --panel, --card, --text, etc.)  
  - Status: Theme compliance verified across all UI components  

- 2025-08-17: Agent-SDD Installer Wizard (DEC-003, Accepted, Product)  
  - Rationale: Provide a way to install `.agent-sdd/` in projects that don't already have it, lowering entry barriers.  
  - Implementation: Add "Install Agent SDD" button → folder selection → guided setup wizard referencing `update-guide.md`.  
  - Status: Planned for Phase 3 (Q2 2025).  

- 2025-08-17: Backend API Commands Implementation Status (DEC-004, Completed, Technical)  
  - Current State: Phase 2 (Backend API Commands) completed successfully - all 8 tasks complete with UX/UI review  
  - Implementation: Full Tauri backend integration enabling directory browsing, file system access, and project scanning  
  - Status: Application now has complete functionality from frontend to backend  

- 2025-08-17: Specs Management Window Feature Scope (DEC-005, Accepted, Product)  
  - Rationale: Phase 4 roadmap item to provide centralized management of all .agent-sdd/specs/ folders  
  - Scope: Table view with filters, details panel, task progress tracking, and quick actions integration  
  - Architecture: Two-panel layout (specs table + details) with comprehensive metadata display  
  - Dependencies: Requires existing backend API commands and text display functionality  
  - Effort Estimate: 16 tasks ranging from XS to M complexity, approximately 3-4 weeks development  

- 2025-08-17: Modal to Full-Screen Page Transformation (DEC-006, Revised, UX/Technical)  
  - Rationale: Current modal implementation feels cramped and squashed, limiting productivity for serious spec management work  
  - Solution: Transform to full-screen page within the app (100% viewport) providing unlimited screen real estate  
  - Benefits: Seamless navigation, resizable layout splitter, better space utilization, focused interface, no modal constraints  
  - Implementation: Replace modal with full-screen overlay page, add back navigation, enhance layout for maximum space usage  
  - User Impact: Significantly improved user experience for spec management workflows with intuitive page-based navigation  
