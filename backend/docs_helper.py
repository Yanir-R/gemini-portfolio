from PyPDF2 import PdfReader
import os
import re
from typing import List, Optional, Dict, Any
from datetime import datetime

# Get the absolute path of the current file's directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__)) 
DOCS_DIR = os.path.join(BASE_DIR, "docs")
PRIVATE_DIR = os.path.join(DOCS_DIR, "private")
TEMPLATES_DIR = os.path.join(DOCS_DIR, "templates")
PROJECTS_DIR = os.path.join(DOCS_DIR, "projects")
STATIC_DIR = os.path.join(BASE_DIR, "static", "projects")

def read_markdown_file(file_path: str) -> str:
    """Read content from markdown file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            content = file.read()
            return content
    except Exception as e:
        print(f"Error reading file {file_path}: {str(e)}")
        return ""

def read_pdf_file(file_path: str) -> str:
    """Read content from PDF file"""
    try:
        with open(file_path, 'rb') as file:
            return "\n".join(page.extract_text() for page in PdfReader(file).pages)
    except Exception as e:
        print(f"Error reading PDF file: {e}")
        return ""

def read_directory(directory: str, doc_type: str) -> list[str]:
    """Read all files from a directory"""
    contents = []
    if os.path.exists(directory):
        for filename in os.listdir(directory):
            if not filename.endswith(('.pdf', '.md')):
                continue
            
            file_path = os.path.join(directory, filename)
            content = read_pdf_file(file_path) if filename.endswith('.pdf') else read_markdown_file(file_path)
            
            if content:
                contents.append(f"{doc_type} Document: {filename}\n---\n{content}\n---")
    return contents

def load_all_files() -> str:
    """Load and combine content from all PDFs and MD files"""
    # Try private files first, fall back to templates if none found
    all_content = read_directory(PRIVATE_DIR, "Private")

    if not all_content:
        all_content = read_directory(TEMPLATES_DIR, "Template")

    return "\n\n".join(all_content)

def parse_project_metadata(content: str) -> Dict[str, Any]:
    """Parse project metadata from markdown content"""
    metadata = {}
    lines = content.split('\n')
    current_section = None
    
    for i, line in enumerate(lines):
        line = line.strip()
        
        # Handle h2 sections (## Section Name) - only metadata sections
        metadata_sections = ['project_type', 'status', 'demo_url', 'repository', 'media', 'featured', 'category', 'license']
        if line.startswith('## ') and line[3:].strip().lower().replace(' ', '_') in metadata_sections:
            current_section = line[3:].strip().lower().replace(' ', '_')
            # Get the content of the next non-empty line after this section
            for j in range(i + 1, len(lines)):
                next_line = lines[j].strip()
                if next_line and not next_line.startswith('#'):
                    # Map section names to metadata keys
                    if current_section == 'project_type':
                        metadata['project_type'] = next_line
                    elif current_section == 'status':
                        metadata['status'] = next_line
                    elif current_section == 'demo_url':
                        metadata['demo_url'] = next_line
                    elif current_section == 'repository':
                        metadata['repository'] = next_line
                    elif current_section == 'media':
                        metadata['media'] = next_line
                    elif current_section == 'featured':
                        metadata['featured'] = next_line.lower() == 'true'
                    elif current_section == 'category':
                        metadata['category'] = next_line
                    elif current_section == 'license':
                        metadata['license'] = next_line
                    break
        
        # Handle technical details format (- **Field**: Value)
        elif line.startswith('- **') and '**:' in line:
            match = re.match(r'- \*\*(.*?)\*\*:\s*(.*)', line)
            if match:
                key = f"tech_{match.group(1).lower().replace(' ', '_').replace('-', '_')}"
                metadata[key] = match.group(2).strip()
    
    # Extract title from first h1
    title_match = re.search(r'^# (.+)$', content, re.MULTILINE)
    if title_match:
        metadata['title'] = title_match.group(1)
    
    # Extract overview - try multiple patterns
    overview_match = re.search(r'## Overview\s*\n(.*?)(?=\n##|\Z)', content, re.DOTALL)
    if not overview_match:
        # Try to extract the first paragraph after the title and subtitle
        lines = content.split('\n')
        overview_lines = []
        found_title = False
        skip_empty = True
        
        for line in lines:
            line = line.strip()
            if line.startswith('# '):
                found_title = True
                continue
            elif found_title and line and not line.startswith('#') and not line.startswith('🎮'):
                if skip_empty and (line.startswith('**') or len(line) < 20):
                    continue
                skip_empty = False
                if line.startswith('##'):
                    break
                overview_lines.append(line)
                if len(' '.join(overview_lines)) > 200:  # Stop after reasonable length
                    break
        
        if overview_lines:
            metadata['overview'] = ' '.join(overview_lines).strip()
    else:
        metadata['overview'] = overview_match.group(1).strip()
    
    return metadata

def get_all_projects() -> List[Dict[str, Any]]:
    """Get all projects with their metadata"""
    projects = []
    
    if not os.path.exists(PROJECTS_DIR):
        return projects
    
    for filename in os.listdir(PROJECTS_DIR):
        if filename.endswith('.md'):
            file_path = os.path.join(PROJECTS_DIR, filename)
            content = read_markdown_file(file_path)
            
            if content:
                metadata = parse_project_metadata(content)
                metadata['slug'] = filename[:-3]  # Remove .md extension
                metadata['content'] = content
                
                # Check for media file
                media_name = metadata.get('media', '')
                if media_name:
                    # Check if it's an external URL
                    if media_name.startswith(('http://', 'https://')):
                        metadata['has_media'] = True
                        metadata['media_url'] = media_name
                    else:
                        # Local file path
                        media_path = os.path.join(STATIC_DIR, media_name)
                        metadata['has_media'] = os.path.exists(media_path)
                        metadata['media_url'] = f"/static/projects/{media_name}" if metadata['has_media'] else None
                
                # Parse featured as boolean (if not already parsed)
                featured_value = metadata.get('featured', False)
                if isinstance(featured_value, str):
                    metadata['featured'] = featured_value.lower() == 'true'
                elif isinstance(featured_value, bool):
                    metadata['featured'] = featured_value
                else:
                    metadata['featured'] = False
                
                
                projects.append(metadata)
    
    # Sort by featured status
    projects.sort(key=lambda x: x.get('featured', False), reverse=True)
    return projects

def get_project_by_slug(slug: str) -> Optional[Dict[str, Any]]:
    """Get a specific project by its slug"""
    projects = get_all_projects()
    return next((p for p in projects if p['slug'] == slug), None)

def get_featured_projects() -> List[Dict[str, Any]]:
    """Get only featured projects"""
    return [p for p in get_all_projects() if p.get('featured', False)]

def load_projects_content() -> str:
    """Load all project content for AI context"""
    projects = get_all_projects()
    content_parts = []
    
    for project in projects:
        content_parts.append(f"Project: {project.get('title', 'Untitled')}\n---\n{project.get('content', '')}\n---")
    
    return "\n\n".join(content_parts) 