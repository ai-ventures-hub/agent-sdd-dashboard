// Date formatting utilities
export function formatDate(dateStr) {
  if (!dateStr) return '-'
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
  if (isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  })
}

// File size formatting
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

// Status icon mapping
export function getStatusIcon(status) {
  switch (status) {
    case 'completed': return '✅'
    case 'in_progress': return '⏳'
    case 'pending': return '⭕'
    default: return '❓'
  }
}

// Status CSS class mapping
export function getStatusClass(status) {
  switch (status) {
    case 'completed': return 'bg-green-500/15 text-green-400 border border-green-400'
    case 'in_progress': return 'bg-yellow-500/15 text-yellow-400 border border-yellow-400'
    case 'pending': return 'bg-gray-500/15 text-gray-400 border border-gray-400'
    default: return 'bg-gray-500/15 text-gray-400 border border-gray-400'
  }
}

// Task status icon mapping
export function getTaskStatusIcon(status) {
  switch (status) {
    case 'completed': return '✅'
    case 'in_progress': return '🔄'
    case 'pending': return '⭕'
    default: return '❓'
  }
}