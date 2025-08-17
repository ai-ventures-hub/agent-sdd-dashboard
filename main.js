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

// Export for use in shared.js
window.openFilePreview = openFilePreview