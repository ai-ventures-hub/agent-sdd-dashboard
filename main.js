import { state, bindCommon, selectProject } from './shared.js'

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  bindCommon()
  
  // Set up file click handlers (will be added after text display component)
  setupFileClickHandlers()
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
    const content = await window.__API.read_file(filePath)
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
  // Basic markdown rendering (can be enhanced with a proper library later)
  let html = escapeHtml(text)
  
  // Headers
  html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>')
  
  // Bold and italic
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>')
  
  // Code blocks
  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
  html = html.replace(/`(.*?)`/g, '<code>$1</code>')
  
  // Lists
  html = html.replace(/^- (.*?)$/gm, '<li>$1</li>')
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
  
  // Line breaks
  html = html.replace(/\n\n/g, '</p><p>')
  html = '<p>' + html + '</p>'
  
  return html
}

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// Export for use in shared.js
window.openFilePreview = openFilePreview