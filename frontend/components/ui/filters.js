import { debounce } from '../../utils/debounce.js'
import { getSpecsData, setFilteredSpecsData } from '../../services/specsService.js'
import { renderSpecsTable } from './table.js'

// Set up specs filters and search
export function setupSpecsFiltersAndSearch() {
  // Search functionality
  const searchInput = document.getElementById('specs-search')
  if (searchInput) {
    searchInput.addEventListener('input', debounce(() => {
      applySpecsFilters()
    }, 300))
  }
  
  // Phase filter
  const phaseFilter = document.getElementById('phase-filter')
  if (phaseFilter) {
    phaseFilter.addEventListener('change', () => {
      applySpecsFilters()
    })
  }
  
  // Status filter
  const statusFilter = document.getElementById('status-filter')
  if (statusFilter) {
    statusFilter.addEventListener('change', () => {
      applySpecsFilters()
    })
  }
}

// Apply filters to specs data
export function applySpecsFilters() {
  const specsData = getSpecsData()
  if (!specsData) return
  
  const searchValue = document.getElementById('specs-search')?.value.toLowerCase() || ''
  const phaseValue = document.getElementById('phase-filter')?.value || ''
  const statusValue = document.getElementById('status-filter')?.value || ''
  
  // Apply filters
  let filtered = specsData.filter(spec => {
    // Search filter - search in feature, phase, tasks
    if (searchValue) {
      const searchIn = [
        spec.feature.toLowerCase(),
        spec.phase.toLowerCase(),
        spec.status.toLowerCase(),
        ...spec.tasks.map(t => t.name.toLowerCase()),
        ...spec.tasks.map(t => t.description.toLowerCase())
      ].join(' ')
      
      if (!searchIn.includes(searchValue)) {
        return false
      }
    }
    
    // Phase filter
    if (phaseValue && spec.phase !== phaseValue) {
      return false
    }
    
    // Status filter
    if (statusValue && spec.status !== statusValue) {
      return false
    }
    
    return true
  })
  
  setFilteredSpecsData(filtered)
  renderSpecsTable(filtered)
}