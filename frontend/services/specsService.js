import { state } from '../shared.js'

// Import Tauri API
const { invoke } = window.__TAURI__.core

// Global storage for specs data
let specsData = []
let filteredSpecsData = []

// Load specs data from backend
export async function loadSpecsData() {
  try {
    // Get the selected project path from state
    const projectPath = state.selectedProject || '.'
    
    // Fetch specs data from backend
    const specs = await invoke('scan_specs', { projectPath })
    
    // Store specs data for filtering
    specsData = specs
    filteredSpecsData = specs
    
    return specs
  } catch (error) {
    console.error('Failed to load specs:', error)
    throw error
  }
}

// Get current specs data
export function getSpecsData() {
  return specsData
}

// Get filtered specs data
export function getFilteredSpecsData() {
  return filteredSpecsData
}

// Set filtered specs data
export function setFilteredSpecsData(data) {
  filteredSpecsData = data
}

// Scan specs for a specific project path
export async function scanSpecs(projectPath) {
  try {
    return await invoke('scan_specs', { projectPath })
  } catch (error) {
    console.error('Failed to scan specs:', error)
    throw error
  }
}