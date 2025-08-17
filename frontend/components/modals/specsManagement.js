import { createModal, setupModalClose } from '../../utils/dom.js'
import { loadSpecsData } from '../../services/specsService.js'
import { renderSpecsTable, setupTableSorting } from '../ui/table.js'
import { setupSpecsFiltersAndSearch } from '../ui/filters.js'

// Set up specs management window
export function setupSpecsManagementWindow() {
  const specsBtn = document.getElementById('btnSpecsManagement')
  if (specsBtn) {
    specsBtn.addEventListener('click', openSpecsManagementWindow)
  }
}

// Open specs management window modal
export async function openSpecsManagementWindow() {
  const modal = createModal('specs-management-modal')
  
  modal.innerHTML = `
    <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
    <div class="relative w-[95%] max-w-7xl h-[85vh] max-h-[800px] bg-app-panel border border-app-outline rounded-xl flex flex-col overflow-hidden">
      <div class="flex items-center justify-between p-4 border-b border-app-outline bg-app-card">
        <h3 class="m-0 text-lg font-semibold">Specs Management</h3>
        <button class="bg-transparent border border-app-outline text-app-muted w-7 h-7 rounded cursor-pointer flex items-center justify-center text-lg hover:bg-app-card hover:text-app-text">&times;</button>
      </div>
      <div class="flex flex-col flex-1 overflow-hidden">
        <div class="flex items-center justify-between p-3 border-b border-app-outline">
          <div class="flex-1 max-w-xs">
            <input type="text" id="specs-search" placeholder="Search specs..." class="w-full p-2 bg-app-card border border-app-outline rounded text-app-text text-sm focus:outline-none focus:border-app-accent" />
          </div>
          <div class="flex gap-2">
            <select id="phase-filter" class="p-2 bg-app-card border border-app-outline rounded-lg text-app-text text-sm">
              <option value="">All Phases</option>
              <option value="Phase 1">Phase 1</option>
              <option value="Phase 2">Phase 2</option>
              <option value="Phase 3">Phase 3</option>
              <option value="Phase 4">Phase 4</option>
            </select>
            <select id="status-filter" class="p-2 bg-app-card border border-app-outline rounded-lg text-app-text text-sm">
              <option value="">All Status</option>
              <option value="completed">Completed</option>
              <option value="in_progress">In Progress</option>
              <option value="pending">Not Started</option>
            </select>
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4 flex-1 overflow-hidden p-4">
          <div class="overflow-auto border border-app-outline rounded-lg bg-app-card">
            <table class="specs-table w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th class="bg-app-panel text-app-text p-3 text-left border-b-2 border-app-outline font-semibold sticky top-0 z-10 sortable cursor-pointer select-none hover:bg-app-card" data-column="status">Status</th>
                  <th class="bg-app-panel text-app-text p-3 text-left border-b-2 border-app-outline font-semibold sticky top-0 z-10 sortable cursor-pointer select-none hover:bg-app-card" data-column="feature">Feature</th>
                  <th class="bg-app-panel text-app-text p-3 text-left border-b-2 border-app-outline font-semibold sticky top-0 z-10 sortable cursor-pointer select-none hover:bg-app-card" data-column="phase">Phase</th>
                  <th class="bg-app-panel text-app-text p-3 text-left border-b-2 border-app-outline font-semibold sticky top-0 z-10 sortable cursor-pointer select-none hover:bg-app-card" data-column="date">Date</th>
                  <th class="bg-app-panel text-app-text p-3 text-left border-b-2 border-app-outline font-semibold sticky top-0 z-10 sortable cursor-pointer select-none hover:bg-app-card" data-column="progress">Progress</th>
                  <th class="bg-app-panel text-app-text p-3 text-left border-b-2 border-app-outline font-semibold sticky top-0 z-10 sortable cursor-pointer select-none hover:bg-app-card" data-column="effort">Size</th>
                  <th class="bg-app-panel text-app-text p-3 text-left border-b-2 border-app-outline font-semibold sticky top-0 z-10 sortable cursor-pointer select-none hover:bg-app-card" data-column="modified">Modified</th>
                </tr>
              </thead>
              <tbody id="specs-table-body">
                <tr>
                  <td colspan="7" class="text-center text-app-muted py-8 italic">Loading specs...</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div class="specs-details-panel border border-app-outline rounded-lg bg-app-card overflow-auto">
            <div class="flex flex-col items-center justify-center h-full text-app-muted">
              <div class="text-5xl mb-4 opacity-50">📋</div>
              <div class="text-lg italic">Select a spec to view details</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
  
  // Set up close handlers
  setupModalClose(modal)
  
  // Load specs data and set up functionality
  await loadAndSetupSpecs()
}

// Load specs data and set up all functionality
async function loadAndSetupSpecs() {
  const tableBody = document.getElementById('specs-table-body')
  if (!tableBody) return
  
  try {
    // Load specs data
    const specs = await loadSpecsData()
    
    // Render the specs table
    renderSpecsTable(specs)
    
    // Set up filter and search handlers
    setupSpecsFiltersAndSearch()
    
    // Set up table sorting
    setupTableSorting()
    
  } catch (error) {
    console.error('Failed to load specs:', error)
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="error-row">Failed to load specs: ${error.message}</td>
      </tr>
    `
  }
}