// HTML escaping utility
export function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// Modal creation helper
export function createModal(id, className = 'fixed inset-0 z-50 flex items-center justify-center') {
  // Remove existing modal if it exists
  const existing = document.getElementById(id)
  if (existing) existing.remove()
  
  const modal = document.createElement('div')
  modal.id = id
  modal.className = className
  document.body.appendChild(modal)
  
  return modal
}

// Modal close handler setup
export function setupModalClose(modal, onClose = null) {
  const closeModal = () => {
    if (onClose) onClose()
    modal.remove()
  }
  
  // Close on backdrop click
  const backdrop = modal.querySelector('.absolute')
  if (backdrop) {
    backdrop.addEventListener('click', closeModal)
  }
  
  // Close on button click
  const closeBtn = modal.querySelector('button')
  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal)
  }
  
  // ESC key handler
  const handleEscKey = (e) => {
    if (e.key === 'Escape' || e.keyCode === 27) {
      closeModal()
      document.removeEventListener('keydown', handleEscKey)
    }
  }
  document.addEventListener('keydown', handleEscKey)
  
  return closeModal
}