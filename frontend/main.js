import { bindCommon } from './shared.js'
import { setupFileClickHandlers } from './components/modals/filePreview.js'
import { setupInstallerWizard } from './components/modals/installerWizard.js'
import { setupSpecsManagementWindow } from './components/modals/specsManagement.js'

document.addEventListener('DOMContentLoaded', () => {
  bindCommon()
  setupFileClickHandlers()
  setupInstallerWizard()
  setupSpecsManagementWindow()
})
