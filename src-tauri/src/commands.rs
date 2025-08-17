use std::fs;
use std::path::Path;
use serde::{Deserialize, Serialize};
use tauri_plugin_dialog::DialogExt;

#[derive(Debug, Serialize, Deserialize)]
pub struct DirectoryInfo {
    name: String,
    full_path: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProjectReport {
    has_agent_sdd: bool,
    sections: std::collections::HashMap<String, SectionInfo>,
    warnings: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SectionInfo {
    exists: bool,
    summary: SectionSummary,
    files: Vec<FileInfo>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SectionSummary {
    total: usize,
    bytes: u64,
    latest: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileInfo {
    rel_path: String,
    full_path: String,
    size: u64,
    mtime: Option<u64>,
}

#[tauri::command]
pub async fn select_base_dir(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let dialog = app.dialog().file();
    
    match dialog.blocking_pick_folder() {
        Some(folder) => Ok(Some(folder.to_string())),
        None => Ok(None),
    }
}

#[tauri::command]
pub async fn list_child_directories(base_path: String) -> Result<Vec<DirectoryInfo>, String> {
    let base = Path::new(&base_path);
    
    if !base.exists() || !base.is_dir() {
        return Err("Base path does not exist or is not a directory".to_string());
    }
    
    let mut directories = Vec::new();
    
    match fs::read_dir(base) {
        Ok(entries) => {
            for entry in entries {
                match entry {
                    Ok(entry) => {
                        let path = entry.path();
                        if path.is_dir() {
                            if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                                // Skip hidden directories
                                if !name.starts_with('.') {
                                    // Only include directories that have .agent-sdd subdirectory
                                    let agent_sdd_path = path.join(".agent-sdd");
                                    if agent_sdd_path.exists() && agent_sdd_path.is_dir() {
                                        directories.push(DirectoryInfo {
                                            name: name.to_string(),
                                            full_path: path.to_string_lossy().to_string(),
                                        });
                                    }
                                }
                            }
                        }
                    }
                    Err(e) => {
                        log::warn!("Failed to read directory entry: {}", e);
                    }
                }
            }
        }
        Err(e) => {
            return Err(format!("Failed to read directory: {}", e));
        }
    }
    
    // Sort by name
    directories.sort_by(|a, b| a.name.cmp(&b.name));
    
    Ok(directories)
}

#[tauri::command]
pub async fn scan_project(project_path: String) -> Result<ProjectReport, String> {
    let project_dir = Path::new(&project_path);
    let agent_sdd_dir = project_dir.join(".agent-sdd");
    
    log::info!("Scanning project at: '{}'", project_path);
    log::info!("Project dir resolved to: '{}'", project_dir.display());
    log::info!("Looking for .agent-sdd at: '{}'", agent_sdd_dir.display());
    log::info!("Agent SDD path exists: {}", agent_sdd_dir.exists());
    log::info!("Agent SDD path is_dir: {}", agent_sdd_dir.is_dir());
    
    let has_agent_sdd = agent_sdd_dir.exists() && agent_sdd_dir.is_dir();
    
    let mut sections = std::collections::HashMap::new();
    let mut warnings = Vec::new();
    
    if has_agent_sdd {
        // Scan standard sections
        let section_names = ["standards", "product", "specs", "instructions", "agents"];
        
        for section_name in section_names {
            let section_path = agent_sdd_dir.join(section_name);
            let section_info = scan_section(&section_path, section_name).await?;
            sections.insert(section_name.to_string(), section_info);
        }
    } else {
        let exists = agent_sdd_dir.exists();
        let is_dir = agent_sdd_dir.is_dir();
        
        if !exists {
            warnings.push(format!("Path does not exist: {}", agent_sdd_dir.display()));
        } else if !is_dir {
            warnings.push(format!("Path exists but is not a directory: {}", agent_sdd_dir.display()));
        } else {
            warnings.push(format!("Unexpected: path exists and is directory but has_agent_sdd is false: {}", agent_sdd_dir.display()));
        }
    }
    
    Ok(ProjectReport {
        has_agent_sdd,
        sections,
        warnings,
    })
}

#[tauri::command]
pub async fn read_file(file_path: String) -> Result<String, String> {
    let path = Path::new(&file_path);
    
    if !path.exists() {
        return Err("File does not exist".to_string());
    }
    
    if !path.is_file() {
        return Err("Path is not a file".to_string());
    }
    
    // Check file size (limit to 10MB)
    const MAX_FILE_SIZE: u64 = 10 * 1024 * 1024;
    match fs::metadata(&path) {
        Ok(metadata) => {
            if metadata.len() > MAX_FILE_SIZE {
                return Err("File too large (>10MB)".to_string());
            }
        }
        Err(e) => {
            return Err(format!("Failed to read file metadata: {}", e));
        }
    }
    
    match fs::read_to_string(&path) {
        Ok(content) => Ok(content),
        Err(e) => Err(format!("Failed to read file: {}", e)),
    }
}

async fn scan_section(section_path: &Path, section_name: &str) -> Result<SectionInfo, String> {
    let exists = section_path.exists() && section_path.is_dir();
    
    if !exists {
        return Ok(SectionInfo {
            exists: false,
            summary: SectionSummary {
                total: 0,
                bytes: 0,
                latest: None,
            },
            files: Vec::new(),
        });
    }
    
    let mut files = Vec::new();
    let mut total_bytes = 0u64;
    let mut latest_mtime: Option<u64> = None;
    
    match scan_directory_recursive(section_path, section_path) {
        Ok(scanned_files) => {
            for file_info in scanned_files {
                total_bytes += file_info.size;
                
                if let Some(mtime) = file_info.mtime {
                    latest_mtime = Some(latest_mtime.map_or(mtime, |latest| latest.max(mtime)));
                }
                
                files.push(file_info);
            }
        }
        Err(e) => {
            log::warn!("Failed to scan section {}: {}", section_name, e);
        }
    }
    
    // Sort files by relative path
    files.sort_by(|a, b| a.rel_path.cmp(&b.rel_path));
    
    Ok(SectionInfo {
        exists: true,
        summary: SectionSummary {
            total: files.len(),
            bytes: total_bytes,
            latest: latest_mtime,
        },
        files,
    })
}

fn scan_directory_recursive(dir_path: &Path, base_path: &Path) -> Result<Vec<FileInfo>, String> {
    let mut files = Vec::new();
    
    match fs::read_dir(dir_path) {
        Ok(entries) => {
            for entry in entries {
                match entry {
                    Ok(entry) => {
                        let path = entry.path();
                        
                        if path.is_file() {
                            let rel_path = path.strip_prefix(base_path)
                                .map_err(|e| format!("Failed to get relative path: {}", e))?
                                .to_string_lossy()
                                .to_string();
                            
                            let metadata = fs::metadata(&path)
                                .map_err(|e| format!("Failed to get file metadata: {}", e))?;
                            
                            let mtime = metadata.modified()
                                .ok()
                                .and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok())
                                .map(|duration| duration.as_millis() as u64);
                            
                            files.push(FileInfo {
                                rel_path,
                                full_path: path.to_string_lossy().to_string(),
                                size: metadata.len(),
                                mtime,
                            });
                        } else if path.is_dir() {
                            // Recursively scan subdirectories
                            match scan_directory_recursive(&path, base_path) {
                                Ok(mut subdir_files) => {
                                    files.append(&mut subdir_files);
                                }
                                Err(e) => {
                                    log::warn!("Failed to scan subdirectory {:?}: {}", path, e);
                                }
                            }
                        }
                    }
                    Err(e) => {
                        log::warn!("Failed to read directory entry: {}", e);
                    }
                }
            }
        }
        Err(e) => {
            return Err(format!("Failed to read directory: {}", e));
        }
    }
    
    Ok(files)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SpecMetadata {
    id: String,
    name: String,
    feature: String,
    phase: String,
    status: String,
    created: String,
    path: String,
    task_count: usize,
    completed_tasks: usize,
    size_bytes: u64,
    last_modified: Option<u64>,
    tasks: Vec<TaskInfo>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TaskInfo {
    id: String,
    name: String,
    description: String,
    status: String,
    completed: Option<String>,
    dependencies: Vec<String>,
    effort: String,
    ux_ui_reviewed: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProjectConfig {
    name: String,
    description: String,
    #[serde(rename = "createStandards")]
    create_standards: bool,
    #[serde(rename = "createSpecs")]
    create_specs: bool,
    #[serde(rename = "createAgents")]
    create_agents: bool,
}

#[tauri::command]
pub async fn scan_specs(project_path: String) -> Result<Vec<SpecMetadata>, String> {
    let project_dir = Path::new(&project_path);
    let specs_dir = project_dir.join(".agent-sdd").join("specs");
    
    if !specs_dir.exists() || !specs_dir.is_dir() {
        return Ok(Vec::new());
    }
    
    let mut specs = Vec::new();
    
    match fs::read_dir(&specs_dir) {
        Ok(entries) => {
            for entry in entries {
                match entry {
                    Ok(entry) => {
                        let path = entry.path();
                        if path.is_dir() {
                            if let Some(spec_metadata) = scan_spec_directory(&path).await {
                                specs.push(spec_metadata);
                            }
                        }
                    }
                    Err(e) => {
                        log::warn!("Failed to read spec directory entry: {}", e);
                    }
                }
            }
        }
        Err(e) => {
            return Err(format!("Failed to read specs directory: {}", e));
        }
    }
    
    // Sort by creation date (newest first)
    specs.sort_by(|a, b| b.created.cmp(&a.created));
    
    Ok(specs)
}

async fn scan_spec_directory(spec_path: &Path) -> Option<SpecMetadata> {
    let tasks_file = spec_path.join("tasks.json");
    
    if !tasks_file.exists() {
        return None;
    }
    
    // Read and parse tasks.json
    let tasks_content = match fs::read_to_string(&tasks_file) {
        Ok(content) => content,
        Err(e) => {
            log::warn!("Failed to read tasks.json in {:?}: {}", spec_path, e);
            return None;
        }
    };
    
    let tasks_json: serde_json::Value = match serde_json::from_str(&tasks_content) {
        Ok(json) => json,
        Err(e) => {
            log::warn!("Failed to parse tasks.json in {:?}: {}", spec_path, e);
            return None;
        }
    };
    
    // Extract metadata from tasks.json
    let feature = tasks_json["feature"].as_str().unwrap_or("Unknown").to_string();
    let phase = tasks_json["phase"].as_str().unwrap_or("Unknown").to_string();
    let status = tasks_json["status"].as_str().unwrap_or("pending").to_string();
    let created = tasks_json["created"].as_str().unwrap_or("Unknown").to_string();
    
    let empty_vec = Vec::new();
    let tasks_array = tasks_json["tasks"].as_array().unwrap_or(&empty_vec);
    let task_count = tasks_array.len();
    let completed_tasks = tasks_array.iter()
        .filter(|task| task["status"].as_str() == Some("completed"))
        .count();
    
    // Parse individual tasks
    let mut tasks = Vec::new();
    for task in tasks_array {
        let task_info = TaskInfo {
            id: task["id"].as_str().unwrap_or("").to_string(),
            name: task["name"].as_str().unwrap_or("").to_string(),
            description: task["description"].as_str().unwrap_or("").to_string(),
            status: task["status"].as_str().unwrap_or("pending").to_string(),
            completed: task["completed"].as_str().map(|s| s.to_string()),
            dependencies: task["dependencies"].as_array()
                .map(|deps| deps.iter()
                    .filter_map(|d| d.as_str())
                    .map(|s| s.to_string())
                    .collect())
                .unwrap_or_default(),
            effort: task["effort"].as_str().unwrap_or("").to_string(),
            ux_ui_reviewed: task["ux_ui_reviewed"].as_bool(),
        };
        tasks.push(task_info);
    }
    
    // Calculate directory size and last modified time
    let (size_bytes, last_modified) = calculate_directory_stats(spec_path);
    
    // Generate a unique ID from the directory name
    let id = spec_path.file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("unknown")
        .to_string();
    
    Some(SpecMetadata {
        id: id.clone(),
        name: feature.clone(),
        feature,
        phase,
        status,
        created,
        path: spec_path.to_string_lossy().to_string(),
        task_count,
        completed_tasks,
        size_bytes,
        last_modified,
        tasks,
    })
}

fn calculate_directory_stats(dir_path: &Path) -> (u64, Option<u64>) {
    let mut total_size = 0u64;
    let mut latest_mtime: Option<u64> = None;
    
    if let Ok(entries) = fs::read_dir(dir_path) {
        for entry in entries.flatten() {
            let path = entry.path();
            if let Ok(metadata) = fs::metadata(&path) {
                if path.is_file() {
                    total_size += metadata.len();
                    
                    if let Ok(mtime) = metadata.modified() {
                        if let Ok(duration) = mtime.duration_since(std::time::UNIX_EPOCH) {
                            let mtime_ms = duration.as_millis() as u64;
                            latest_mtime = Some(latest_mtime.map_or(mtime_ms, |latest| latest.max(mtime_ms)));
                        }
                    }
                } else if path.is_dir() {
                    let (subdir_size, subdir_mtime) = calculate_directory_stats(&path);
                    total_size += subdir_size;
                    if let Some(subdir_mtime) = subdir_mtime {
                        latest_mtime = Some(latest_mtime.map_or(subdir_mtime, |latest| latest.max(subdir_mtime)));
                    }
                }
            }
        }
    }
    
    (total_size, latest_mtime)
}

#[tauri::command]
pub async fn create_agent_sdd_structure(project_path: String, config: ProjectConfig) -> Result<String, String> {
    let project_dir = Path::new(&project_path);
    
    if !project_dir.exists() || !project_dir.is_dir() {
        return Err("Project path does not exist or is not a directory".to_string());
    }
    
    let agent_sdd_dir = project_dir.join(".agent-sdd");
    
    // Check if .agent-sdd already exists
    if agent_sdd_dir.exists() {
        return Err("Agent-SDD structure already exists in this directory".to_string());
    }
    
    // Create .agent-sdd directory
    fs::create_dir(&agent_sdd_dir)
        .map_err(|e| format!("Failed to create .agent-sdd directory: {}", e))?;
    
    // Create core directories
    let core_dirs = ["product", "instructions"];
    for dir_name in core_dirs {
        let dir_path = agent_sdd_dir.join(dir_name);
        fs::create_dir(&dir_path)
            .map_err(|e| format!("Failed to create {} directory: {}", dir_name, e))?;
    }
    
    // Create optional directories
    if config.create_standards {
        let standards_dir = agent_sdd_dir.join("standards");
        fs::create_dir(&standards_dir)
            .map_err(|e| format!("Failed to create standards directory: {}", e))?;
            
        // Create a basic standards template
        let standards_readme = standards_dir.join("README.md");
        let standards_content = "# Standards\n\nThis directory contains project standards and guidelines.\n\n## Code Standards\n- Follow consistent naming conventions\n- Write self-documenting code\n- Include appropriate comments\n\n## Documentation Standards\n- Keep documentation up to date\n- Use clear and concise language\n- Include examples where helpful\n";
        fs::write(&standards_readme, standards_content)
            .map_err(|e| format!("Failed to create standards README: {}", e))?;
    }
    
    if config.create_specs {
        let specs_dir = agent_sdd_dir.join("specs");
        fs::create_dir(&specs_dir)
            .map_err(|e| format!("Failed to create specs directory: {}", e))?;
            
        // Create a basic specs template
        let specs_readme = specs_dir.join("README.md");
        let specs_content = "# Technical Specifications\n\nThis directory contains detailed technical specifications for the project.\n\n## Structure\n- `api/` - API specifications and documentation\n- `database/` - Database schemas and migration plans\n- `architecture/` - System architecture documents\n- `requirements/` - Functional and non-functional requirements\n";
        fs::write(&specs_readme, specs_content)
            .map_err(|e| format!("Failed to create specs README: {}", e))?;
    }
    
    if config.create_agents {
        let agents_dir = agent_sdd_dir.join("agents");
        fs::create_dir(&agents_dir)
            .map_err(|e| format!("Failed to create agents directory: {}", e))?;
            
        // Create a basic agents template
        let agents_readme = agents_dir.join("README.md");
        let agents_content = "# AI Agents\n\nThis directory contains AI agent configurations and prompts.\n\n## Structure\n- `prompts/` - Reusable prompts for various tasks\n- `workflows/` - Multi-step agent workflows\n- `configs/` - Agent-specific configuration files\n";
        fs::write(&agents_readme, agents_content)
            .map_err(|e| format!("Failed to create agents README: {}", e))?;
    }
    
    // Create product overview file
    let product_dir = agent_sdd_dir.join("product");
    let overview_file = product_dir.join("overview.md");
    let overview_content = format!(
        "# {}\n\n{}\n\n## Project Overview\n\nThis is an Agent-SDD enabled project.\n\n## Key Features\n\n- Feature 1\n- Feature 2\n- Feature 3\n\n## Getting Started\n\n1. Review the project documentation\n2. Set up your development environment\n3. Run the application\n\n## Resources\n\n- [Agent-SDD Documentation](https://github.com/agent-sdd)\n- [Project Repository](./)\n",
        config.name,
        if config.description.is_empty() { 
            "Project description coming soon." 
        } else { 
            &config.description 
        }
    );
    fs::write(&overview_file, overview_content)
        .map_err(|e| format!("Failed to create product overview: {}", e))?;
    
    // Create roadmap file
    let roadmap_file = product_dir.join("roadmap.md");
    let roadmap_content = format!(
        "# {} Roadmap\n\n## Phase 1: Foundation\n- [ ] Set up project structure\n- [ ] Implement core functionality\n- [ ] Create initial documentation\n\n## Phase 2: Features\n- [ ] Add key features\n- [ ] Implement user interface\n- [ ] Add testing framework\n\n## Phase 3: Polish\n- [ ] Performance optimization\n- [ ] Bug fixes and improvements\n- [ ] Final documentation review\n\n## Progress Log\n\n**[{}] – Project Initialized**\n- **What:** Created Agent-SDD structure\n- **Why:** Establish organized project foundation\n- **Impact:** Enables systematic development and documentation\n",
        config.name,
        chrono::Utc::now().format("%Y-%m-%d")
    );
    fs::write(&roadmap_file, roadmap_content)
        .map_err(|e| format!("Failed to create roadmap: {}", e))?;
    
    // Create basic instructions file
    let instructions_dir = agent_sdd_dir.join("instructions");
    let instructions_file = instructions_dir.join("development.md");
    let instructions_content = "# Development Instructions\n\n## Setup\n\n1. Clone the repository\n2. Install dependencies\n3. Configure environment variables\n4. Run initial setup scripts\n\n## Development Workflow\n\n1. Create feature branch\n2. Make changes\n3. Test thoroughly\n4. Submit pull request\n5. Code review and merge\n\n## Testing\n\n- Run unit tests: `npm test`\n- Run integration tests: `npm run test:integration`\n- Check code coverage: `npm run coverage`\n\n## Deployment\n\n1. Ensure all tests pass\n2. Update version numbers\n3. Create release notes\n4. Deploy to staging\n5. Deploy to production\n";
    fs::write(&instructions_file, instructions_content)
        .map_err(|e| format!("Failed to create development instructions: {}", e))?;
    
    Ok("Agent-SDD structure created successfully".to_string())
}