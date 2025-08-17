# Software Design Document: Specs Management Window

## Overview

### Goal
Transform the existing Specs Management modal interface into a full-screen page within the application providing significantly more screen real estate for improved productivity and user experience.

### User Story
As a developer using the Agent-SDD Viewer, I want the Specs Management interface to open as a full-screen page instead of a cramped modal dialog, so that I can:
- Have much more space to view specifications without the squashed feeling
- Navigate seamlessly between the main project view and specs management
- Use a resizable layout to optimize space for both table and details panels
- View detailed task information without scrolling constraints
- Have a clean, focused interface dedicated to spec management work

### Success Criteria
- [x] **Page Transformation**: Specs Management opens as full-screen page instead of cramped modal
- [x] **Expanded Interface**: Significantly more screen space eliminates the squashed feeling
- [x] **Page Navigation**: Seamless navigation with back button and clear page header
- [ ] **Content Migration**: All existing functionality (table, details, search, filters) works in new page
- [x] **Enhanced Layout**: Two-column layout with resizable splitter maximizes space usage
- [x] **Theme Compliance**: Consistent styling with main app following theme standards
- [ ] **Performance**: Smooth operation with optimized rendering and state management
- [ ] **Accessibility**: Full keyboard navigation and screen reader support in page context

## Technical Specifications

### Page Architecture

#### Full-Screen Page Implementation
- **Page Type**: Full-screen overlay page within existing application window
- **Page Size**: 100% viewport width and height (unlimited space vs. modal's 1200x800px max)
- **Navigation**: Seamless page switching with back button to return to main project view
- **Z-Index**: High z-index (1000) to overlay main content completely
- **Background**: Consistent with app theme but independent layout

#### Page Management
- **Opening**: Replace `openSpecsManagementWindow()` modal with `openSpecsManagementPage()`
- **State Management**: Hide main content and show full-screen specs page
- **Navigation**: Back button returns to main project view with smooth transitions
- **Lifecycle**: Proper cleanup when page is closed, restore main content visibility
- **Context**: Maintain project context and data between page switches

#### Layout Enhancement
- **Current Modal Size**: 95% width, 85vh height, max 1200x800px constrained
- **New Page Size**: 100vw × 100vh (unlimited space utilization)
- **Content Area**: ~95% usable space vs. ~68% in modal (significant improvement)
- **Space Increase**: Approximately **40% more effective screen real estate**
- **Layout**: Header (navigation) + Toolbar (search/filters) + Resizable Content
- **Splitter**: Adjustable divider between table (60%) and details (40%) with persistence

### UI Requirements

#### Layout Structure
```
┌─────────────────────────────────────────────────────────────┐
│ [Toolbar: Search, Filters, Actions]                        │
├─────────────────────┬───────────────────────────────────────┤
│ Specs Table         │ Details Panel                         │
│ ┌─────────────────┐ │ ┌───────────────────────────────────┐ │
│ │ □ Feature | Date│ │ │ Spec Overview                     │ │
│ │ ✅ API Cmds 1/17│ │ │ ┌─────────────────────────────────┐ │ │
│ │ ⏳ Text UI  8/17│ │ │ │ Goal: Enable file system...    │ │ │
│ │ ❌ Installer 1/17│ │ │ └─────────────────────────────────┘ │ │
│ │ ...             │ │ │ Tasks Progress (4/8 completed)   │ │
│ └─────────────────┘ │ │ ┌─────────────────────────────────┐ │ │
│                     │ │ │ ✅ BAC-001: Setup commands     │ │ │
│                     │ │ │ ✅ BAC-002: File dialog        │ │ │
│                     │ │ │ ⏳ BAC-003: List directories   │ │ │
│                     │ │ │ ❌ BAC-004: Scan project       │ │ │
│                     │ │ └─────────────────────────────────┘ │ │
│                     │ │ [Quick Actions]                   │ │
│                     │ └───────────────────────────────────┘ │
└─────────────────────┴───────────────────────────────────────┘
```

#### Specs Table Columns
- **Status Icon**: Visual indicator (✅/⏳/❌) based on task completion
- **Feature Name**: Extracted from spec folder name or sdd.md title
- **Phase**: Roadmap phase assignment (Phase 1, Phase 2, etc.)
- **Date**: Creation date from folder name
- **Progress**: "X/Y tasks" completion ratio
- **Size**: Effort indicator (XS/S/M/L based on task efforts)
- **Modified**: Last modification time of sdd.md or tasks.json

#### Details Panel Components
1. **Spec Overview Section**
   - Feature name and description
   - Goal and user story from sdd.md
   - Success criteria checklist

2. **Task Progress Section**
   - List of all tasks with status icons
   - Task names, IDs, and effort estimates
   - Dependencies visualization
   - Completion timestamps

3. **Quick Actions Bar**
   - "Open SDD" button → launches text display modal
   - "Mark Task Done" dropdown → updates tasks.json
   - "Create Related Spec" button → launches /sdd-create-spec
   - "Run Analysis" button → launches /sdd-analyze

#### Filters & Search
- **Phase Filter**: Dropdown (All, Phase 1, Phase 2, Phase 3, Phase 4)
- **Status Filter**: Dropdown (All, Completed, In Progress, Not Started)
- **Search Box**: Full-text search across feature names and descriptions
- **Sort Options**: Date, Progress, Phase, Alphabetical

### Component Architecture

#### Main Components
1. **SpecsManagementWindow** (main container)
2. **SpecsTable** (left panel table)
3. **SpecDetailsPanel** (right panel details)
4. **SpecsToolbar** (top search and filters)
5. **TaskProgressIndicator** (reusable status component)
6. **QuickActionsBar** (action buttons)

#### Data Flow
```
SpecsManagementWindow
├── useSpecsData() → loads all spec folders + parses JSON
├── useFilters() → manages search/filter state
├── useSelectedSpec() → tracks selected row
└── Components receive filtered data via props
```

#### State Management
- **specs**: Array of parsed spec objects with metadata
- **selectedSpec**: Currently selected spec for details panel
- **filters**: Search term, phase filter, status filter
- **loading**: Loading state for async operations

### Data Models

#### Spec Object Structure
```typescript
interface Spec {
  id: string; // folder name
  folderPath: string;
  featureName: string;
  phase: string;
  createdDate: string;
  modifiedDate: string;
  tasks: Task[];
  totalTasks: number;
  completedTasks: number;
  overallStatus: 'completed' | 'in_progress' | 'not_started';
  effort: 'XS' | 'S' | 'M' | 'L'; // aggregated from tasks
  sddContent?: string; // lazy loaded
}

interface Task {
  id: string;
  name: string;
  description: string;
  status: 'completed' | 'in_progress' | 'pending';
  effort: 'XS' | 'S' | 'M' | 'L';
  dependencies: string[];
  completed?: string;
  ux_ui_reviewed?: boolean;
}
```

### Backend Integration

#### Required Tauri Commands
- **scan_specs_directory()**: Scans .agent-sdd/specs/ and returns folder list
- **load_spec_metadata(path)**: Loads and parses sdd.md + tasks.json
- **update_task_status(specPath, taskId, status)**: Updates tasks.json
- **get_file_modified_time(path)**: Returns last modification timestamp

#### File System Operations
- Read all spec folders from `.agent-sdd/specs/`
- Parse `tasks.json` for task metadata
- Extract feature name from folder name or `sdd.md` title
- Monitor file changes for real-time updates

### Performance Considerations
- **Lazy Loading**: Load spec content only when selected
- **Virtual Scrolling**: Handle 100+ specs efficiently
- **Debounced Search**: Avoid excessive filtering operations
- **Memoization**: Cache parsed spec data to avoid re-parsing

## Theme Standards Compliance

### Color Scheme
- **Background**: Uses `--bg` for main window background
- **Table Rows**: Alternating `--panel` and `--card` backgrounds
- **Selected Row**: Highlight with `--accent` (subtle opacity)
- **Status Icons**: Success (`--success`), Error (`--error`), Neutral (`--text`)
- **Text**: Primary `--text`, secondary with opacity

### Typography
- **Table Headers**: `text-sm font-medium` in `--text`
- **Feature Names**: `text-sm font-semibold` for emphasis
- **Metadata**: `text-xs text-gray-500` for dates/stats
- **Details Panel**: Standard `text-sm` with proper line-height

### Component Styling
- **Table**: `shadcn/ui` Table component with custom styling
- **Cards**: Details panel uses Card component with `p-4`
- **Buttons**: Standard Button variants (primary for main actions)
- **Search Input**: Input component with proper focus states

### Layout & Spacing
- **Grid Gap**: `gap-4` between table and details panel
- **Padding**: `p-4` for main container and panels
- **Margins**: `gap-2` for toolbar elements
- **Rounded Corners**: `rounded-xl` for panels and cards

### Accessibility
- **Keyboard Navigation**: Table rows navigable with arrow keys
- **Screen Reader**: Proper ARIA labels for status icons and actions
- **Focus Management**: Clear focus indicators throughout
- **Color Contrast**: All text meets WCAG 2.1 AA standards

### Motion
- **Row Selection**: Smooth highlight transition with `transition-all duration-200`
- **Panel Loading**: Fade-in animation for details panel content
- **Filter Updates**: Smooth table re-render with Framer Motion
- **Modal Actions**: Standard slide-in for action confirmations

## Test Scenarios

### Functional Testing
1. **Table Display**
   - Load window with multiple specs and verify all metadata displays correctly
   - Test sorting by each column (date, progress, phase, alphabetical)
   - Verify status icons match actual task completion ratios

2. **Selection & Details**
   - Click different table rows and verify details panel updates
   - Test lazy loading of spec content
   - Verify task list displays with correct status indicators

3. **Filtering & Search**
   - Test phase filter dropdown with each option
   - Test status filter combinations
   - Search for partial feature names and descriptions
   - Test filter reset functionality

4. **Quick Actions**
   - "Open SDD" → verify text display modal opens with correct content
   - "Mark Task Done" → verify tasks.json updates and UI refreshes
   - "Create Related Spec" → verify /sdd-create-spec command triggers
   - Test action button states (enabled/disabled based on selection)

### Integration Testing
1. **Backend Commands**
   - Test scan_specs_directory with various folder structures
   - Test load_spec_metadata with malformed JSON
   - Test update_task_status file writing
   - Verify error handling for missing files

2. **File System Monitoring**
   - Create new spec folder and verify table updates
   - Modify existing tasks.json and verify real-time updates
   - Delete spec folder and verify removal from table

### UI/UX Testing
1. **Responsive Layout**
   - Test window resizing and panel proportions
   - Verify table remains usable at minimum window size
   - Test with very long feature names and descriptions

2. **Performance**
   - Load 50+ specs and verify smooth scrolling
   - Test search performance with large datasets
   - Verify memory usage remains reasonable

3. **Theme Compliance**
   - Verify all colors use CSS variables
   - Test light/dark mode switching
   - Verify accessibility standards (contrast, focus, keyboard navigation)

### Error Handling
1. **Malformed Data**
   - Test with corrupted tasks.json files
   - Test with missing sdd.md files
   - Verify graceful degradation and error messages

2. **File System Errors**
   - Test with permission denied scenarios
   - Test with disk space issues during task updates
   - Verify proper error messaging to users