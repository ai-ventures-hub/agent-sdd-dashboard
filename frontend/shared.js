// Helpers
const $ = (sel) => document.querySelector(sel)

// Import Tauri API - Tauri v2 with withGlobalTauri
let invoke;

// Wait for the global Tauri API to be available
function waitForTauriAPI() {
  return new Promise((resolve) => {
    // Check if global Tauri is available
    if (window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke) {
      invoke = window.__TAURI__.core.invoke;
      console.log('✅ Using __TAURI__.core.invoke (withGlobalTauri)');
      resolve();
      return;
    }
    
    // Poll for the API to become available
    const checkAPI = () => {
      if (window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke) {
        invoke = window.__TAURI__.core.invoke;
        console.log('✅ Using __TAURI__.core.invoke (withGlobalTauri after wait)');
        resolve();
      } else {
        setTimeout(checkAPI, 50);
      }
    };
    checkAPI();
  });
}

// Initialize API when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => waitForTauriAPI());
} else {
  waitForTauriAPI();
}

let state = {
  baseDir: null,
  projects: [],
  selected: null,
  report: null,
  hideSpecs: true,
  auto: false,
  timer: null
}

function bytesToHuman(n){ if(!n) return '0 B'; const u=['B','KB','MB','GB','TB']; let i=0; while(n>=1024&&i<u.length-1){n/=1024;i++} return `${n.toFixed(1)} ${u[i]}` }
function timeAgo(ms){ if(!ms) return '—'; const d=Date.now()-ms; const m=Math.floor(d/60000); if(m<1) return 'just now'; if(m<60) return `${m}m ago`; const h=Math.floor(m/60); if(h<24) return `${h}h ago`; const days=Math.floor(h/24); return `${days}d ago` }

function renderProjectsList() {
  const select = document.getElementById('projectsSelect')
  // Clear existing options except the first one
  select.innerHTML = '<option value="">Select a project...</option>'
  
  state.projects.forEach((p) => {
    const option = document.createElement('option')
    option.value = p.full_path
    option.textContent = p.name
    option.dataset.projectName = p.name
    select.appendChild(option)
  })
  
  // Enable the dropdown if there are projects
  select.disabled = state.projects.length === 0
}

function renderSummary(report) {
  const cards = [
    { label: '.agent-sdd detected', value: report.has_agent_sdd ? 'Yes' : 'No', cls: report.has_agent_sdd ? 'ok' : 'danger' },
    { label: 'Standards files', value: report.sections?.standards?.summary?.total ?? 0 },
    { label: 'Product files', value: report.sections?.product?.summary?.total ?? 0 },
    { label: 'Specs files', value: report.sections?.specs?.summary?.total ?? 0 },
    { label: 'Instructions files', value: report.sections?.instructions?.summary?.total ?? 0 },
  ]
  document.getElementById('summary').innerHTML = cards.map(c => `
    <div class="card">
      <h3>${c.label}</h3>
      <div class="value">${c.value}</div>
      ${c.cls ? `<span class="badge ${c.cls}">status</span>` : ''}
    </div>
  `).join('')
}

function renderSections(report) {
  const container = document.getElementById('sections')
  container.innerHTML = ''
  const order = ['standards','product','specs','instructions','agents']
  order.forEach((key) => {
    const sec = report.sections[key]
    if (!sec) return
    const shouldHide = state.hideSpecs && key === 'specs'

    const wrap = document.createElement('div')
    wrap.className = 'section'

    const head = document.createElement('div')
    head.className = 'head'
    head.innerHTML = `
      <div>
        <strong>${key}</strong>
        <span class="badge ${sec.exists ? 'ok' : 'danger'}" style="margin-left:8px">${sec.exists ? 'exists' : 'missing'}</span>
      </div>
      <div class="muted">${sec.summary.total} files • ${bytesToHuman(sec.summary.bytes)} • latest ${timeAgo(sec.summary.latest)}</div>
    `

    const body = document.createElement('div')
    body.className = 'body'
    if (shouldHide) {
      body.innerHTML = '<em>Hidden (toggle above)</em>'
    } else {
      const table = document.createElement('table')
      table.className = 'filelist'
      table.innerHTML = '<thead><tr><th>File</th><th>Size</th><th>Modified</th></tr></thead>'
      const tbody = document.createElement('tbody')
      ;(sec.files || []).forEach((f) => {
        const tr = document.createElement('tr')
        const isViewable = f.rel_path.endsWith('.md') || f.rel_path.endsWith('.json') || f.rel_path.endsWith('.txt')
        tr.innerHTML = `
          <td>${isViewable ? `<a href="#" class="file-link" data-path="${f.full_path}">${f.rel_path}</a>` : f.rel_path}</td>
          <td>${bytesToHuman(f.size)}</td>
          <td>${timeAgo(f.mtime)}</td>
        `
        tbody.appendChild(tr)
      })
      table.appendChild(tbody)
      body.appendChild(table)
    }
    wrap.appendChild(head); wrap.appendChild(body); container.appendChild(wrap)
  })

  const warn = document.getElementById('warnings')
  warn.innerHTML = ''
  if (Array.isArray(report.warnings) && report.warnings.length) {
    warn.innerHTML = report.warnings.map(w => `<div class="card" style="border-left:4px solid var(--warning)"><strong>Warning:</strong> ${w}</div>`).join('')
  }
}

async function selectProject(projectPath, name) {
  document.getElementById('projectTitle').innerHTML = `<h2>${name}</h2><div class="muted">${projectPath}</div>`
  document.getElementById('btnRefresh').disabled = false

  const report = await invoke('scan_project', { projectPath })
  state.selected = { projectPath, name }
  state.report = report
  renderSummary(report)
  renderSections(report)
}

async function chooseBaseDir() {
  try {
    // Ensure Tauri API is available
    if (!invoke) {
      await waitForTauriAPI();
    }
    
    if (!invoke) {
      alert('Tauri API not available. Please run this app through Tauri.');
      return;
    }
    
    console.log('Calling select_base_dir...');
    const base = await invoke('select_base_dir')
    console.log('select_base_dir result:', base);
    
    if (!base) return
    state.baseDir = base
    document.getElementById('basePath').textContent = base

    console.log('Calling list_child_directories with base:', base);
    const list = await invoke('list_child_directories', { basePath: base })
    console.log('list_child_directories result:', list);
    
    state.projects = list
    renderProjectsList()
  } catch (error) {
    console.error('Error in chooseBaseDir:', error);
    alert(`Error: ${error}`)
  }
}

async function testAPI() {
  console.log('Testing Tauri API...');
  console.log('window.__TAURI__:', window.__TAURI__);
  console.log('invoke function:', invoke);
  
  if (!invoke) {
    await waitForTauriAPI();
  }
  
  if (invoke) {
    alert('Tauri API is available! You can now test the directory browser.');
  } else {
    alert('Tauri API is NOT available. Check console for details.');
  }
}

function bindCommon() {
  document.getElementById('btnChooseBase').addEventListener('click', chooseBaseDir)
  document.getElementById('btnRefresh').addEventListener('click', async () => {
    if (!state.selected?.projectPath) return
    await selectProject(state.selected.projectPath, state.selected.name)
  })
  document.getElementById('toggleHideSpecs').addEventListener('change', (e) => {
    state.hideSpecs = !!e.target.checked
    if (state.report) renderSections(state.report)
  })
  document.getElementById('btnTest').addEventListener('click', testAPI)
  
  // Add dropdown selection handler
  document.getElementById('projectsSelect').addEventListener('change', async (e) => {
    const selectedPath = e.target.value
    if (selectedPath) {
      const selectedOption = e.target.selectedOptions[0]
      const projectName = selectedOption.dataset.projectName
      await selectProject(selectedPath, projectName)
    }
  })
}

export { state, bindCommon, selectProject }
