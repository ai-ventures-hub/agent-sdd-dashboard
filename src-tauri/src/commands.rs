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