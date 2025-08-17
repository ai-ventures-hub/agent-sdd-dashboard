import { state, bindCommon, selectProject } from './shared.js'

// Get invoke function from shared.js
let invoke;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  bindCommon()
  
  // Set up file click handlers (will be added after text display component)
  setupFileClickHandlers()
  
  // Set up installer wizard
  setupInstallerWizard()
  
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
    // Get invoke from global scope - it should be available by now
    if (!invoke && window.__TAURI__ && window.__TAURI__.core) {
      invoke = window.__TAURI__.core.invoke;
    }
    
    if (!invoke) {
      throw new Error('Tauri API not available');
    }
    
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

function setupInstallerWizard() {
  const installerBtn = document.getElementById('btnInstaller')
  if (installerBtn) {
    installerBtn.addEventListener('click', openInstallerWizard)
  }
}

async function openInstallerWizard() {
  // Create installer wizard modal
  const existing = document.getElementById('installer-wizard-modal')
  if (existing) existing.remove()
  
  const modal = document.createElement('div')
  modal.id = 'installer-wizard-modal'
  modal.className = 'installer-wizard-modal'
  modal.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-content installer-modal">
      <div class="modal-header">
        <h3>Agent-SDD Installer Wizard</h3>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="installer-step" id="step-1">
          <h4>Step 1: Choose Project Directory</h4>
          <p>Select the directory where you want to install Agent-SDD structure.</p>
          <button id="choose-project-dir" class="btn-primary">Choose Directory</button>
          <div id="selected-project-path" class="selected-path"></div>
        </div>
        
        <div class="installer-step" id="step-2" style="display: none;">
          <h4>Step 2: Configure Project Settings</h4>
          <div class="form-group">
            <label for="project-name">Project Name:</label>
            <input type="text" id="project-name" placeholder="Enter project name" />
          </div>
          <div class="form-group">
            <label for="project-description">Project Description:</label>
            <textarea id="project-description" placeholder="Brief description of the project" rows="3"></textarea>
          </div>
          <div class="form-group">
            <label>
              <input type="checkbox" id="create-standards" checked />
              Create standards directory with common templates
            </label>
          </div>
          <div class="form-group">
            <label>
              <input type="checkbox" id="create-specs" checked />
              Create specs directory for technical specifications
            </label>
          </div>
          <div class="form-group">
            <label>
              <input type="checkbox" id="create-agents" checked />
              Create agents directory for AI agent configurations
            </label>
          </div>
        </div>
        
        <div class="installer-step" id="step-3" style="display: none;">
          <h4>Step 3: Review & Install</h4>
          <div id="install-summary"></div>
          <div class="install-progress" style="display: none;">
            <div class="progress-bar">
              <div class="progress-fill" id="progress-fill"></div>
            </div>
            <div id="progress-text">Installing...</div>
          </div>
          <div id="install-result" style="display: none;"></div>
        </div>
      </div>
      <div class="modal-footer">
        <button id="wizard-back" style="display: none;">Back</button>
        <button id="wizard-next">Next</button>
        <button id="wizard-install" style="display: none;" class="btn-primary">Install</button>
        <button id="wizard-cancel">Cancel</button>
      </div>
    </div>
  `
  document.body.appendChild(modal)
  
  // Modal state
  let currentStep = 1
  let selectedProjectPath = ''
  let projectConfig = {}
  
  // Close handlers
  const closeModal = () => modal.remove()
  modal.querySelector('.modal-backdrop').addEventListener('click', closeModal)
  modal.querySelector('.modal-close').addEventListener('click', closeModal)
  modal.querySelector('#wizard-cancel').addEventListener('click', closeModal)
  
  // ESC key handler
  const handleEscKey = (e) => {
    if (e.key === 'Escape' || e.keyCode === 27) {
      closeModal()
      document.removeEventListener('keydown', handleEscKey)
    }
  }
  document.addEventListener('keydown', handleEscKey)
  
  // Step navigation
  function showStep(step) {
    // Hide all steps
    for (let i = 1; i <= 3; i++) {
      document.getElementById(`step-${i}`).style.display = 'none'
    }
    
    // Show current step
    document.getElementById(`step-${step}`).style.display = 'block'
    currentStep = step
    
    // Update buttons
    const backBtn = document.getElementById('wizard-back')
    const nextBtn = document.getElementById('wizard-next')
    const installBtn = document.getElementById('wizard-install')
    
    backBtn.style.display = step > 1 ? 'inline-block' : 'none'
    nextBtn.style.display = step < 3 ? 'inline-block' : 'none'
    installBtn.style.display = step === 3 ? 'inline-block' : 'none'
    
    // Update next button state
    updateNextButtonState()
  }
  
  function updateNextButtonState() {
    const nextBtn = document.getElementById('wizard-next')
    if (currentStep === 1) {
      nextBtn.disabled = !selectedProjectPath
    } else if (currentStep === 2) {
      const projectName = document.getElementById('project-name').value.trim()
      nextBtn.disabled = !projectName
    }
  }
  
  // Step 1: Choose directory
  document.getElementById('choose-project-dir').addEventListener('click', async () => {
    try {
      if (!invoke && window.__TAURI__ && window.__TAURI__.core) {
        invoke = window.__TAURI__.core.invoke;
      }
      
      if (!invoke) {
        throw new Error('Tauri API not available');
      }
      
      const path = await invoke('select_base_dir')
      if (path) {
        selectedProjectPath = path
        document.getElementById('selected-project-path').textContent = path
        updateNextButtonState()
      }
    } catch (error) {
      alert(`Failed to select directory: ${error.message}`)
    }
  })
  
  // Step 2: Form validation
  document.getElementById('project-name').addEventListener('input', updateNextButtonState)
  
  // Navigation buttons
  document.getElementById('wizard-back').addEventListener('click', () => {
    if (currentStep > 1) {
      showStep(currentStep - 1)
    }
  })
  
  document.getElementById('wizard-next').addEventListener('click', () => {
    if (currentStep === 1 && selectedProjectPath) {
      showStep(2)
    } else if (currentStep === 2) {
      // Collect configuration
      projectConfig = {
        name: document.getElementById('project-name').value.trim(),
        description: document.getElementById('project-description').value.trim(),
        createStandards: document.getElementById('create-standards').checked,
        createSpecs: document.getElementById('create-specs').checked,
        createAgents: document.getElementById('create-agents').checked
      }
      
      // Show summary
      showInstallSummary()
      showStep(3)
    }
  })
  
  document.getElementById('wizard-install').addEventListener('click', performInstallation)
  
  function showInstallSummary() {
    const summary = document.getElementById('install-summary')
    const directories = []
    if (projectConfig.createStandards) directories.push('standards/')
    if (projectConfig.createSpecs) directories.push('specs/')
    if (projectConfig.createAgents) directories.push('agents/')
    directories.push('product/', 'instructions/')
    
    summary.innerHTML = `
      <div class="summary-item">
        <strong>Project Path:</strong> ${selectedProjectPath}
      </div>
      <div class="summary-item">
        <strong>Project Name:</strong> ${projectConfig.name}
      </div>
      <div class="summary-item">
        <strong>Description:</strong> ${projectConfig.description || 'No description'}
      </div>
      <div class="summary-item">
        <strong>Directories to create:</strong>
        <ul class="directory-list">
          ${directories.map(dir => `<li>.agent-sdd/${dir}</li>`).join('')}
        </ul>
      </div>
    `
  }
  
  async function performInstallation() {
    const progressEl = document.querySelector('.install-progress')
    const resultEl = document.getElementById('install-result')
    const installBtn = document.getElementById('wizard-install')
    
    progressEl.style.display = 'block'
    installBtn.disabled = true
    
    try {
      if (!invoke && window.__TAURI__ && window.__TAURI__.core) {
        invoke = window.__TAURI__.core.invoke;
      }
      
      if (!invoke) {
        throw new Error('Tauri API not available');
      }
      
      // Simulate installation progress
      const steps = [
        'Creating .agent-sdd directory...',
        'Creating product directory...',
        'Creating instructions directory...',
        projectConfig.createStandards ? 'Creating standards directory...' : null,
        projectConfig.createSpecs ? 'Creating specs directory...' : null,
        projectConfig.createAgents ? 'Creating agents directory...' : null,
        'Creating configuration files...',
        'Installation complete!'
      ].filter(Boolean)
      
      for (let i = 0; i < steps.length; i++) {
        document.getElementById('progress-text').textContent = steps[i]
        document.getElementById('progress-fill').style.width = `${((i + 1) / steps.length) * 100}%`
        
        if (i === 0) {
          // Actually create the directories
          await invoke('create_agent_sdd_structure', {
            projectPath: selectedProjectPath,
            config: projectConfig
          })
        }
        
        await new Promise(resolve => setTimeout(resolve, 300))
      }
      
      progressEl.style.display = 'none'
      resultEl.style.display = 'block'
      resultEl.innerHTML = `
        <div class="install-success">
          <h4>✅ Installation Successful!</h4>
          <p>Agent-SDD structure has been created in:<br><code>${selectedProjectPath}/.agent-sdd/</code></p>
          <p>You can now close this wizard and refresh the project list to see your new project.</p>
        </div>
      `
      
      document.getElementById('wizard-cancel').textContent = 'Close'
      
    } catch (error) {
      progressEl.style.display = 'none'
      resultEl.style.display = 'block'
      resultEl.innerHTML = `
        <div class="install-error">
          <h4>❌ Installation Failed</h4>
          <p>Error: ${error.message}</p>
        </div>
      `
      installBtn.disabled = false
    }
  }
  
  // Initialize
  showStep(1)
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
  
  // Initialize sorting state
  let sortState = {
    column: 'modified',
    direction: 'desc',
    data: []
  }
  
  // Add table sorting handlers
  setupTableSorting(sortState)
  
  // Load specs data
  await loadSpecsData(sortState)
}

function setupTableSorting(sortState) {
  const tableHeaders = document.querySelectorAll('.specs-table th.sortable')
  
  tableHeaders.forEach(header => {
    header.addEventListener('click', () => {
      const column = header.dataset.column
      
      // Toggle direction if same column, otherwise default to asc
      if (sortState.column === column) {
        sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc'
      } else {
        sortState.column = column
        sortState.direction = 'asc'
      }
      
      // Update header indicators
      updateSortIndicators(sortState)
      
      // Re-sort and re-render table
      renderSortedSpecs(sortState)
    })
  })
  
  // Set initial sort indicator
  updateSortIndicators(sortState)
}

function updateSortIndicators(sortState) {
  const tableHeaders = document.querySelectorAll('.specs-table th.sortable')
  
  tableHeaders.forEach(header => {
    const column = header.dataset.column
    
    // Remove existing indicators
    header.classList.remove('sort-asc', 'sort-desc')
    
    // Add indicator for current sort column
    if (column === sortState.column) {
      header.classList.add(sortState.direction === 'asc' ? 'sort-asc' : 'sort-desc')
    }
  })
}

function sortSpecs(specs, column, direction) {
  return [...specs].sort((a, b) => {
    let aVal, bVal
    
    switch (column) {
      case 'status':
        const statusOrder = { 'completed': 3, 'in_progress': 2, 'pending': 1 }
        aVal = statusOrder[a.status] || 0
        bVal = statusOrder[b.status] || 0
        break
      case 'feature':
        aVal = a.feature.toLowerCase()
        bVal = b.feature.toLowerCase()
        break
      case 'phase':
        aVal = a.phase.toLowerCase()
        bVal = b.phase.toLowerCase()
        break
      case 'date':
        aVal = new Date(a.created)
        bVal = new Date(b.created)
        break
      case 'progress':
        aVal = a.task_count > 0 ? (a.completed_tasks / a.task_count) : 0
        bVal = b.task_count > 0 ? (b.completed_tasks / b.task_count) : 0
        break
      case 'effort':
        const getEffortTotal = (spec) => spec.tasks.reduce((total, task) => total + getEffortValue(task.effort), 0)
        aVal = getEffortTotal(a)
        bVal = getEffortTotal(b)
        break
      case 'modified':
        aVal = a.last_modified ? new Date(a.last_modified) : new Date(0)
        bVal = b.last_modified ? new Date(b.last_modified) : new Date(0)
        break
      default:
        aVal = a[column] || ''
        bVal = b[column] || ''
    }
    
    // Handle comparison based on data type
    if (aVal instanceof Date && bVal instanceof Date) {
      return direction === 'asc' ? aVal - bVal : bVal - aVal
    } else if (typeof aVal === 'number' && typeof bVal === 'number') {
      return direction === 'asc' ? aVal - bVal : bVal - aVal
    } else {
      const strA = String(aVal)
      const strB = String(bVal)
      return direction === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA)
    }
  })
}

function renderSortedSpecs(sortState) {
  const tableBody = document.getElementById('specs-table-body')
  if (!tableBody || !sortState.data.length) return
  
  const sortedSpecs = sortSpecs(sortState.data, sortState.column, sortState.direction)
  
  // Clear existing rows
  tableBody.innerHTML = ''
  
  // Remember currently selected spec
  const selectedSpec = document.querySelector('.specs-table tbody tr.selected')?.dataset.specId
  
  // Render sorted rows
  sortedSpecs.forEach(spec => {
    const row = document.createElement('tr')
    row.dataset.specId = spec.id
    
    // Restore selection if this was the selected row
    if (selectedSpec === spec.id) {
      row.classList.add('selected')
    }
    
    row.addEventListener('click', () => selectSpecRow(row, spec))
    
    const progressPercent = spec.task_count > 0 
      ? Math.round((spec.completed_tasks / spec.task_count) * 100) 
      : 0
    
    const statusIcon = getStatusIcon(spec.status)
    const effortDisplay = spec.tasks.reduce((total, task) => {
      const effort = getEffortValue(task.effort)
      return total + effort
    }, 0)
    const effortLabel = getEffortLabel(effortDisplay)
    
    const modifiedDate = spec.last_modified 
      ? new Date(spec.last_modified).toLocaleDateString()
      : 'Unknown'
    
    row.innerHTML = `
      <td><span class="status-icon">${statusIcon}</span></td>
      <td>${escapeHtml(spec.feature)}</td>
      <td>${escapeHtml(spec.phase)}</td>
      <td class="date-text">${escapeHtml(spec.created)}</td>
      <td class="progress-text">${progressPercent}% (${spec.completed_tasks}/${spec.task_count})</td>
      <td><span class="effort-badge">${effortLabel}</span></td>
      <td class="date-text">${modifiedDate}</td>
    `
    
    tableBody.appendChild(row)
  })
}

async function loadSpecsData(sortState) {
  const tableBody = document.getElementById('specs-table-body')
  if (!tableBody) return
  
  // Show loading state
  tableBody.innerHTML = `
    <tr>
      <td colspan="7" class="loading-row">Loading specs...</td>
    </tr>
  `
  
  try {
    // Get invoke from global scope
    if (!invoke && window.__TAURI__ && window.__TAURI__.core) {
      invoke = window.__TAURI__.core.invoke;
    }
    
    if (!invoke) {
      throw new Error('Tauri API not available');
    }
    
    // Get current project path from the selected project
    const projectSelect = document.getElementById('projectsSelect')
    if (!projectSelect || !projectSelect.value) {
      throw new Error('No project selected');
    }
    
    const projectPath = projectSelect.value
    const specs = await invoke('scan_specs', { projectPath })
    
    if (specs.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="no-specs">No specs found in this project.</td>
        </tr>
      `
      return
    }
    
    // Store data in sort state and render sorted
    sortState.data = specs
    renderSortedSpecs(sortState)
    
  } catch (error) {
    console.error('Failed to load specs:', error)
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-display-error">Failed to load specs: ${error.message}</td>
      </tr>
    `
  }
}

function getStatusIcon(status) {
  switch (status) {
    case 'completed': return '✅'
    case 'in_progress': return '⏳'
    case 'pending': return '⭕'
    default: return '❓'
  }
}

function getEffortValue(effort) {
  const effortMap = {
    'XS': 1,
    'S': 2, 
    'M': 3,
    'L': 5,
    'XL': 8
  }
  return effortMap[effort] || 1
}

function getEffortLabel(totalEffort) {
  if (totalEffort <= 3) return 'XS'
  if (totalEffort <= 6) return 'S'
  if (totalEffort <= 12) return 'M'
  if (totalEffort <= 20) return 'L'
  return 'XL'
}

function selectSpecRow(row, spec) {
  // Remove previous selection
  document.querySelectorAll('.specs-table tbody tr').forEach(r => {
    r.classList.remove('selected')
  })
  
  // Add selection to clicked row
  row.classList.add('selected')
  
  // Update details panel (placeholder for now - will be implemented in SMW-005)
  const detailsPanel = document.querySelector('.specs-details-panel')
  if (detailsPanel) {
    detailsPanel.innerHTML = `
      <div style="padding: 16px;">
        <h3 style="margin: 0 0 16px; color: var(--text);">${escapeHtml(spec.feature)}</h3>
        <div style="margin-bottom: 12px;">
          <strong>Phase:</strong> ${escapeHtml(spec.phase)}
        </div>
        <div style="margin-bottom: 12px;">
          <strong>Status:</strong> ${getStatusIcon(spec.status)} ${escapeHtml(spec.status)}
        </div>
        <div style="margin-bottom: 12px;">
          <strong>Progress:</strong> ${spec.completed_tasks}/${spec.task_count} tasks completed
        </div>
        <div style="margin-bottom: 12px;">
          <strong>Created:</strong> ${escapeHtml(spec.created)}
        </div>
        <div style="margin-bottom: 16px;">
          <strong>Path:</strong> <code style="word-break: break-all;">${escapeHtml(spec.path)}</code>
        </div>
        <div style="color: var(--muted); font-style: italic;">
          Detailed view coming in SMW-005 (Details Panel)
        </div>
      </div>
    `
  }
}

// Export for use in shared.js
window.openFilePreview = openFilePreview
window.openSpecsManagementWindow = openSpecsManagementWindow