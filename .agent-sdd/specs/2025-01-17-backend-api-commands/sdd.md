# Software Design Document: Backend API Commands

## Overview

### Goal
Implement Tauri backend commands to enable file system access and project scanning capabilities, making the Agent SDD Viewer fully functional and interactive.

### User Story
As a developer using Agent SDD Viewer, I want to browse my local projects, scan their .agent-sdd directories, and view file contents directly in the application, so that I can monitor and manage my SDD-driven projects effectively.

### Success Criteria
- Users can select a base directory using the file dialog
- Application lists all subdirectories as potential projects
- Clicking on a project scans its .agent-sdd structure and displays statistics
- Users can click on .md, .json, and .txt files to view their contents
- File content is properly escaped and secured (no arbitrary code execution)
- All file operations are read-only for safety

## Technical Specifications

### Architecture
- **Backend**: Rust/Tauri commands with proper error handling
- **Frontend**: JavaScript async/await calls to Tauri API
- **Security**: Path validation, read-only operations, proper escaping

### API Commands to Implement

#### 1. `select_base_dir`
- Opens native file dialog for directory selection
- Returns selected directory path or null if cancelled
- Validates path exists and is readable

#### 2. `list_child_directories`
- Takes base directory path as input
- Returns array of immediate subdirectories with metadata
- Filters out hidden directories (starting with .)
- Returns: `{name: string, full_path: string}[]`

#### 3. `scan_project`
- Takes project directory path as input
- Scans for .agent-sdd folder structure
- Collects file statistics (count, size, latest modified)
- Returns comprehensive report object with sections

#### 4. `read_file`
- Takes file path as input
- Validates file exists and is readable
- Returns file content as string
- Implements size limit (e.g., 10MB) for safety

### UI Requirements
- Error handling with user-friendly messages
- Loading states during async operations
- Disabled state for buttons during operations
- Console errors logged for debugging

### Data Flow
1. User clicks "Choose Base Directory" → `select_base_dir()` → Updates UI
2. Base directory selected → `list_child_directories()` → Populates project list
3. User clicks "Open" on project → `scan_project()` → Displays statistics
4. User clicks file link → `read_file()` → Opens text display modal

## Tasks

| ID | Task | Description | Dependencies | Effort |
|----|------|-------------|--------------|--------|
| BAC-001 | Setup Tauri command structure | Create command module and register with Tauri builder | None | XS |
| BAC-002 | Implement select_base_dir | Native file dialog for directory selection | BAC-001 | S |
| BAC-003 | Implement list_child_directories | List subdirectories with filtering | BAC-001 | S |
| BAC-004 | Implement scan_project | Scan .agent-sdd structure and collect stats | BAC-001 | M |
| BAC-005 | Implement read_file | Safe file reading with size limits | BAC-001 | S |
| BAC-006 | Add error handling | Comprehensive error types and messages | BAC-002, BAC-003, BAC-004, BAC-005 | S |
| BAC-007 | Frontend API integration | Connect JavaScript to Tauri commands | BAC-002, BAC-003, BAC-004, BAC-005 | S |
| BAC-008 | Test all workflows | End-to-end testing of all user flows | BAC-007 | S |

## Test Scenarios

### Scenario 1: Directory Selection
1. Click "Choose Base Directory"
2. Select a valid directory
3. Verify project list populates
4. Cancel dialog and verify no changes

### Scenario 2: Project Scanning
1. Select base directory with projects
2. Click "Open" on a project with .agent-sdd
3. Verify statistics display correctly
4. Click "Open" on project without .agent-sdd
5. Verify appropriate warning/empty state

### Scenario 3: File Viewing
1. Open a project with various file types
2. Click on .md file - verify markdown rendering
3. Click on .json file - verify JSON formatting
4. Click on .txt file - verify plain text display
5. Click on non-viewable file - verify no link

### Scenario 4: Error Handling
1. Try to read a very large file (>10MB)
2. Try to access restricted directory
3. Delete a file while app is running, then try to read it
4. Verify graceful error messages

## Theme Standards Compliance

This feature primarily involves backend functionality with minimal UI changes. However, all error messages and loading states must comply with the theme standards:

- Error messages use `--danger` color variable
- Loading states use `--muted` color variable  
- All new UI elements use existing CSS variables
- No hardcoded colors or styles

## Security Considerations

- **Path Traversal Prevention**: Validate all paths stay within selected base directory
- **Read-Only Operations**: No write, delete, or execute operations
- **File Size Limits**: Prevent memory exhaustion from large files
- **Content Escaping**: Properly escape file contents before display
- **No Code Execution**: File contents displayed as text only

## Performance Considerations

- Implement caching for project scans (invalidate on refresh)
- Lazy load file contents only when requested
- Limit directory traversal depth to prevent slowdowns
- Use async operations to keep UI responsive