# Decisions

## 2025-08-18: Execute Instructions from Dashboard
- **Decision**: Add UI controls to execute Agent-SDD instruction commands directly from the dashboard
- **Rationale**: Users need a seamless workflow without switching between dashboard and command line
- **Implementation**: 
  - Add command buttons to task cards for non-complete tasks
  - Use Tauri commands to execute shell scripts
  - Display execution output in modal with real-time updates
- **Trade-offs**: 
  - Adds complexity to UI but significantly improves user experience
  - Requires careful error handling for shell command execution
