import { formatDate, formatFileSize, getStatusIcon, getStatusClass, getTaskStatusIcon } from '../../utils/formatters.js'
import { escapeHtml } from '../../utils/dom.js'
import { getFilteredSpecsData, setFilteredSpecsData } from '../../services/specsService.js'
import { createCommandButtonGroup } from './commandButton.js'
import { openExecutionModal } from '../modals/executionModal.js'
// Note: openFilePreview is available globally via window.openFilePreview

// Global state for table sorting
let currentSpecsSort = {}

// Render specs table
export function renderSpecsTable(specs) {
  const tableBody = document.getElementById('specs-table-body')
  if (!tableBody) return
  
  if (specs.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-app-muted py-8 italic">No specs found</td>
      </tr>
    `
    return
  }
  
  tableBody.innerHTML = specs.map((spec, index) => {
    const progress = spec.task_count > 0 
      ? Math.round((spec.completed_tasks / spec.task_count) * 100) 
      : 0
    
    const statusIcon = getStatusIcon(spec.status)
    const statusClass = getStatusClass(spec.status)
    
    // Format dates
    const createdDate = formatDate(spec.created)
    const modifiedDate = spec.last_modified ? formatDate(new Date(spec.last_modified)) : '-'
    
    // Format size
    const sizeStr = formatFileSize(spec.size_bytes)
    
    return `
      <tr class="cursor-pointer transition-colors duration-200 hover:bg-app-card border-l-3 border-transparent hover:border-app-accent" data-spec-id="${spec.id}" data-index="${index}">
        <td class="p-3 border-b border-app-outline text-app-text">
          <span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium ${statusClass}">${statusIcon} ${spec.status}</span>
        </td>
        <td class="p-3 border-b border-app-outline text-app-text">${escapeHtml(spec.feature)}</td>
        <td class="p-3 border-b border-app-outline text-app-text">${escapeHtml(spec.phase)}</td>
        <td class="p-3 border-b border-app-outline text-app-text">${createdDate}</td>
        <td class="p-3 border-b border-app-outline text-app-text">
          <div class="w-full h-2 bg-app-card rounded overflow-hidden">
            <div class="h-full bg-app-accent transition-all duration-300" style="width: ${progress}%"></div>
          </div>
          <span class="text-xs font-mono text-app-muted mt-1">${spec.completed_tasks}/${spec.task_count}</span>
        </td>
        <td class="p-3 border-b border-app-outline text-app-text">${sizeStr}</td>
        <td class="p-3 border-b border-app-outline text-app-text">${modifiedDate}</td>
      </tr>
    `
  }).join('')
  
  // Add click handlers to rows
  document.querySelectorAll('tr[data-spec-id]').forEach(row => {
    row.addEventListener('click', () => {
      const index = parseInt(row.dataset.index)
      selectSpec(specs[index])
    })
  })
}

// Set up table sorting
export function setupTableSorting() {
  document.querySelectorAll('.specs-table th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const column = th.dataset.column
      sortSpecsTable(column)
    })
  })
}

// Sort specs table
export function sortSpecsTable(column) {
  const filteredData = getFilteredSpecsData()
  if (!filteredData) return
  
  // Toggle sort direction
  const isAscending = currentSpecsSort.column === column ? !currentSpecsSort.ascending : true
  currentSpecsSort = { column, ascending: isAscending }
  
  // Sort the data
  const sorted = [...filteredData].sort((a, b) => {
    let aVal, bVal
    
    switch (column) {
      case 'status':
        aVal = a.status
        bVal = b.status
        break
      case 'feature':
        aVal = a.feature
        bVal = b.feature
        break
      case 'phase':
        aVal = a.phase
        bVal = b.phase
        break
      case 'date':
        aVal = a.created
        bVal = b.created
        break
      case 'progress':
        aVal = a.task_count > 0 ? a.completed_tasks / a.task_count : 0
        bVal = b.task_count > 0 ? b.completed_tasks / b.task_count : 0
        break
      case 'effort':
        aVal = a.size_bytes
        bVal = b.size_bytes
        break
      case 'modified':
        aVal = a.last_modified || 0
        bVal = b.last_modified || 0
        break
      default:
        return 0
    }
    
    if (aVal < bVal) return isAscending ? -1 : 1
    if (aVal > bVal) return isAscending ? 1 : -1
    return 0
  })
  
  renderSpecsTable(sorted)
  
  // Update sort indicators
  document.querySelectorAll('.specs-table th.sortable').forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc')
    if (th.dataset.column === column) {
      th.classList.add(isAscending ? 'sort-asc' : 'sort-desc')
    }
  })
}

// Select a spec and show details
export function selectSpec(spec) {
  // Highlight selected row
  document.querySelectorAll('.spec-row').forEach(row => {
    row.classList.remove('selected')
  })
  document.querySelector(`[data-spec-id="${spec.id}"]`)?.classList.add('selected')
  
  // Update details panel
  const detailsPanel = document.querySelector('.specs-details-panel')
  if (!detailsPanel) return
  
  detailsPanel.innerHTML = `
    <div class="spec-details">
      <div class="details-header">
        <h3>${escapeHtml(spec.feature)}</h3>
        <span class="status-badge ${getStatusClass(spec.status)}">${getStatusIcon(spec.status)} ${spec.status}</span>
      </div>
      
      <div class="details-metadata">
        <div class="metadata-item">
          <span class="label">Phase:</span>
          <span class="value">${escapeHtml(spec.phase)}</span>
        </div>
        <div class="metadata-item">
          <span class="label">Created:</span>
          <span class="value">${formatDate(spec.created)}</span>
        </div>
        <div class="metadata-item">
          <span class="label">Progress:</span>
          <span class="value">${spec.completed_tasks}/${spec.task_count} tasks</span>
        </div>
        <div class="metadata-item">
          <span class="label">Size:</span>
          <span class="value">${formatFileSize(spec.size_bytes)}</span>
        </div>
      </div>
      
      <div class="tasks-section">
        <h4>Tasks</h4>
        <div class="tasks-list" id="tasks-list-${spec.id}">
          ${spec.tasks.map((task, taskIndex) => `
            <div class="task-item ${task.status}" data-task-id="${task.id}" data-task-index="${taskIndex}">
              <div class="task-item-main">
                <span class="task-status">${getTaskStatusIcon(task.status)}</span>
                <div class="task-content">
                  <div class="task-name">${escapeHtml(task.name)}</div>
                  <div class="task-description">${escapeHtml(task.description)}</div>
                  <div class="task-meta">
                    <span class="task-id">${task.id}</span>
                    <span class="task-effort">Effort: ${task.effort}</span>
                    ${task.ux_ui_reviewed ? '<span class="task-reviewed">✓ UX/UI</span>' : ''}
                  </div>
                </div>
              </div>
              <div class="task-actions" data-task-id="${task.id}">
                <!-- Command buttons will be inserted here -->
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      
      <div class="quick-actions">
        <button onclick="window.openFilePreview('${spec.path}/tasks.json')">View tasks.json</button>
        <button onclick="window.openFilePreview('${spec.path}/sdd.md')">View SDD</button>
      </div>
    </div>
  `
  
  // Add command buttons to tasks after the HTML is rendered
  setTimeout(() => addCommandButtonsToTasks(spec), 0)
}

// Add command buttons to task items
function addCommandButtonsToTasks(spec) {
  if (!spec.tasks) return
  
  // Available commands for tasks
  const availableCommands = ['execute-task', 'fix', 'tweak', 'check-task']
  
  spec.tasks.forEach(task => {
    const taskActionsContainer = document.querySelector(`[data-task-id="${task.id}"].task-actions`)
    if (!taskActionsContainer) return
    
    // Clear existing buttons
    taskActionsContainer.innerHTML = ''
    
    // Create command button group
    const buttonGroup = createCommandButtonGroup(task, availableCommands)
    taskActionsContainer.appendChild(buttonGroup)
  })
  
  // Set up command click handler for this spec's tasks
  setupCommandClickHandler(spec)
}

// Set up command click event handling for a specific spec
function setupCommandClickHandler(spec) {
  // Use event delegation on the task actions containers for this spec
  const tasksContainer = document.getElementById(`tasks-list-${spec.id}`)
  if (!tasksContainer) return
  
  // Remove any existing listener
  tasksContainer.removeEventListener('command-click', handleSpecCommandClick)
  
  // Add new listener
  function handleSpecCommandClick(e) {
    const { command, taskData } = e.detail
    handleCommandExecution(command, taskData, spec)
  }
  
  tasksContainer.addEventListener('command-click', handleSpecCommandClick)
}

// Handle command execution
function handleCommandExecution(command, taskData, spec) {
  console.log(`Executing command: ${command} for task: ${taskData.id}`)
  
  // Get the current project path from the project selector
  const projectSelect = document.getElementById('projectsSelect')
  const projectPath = projectSelect ? projectSelect.value : ''
  
  if (!projectPath) {
    alert('Please select a project first.')
    return
  }
  
  // Open execution modal with proper parameters
  openExecutionModal(command, taskData, spec, projectPath, {
    onComplete: (result) => {
      console.log('Command execution completed:', result)
      
      // Refresh specs data if needed
      if (result.success) {
        // Dispatch event for other components to handle refresh
        document.dispatchEvent(new CustomEvent('command-execution-complete', {
          detail: { command, taskData, result, spec }
        }))
      }
    },
    onCancel: () => {
      console.log('Command execution cancelled')
    }
  })
}