import { createModal, setupModalClose, escapeHtml } from '../../utils/dom.js'
import { renderBasicMarkdown } from '../renderers/markdown.js'

// Import Tauri API
const { invoke } = window.__TAURI__.core

// Set up file click handlers
export function setupFileClickHandlers() {
  document.addEventListener('click', (e) => {
    if (e.target.closest('.file-link')) {
      e.preventDefault()
      const filePath = e.target.closest('.file-link').dataset.path
      openFilePreview(filePath)
    }
  })
}

// Open file preview modal
export async function openFilePreview(filePath) {
  const modal = createModal('text-display-modal')
  
  modal.innerHTML = `
    <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
    <div class="relative w-[90%] max-w-4xl max-h-[80vh] bg-app-panel border border-app-outline rounded-xl flex flex-col overflow-hidden">
      <div class="flex items-center justify-between p-4 border-b border-app-outline bg-app-card">
        <h3 class="m-0 text-sm font-medium">${filePath.split('/').pop()}</h3>
        <button class="bg-transparent border border-app-outline text-app-muted w-7 h-7 rounded cursor-pointer flex items-center justify-center text-lg hover:bg-app-card hover:text-app-text">&times;</button>
      </div>
      <div class="flex-1 overflow-auto p-4">
        <div class="text-center text-app-muted py-8">Loading...</div>
      </div>
    </div>
  `
  
  // Set up close handlers
  setupModalClose(modal)
  
  // Load file content
  try {
    const content = await invoke('read_file', { filePath })
    const bodyEl = modal.querySelector('.flex-1')
    
    if (filePath.endsWith('.md')) {
      // For markdown files, render as HTML
      bodyEl.innerHTML = `<div class="font-mono text-sm leading-relaxed">${renderBasicMarkdown(content)}</div>`
    } else if (filePath.endsWith('.json')) {
      // For JSON files, pretty print
      try {
        const parsed = JSON.parse(content)
        bodyEl.innerHTML = `<pre class="font-mono text-sm leading-relaxed bg-app-card p-3 rounded">${JSON.stringify(parsed, null, 2)}</pre>`
      } catch {
        bodyEl.innerHTML = `<pre class="font-mono text-sm leading-relaxed">${escapeHtml(content)}</pre>`
      }
    } else {
      // For other files, display as plain text
      bodyEl.innerHTML = `<pre class="font-mono text-sm leading-relaxed">${escapeHtml(content)}</pre>`
    }
  } catch (error) {
    modal.querySelector('.flex-1').innerHTML = `
      <div class="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded">Failed to load file: ${error.message}</div>
    `
  }
}