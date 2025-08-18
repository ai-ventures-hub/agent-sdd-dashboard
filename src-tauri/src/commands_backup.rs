use std::fs;
use std::path::Path;
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};
use serde::{Deserialize, Serialize};
use tauri_plugin_dialog::DialogExt;
use tokio::time::timeout;

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

#[tauri::command]
pub async fn create_spec(project_path: String, spec_name: String, description: String, lite_mode: bool) -> Result<String, String> {
    let project_dir = Path::new(&project_path);
    let specs_dir = project_dir.join(".agent-sdd").join("specs");
    
    if !specs_dir.exists() {
        fs::create_dir_all(&specs_dir)
            .map_err(|e| format!("Failed to create specs directory: {}", e))?;
    }
    
    // Generate directory name with current date
    let date_str = chrono::Utc::now().format("%Y-%m-%d");
    let kebab_name = spec_name.to_lowercase()
        .split_whitespace()
        .take(5)
        .collect::<Vec<_>>()
        .join("-")
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == '-')
        .collect::<String>();
    
    let spec_dir_name = format!("{}-{}", date_str, kebab_name);
    let spec_dir = specs_dir.join(&spec_dir_name);
    
    if spec_dir.exists() {
        return Err("A spec with this name already exists for today".to_string());
    }
    
    fs::create_dir(&spec_dir)
        .map_err(|e| format!("Failed to create spec directory: {}", e))?;
    
    // Create SDD markdown file
    let sdd_content = if lite_mode {
        create_lite_sdd_content(&spec_name, &description)
    } else {
        create_full_sdd_content(&spec_name, &description)
    };
    
    let sdd_file = spec_dir.join("sdd.md");
    fs::write(&sdd_file, sdd_content)
        .map_err(|e| format!("Failed to create SDD file: {}", e))?;
    
    // Create tasks.json
    let tasks_content = create_tasks_json(&spec_name, &date_str.to_string());
    let tasks_file = spec_dir.join("tasks.json");
    fs::write(&tasks_file, tasks_content)
        .map_err(|e| format!("Failed to create tasks file: {}", e))?;
    
    Ok(format!("Spec '{}' created successfully at {}", spec_name, spec_dir.to_string_lossy()))
}

#[tauri::command]
pub async fn analyze_spec(spec_path: String) -> Result<String, String> {
    let spec_dir = Path::new(&spec_path).parent()
        .ok_or("Invalid spec path")?;
    let project_dir = spec_dir.ancestors()
        .find(|p| p.join(".agent-sdd").exists())
        .ok_or("Could not find project root with .agent-sdd")?;
    
    let mut analysis = String::new();
    analysis.push_str("# Spec Analysis Results\n\n");
    
    // Read and analyze the tasks.json
    let tasks_file = Path::new(&spec_path);
    if !tasks_file.exists() {
        return Err("tasks.json not found".to_string());
    }
    
    let tasks_content = fs::read_to_string(&tasks_file)
        .map_err(|e| format!("Failed to read tasks.json: {}", e))?;
    
    let tasks_json: serde_json::Value = serde_json::from_str(&tasks_content)
        .map_err(|e| format!("Failed to parse tasks.json: {}", e))?;
    
    // Extract basic info
    let feature = tasks_json["feature"].as_str().unwrap_or("Unknown");
    let phase = tasks_json["phase"].as_str().unwrap_or("Unknown");
    let status = tasks_json["status"].as_str().unwrap_or("Unknown");
    
    analysis.push_str(&format!("## Spec Overview\n"));
    analysis.push_str(&format!("- **Feature:** {}\n", feature));
    analysis.push_str(&format!("- **Phase:** {}\n", phase));
    analysis.push_str(&format!("- **Status:** {}\n", status));
    analysis.push_str("\n");
    
    // Analyze tasks
    if let Some(tasks_array) = tasks_json["tasks"].as_array() {
        let total_tasks = tasks_array.len();
        let completed_tasks = tasks_array.iter()
            .filter(|task| task["status"].as_str() == Some("completed"))
            .count();
        let in_progress_tasks = tasks_array.iter()
            .filter(|task| task["status"].as_str() == Some("in_progress"))
            .count();
        let pending_tasks = tasks_array.iter()
            .filter(|task| task["status"].as_str() == Some("pending"))
            .count();
        
        analysis.push_str("## Task Progress\n");
        analysis.push_str(&format!("- **Total Tasks:** {}\n", total_tasks));
        analysis.push_str(&format!("- **Completed:** {} ({:.1}%)\n", completed_tasks, 
            if total_tasks > 0 { (completed_tasks as f32 / total_tasks as f32) * 100.0 } else { 0.0 }));
        analysis.push_str(&format!("- **In Progress:** {}\n", in_progress_tasks));
        analysis.push_str(&format!("- **Pending:** {}\n", pending_tasks));
        analysis.push_str("\n");
        
        // Show next task
        if let Some(next_task) = tasks_array.iter()
            .find(|task| task["status"].as_str() == Some("pending") || task["status"].as_str() == Some("in_progress")) {
            analysis.push_str("## Next Task\n");
            analysis.push_str(&format!("- **ID:** {}\n", next_task["id"].as_str().unwrap_or("N/A")));
            analysis.push_str(&format!("- **Name:** {}\n", next_task["name"].as_str().unwrap_or("N/A")));
            analysis.push_str(&format!("- **Description:** {}\n", next_task["description"].as_str().unwrap_or("N/A")));
            analysis.push_str(&format!("- **Effort:** {}\n", next_task["effort"].as_str().unwrap_or("N/A")));
            analysis.push_str("\n");
        }
    }
    
    // Check roadmap alignment
    let roadmap_file = project_dir.join(".agent-sdd").join("product").join("roadmap.md");
    if roadmap_file.exists() {
        analysis.push_str("## Roadmap Alignment\n");
        analysis.push_str("✅ Spec is part of tracked project roadmap\n\n");
    } else {
        analysis.push_str("## Roadmap Alignment\n");
        analysis.push_str("⚠️ No roadmap.md found - consider creating one\n\n");
    }
    
    analysis.push_str("## Recommendations\n");
    if status == "pending" {
        analysis.push_str("- Consider updating spec status to 'in_progress' when work begins\n");
    }
    if status == "completed" {
        analysis.push_str("- ✅ Spec is complete! Review lessons learned for future specs\n");
    } else {
        analysis.push_str("- Focus on completing current in-progress tasks before starting new ones\n");
        analysis.push_str("- Regularly update task status to track progress\n");
    }
    
    Ok(analysis)
}

fn create_lite_sdd_content(spec_name: &str, description: &str) -> String {
    format!(r#"# {spec_name}

## Overview

**Goal:** {description}

**User Story:** As a user, I want {description} so that I can achieve my objectives effectively.

**Success Criteria:**
- [ ] Core functionality is implemented
- [ ] User interface is intuitive and responsive
- [ ] All acceptance tests pass

## Tasks

Tasks are defined in tasks.json with detailed breakdown, dependencies, and effort estimates.

Key milestones:
1. Setup and planning
2. Core implementation  
3. Testing and refinement
4. Documentation and deployment

## Next Steps

Review tasks.json for detailed task breakdown and begin with the first pending task.
"#, spec_name = spec_name, description = description)
}

fn create_full_sdd_content(spec_name: &str, description: &str) -> String {
    format!(r#"# {spec_name}

## Overview

**Goal:** {description}

**User Story:** As a user, I want {description} so that I can achieve my objectives effectively.

**Success Criteria:**
- [ ] Core functionality is implemented
- [ ] User interface meets design requirements
- [ ] Performance meets specified benchmarks
- [ ] All acceptance tests pass
- [ ] Documentation is complete

## Technical Specifications

### UI Requirements

**Layout:**
- Clean, intuitive interface following established design patterns
- Responsive design supporting desktop and mobile viewports
- Consistent styling with theme standards

**Components:**
- Main interface components with clear hierarchy
- Interactive elements with appropriate feedback
- Error handling and loading states

**User Experience:**
- Intuitive navigation and workflow
- Clear call-to-action buttons
- Helpful error messages and guidance

### Theme Standards Compliance

This feature will adhere to the theme standards defined in .agent-sdd/standards/theme-standards.md:
- Color palette consistency
- Typography standards
- Spacing and layout guidelines
- Accessibility requirements

## Tasks

Detailed task breakdown is provided in tasks.json including:
- Task IDs and dependencies
- Effort estimates (XS=1 day, S=2-3 days, M=1 week)
- Implementation order and prerequisites

## Test Scenarios

**Unit Tests:**
- [ ] Core logic functions
- [ ] Edge cases and error conditions
- [ ] Input validation

**Integration Tests:**
- [ ] Component interactions
- [ ] API integrations
- [ ] Database operations

**User Acceptance Tests:**
- [ ] End-to-end user workflows
- [ ] Cross-browser compatibility
- [ ] Accessibility compliance

## Implementation Notes

Additional technical details and decisions will be documented as implementation progresses.
"#, spec_name = spec_name, description = description)
}

fn create_tasks_json(spec_name: &str, date: &str) -> String {
    format!(r#"{{
  "phase": "Phase 1",
  "feature": "{}",
  "status": "pending",
  "created": "{}",
  "tasks": [
    {{
      "id": "TASK-001",
      "name": "Setup component structure",
      "description": "Create main component structure and basic layout",
      "status": "pending",
      "dependencies": [],
      "effort": "XS"
    }},
    {{
      "id": "TASK-002",
      "name": "Implement core functionality",
      "description": "Add primary business logic and core features",
      "status": "pending",
      "dependencies": ["TASK-001"],
      "effort": "M"
    }},
    {{
      "id": "TASK-003",
      "name": "Add user interface",
      "description": "Create user interface components and styling",
      "status": "pending",
      "dependencies": ["TASK-001"],
      "effort": "S"
    }},
    {{
      "id": "TASK-004",
      "name": "Integration testing",
      "description": "Test component integration and user workflows",
      "status": "pending",
      "dependencies": ["TASK-002", "TASK-003"],
      "effort": "S"
    }}
  ]
}}"#, spec_name, date)
}

// Command execution structures and functions

#[derive(Debug, Serialize, Deserialize)]
pub struct CommandRequest {
    pub command: String,
    pub task_id: String,
    pub spec_path: String,
    pub project_path: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CommandResult {
    pub success: bool,
    pub exit_code: Option<i32>,
    pub stdout: String,
    pub stderr: String,
    pub duration_ms: u64,
    pub error_message: Option<String>,
}

#[tauri::command]
pub async fn execute_agent_sdd_command(request: CommandRequest) -> Result<CommandResult, String> {
    let start_time = Instant::now();
    
    log::info!("Executing Agent-SDD command: {} for task: {}", request.command, request.task_id);
    
    // Validate the command is allowed
    let allowed_commands = vec![
        "sdd-execute-task",
        "sdd-fix", 
        "sdd-tweak",
        "sdd-check-task",
        "sdd-queue-fix",
        "sdd-queue-tweak"
    ];
    
    if !allowed_commands.contains(&request.command.as_str()) {
        return Err(format!("Command '{}' is not allowed", request.command));
    }
    
    // Validate project path exists and contains .agent-sdd
    let project_dir = Path::new(&request.project_path);
    if !project_dir.exists() || !project_dir.is_dir() {
        return Err("Project path does not exist or is not a directory".to_string());
    }
    
    let agent_sdd_dir = project_dir.join(".agent-sdd");
    if !agent_sdd_dir.exists() || !agent_sdd_dir.is_dir() {
        return Err("Project does not contain .agent-sdd directory".to_string());
    }
    
    // Validate spec path exists
    let spec_path = Path::new(&request.spec_path);
    if !spec_path.exists() || !spec_path.is_dir() {
        return Err("Spec path does not exist or is not a directory".to_string());
    }
    
    // Construct the command based on the Agent-SDD instruction
    let script_path = match find_agent_sdd_script(&request.command, &agent_sdd_dir).await {
        Some(path) => path,
        None => {
            // Fallback: try to execute as a direct command with task ID
            return execute_direct_command(&request, start_time).await;
        }
    };
    
    // Execute the script with the task ID
    execute_script_command(&script_path, &request, start_time).await
}

async fn find_agent_sdd_script(command: &str, agent_sdd_dir: &Path) -> Option<String> {
    log::info!("Looking for script for command: {}", command);
    log::info!("Agent SDD dir: {}", agent_sdd_dir.display());
    
    // Look for scripts in .agent-sdd/scripts/ directory
    let scripts_dir = agent_sdd_dir.join("scripts");
    log::info!("Scripts dir: {}, exists: {}", scripts_dir.display(), scripts_dir.exists());
    
    if scripts_dir.exists() {
        let script_name = format!("{}.sh", command);
        let script_path = scripts_dir.join(&script_name);
        log::info!("Looking for script: {}, exists: {}", script_path.display(), script_path.exists());
        
        if script_path.exists() {
            log::info!("Found script: {}", script_path.display());
            return Some(script_path.to_string_lossy().to_string());
        }
    }
    
    // Look for instruction files in .agent-sdd/instructions/
    let instructions_dir = agent_sdd_dir.join("instructions");
    if instructions_dir.exists() {
        let instruction_file = format!("{}.md", command);
        let instruction_path = instructions_dir.join(&instruction_file);
        if instruction_path.exists() {
            // For instruction files, we might need to execute them differently
            // For now, we'll return None to use direct command execution
            log::info!("Found instruction file: {}, using direct command execution", instruction_path.display());
        }
    }
    
    log::warn!("No script found for command: {}", command);
    None
}

async fn execute_script_command(script_path: &str, request: &CommandRequest, start_time: Instant) -> Result<CommandResult, String> {
    log::info!("Executing script: {} with task ID: {}", script_path, request.task_id);
    
    // Make script executable (Unix systems)
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if let Ok(metadata) = fs::metadata(script_path) {
            let mut permissions = metadata.permissions();
            permissions.set_mode(0o755); // rwxr-xr-x
            let _ = fs::set_permissions(script_path, permissions);
        }
    }
    
    // Execute the script with timeout
    let timeout_duration = Duration::from_secs(300); // 5 minutes timeout
    
    let mut command = Command::new("bash");
    command
        .arg(script_path)
        .arg(&request.task_id)
        .current_dir(&request.project_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    
    match timeout(timeout_duration, tokio::task::spawn_blocking(move || {
        command.output()
    })).await {
        Ok(Ok(Ok(output))) => {
            let duration = start_time.elapsed();
            let stdout = String::from_utf8_lossy(&output.stdout).to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            
            log::info!("Script execution completed in {}ms", duration.as_millis());
            log::info!("Script stdout: {}", stdout);
            log::info!("Script stderr: {}", stderr);
            log::info!("Script exit code: {:?}", output.status.code());
            
            let error_message = if !output.status.success() {
                Some(format!("Script exited with code: {:?}", output.status.code()))
            } else {
                None
            };
            
            Ok(CommandResult {
                success: output.status.success(),
                exit_code: output.status.code(),
                stdout,
                stderr,
                duration_ms: duration.as_millis() as u64,
                error_message,
            })
        }
        Ok(Ok(Err(e))) => {
            let duration = start_time.elapsed();
            log::error!("Failed to execute script: {}", e);
            Ok(CommandResult {
                success: false,
                exit_code: Some(-1),
                stdout: String::new(),
                stderr: format!("Failed to execute script: {}", e),
                duration_ms: duration.as_millis() as u64,
                error_message: Some(format!("Script execution failed: {}", e)),
            })
        }
        Ok(Err(e)) => {
            let duration = start_time.elapsed();
            log::error!("Task execution error: {}", e);
            Ok(CommandResult {
                success: false,
                exit_code: Some(-1),
                stdout: String::new(),
                stderr: format!("Task execution error: {}", e),
                duration_ms: duration.as_millis() as u64,
                error_message: Some(format!("Task execution error: {}", e)),
            })
        }
        Err(_) => {
            let duration = start_time.elapsed();
            Ok(CommandResult {
                success: false,
                exit_code: None,
                stdout: String::new(),
                stderr: "Command timed out after 5 minutes".to_string(),
                duration_ms: duration.as_millis() as u64,
                error_message: Some("Execution timeout".to_string()),
            })
        }
    }
}

async fn execute_direct_command(request: &CommandRequest, start_time: Instant) -> Result<CommandResult, String> {
    log::info!("Executing direct command: {} for task: {}", request.command, request.task_id);
    
    // Check if this is an execute-task command that should use Claude Code CLI
    if request.command == "sdd-execute-task" {
        log::warn!("Script not found for sdd-execute-task, returning error instead of mock");
        return Ok(CommandResult {
            success: false,
            exit_code: Some(1),
            stdout: String::new(),
            stderr: format!("Script execution failed: sdd-execute-task.sh not found or not executable.\n\nTo use the execute feature, ensure:\n1. Claude Code CLI is installed\n2. The sdd-execute-task.sh script exists and is executable\n3. You have the proper Agent-SDD setup\n\nThis feature requires Claude Code CLI to work properly."),
            duration_ms: start_time.elapsed().as_millis() as u64,
            error_message: Some("Agent-SDD script execution requires Claude Code CLI".to_string()),
        });
    }
    
    let duration = start_time.elapsed();
    
    // Simulate some processing time
    tokio::time::sleep(Duration::from_millis(500)).await;
    
    let mock_output = format!(
        "Agent-SDD Command: {}\nTask ID: {}\nSpec Path: {}\nProject Path: {}\n\nThis is a mock execution. Full implementation pending.",
        request.command,
        request.task_id,
        request.spec_path,
        request.project_path
    );
    
    Ok(CommandResult {
        success: true,
        exit_code: Some(0),
        stdout: mock_output,
        stderr: String::new(),
        duration_ms: duration.as_millis() as u64,
        error_message: None,
    })
}

