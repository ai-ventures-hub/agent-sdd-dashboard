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

- 2025-08-17: Backend API Commands Implementation Status (DEC-004, In Progress, Technical)  
  - Current State: Phase 1 (Text Display) completed successfully - all 8 tasks complete with theme compliance  
  - Backend Progress: Tauri command structure setup completed (BAC-001), 7 remaining tasks pending  
  - Critical Need: Frontend is fully functional for text display but lacks backend connectivity for directory browsing  
  - Next Priority: Complete BAC-002 through BAC-008 to enable full application functionality  
