# Software Design Document: Main.js Code Refactoring

**Feature**: Refactor main.js code
**Date**: 2025-08-17
**Phase**: Phase 2

## Overview

### Goal
Break apart the large main.js file (741 lines) into smaller, logically organized components to improve maintainability, testability, and code organization.

### User Story
As a developer working on the Agent SDD Viewer, I want the codebase to be well-organized with clear separation of concerns so that I can easily find, modify, and test specific functionality without navigating through a massive single file.

### Success Criteria
- [ ] Main.js file reduced to under 100 lines (entry point only)
- [ ] All functionality split into logical modules/components
- [ ] No breaking changes to existing functionality
- [ ] Clear module boundaries and interfaces
- [ ] Improved code maintainability and testability

## Technical Specs

### Current State Analysis
The current main.js file (741 lines) contains:
- **File Preview Modal** (lines 28-293): Complete modal system with markdown rendering
- **Specs Management Window** (lines 295-741): Complex table-based specs browser
- **Event Handlers Setup** (lines 7-26): DOM event binding
- **Utility Functions** (lines 681-737): Helper functions for formatting and data manipulation

### Proposed Module Structure

```
frontend/
├── components/
│   ├── modals/
│   │   ├── filePreview.js      # File preview modal functionality
│   │   └── specsManagement.js  # Specs management window
│   ├── ui/
│   │   ├── table.js           # Reusable table component
│   │   └── filters.js         # Search and filter components
│   └── renderers/
│       └── markdown.js        # Markdown rendering logic
├── utils/
│   ├── formatters.js          # Date, file size formatting
│   ├── dom.js                 # DOM manipulation utilities
│   └── debounce.js            # Utility functions
├── services/
│   └── specsService.js        # Backend API calls for specs
├── main.js                    # Entry point (< 100 lines)
└── shared.js                  # Existing shared state
```

### Module Responsibilities

#### 1. `components/modals/filePreview.js`
- **Exports**: `openFilePreview(filePath)`
- **Responsibilities**: 
  - File preview modal creation and management
  - Content loading and rendering
  - Modal lifecycle (open/close/keyboard handling)

#### 2. `components/modals/specsManagement.js`
- **Exports**: `openSpecsManagementWindow()`, `setupSpecsManagementWindow()`
- **Dependencies**: `services/specsService.js`, `components/ui/table.js`, `components/ui/filters.js`
- **Responsibilities**:
  - Specs management window creation
  - Window lifecycle management
  - Integration with table and filter components

#### 3. `components/renderers/markdown.js`
- **Exports**: `renderBasicMarkdown(text)`, `processLists(html)`
- **Responsibilities**:
  - Markdown to HTML conversion
  - List processing and formatting
  - HTML escaping utilities

#### 4. `components/ui/table.js`
- **Exports**: `createSpecsTable()`, `renderSpecsTable(specs)`, `setupTableSorting()`
- **Dependencies**: `utils/formatters.js`
- **Responsibilities**:
  - Table creation and rendering
  - Row selection handling
  - Sorting functionality

#### 5. `components/ui/filters.js`
- **Exports**: `setupSpecsFilters()`, `applySpecsFilters()`
- **Dependencies**: `utils/debounce.js`
- **Responsibilities**:
  - Search input handling
  - Filter dropdown management
  - Filter application logic

#### 6. `services/specsService.js`
- **Exports**: `loadSpecsData()`, `scanSpecs(projectPath)`
- **Responsibilities**:
  - Backend API communication
  - Data fetching and caching
  - Error handling for API calls

#### 7. `utils/formatters.js`
- **Exports**: `formatDate()`, `formatFileSize()`, `getStatusIcon()`, `getStatusClass()`
- **Responsibilities**:
  - Date formatting utilities
  - File size formatting
  - Status icon and class mappings

#### 8. `utils/dom.js`
- **Exports**: `escapeHtml()`, `createModal()`, `closeModal()`
- **Responsibilities**:
  - DOM manipulation utilities
  - Modal creation helpers
  - HTML escaping

#### 9. `main.js` (Refactored)
- **Responsibilities**:
  - Application initialization
  - Module imports and setup
  - Event handler registration
  - Entry point coordination

### UI Requirements

#### Component Integration
- All modals must maintain current styling and behavior
- Table sorting and filtering must work exactly as before
- File preview functionality must support all current file types
- Keyboard shortcuts (ESC, etc.) must continue working

#### Theme Standards Compliance
- All components must use CSS variables defined in theme standards
- Maintain current Tailwind CSS classes and styling
- Ensure consistent spacing using 4px grid system
- Use `rounded-xl` for modal corners
- Maintain current color scheme for status indicators

## Test Scenarios

### Functional Testing
1. **File Preview Modal**
   - Open various file types (.md, .json, .txt)
   - Verify markdown rendering works correctly
   - Test modal close via button, backdrop, and ESC key
   - Verify proper cleanup when opening multiple files

2. **Specs Management Window**
   - Open specs management window
   - Test table sorting on all columns
   - Test search functionality with various terms
   - Test phase and status filtering
   - Verify spec selection shows details panel
   - Test window close functionality

3. **Module Integration**
   - Verify all functionality works after refactoring
   - Test that imports/exports work correctly
   - Verify no console errors during module loading

### Performance Testing
- Page load time should not increase significantly
- Module loading should be efficient
- Memory usage should remain similar

### Regression Testing
- All existing functionality must work identically
- No visual or behavioral changes
- All keyboard shortcuts continue working
- Error handling remains robust

## Theme Standards Compliance

### Color Usage
- All status indicators use defined CSS variables
- Error states use `--error` color
- Success states use `--success` color
- Text uses `--text` and `--text-muted` variables

### Typography
- Maintain base font family from theme standards
- Use Tailwind typography classes (`text-sm`, `text-lg`)
- Preserve current line heights and spacing

### Component Standards
- Modals use centered layout with `rounded-xl`
- Buttons maintain current styling patterns
- Tables use consistent padding and spacing
- All interactive elements remain keyboard accessible

### Accessibility
- All `aria-label` attributes preserved
- Keyboard navigation continues working
- Focus management in modals maintained
- Screen reader compatibility preserved