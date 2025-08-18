/**
 * Command Button Component
 * Creates action buttons for executing Agent-SDD instruction commands
 */

export class CommandButton {
  /**
   * Create a command button element
   * @param {Object} options - Button configuration
   * @param {string} options.command - Command type (execute-task, fix, tweak, etc.)
   * @param {string} options.label - Button text
   * @param {string} options.icon - Lucide icon name
   * @param {Function} options.onClick - Click handler
   * @param {boolean} options.disabled - Whether button is disabled
   * @param {string} options.variant - Button variant (primary, secondary, danger)
   * @param {string} options.size - Button size (sm, md, lg)
   */
  constructor(options = {}) {
    const {
      command = '',
      label = 'Execute',
      icon = 'play',
      onClick = () => {},
      disabled = false,
      variant = 'primary',
      size = 'sm'
    } = options

    this.command = command
    this.label = label
    this.icon = icon
    this.onClick = onClick
    this.disabled = disabled
    this.variant = variant
    this.size = size
    this.element = null
    this.isLoading = false

    this.render()
  }

  /**
   * Get variant-specific CSS classes following project theme standards
   */
  getVariantClasses() {
    const variants = {
      primary: 'bg-app-accent text-white hover:bg-green-600',
      secondary: 'bg-app-card text-app-text border border-app-outline hover:bg-app-panel',
      success: 'bg-green-500 text-white hover:bg-green-600',
      warning: 'bg-yellow-500 text-white hover:bg-yellow-600',
      danger: 'bg-red-500 text-white hover:bg-red-600'
    }
    return variants[this.variant] || variants.primary
  }

  /**
   * Get size-specific CSS classes
   */
  getSizeClasses() {
    const sizes = {
      sm: 'px-3 py-1 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base'
    }
    return sizes[this.size] || sizes.sm
  }

  /**
   * Get Lucide icon SVG
   */
  getIconSVG() {
    const icons = {
      play: '<path d="M9 18l6-6-6-6v12z"/>',
      wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
      edit: '<path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.375 2.625a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z"/>',
      check: '<polyline points="20,6 9,17 4,12"/>',
      plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
      loader: '<line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>'
    }
    
    const iconPath = icons[this.icon] || icons.play
    const loadingClass = this.isLoading ? 'animate-spin' : ''
    
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" 
           fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" 
           stroke-linejoin="round" class="lucide ${loadingClass}">
        ${iconPath}
      </svg>
    `
  }

  /**
   * Render the button element
   */
  render() {
    const baseClasses = 'inline-flex items-center gap-2 rounded-md font-medium transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2'
    const variantClasses = this.getVariantClasses()
    const sizeClasses = this.getSizeClasses()
    const disabledClasses = this.disabled ? 'opacity-60 cursor-not-allowed pointer-events-none' : 'cursor-pointer'
    
    const classes = `${baseClasses} ${variantClasses} ${sizeClasses} ${disabledClasses}`

    this.element = document.createElement('button')
    this.element.className = classes
    this.element.disabled = this.disabled
    this.element.dataset.command = this.command
    this.element.setAttribute('type', 'button')
    this.element.setAttribute('aria-label', `${this.label} command`)
    
    this.updateContent()
    
    this.element.addEventListener('click', (e) => {
      if (!this.disabled && !this.isLoading) {
        this.onClick(e, this.command)
      }
    })

    return this.element
  }

  /**
   * Update button content (icon + text)
   */
  updateContent() {
    if (!this.element) return

    const iconSVG = this.getIconSVG()
    this.element.innerHTML = `${iconSVG}<span>${this.label}</span>`
  }

  /**
   * Set loading state
   */
  setLoading(loading = true) {
    this.isLoading = loading
    this.icon = loading ? 'loader' : this.originalIcon || 'play'
    this.updateContent()
    
    if (loading) {
      this.element.classList.add('opacity-75')
      this.element.setAttribute('aria-busy', 'true')
    } else {
      this.element.classList.remove('opacity-75')
      this.element.removeAttribute('aria-busy')
    }
  }

  /**
   * Update button state
   */
  setState({ disabled, variant, label, icon }) {
    if (disabled !== undefined) {
      this.disabled = disabled
      this.element.disabled = disabled
      
      if (disabled) {
        this.element.classList.add('opacity-60', 'cursor-not-allowed', 'pointer-events-none')
      } else {
        this.element.classList.remove('opacity-60', 'cursor-not-allowed', 'pointer-events-none')
      }
    }
    
    if (variant !== undefined && variant !== this.variant) {
      this.element.className = this.element.className.replace(this.getVariantClasses(), '')
      this.variant = variant
      this.element.className += ' ' + this.getVariantClasses()
    }
    
    if (label !== undefined) {
      this.label = label
      this.updateContent()
    }
    
    if (icon !== undefined) {
      this.originalIcon = this.icon
      this.icon = icon
      this.updateContent()
    }
  }

  /**
   * Destroy the button and clean up event listeners
   */
  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element)
    }
    this.element = null
  }
}

/**
 * Create command button for common instruction commands
 */
export function createCommandButton(command, taskData = {}) {
  const commandConfigs = {
    'execute-task': {
      label: 'Execute',
      icon: 'play',
      variant: 'primary'
    },
    'fix': {
      label: 'Fix',
      icon: 'wrench',
      variant: 'warning'
    },
    'tweak': {
      label: 'Tweak',
      icon: 'edit',
      variant: 'secondary'
    },
    'check-task': {
      label: 'Check',
      icon: 'check',
      variant: 'secondary'
    },
    'queue-fix': {
      label: 'Queue Fix',
      icon: 'plus',
      variant: 'warning'
    },
    'queue-tweak': {
      label: 'Queue Tweak',
      icon: 'plus',
      variant: 'secondary'
    }
  }

  const config = commandConfigs[command] || commandConfigs['execute-task']
  const disabled = taskData.status === 'completed'

  return new CommandButton({
    command,
    ...config,
    disabled,
    onClick: (e, cmd) => {
      // Dispatch custom event for parent components to handle
      e.target.dispatchEvent(new CustomEvent('command-click', {
        bubbles: true,
        detail: { command: cmd, taskData }
      }))
    }
  })
}

/**
 * Create a group of command buttons for a task
 */
export function createCommandButtonGroup(taskData = {}, availableCommands = []) {
  const container = document.createElement('div')
  container.className = 'flex items-center gap-2'
  container.setAttribute('role', 'group')
  container.setAttribute('aria-label', 'Task commands')

  availableCommands.forEach(command => {
    const button = createCommandButton(command, taskData)
    container.appendChild(button.element)
  })

  return container
}