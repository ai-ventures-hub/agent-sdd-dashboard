import { createModal, setupModalClose, escapeHtml } from '../../utils/dom.js'

// Import Tauri API
const { invoke } = window.__TAURI__.core

/**
 * Attach click handler for opening the installer wizard.
 */
export function setupInstallerWizard() {
  const installerBtn = document.getElementById('btnInstaller')
  if (installerBtn) {
    installerBtn.addEventListener('click', openInstallerWizard)
  }
}

/**
 * Launch the multi-step Agent‑SDD installer wizard.
 */
export async function openInstallerWizard() {
  const modal = createModal('installer-wizard-modal')

  modal.innerHTML = `
    <div class="
      absolute inset-0 bg-black/70
      backdrop-blur-sm
    "></div>
    <div class="
      relative w-full max-w-2xl max-h-[90vh] mx-4
      bg-white dark:bg-gray-800 rounded-xl shadow-lg
      flex flex-col
    ">
      <div class="
        flex items-center justify-between p-4
        border-b border-gray-200 dark:border-gray-700 bg-app-card
      ">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          Agent-SDD Installer Wizard
        </h3>
        <button class="
          text-gray-500 hover:text-gray-700
          dark:text-gray-400 dark:hover:text-gray-200
          text-2xl leading-none
        ">&times;</button>
      </div>
      <div class="p-4 overflow-auto max-h-[calc(90vh-12rem)]">
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
      <div class="
        flex justify-end gap-2 p-4
        border-t border-gray-200 dark:border-gray-700
      ">
        <button id="wizard-back" class="
          px-4 py-2 text-sm font-medium
          text-gray-700 bg-gray-100 hover:bg-gray-200
          dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600
          rounded-lg transition-colors
        " style="display: none;">Back</button>
        <button id="wizard-next" class="
          px-4 py-2 text-sm font-medium text-white
          bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors
        ">Next</button>
        <button id="wizard-install" class="
          px-4 py-2 text-sm font-medium text-white
          bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors
        " style="display: none;">Install</button>
        <button id="wizard-cancel" class="
          px-4 py-2 text-sm font-medium
          text-gray-700 bg-gray-100 hover:bg-gray-200
          dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600
          rounded-lg transition-colors
        ">Cancel</button>
      </div>
    </div>
  `

  setupModalClose(modal)

  // Modal state
  let currentStep = 1
  let selectedProjectPath = ''
  let projectConfig = {}

  function showStep(step) {
    for (let i = 1; i <= 3; i++) {
      document.getElementById(`step-${i}`).style.display = 'none'
    }
    document.getElementById(`step-${step}`).style.display = 'block'
    document.getElementById('wizard-back').style.display = step === 1 ? 'none' : 'inline-block'
    document.getElementById('wizard-next').style.display = step === 3 ? 'none' : 'inline-block'
    document.getElementById('wizard-install').style.display = step === 3 ? 'inline-block' : 'none'
    currentStep = step
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

  document.getElementById('choose-project-dir').addEventListener('click', async () => {
    try {
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

  document.getElementById('project-name').addEventListener('input', updateNextButtonState)

  document.getElementById('wizard-back').addEventListener('click', () => {
    if (currentStep > 1) showStep(currentStep - 1)
  })

  document.getElementById('wizard-next').addEventListener('click', () => {
    if (currentStep === 1 && selectedProjectPath) {
      showStep(2)
    } else if (currentStep === 2) {
      projectConfig = {
        name: document.getElementById('project-name').value.trim(),
        description: document.getElementById('project-description').value.trim(),
        createStandards: document.getElementById('create-standards').checked,
        createSpecs: document.getElementById('create-specs').checked,
        createAgents: document.getElementById('create-agents').checked
      }
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
        <strong>Project Path:</strong> ${escapeHtml(selectedProjectPath)}
      </div>
      <div class="summary-item">
        <strong>Project Name:</strong> ${escapeHtml(projectConfig.name)}
      </div>
      <div class="summary-item">
        <strong>Description:</strong> ${escapeHtml(projectConfig.description || 'No description')}
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
    const progressEl = modal.querySelector('.install-progress')
    const resultEl = document.getElementById('install-result')
    const installBtn = document.getElementById('wizard-install')

    progressEl.style.display = 'block'
    installBtn.disabled = true

    try {
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
          <p>Agent-SDD structure has been created in:<br><code>${escapeHtml(selectedProjectPath)}/.agent-sdd/</code></p>
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
          <p>Error: ${escapeHtml(error.message)}</p>
        </div>
      `
      installBtn.disabled = false
    }
  }

  showStep(1)
}
