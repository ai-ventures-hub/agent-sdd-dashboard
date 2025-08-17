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
        <button id="wizard-back" class="btn-secondary" style="display: none;">Back</button>
        <button id="wizard-next" class="btn-primary">Next</button>
        <button id="wizard-install" class="btn-primary" style="display: none;">Install</button>
        <button id="wizard-cancel" class="btn-secondary">Cancel</button>
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
  // Create enhanced specs management page (full-screen within app)
  openSpecsManagementPage()
}

async function openSpecsManagementPage() {
  // Get current project path before hiding main content
  const projectSelect = document.getElementById('projectsSelect')
  if (!projectSelect || !projectSelect.value) {
    alert('Please select a project first before opening Specs Management.')
    return
  }
  
  const currentProjectPath = projectSelect.value
  
  // Replace main content area (keeping sidebar and header visible)
  const contentSection = document.querySelector('.content')
  const existingPage = document.getElementById('specs-management-page')
  
  if (existingPage) {
    existingPage.remove()
  }
  
  if (!contentSection) {
    console.error('Content section not found')
    return
  }
  
  // Store original content for restoration
  const originalContent = contentSection.innerHTML
  
  // Replace content section with specs management
  contentSection.innerHTML = `
    <div id="specs-management-page" class="specs-page-content">
      <!-- Page Header with Back Button -->
      <div class="specs-page-header">
        <button class="back-button" id="specs-back-btn">
          <span class="back-icon">←</span>
          <span class="back-text">Back to Project</span>
        </button>
        <h1 class="page-title">Specs Management</h1>
        <div class="page-actions">
          <button class="btn-primary" id="create-new-spec-btn">
            <span class="action-icon">➕</span>
            Create New Spec
          </button>
        </div>
      </div>

      <!-- Toolbar Section -->
      <div class="specs-toolbar">
        <div class="toolbar-search">
          <input type="text" id="specs-search" placeholder="Search specs..." />
        </div>
        <div class="toolbar-filters">
          <select id="phase-filter" class="p-2 bg-app-card border border-app-outline rounded-lg text-app-text text-sm">
            <option value="">All Phases</option>
            <option value="Phase 1">Phase 1</option>
            <option value="Phase 2">Phase 2</option>
            <option value="Phase 3">Phase 3</option>
            <option value="Phase 4">Phase 4</option>
          </select>
          <select id="status-filter" class="p-2 bg-app-card border border-app-outline rounded-lg text-app-text text-sm">
            <option value="">All Status</option>
            <option value="completed">Completed</option>
            <option value="in_progress">In Progress</option>
            <option value="pending">Not Started</option>
          </select>
        </div>
      </div>
      
      <!-- Main Content Area with Resizable Splitter -->
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
                <th class="sortable" data-column="effort">Effort</th>
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
        
        <!-- Resizable Splitter -->
        <div class="specs-splitter" id="specs-splitter"></div>
        
        <div class="specs-details-panel">
          <div class="details-placeholder">
            <div class="placeholder-icon">📋</div>
            <div class="placeholder-text">Select a spec to view details</div>
          </div>
        </div>
      </div>
    </div>
  `
  
  // Set up back button to restore original content
  const backBtn = document.getElementById('specs-back-btn')
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      contentSection.innerHTML = originalContent
    })
  }
  
  // Set up create spec button
  const createBtn = document.getElementById('create-new-spec-btn')
  if (createBtn) {
    createBtn.addEventListener('click', () => {
      openCreateSpecDialog()
    })
  }
  
  // Initialize specs management functionality with project path
  await initializeSpecsPage(currentProjectPath)
}

async function initializeSpecsPage(projectPath) {
  // Initialize sorting state
  let sortState = {
    column: 'modified',
    direction: 'desc',
    data: [],
    projectPath: projectPath // Store project path in sort state
  }
  
  // Set up table sorting
  setupTableSorting(sortState)
  
  // Set up splitter
  setupPageSplitter()
  
  // Set up search and filters
  setupPageSearchAndFilters(sortState)
  
  // Load specs data
  await loadSpecsData(sortState)
}

function setupPageSplitter() {
  const splitter = document.getElementById('specs-splitter')
  const container = document.querySelector('.specs-layout')
  const tableContainer = document.querySelector('.specs-table-container')
  const detailsPanel = document.querySelector('.specs-details-panel')
  
  if (!splitter || !container || !tableContainer || !detailsPanel) {
    return
  }
  
  // Set table to full width initially and hide splitter/details panel
  tableContainer.style.width = '100%'
  detailsPanel.style.display = 'none'
  splitter.style.display = 'none'
  
  let isResizing = false
  let leftWidth = 100 // percentage - full width initially
  
  // Load saved splitter state
  const savedWidth = localStorage.getItem('specs-splitter-width')
  if (savedWidth) {
    leftWidth = parseFloat(savedWidth)
  }
  
  function updateLayout() {
    tableContainer.style.width = `${leftWidth}%`
    detailsPanel.style.width = `${100 - leftWidth}%`
  }
  
  splitter.addEventListener('mousedown', (e) => {
    e.preventDefault()
    isResizing = true
    document.body.style.cursor = 'col-resize'
    
    function handleMouseMove(e) {
      if (!isResizing) return
      
      const containerRect = container.getBoundingClientRect()
      const mouseX = e.clientX - containerRect.left
      const percentage = Math.max(30, Math.min(80, (mouseX / containerRect.width) * 100))
      
      leftWidth = percentage
      updateLayout()
    }
    
    function handleMouseUp() {
      isResizing = false
      document.body.style.cursor = ''
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      
      // Save splitter state
      localStorage.setItem('specs-splitter-width', leftWidth.toString())
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  })
  
  // Set initial layout
  updateLayout()
}

function setupPageSearchAndFilters(sortState) {
  const searchInput = document.getElementById('specs-search')
  const phaseFilter = document.getElementById('phase-filter')
  const statusFilter = document.getElementById('status-filter')
  
  let searchTimeout
  
  searchInput?.addEventListener('input', () => {
    clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
      renderFilteredSpecs(sortState)
    }, 300)
  })
  
  phaseFilter?.addEventListener('change', () => renderFilteredSpecs(sortState))
  statusFilter?.addEventListener('change', () => renderFilteredSpecs(sortState))
}

function renderFilteredSpecs(sortState) {
  const searchTerm = document.getElementById('specs-search')?.value.toLowerCase() || ''
  const phaseFilter = document.getElementById('phase-filter')?.value || ''
  const statusFilter = document.getElementById('status-filter')?.value || ''
  
  let filteredSpecs = sortState.data.filter(spec => {
    const matchesSearch = !searchTerm || 
      spec.feature.toLowerCase().includes(searchTerm) ||
      spec.phase.toLowerCase().includes(searchTerm)
    
    const matchesPhase = !phaseFilter || spec.phase === phaseFilter
    const matchesStatus = !statusFilter || spec.status === statusFilter
    
    return matchesSearch && matchesPhase && matchesStatus
  })
  
  // Sort filtered results and render
  filteredSpecs = sortSpecs(filteredSpecs, sortState.column, sortState.direction)
  
  // Temporarily update sort state with filtered data for rendering
  const originalData = sortState.data
  sortState.data = filteredSpecs
  renderSortedSpecs(sortState)
  sortState.data = originalData // Restore original data for future filtering
}

async function openSpecsManagementModal() {
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
            <select id="phase-filter" class="p-2 bg-app-card border border-app-outline rounded-lg text-app-text text-sm">
              <option value="">All Phases</option>
              <option value="Phase 1">Phase 1</option>
              <option value="Phase 2">Phase 2</option>
              <option value="Phase 3">Phase 3</option>
              <option value="Phase 4">Phase 4</option>
            </select>
            <select id="status-filter" class="p-2 bg-app-card border border-app-outline rounded-lg text-app-text text-sm">
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
                  <th class="sortable" data-column="effort">Task ID</th>
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
    
    // Get project path from sort state (passed during initialization)
    const projectPath = sortState.projectPath
    if (!projectPath) {
      throw new Error('No project path available');
    }
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
  
  // Show details panel and splitter when row is selected
  const detailsPanel = document.querySelector('.specs-details-panel')
  const splitter = document.getElementById('specs-splitter')
  const tableContainer = document.querySelector('.specs-table-container')
  
  if (detailsPanel && splitter && tableContainer) {
    detailsPanel.style.display = 'block'
    splitter.style.display = 'block'
    tableContainer.style.width = '60%'
    detailsPanel.style.width = '40%'
  }
  
  // Update details panel with enhanced SpecDetailsPanel
  renderSpecDetailsPanel(spec)
  
  // Attach Quick Actions event handlers
  attachQuickActionHandlers(spec)
}

function renderSpecDetailsPanel(spec) {
  const detailsPanel = document.querySelector('.specs-details-panel')
  if (!detailsPanel) return
  
  // Calculate progress metrics
  const progressPercent = spec.task_count > 0 
    ? Math.round((spec.completed_tasks / spec.task_count) * 100) 
    : 0
  
  const totalEffort = spec.tasks.reduce((sum, task) => sum + getEffortValue(task.effort), 0)
  const completedEffort = spec.tasks
    .filter(task => task.status === 'completed')
    .reduce((sum, task) => sum + getEffortValue(task.effort), 0)
  
  const effortProgress = totalEffort > 0 ? Math.round((completedEffort / totalEffort) * 100) : 0
  
  // Group tasks by status
  const tasksByStatus = {
    completed: spec.tasks.filter(t => t.status === 'completed'),
    pending: spec.tasks.filter(t => t.status === 'pending'),
    in_progress: spec.tasks.filter(t => t.status === 'in_progress')
  }
  
  detailsPanel.innerHTML = `
    <div class="spec-details-content">
      <!-- Header Section -->
      <div class="spec-details-header">
        <h3 class="spec-details-title">${escapeHtml(spec.feature)}</h3>
        <div class="spec-status-badge ${spec.status}">
          <span class="status-icon">${getStatusIcon(spec.status)}</span>
          <span class="status-text">${escapeHtml(spec.status.replace('_', ' ').toUpperCase())}</span>
        </div>
      </div>

      <!-- Spec Overview Section -->
      <div class="spec-overview-section">
        <h4 class="section-title">Spec Overview</h4>
        <div class="spec-metadata">
          <div class="metadata-item">
            <span class="metadata-label">Phase:</span>
            <span class="metadata-value">${escapeHtml(spec.phase)}</span>
          </div>
          <div class="metadata-item">
            <span class="metadata-label">Created:</span>
            <span class="metadata-value">${escapeHtml(spec.created)}</span>
          </div>
          <div class="metadata-item">
            <span class="metadata-label">Total Effort:</span>
            <span class="metadata-value effort-badge">${getEffortLabel(totalEffort)}</span>
          </div>
          <div class="metadata-item">
            <span class="metadata-label">Tasks:</span>
            <span class="metadata-value">${spec.task_count} total</span>
          </div>
          <div class="metadata-item">
            <span class="metadata-label">Path:</span>
            <span class="metadata-value spec-path">${escapeHtml(spec.path)}</span>
          </div>
        </div>
      </div>

      <!-- Progress Section -->
      <div class="spec-progress-section">
        <h4 class="section-title">Task Progress</h4>
        
        <!-- Task Progress Indicator Component -->
        ${createTaskProgressIndicator(spec.tasks)}
        
        <div class="progress-metrics">
          <div class="progress-metric">
            <div class="progress-metric-header">
              <span class="progress-metric-label">Tasks Completed</span>
              <span class="progress-metric-value">${spec.completed_tasks}/${spec.task_count}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${progressPercent}%"></div>
            </div>
            <div class="progress-percentage">${progressPercent}%</div>
          </div>
          
          <div class="progress-metric">
            <div class="progress-metric-header">
              <span class="progress-metric-label">Effort Completed</span>
              <span class="progress-metric-value">${completedEffort}/${totalEffort} points</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill effort-fill" style="width: ${effortProgress}%"></div>
            </div>
            <div class="progress-percentage">${effortProgress}%</div>
          </div>
        </div>
      </div>

      <!-- Task Status Breakdown -->
      <div class="spec-tasks-section">
        <h4 class="section-title">Task Breakdown</h4>
        <div class="task-status-groups">
          ${renderTaskStatusGroup('Completed', tasksByStatus.completed, 'completed')}
          ${tasksByStatus.in_progress.length > 0 ? renderTaskStatusGroup('In Progress', tasksByStatus.in_progress, 'in_progress') : ''}
          ${renderTaskStatusGroup('Pending', tasksByStatus.pending, 'pending')}
        </div>
      </div>

      <!-- Quick Actions Bar -->
      ${renderQuickActionsBar(spec)}
    </div>
  `
}

function renderTaskStatusGroup(title, tasks, status) {
  if (tasks.length === 0) return ''
  
  return `
    <div class="task-status-group">
      <div class="task-group-header">
        <span class="task-group-title">${title}</span>
        <span class="task-group-count">${tasks.length}</span>
      </div>
      <div class="task-list">
        ${tasks.map(task => `
          <div class="task-item ${status}">
            <div class="task-item-header">
              <span class="task-status-icon" title="${escapeHtml(task.status.replace('_', ' ').toUpperCase())}">${getTaskStatusIcon(task.status)}</span>
              <span class="task-name">${escapeHtml(task.name)}</span>
              <div class="task-id-container">
                <span class="task-id">${escapeHtml(task.id)}</span>
                <button class="copy-task-id-btn" data-task-id="${escapeHtml(task.id)}" title="Copy task ID to clipboard">
                  <span class="copy-icon">📋</span>
                </button>
              </div>
            </div>
            <div class="task-description">${escapeHtml(task.description)}</div>
            ${task.dependencies && task.dependencies.length > 0 ? 
              `<div class="task-dependencies">
                <span class="dependencies-label">Depends on:</span>
                <span class="dependencies-list">${task.dependencies.join(', ')}</span>
              </div>` : ''
            }
            ${task.completed ? 
              `<div class="task-completed-date">Completed: ${task.completed}</div>` : ''
            }
          </div>
        `).join('')}
      </div>
    </div>
  `
}

function getTaskStatusIcon(status) {
  switch (status) {
    case 'completed': return '✅'
    case 'in_progress': return '⏳'
    case 'pending': return '⭕'
    case 'blocked': return '❌'
    case 'cancelled': return '🚫'
    default: return '❓'
  }
}

function renderQuickActionsBar(spec) {
  const hasPendingTasks = spec.tasks.some(task => task.status === 'pending' || task.status === 'in_progress')
  
  return `
    <div class="quick-actions-bar">
      <h4 class="section-title">Quick Actions</h4>
      <div class="quick-actions-buttons">
        <button class="quick-action-btn open-sdd" data-spec-path="${escapeHtml(spec.path)}" title="Open spec's SDD document">
          <span class="action-icon">📄</span>
          <span class="action-label">Open SDD</span>
        </button>
        
        ${hasPendingTasks ? `
          <button class="quick-action-btn mark-done" data-spec-id="${escapeHtml(spec.id)}" title="Mark next pending task as done">
            <span class="action-icon">✅</span>
            <span class="action-label">Mark Task Done</span>
          </button>
        ` : ''}
        
        <button class="quick-action-btn create-spec" data-project-path="${escapeHtml(spec.projectPath || '')}" title="Create a new spec">
          <span class="action-icon">➕</span>
          <span class="action-label">Create Spec</span>
        </button>
        
        <button class="quick-action-btn run-analysis" data-spec-path="${escapeHtml(spec.path)}" title="Run spec analysis">
          <span class="action-icon">🔍</span>
          <span class="action-label">Run Analysis</span>
        </button>
      </div>
    </div>
  `
}

function createTaskProgressIndicator(tasks) {
  const statusCounts = {
    completed: 0,
    in_progress: 0,
    pending: 0,
    blocked: 0,
    cancelled: 0
  }
  
  tasks.forEach(task => {
    if (statusCounts.hasOwnProperty(task.status)) {
      statusCounts[task.status]++
    }
  })
  
  const total = tasks.length
  const completedPercent = total > 0 ? Math.round((statusCounts.completed / total) * 100) : 0
  const inProgressPercent = total > 0 ? Math.round((statusCounts.in_progress / total) * 100) : 0
  const pendingPercent = total > 0 ? Math.round((statusCounts.pending / total) * 100) : 0
  const blockedPercent = total > 0 ? Math.round((statusCounts.blocked / total) * 100) : 0
  
  return `
    <div class="task-progress-indicator">
      <div class="progress-indicator-header">
        <span class="indicator-title">Task Status Overview</span>
        <span class="indicator-summary">${statusCounts.completed} of ${total} completed</span>
      </div>
      
      <div class="progress-indicator-bar">
        ${statusCounts.completed > 0 ? `<div class="progress-segment completed" style="width: ${completedPercent}%" title="Completed: ${statusCounts.completed}"></div>` : ''}
        ${statusCounts.in_progress > 0 ? `<div class="progress-segment in-progress" style="width: ${inProgressPercent}%" title="In Progress: ${statusCounts.in_progress}"></div>` : ''}
        ${statusCounts.pending > 0 ? `<div class="progress-segment pending" style="width: ${pendingPercent}%" title="Pending: ${statusCounts.pending}"></div>` : ''}
        ${statusCounts.blocked > 0 ? `<div class="progress-segment blocked" style="width: ${blockedPercent}%" title="Blocked: ${statusCounts.blocked}"></div>` : ''}
      </div>
      
      <div class="progress-indicator-legend">
        ${statusCounts.completed > 0 ? `
          <div class="legend-item">
            <span class="legend-icon">✅</span>
            <span class="legend-label">Completed</span>
            <span class="legend-count">${statusCounts.completed}</span>
          </div>
        ` : ''}
        ${statusCounts.in_progress > 0 ? `
          <div class="legend-item">
            <span class="legend-icon">⏳</span>
            <span class="legend-label">In Progress</span>
            <span class="legend-count">${statusCounts.in_progress}</span>
          </div>
        ` : ''}
        ${statusCounts.pending > 0 ? `
          <div class="legend-item">
            <span class="legend-icon">⭕</span>
            <span class="legend-label">Pending</span>
            <span class="legend-count">${statusCounts.pending}</span>
          </div>
        ` : ''}
        ${statusCounts.blocked > 0 ? `
          <div class="legend-item">
            <span class="legend-icon">❌</span>
            <span class="legend-label">Blocked</span>
            <span class="legend-count">${statusCounts.blocked}</span>
          </div>
        ` : ''}
      </div>
    </div>
  `
}

function attachQuickActionHandlers(spec) {
  // Wait for DOM to update
  setTimeout(() => {
    // Open SDD button
    const openSddBtn = document.querySelector('.quick-action-btn.open-sdd')
    if (openSddBtn) {
      openSddBtn.addEventListener('click', async () => {
        const sddPath = spec.path.replace('tasks.json', 'sdd.md')
        try {
          await openFilePreview(sddPath)
        } catch (error) {
          console.error('Failed to open SDD:', error)
          alert('Failed to open SDD document. The file may not exist.')
        }
      })
    }
    
    // Mark Task Done button
    const markDoneBtn = document.querySelector('.quick-action-btn.mark-done')
    if (markDoneBtn) {
      markDoneBtn.addEventListener('click', async () => {
        const nextPendingTask = spec.tasks.find(task => 
          task.status === 'pending' || task.status === 'in_progress'
        )
        
        if (nextPendingTask) {
          const confirmMsg = `Mark task "${nextPendingTask.name}" as completed?`
          if (confirm(confirmMsg)) {
            await markTaskAsCompleted(spec, nextPendingTask)
          }
        }
      })
    }
    
    // Create Spec button
    const createSpecBtn = document.querySelector('.quick-action-btn.create-spec')
    if (createSpecBtn) {
      createSpecBtn.addEventListener('click', () => {
        openCreateSpecDialog()
      })
    }
    
    // Run Analysis button
    const runAnalysisBtn = document.querySelector('.quick-action-btn.run-analysis')
    if (runAnalysisBtn) {
      runAnalysisBtn.addEventListener('click', async () => {
        try {
          // Get invoke from global scope
          if (!invoke && window.__TAURI__ && window.__TAURI__.core) {
            invoke = window.__TAURI__.core.invoke;
          }
          
          if (!invoke) {
            throw new Error('Tauri API not available');
          }
          
          // Set button loading state
          runAnalysisBtn.disabled = true
          const originalText = runAnalysisBtn.innerHTML
          runAnalysisBtn.innerHTML = '<span class="action-icon">⏳</span><span class="action-label">Analyzing...</span>'
          
          // Run analysis command - need to pass the tasks.json path
          const tasksPath = spec.path + '/tasks.json'
          const analysisResult = await invoke('analyze_spec', { specPath: tasksPath })
          
          // Reset button state
          runAnalysisBtn.disabled = false
          runAnalysisBtn.innerHTML = originalText
          
          // Display results in a modal
          displayAnalysisResults(spec, analysisResult)
        } catch (error) {
          console.error('Failed to run analysis:', error)
          
          // Reset button state
          runAnalysisBtn.disabled = false
          runAnalysisBtn.innerHTML = originalText
          
          alert('Failed to run spec analysis. Please check the console for details.')
        }
      })
    }
    
    // Copy task ID buttons
    const copyTaskIdBtns = document.querySelectorAll('.copy-task-id-btn')
    copyTaskIdBtns.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault()
        e.stopPropagation()
        
        const taskId = btn.dataset.taskId
        try {
          await navigator.clipboard.writeText(taskId)
          
          // Visual feedback
          const originalIcon = btn.querySelector('.copy-icon')
          const originalText = originalIcon.textContent
          originalIcon.textContent = '✅'
          
          setTimeout(() => {
            originalIcon.textContent = originalText
          }, 1000)
        } catch (error) {
          console.error('Failed to copy task ID:', error)
          
          // Fallback for older browsers
          const textArea = document.createElement('textarea')
          textArea.value = taskId
          document.body.appendChild(textArea)
          textArea.select()
          try {
            document.execCommand('copy')
            
            // Visual feedback
            const originalIcon = btn.querySelector('.copy-icon')
            const originalText = originalIcon.textContent
            originalIcon.textContent = '✅'
            
            setTimeout(() => {
              originalIcon.textContent = originalText
            }, 1000)
          } catch (fallbackError) {
            console.error('Fallback copy failed:', fallbackError)
            alert('Failed to copy task ID to clipboard')
          }
          document.body.removeChild(textArea)
        }
      })
    })
  }, 100)
}

async function markTaskAsCompleted(spec, task) {
  try {
    // Get invoke from global scope
    if (!invoke && window.__TAURI__ && window.__TAURI__.core) {
      invoke = window.__TAURI__.core.invoke;
    }
    
    if (!invoke) {
      throw new Error('Tauri API not available');
    }
    
    // Update task status in tasks.json
    task.status = 'completed'
    task.completed = new Date().toISOString().split('T')[0]
    
    await invoke('update_task_status', { 
      specPath: spec.path,
      taskId: task.id,
      status: 'completed',
      completedDate: task.completed
    })
    
    // Refresh the specs data
    const sortState = {
      column: 'modified',
      direction: 'desc',
      data: []
    }
    await loadSpecsData(sortState)
    
    // Re-select the current spec to refresh details
    const updatedSpec = sortState.data.find(s => s.id === spec.id)
    if (updatedSpec) {
      const row = document.querySelector(`tr[data-spec-id="${spec.id}"]`)
      if (row) {
        selectSpecRow(row, updatedSpec)
      }
    }
    
    alert(`Task "${task.name}" marked as completed!`)
  } catch (error) {
    console.error('Failed to update task status:', error)
    alert('Failed to update task status. Please check the console for details.')
  }
}

function displayAnalysisResults(spec, results) {
  // Create modal for analysis results
  const existing = document.getElementById('analysis-results-modal')
  if (existing) existing.remove()
  
  const modal = document.createElement('div')
  modal.id = 'analysis-results-modal'
  modal.className = 'text-display-modal'
  modal.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h3>Analysis Results: ${spec.feature}</h3>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="text-display markdown">${renderBasicMarkdown(results)}</div>
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
}

function openCreateSpecDialog() {
  // Create spec creation modal
  const existing = document.getElementById('create-spec-modal')
  if (existing) existing.remove()
  
  const modal = document.createElement('div')
  modal.id = 'create-spec-modal'
  modal.className = 'create-spec-modal'
  modal.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h3>Create New Spec</h3>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label for="spec-name-input">Spec Name:</label>
          <input type="text" id="spec-name-input" placeholder="Enter spec name (e.g., User Authentication)" />
        </div>
        <div class="form-group">
          <label for="spec-description-input">Description:</label>
          <textarea id="spec-description-input" placeholder="Brief description of what this spec will accomplish" rows="3"></textarea>
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" id="lite-mode-checkbox" />
            Lite mode (minimal template)
          </label>
        </div>
      </div>
      <div class="modal-footer">
        <button id="create-spec-btn" class="btn-primary">Create Spec</button>
        <button id="cancel-spec-btn" class="btn-secondary">Cancel</button>
      </div>
    </div>
  `
  document.body.appendChild(modal)
  
  // Close handlers
  const closeModal = () => modal.remove()
  modal.querySelector('.modal-backdrop').addEventListener('click', closeModal)
  modal.querySelector('.modal-close').addEventListener('click', closeModal)
  modal.querySelector('#cancel-spec-btn').addEventListener('click', closeModal)
  
  // ESC key handler
  const handleEscKey = (e) => {
    if (e.key === 'Escape' || e.keyCode === 27) {
      closeModal()
      document.removeEventListener('keydown', handleEscKey)
    }
  }
  document.addEventListener('keydown', handleEscKey)
  
  // Focus the name input
  setTimeout(() => {
    document.getElementById('spec-name-input').focus()
  }, 100)
  
  // Create spec handler
  document.getElementById('create-spec-btn').addEventListener('click', async () => {
    const specName = document.getElementById('spec-name-input').value.trim()
    const description = document.getElementById('spec-description-input').value.trim()
    const liteMode = document.getElementById('lite-mode-checkbox').checked
    
    if (!specName) {
      alert('Please enter a spec name')
      return
    }
    
    if (!description) {
      alert('Please enter a description')
      return
    }
    
    try {
      // Get invoke from global scope
      if (!invoke && window.__TAURI__ && window.__TAURI__.core) {
        invoke = window.__TAURI__.core.invoke;
      }
      
      if (!invoke) {
        throw new Error('Tauri API not available');
      }
      
      // Get current project path
      const projectSelect = document.getElementById('projectsSelect')
      if (!projectSelect || !projectSelect.value) {
        throw new Error('No project selected');
      }
      
      const projectPath = projectSelect.value
      
      // Disable button and show loading
      const createBtn = document.getElementById('create-spec-btn')
      createBtn.disabled = true
      createBtn.textContent = 'Creating...'
      
      // Call create_spec command
      const result = await invoke('create_spec', {
        projectPath,
        specName,
        description,
        liteMode
      })
      
      // Show success message using the existing analysis results modal
      displayAnalysisResults({feature: 'New Spec Created'}, `✅ ${result}\n\nThe new spec has been created and is ready for development.`)
      
      // Close the dialog
      closeModal()
      
      // Refresh the specs list if we're in the specs management window
      const specsModal = document.getElementById('specs-management-modal')
      if (specsModal) {
        // Reload specs data
        const sortState = {
          column: 'modified',
          direction: 'desc',
          data: []
        }
        await loadSpecsData(sortState)
      }
      
    } catch (error) {
      console.error('Failed to create spec:', error)
      alert(`Failed to create spec: ${error.message}`)
      
      // Re-enable button
      const createBtn = document.getElementById('create-spec-btn')
      createBtn.disabled = false
      createBtn.textContent = 'Create Spec'
    }
  })
}

// Export for use in shared.js
window.openFilePreview = openFilePreview
window.openSpecsManagementWindow = openSpecsManagementWindow
window.openSpecsManagementModal = openSpecsManagementModal