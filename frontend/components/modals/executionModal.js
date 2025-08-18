import { createModal, setupModalClose, escapeHtml } from '../../utils/dom.js'

// Tauri API will be accessed at runtime

/**
 * Execution Modal Component
 * Modal to show command execution progress and output
 */
export class ExecutionModal {
  constructor(options = {}) {
    this.command = options.command || ''
    this.taskData = options.taskData || {}
    this.specData = options.specData || {}
    this.projectPath = options.projectPath || ''
    this.onComplete = options.onComplete || (() => {})
    this.onCancel = options.onCancel || (() => {})
    
    this.modal = null
    this.outputContainer = null
    this.statusElement = null
    this.progressElement = null
    this.isExecuting = false
    this.executionProcess = null
    
    this.render()
  }

  /**
   * Render the execution modal
   */
  render() {
    this.modal = createModal('execution-modal')
    
    this.modal.innerHTML = `
      <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
      <div class="relative w-[90%] max-w-3xl max-h-[80vh] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl flex flex-col overflow-hidden shadow-lg">
        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          <div class="flex items-center gap-3">
            <div class="execution-status-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" 
                   fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" 
                   stroke-linejoin="round" class="lucide text-blue-500">
                <path d="M9 18l6-6-6-6v12z"/>
              </svg>
            </div>
            <div>
              <h3 class="m-0 text-lg font-semibold text-gray-900 dark:text-gray-100">Executing Command</h3>
              <p class="m-0 text-sm text-gray-600 dark:text-gray-400">${this.getCommandDescription()}</p>
            </div>
          </div>
          <button class="cancel-btn bg-transparent border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 w-8 h-8 rounded cursor-pointer flex items-center justify-center text-lg hover:bg-gray-100 dark:hover:bg-gray-600 hover:text-gray-900 dark:hover:text-gray-100 transition-colors duration-200">
            &times;
          </button>
        </div>
        
        <!-- Progress Section -->
        <div class="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          <div class="flex items-center gap-3 mb-2">
            <div class="execution-status text-sm font-medium text-gray-700 dark:text-gray-300">Initializing...</div>
          </div>
          <div class="execution-progress bg-gray-200 dark:bg-gray-600 rounded-full h-2 overflow-hidden">
            <div class="progress-bar bg-blue-500 h-full transition-all duration-300 ease-out" style="width: 0%"></div>
          </div>
        </div>
        
        <!-- Output Section -->
        <div class="flex-1 overflow-auto p-4 bg-white dark:bg-gray-800">
          <div class="execution-output font-mono text-sm leading-relaxed">
            <div class="text-gray-500 dark:text-gray-400 italic">Waiting for execution to start...</div>
          </div>
        </div>
        
        <!-- Footer -->
        <div class="execution-footer p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 flex items-center justify-between">
          <div class="text-xs text-gray-500 dark:text-gray-400">
            Command: <code class="bg-gray-200 dark:bg-gray-600 px-1 rounded">${this.command}</code>
          </div>
          <div class="flex items-center gap-2">
            <button class="cancel-btn bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-3 py-1 rounded text-sm hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors duration-200">
              Cancel
            </button>
          </div>
        </div>
      </div>
    `
    
    // Cache references to key elements
    this.outputContainer = this.modal.querySelector('.execution-output')
    this.statusElement = this.modal.querySelector('.execution-status')
    this.progressElement = this.modal.querySelector('.progress-bar')
    
    // Set up close handlers
    this.setupCloseHandlers()
    
    return this.modal
  }

  /**
   * Get human-readable command description
   */
  getCommandDescription() {
    const descriptions = {
      'execute-task': `Execute task ${this.taskData.id || 'Unknown'}`,
      'fix': `Fix task ${this.taskData.id || 'Unknown'}`,
      'tweak': `Tweak task ${this.taskData.id || 'Unknown'}`,
      'check-task': `Check task ${this.taskData.id || 'Unknown'}`,
      'queue-fix': `Queue fix for task ${this.taskData.id || 'Unknown'}`,
      'queue-tweak': `Queue tweak for task ${this.taskData.id || 'Unknown'}`
    }
    
    return descriptions[this.command] || `Execute ${this.command} command`
  }

  /**
   * Set up modal close handlers
   */
  setupCloseHandlers() {
    const closeModal = () => {
      if (this.isExecuting) {
        this.cancelExecution()
      } else {
        this.close()
      }
    }
    
    // Close on backdrop click (only if not executing)
    const backdrop = this.modal.querySelector('.absolute')
    if (backdrop) {
      backdrop.addEventListener('click', () => {
        if (!this.isExecuting) {
          this.close()
        }
      })
    }
    
    // Close/cancel button clicks
    const cancelBtns = this.modal.querySelectorAll('.cancel-btn')
    cancelBtns.forEach(btn => {
      btn.addEventListener('click', closeModal)
    })
    
    // ESC key handler
    this.handleEscKey = (e) => {
      if (e.key === 'Escape' || e.keyCode === 27) {
        closeModal()
      }
    }
    document.addEventListener('keydown', this.handleEscKey)
  }

  /**
   * Start command execution
   */
  async execute() {
    if (this.isExecuting) return
    
    console.log('ExecutionModal.execute() called with:', {
      command: this.command,
      taskData: this.taskData,
      specData: this.specData,
      projectPath: this.projectPath
    })
    
    this.isExecuting = true
    this.updateStatus('Executing...', 'executing')
    this.updateProgress(10)
    this.appendOutput(`Starting execution of command: ${this.command}\n`, 'info')
    
    try {
      // Get invoke from global scope
      let invoke
      if (window.__TAURI__ && window.__TAURI__.core) {
        invoke = window.__TAURI__.core.invoke;
      }
      
      if (!invoke) {
        throw new Error('Tauri API not available');
      }
      
      // Build command arguments based on command type and task data
      const commandArgs = this.buildCommandArgs()
      
      this.updateProgress(25)
      this.appendOutput(`Command arguments: ${commandArgs.join(' ')}\n`, 'info')
      this.appendOutput(`Task ID: ${this.taskData.id}\n`, 'info')
      this.appendOutput(`Spec path: ${this.specData.path || 'Not provided'}\n`, 'info')
      this.appendOutput(`Project path: ${this.projectPath || 'Not provided'}\n`, 'info')
      
      // Execute the command via Tauri
      this.updateProgress(50)
      const result = await invoke('execute_agent_sdd_command', {
        command: `sdd-${this.command}`,
        task_id: this.taskData.id,
        spec_path: this.specData.path || '',
        project_path: this.projectPath
      })
      
      this.updateProgress(75)
      
      // Display command output
      if (result.stdout) {
        this.appendOutput(result.stdout, 'info')
      }
      if (result.stderr) {
        this.appendOutput(result.stderr, 'warning')
      }
      
      if (result.success) {
        this.updateStatus('Completed successfully', 'success')
        this.updateProgress(100)
        this.appendOutput('\n✅ Execution completed successfully\n', 'success')
        
        if (result.duration_ms) {
          this.appendOutput(`\nExecution time: ${result.duration_ms}ms\n`, 'info')
        }
        
        // Call completion callback after a short delay
        setTimeout(() => {
          this.onComplete(result)
        }, 1000)
      } else {
        throw new Error(result.error_message || `Command failed with exit code ${result.exit_code}`)
      }
      
    } catch (error) {
      this.updateStatus('Execution failed', 'error')
      this.updateProgress(0)
      this.appendOutput(`\n❌ Error: ${error.message}\n`, 'error')
      console.error('Command execution error:', error)
    } finally {
      this.isExecuting = false
      this.updateActionButtons()
    }
  }

  /**
   * Build command arguments based on command type and task data
   */
  buildCommandArgs() {
    const args = []
    
    switch (this.command) {
      case 'execute-task':
        if (this.taskData.id) {
          args.push(this.taskData.id)
        }
        break
      case 'fix':
      case 'tweak':
      case 'check-task':
      case 'queue-fix':
      case 'queue-tweak':
        if (this.taskData.id) {
          args.push(this.taskData.id)
        }
        break
      default:
        // For unknown commands, pass task ID if available
        if (this.taskData.id) {
          args.push(this.taskData.id)
        }
    }
    
    return args
  }

  /**
   * Cancel ongoing execution
   */
  cancelExecution() {
    if (!this.isExecuting) return
    
    this.isExecuting = false
    this.updateStatus('Cancelled', 'cancelled')
    this.updateProgress(0)
    this.appendOutput('\n⚠️ Execution cancelled by user\n', 'warning')
    this.updateActionButtons()
    this.onCancel()
  }

  /**
   * Update execution status
   */
  updateStatus(status, type = 'info') {
    if (!this.statusElement) return
    
    this.statusElement.textContent = status
    
    // Update icon based on status type
    const iconContainer = this.modal.querySelector('.execution-status-icon svg')
    if (iconContainer) {
      const icons = {
        executing: '<path d="M9 18l6-6-6-6v12z"/>',
        success: '<polyline points="20,6 9,17 4,12"/>',
        error: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
        cancelled: '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
        info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'
      }
      
      const colors = {
        executing: 'text-blue-500',
        success: 'text-green-500',
        error: 'text-red-500',
        cancelled: 'text-yellow-500',
        info: 'text-gray-500'
      }
      
      iconContainer.innerHTML = icons[type] || icons.info
      iconContainer.className = iconContainer.className.replace(/text-\w+-500/g, '') + ' ' + (colors[type] || colors.info)
    }
  }

  /**
   * Update progress bar
   */
  updateProgress(percentage) {
    if (!this.progressElement) return
    
    this.progressElement.style.width = `${Math.max(0, Math.min(100, percentage))}%`
  }

  /**
   * Append output to the output container
   */
  appendOutput(text, type = 'info') {
    if (!this.outputContainer) return
    
    const colors = {
      info: 'text-gray-700 dark:text-gray-300',
      success: 'text-green-500 dark:text-green-400',
      error: 'text-red-500 dark:text-red-400',
      warning: 'text-yellow-500 dark:text-yellow-400'
    }
    
    const line = document.createElement('div')
    line.className = colors[type] || colors.info
    line.innerHTML = escapeHtml(text).replace(/\n/g, '<br>')
    
    this.outputContainer.appendChild(line)
    
    // Auto-scroll to bottom
    this.outputContainer.scrollTop = this.outputContainer.scrollHeight
  }

  /**
   * Update action buttons based on execution state
   */
  updateActionButtons() {
    const cancelBtns = this.modal.querySelectorAll('.cancel-btn')
    
    if (this.isExecuting) {
      cancelBtns.forEach(btn => {
        btn.textContent = 'Cancel'
        btn.className = btn.className.replace(/bg-gray-200.*?transition-colors duration-200/, 'bg-red-500 text-white hover:bg-red-500 transition-colors duration-200')
      })
    } else {
      cancelBtns.forEach(btn => {
        btn.textContent = 'Close'
        btn.className = btn.className.replace(/bg-red-500.*?transition-colors duration-200/, 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors duration-200')
      })
    }
  }

  /**
   * Close the modal
   */
  close() {
    if (this.isExecuting) {
      this.cancelExecution()
    }
    
    document.removeEventListener('keydown', this.handleEscKey)
    
    if (this.modal) {
      this.modal.remove()
    }
  }

  /**
   * Destroy the modal and clean up
   */
  destroy() {
    this.close()
  }
}

/**
 * Open execution modal for a command
 * @param {string} command - Command to execute
 * @param {Object} taskData - Task data
 * @param {Object} specData - Spec data containing path info
 * @param {string} projectPath - Project path
 * @param {Object} options - Additional options
 */
export function openExecutionModal(command, taskData = {}, specData = {}, projectPath = '', options = {}) {
  const modal = new ExecutionModal({
    command,
    taskData,
    specData,
    projectPath,
    onComplete: options.onComplete || (() => {}),
    onCancel: options.onCancel || (() => {})
  })
  
  // Auto-start execution after a brief delay
  console.log('Setting up auto-execution for modal:', { command, taskData, specData, projectPath })
  setTimeout(async () => {
    console.log('Auto-execution timeout triggered')
    try {
      await modal.execute()
    } catch (error) {
      console.error('Auto-execution failed:', error)
      modal.appendOutput(`❌ Failed to start execution: ${error.message}\n`, 'error')
      modal.updateStatus('Failed to start', 'error')
    }
  }, 500)
  
  return modal
}

/**
 * Set up command execution handlers for command buttons
 * @param {Object} specData - Spec data containing path info
 * @param {string} projectPath - Project path
 */
export function setupCommandExecutionHandlers(specData = {}, projectPath = '') {
  document.addEventListener('command-click', (e) => {
    const { command, taskData } = e.detail
    
    openExecutionModal(command, taskData, specData, projectPath, {
      onComplete: (result) => {
        // Refresh the page or update UI as needed
        console.log('Command execution completed:', result)
        
        // Dispatch event for other components to handle
        document.dispatchEvent(new CustomEvent('command-execution-complete', {
          detail: { command, taskData, result }
        }))
        
        // Close modal after showing success briefly
        setTimeout(() => {
          const modal = document.getElementById('execution-modal')
          if (modal) modal.remove()
        }, 2000)
      },
      onCancel: () => {
        console.log('Command execution cancelled')
      }
    })
  })
}