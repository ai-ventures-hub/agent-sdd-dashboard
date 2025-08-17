import { state, bindCommon, selectProject } from './shared.js'

// Import Tauri API
const { invoke } = window.__TAURI__.core

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  bindCommon()
  
  // Set up file click handlers (will be added after text display component)
  setupFileClickHandlers()
  
  // Set up specs management window
  setupSpecsManagementWindow()
})

function setupFileClickHandlers() {
  // This will be implemented to handle file clicks
  document.addEventListener('click', (e) => {
    if (e.target.closest('.file-link')) {
      e.preventDefault()
      const filePath = e.target.closest('.file-link').dataset.path
      openFilePreview(filePath)
    }
  })
}

async function openFilePreview(filePath) {
  // Create modal for text display
  const existing = document.getElementById('text-display-modal')
  if (existing) existing.remove()
  
  const modal = document.createElement('div')
  modal.id = 'text-display-modal'
  modal.className = 'text-display-modal'
  modal.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h3>${filePath.split('/').pop()}</h3>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="text-display-loading">Loading...</div>
      </div>
    </div>
  `
  document.body.appendChild(modal)
  
  // Close handlers
  const closeModal = () => modal.remove()
  modal.querySelector('.modal-backdrop').addEventListener('click', closeModal)
  modal.querySelector('.modal-close').addEventListener('click', closeModal)
  
  // ESC key handler
  const handleEscKey = (e) => {
    if (e.key === 'Escape' || e.keyCode === 27) {
      closeModal()
      document.removeEventListener('keydown', handleEscKey)
    }
  }
  document.addEventListener('keydown', handleEscKey)
  
  // Load file content
  try {
    const content = await invoke('read_file', { filePath })
    const bodyEl = modal.querySelector('.modal-body')
    
    if (filePath.endsWith('.md')) {
      // For markdown files, render as HTML (basic rendering for now)
      bodyEl.innerHTML = `<div class="text-display markdown">${renderBasicMarkdown(content)}</div>`
    } else if (filePath.endsWith('.json')) {
      // For JSON files, pretty print
      try {
        const parsed = JSON.parse(content)
        bodyEl.innerHTML = `<pre class="text-display json">${JSON.stringify(parsed, null, 2)}</pre>`
      } catch {
        bodyEl.innerHTML = `<pre class="text-display">${escapeHtml(content)}</pre>`
      }
    } else {
      // For other files, display as plain text
      bodyEl.innerHTML = `<pre class="text-display">${escapeHtml(content)}</pre>`
    }
  } catch (error) {
    modal.querySelector('.modal-body').innerHTML = `
      <div class="text-display-error">Failed to load file: ${error.message}</div>
    `
  }
}

function renderBasicMarkdown(text) {
  // Enhanced markdown rendering with tables, links, and nested lists support
  let html = escapeHtml(text)
  
  // Preserve code blocks first (to avoid processing their content)
  const codeBlocks = []
  html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
    codeBlocks.push(`<pre><code>${code}</code></pre>`)
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`
  })
  
  // Inline code (preserve these too)
  const inlineCodes = []
  html = html.replace(/`([^`]+)`/g, (match, code) => {
    inlineCodes.push(`<code>${code}</code>`)
    return `__INLINE_CODE_${inlineCodes.length - 1}__`
  })
  
  // Headers (h1-h6)
  html = html.replace(/^###### (.*?)$/gm, '<h6>$1</h6>')
  html = html.replace(/^##### (.*?)$/gm, '<h5>$1</h5>')
  html = html.replace(/^#### (.*?)$/gm, '<h4>$1</h4>')
  html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>')
  
  // Links - handle both [text](url) and [text](url "title")
  html = html.replace(/\[([^\]]+)\]\(([^)"]+)(?:\s+"([^"]+)")?\)/g, (match, text, url, title) => {
    const titleAttr = title ? ` title="${title}"` : ''
    return `<a href="${url}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`
  })
  
  // Images - ![alt](url)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
  
  // Tables
  html = html.replace(/(\|[^\n]+\|\n)(\|[\s:|-]+\|\n)((?:\|[^\n]+\|\n)+)/gm, (match, header, separator, body) => {
    // Parse header
    const headerCells = header.trim().split('|').filter(cell => cell.trim())
    const headerRow = '<tr>' + headerCells.map(cell => `<th>${cell.trim()}</th>`).join('') + '</tr>'
    
    // Parse alignment from separator
    const alignments = separator.trim().split('|').filter(cell => cell.trim()).map(cell => {
      const trimmed = cell.trim()
      if (trimmed.startsWith(':') && trimmed.endsWith(':')) return 'center'
      if (trimmed.endsWith(':')) return 'right'
      return 'left'
    })
    
    // Parse body rows
    const bodyRows = body.trim().split('\n').map(row => {
      const cells = row.split('|').filter(cell => cell.trim())
      return '<tr>' + cells.map((cell, i) => {
        const align = alignments[i] || 'left'
        return `<td style="text-align: ${align}">${cell.trim()}</td>`
      }).join('') + '</tr>'
    }).join('')
    
    return `<table><thead>${headerRow}</thead><tbody>${bodyRows}</tbody></table>`
  })
  
  // Bold and italic (handle both ** and __ for bold, * and _ for italic)
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>')
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>')
  
  // Strikethrough
  html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>')
  
  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr>')
  html = html.replace(/^\*\*\*$/gm, '<hr>')
  
  // Process lists (including nested lists)
  html = processLists(html)
  
  // Blockquotes
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')
  // Merge consecutive blockquotes
  html = html.replace(/<\/blockquote>\n<blockquote>/g, '\n')
  
  // Paragraphs (don't wrap headers, lists, tables, etc.)
  const lines = html.split('\n')
  const processedLines = []
  let inParagraph = false
  
  for (const line of lines) {
    const trimmed = line.trim()
    const isBlock = trimmed.startsWith('<h') || trimmed.startsWith('<ul>') || 
                   trimmed.startsWith('<ol>') || trimmed.startsWith('<li>') ||
                   trimmed.startsWith('<table>') || trimmed.startsWith('<blockquote>') ||
                   trimmed.startsWith('<hr') || trimmed.startsWith('<pre>') ||
                   trimmed === ''
    
    if (isBlock) {
      if (inParagraph) {
        processedLines.push('</p>')
        inParagraph = false
      }
      processedLines.push(line)
    } else {
      if (!inParagraph) {
        processedLines.push('<p>')
        inParagraph = true
      }
      processedLines.push(line)
    }
  }
  
  if (inParagraph) {
    processedLines.push('</p>')
  }
  
  html = processedLines.join('\n')
  
  // Restore code blocks and inline codes
  html = html.replace(/__CODE_BLOCK_(\d+)__/g, (match, index) => codeBlocks[index])
  html = html.replace(/__INLINE_CODE_(\d+)__/g, (match, index) => inlineCodes[index])
  
  return html
}

function processLists(html) {
  // Process nested lists with proper indentation
  const lines = html.split('\n')
  const result = []
  const listStack = [] // Track list type and depth
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const match = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/)
    
    if (match) {
      const [, indent, marker, content] = match
      const depth = Math.floor(indent.length / 2)
      const isOrdered = /\d+\./.test(marker)
      const listType = isOrdered ? 'ol' : 'ul'
      
      // Close deeper lists
      while (listStack.length > depth + 1) {
        const popped = listStack.pop()
        result.push(`</${popped.type}>`)
        if (listStack.length > 0) {
          result.push('</li>')
        }
      }
      
      // Open new list if needed
      if (listStack.length === depth) {
        // Same level, close previous item if exists
        if (listStack.length > 0 && result[result.length - 1] !== `<${listType}>`) {
          result.push('</li>')
        }
        // Start new list at this level
        result.push(`<${listType}>`)
        listStack.push({ type: listType, depth })
      } else if (listStack.length === depth + 1) {
        // Correct level
        const currentList = listStack[listStack.length - 1]
        if (currentList.type !== listType) {
          // Wrong list type, close and open new
          result.push(`</${currentList.type}>`)
          listStack.pop()
          result.push(`<${listType}>`)
          listStack.push({ type: listType, depth })
        } else if (result[result.length - 1] !== `<${listType}>`) {
          // Same type, close previous item
          result.push('</li>')
        }
      }
      
      result.push(`<li>${content}`)
    } else {
      // Not a list item, close all open lists
      while (listStack.length > 0) {
        const popped = listStack.pop()
        if (result[result.length - 1] !== `</${popped.type}>`) {
          result.push('</li>')
        }
        result.push(`</${popped.type}>`)
      }
      result.push(line)
    }
  }
  
  // Close any remaining open lists
  while (listStack.length > 0) {
    const popped = listStack.pop()
    if (result[result.length - 1] !== `</${popped.type}>`) {
      result.push('</li>')
    }
    result.push(`</${popped.type}>`)
  }
  
  return result.join('\n')
}

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function setupSpecsManagementWindow() {
  const specsBtn = document.getElementById('btnSpecsManagement')
  if (specsBtn) {
    specsBtn.addEventListener('click', openSpecsManagementWindow)
  }
}

async function openSpecsManagementWindow() {
  // Create specs management window modal
  const existing = document.getElementById('specs-management-modal')
  if (existing) existing.remove()
  
  const modal = document.createElement('div')
  modal.id = 'specs-management-modal'
  modal.className = 'specs-management-modal'
  modal.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-content specs-management-content">
      <div class="modal-header">
        <h3>Specs Management</h3>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body specs-management-body">
        <div class="specs-toolbar">
          <div class="toolbar-search">
            <input type="text" id="specs-search" placeholder="Search specs..." />
          </div>
          <div class="toolbar-filters">
            <select id="phase-filter">
              <option value="">All Phases</option>
              <option value="Phase 1">Phase 1</option>
              <option value="Phase 2">Phase 2</option>
              <option value="Phase 3">Phase 3</option>
              <option value="Phase 4">Phase 4</option>
            </select>
            <select id="status-filter">
              <option value="">All Status</option>
              <option value="completed">Completed</option>
              <option value="in_progress">In Progress</option>
              <option value="pending">Not Started</option>
            </select>
          </div>
        </div>
        
        <div class="specs-layout">
          <div class="specs-table-container">
            <table class="specs-table">
              <thead>
                <tr>
                  <th class="sortable" data-column="status">Status</th>
                  <th class="sortable" data-column="feature">Feature</th>
                  <th class="sortable" data-column="phase">Phase</th>
                  <th class="sortable" data-column="date">Date</th>
                  <th class="sortable" data-column="progress">Progress</th>
                  <th class="sortable" data-column="effort">Size</th>
                  <th class="sortable" data-column="modified">Modified</th>
                </tr>
              </thead>
              <tbody id="specs-table-body">
                <tr>
                  <td colspan="7" class="loading-row">Loading specs...</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div class="specs-details-panel">
            <div class="details-placeholder">
              <div class="placeholder-icon">📋</div>
              <div class="placeholder-text">Select a spec to view details</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
  document.body.appendChild(modal)
  
  // Close handlers
  const closeModal = () => modal.remove()
  modal.querySelector('.modal-backdrop').addEventListener('click', closeModal)
  modal.querySelector('.modal-close').addEventListener('click', closeModal)
  
  // ESC key handler
  const handleEscKey = (e) => {
    if (e.key === 'Escape' || e.keyCode === 27) {
      closeModal()
      document.removeEventListener('keydown', handleEscKey)
    }
  }
  document.addEventListener('keydown', handleEscKey)
  
  // Load specs data (placeholder for now)
  await loadSpecsData()
}

async function loadSpecsData() {
  const tableBody = document.getElementById('specs-table-body')
  if (!tableBody) return
  
  try {
    // Get the selected project path from state
    const projectPath = state.selectedProject || '.'
    
    // Fetch specs data from backend
    const specs = await invoke('scan_specs', { projectPath })
    
    // Store specs data globally for filtering
    window.specsData = specs
    window.filteredSpecsData = specs
    
    // Render the specs table
    renderSpecsTable(specs)
    
    // Set up filter and search handlers
    setupSpecsFiltersAndSearch()
    
  } catch (error) {
    console.error('Failed to load specs:', error)
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="error-row">Failed to load specs: ${error.message}</td>
      </tr>
    `
  }
}

function renderSpecsTable(specs) {
  const tableBody = document.getElementById('specs-table-body')
  if (!tableBody) return
  
  if (specs.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="no-specs">No specs found</td>
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
      <tr class="spec-row" data-spec-id="${spec.id}" data-index="${index}">
        <td class="status-cell">
          <span class="status-badge ${statusClass}">${statusIcon} ${spec.status}</span>
        </td>
        <td class="feature-cell">${escapeHtml(spec.feature)}</td>
        <td class="phase-cell">${escapeHtml(spec.phase)}</td>
        <td class="date-cell">${createdDate}</td>
        <td class="progress-cell">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${progress}%"></div>
            <span class="progress-text">${spec.completed_tasks}/${spec.task_count}</span>
          </div>
        </td>
        <td class="size-cell">${sizeStr}</td>
        <td class="modified-cell">${modifiedDate}</td>
      </tr>
    `
  }).join('')
  
  // Add click handlers to rows
  document.querySelectorAll('.spec-row').forEach(row => {
    row.addEventListener('click', () => {
      const index = parseInt(row.dataset.index)
      selectSpec(specs[index])
    })
  })
}

function setupSpecsFiltersAndSearch() {
  // Search functionality
  const searchInput = document.getElementById('specs-search')
  if (searchInput) {
    searchInput.addEventListener('input', debounce(() => {
      applySpecsFilters()
    }, 300))
  }
  
  // Phase filter
  const phaseFilter = document.getElementById('phase-filter')
  if (phaseFilter) {
    phaseFilter.addEventListener('change', () => {
      applySpecsFilters()
    })
  }
  
  // Status filter
  const statusFilter = document.getElementById('status-filter')
  if (statusFilter) {
    statusFilter.addEventListener('change', () => {
      applySpecsFilters()
    })
  }
  
  // Table sorting
  document.querySelectorAll('.specs-table th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const column = th.dataset.column
      sortSpecsTable(column)
    })
  })
}

function applySpecsFilters() {
  if (!window.specsData) return
  
  const searchValue = document.getElementById('specs-search')?.value.toLowerCase() || ''
  const phaseValue = document.getElementById('phase-filter')?.value || ''
  const statusValue = document.getElementById('status-filter')?.value || ''
  
  // Apply filters
  let filtered = window.specsData.filter(spec => {
    // Search filter - search in feature, phase, tasks
    if (searchValue) {
      const searchIn = [
        spec.feature.toLowerCase(),
        spec.phase.toLowerCase(),
        spec.status.toLowerCase(),
        ...spec.tasks.map(t => t.name.toLowerCase()),
        ...spec.tasks.map(t => t.description.toLowerCase())
      ].join(' ')
      
      if (!searchIn.includes(searchValue)) {
        return false
      }
    }
    
    // Phase filter
    if (phaseValue && spec.phase !== phaseValue) {
      return false
    }
    
    // Status filter
    if (statusValue && spec.status !== statusValue) {
      return false
    }
    
    return true
  })
  
  window.filteredSpecsData = filtered
  renderSpecsTable(filtered)
}

function sortSpecsTable(column) {
  if (!window.filteredSpecsData) return
  
  // Toggle sort direction
  const currentSort = window.currentSpecsSort || {}
  const isAscending = currentSort.column === column ? !currentSort.ascending : true
  
  window.currentSpecsSort = { column, ascending: isAscending }
  
  // Sort the data
  const sorted = [...window.filteredSpecsData].sort((a, b) => {
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

function selectSpec(spec) {
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
        <div class="tasks-list">
          ${spec.tasks.map(task => `
            <div class="task-item ${task.status}">
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
          `).join('')}
        </div>
      </div>
      
      <div class="quick-actions">
        <button onclick="openFilePreview('${spec.path}/tasks.json')">View tasks.json</button>
        <button onclick="openFilePreview('${spec.path}/sdd.md')">View SDD</button>
      </div>
    </div>
  `
}

// Helper functions
function getStatusIcon(status) {
  switch (status) {
    case 'completed': return '✅'
    case 'in_progress': return '⏳'
    case 'pending': return '⭕'
    default: return '❓'
  }
}

function getStatusClass(status) {
  switch (status) {
    case 'completed': return 'status-completed'
    case 'in_progress': return 'status-progress'
    case 'pending': return 'status-pending'
    default: return 'status-unknown'
  }
}

function getTaskStatusIcon(status) {
  switch (status) {
    case 'completed': return '✅'
    case 'in_progress': return '🔄'
    case 'pending': return '⭕'
    default: return '❓'
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
  if (isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  })
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// Export for use in shared.js
window.openFilePreview = openFilePreview
window.openSpecsManagementWindow = openSpecsManagementWindow