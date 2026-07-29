"""File access for the documents the site publishes.

Reading and parsing only. What the chat is allowed to know, and how that corpus
is assembled and cached, is context.py's job.
"""

from pypdf import PdfReader
import logging
import os
import re
from typing import List, Optional, Dict, Any

logger = logging.getLogger(__name__)

# Get the absolute path of the current file's directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DOCS_DIR = os.path.join(BASE_DIR, "docs")

# Yanir's own documents. Named for what it is: this repository is public and
# these files are served over /api/content/, so everything in here is published.
# It was called "private/", which claimed an access boundary that has never
# existed and invited exactly the mistake of putting something sensitive in it.
PROFILE_DIR = os.path.join(DOCS_DIR, "profile")

# Placeholder documents for anyone forking this repo. Never loaded into the
# chat's context - see the note in context.py about why an empty corpus fails
# loudly instead of falling back to these.
TEMPLATES_DIR = os.path.join(DOCS_DIR, "templates")

PROJECTS_DIR = os.path.join(DOCS_DIR, "projects")

# There is deliberately no STATIC_DIR. Project screenshots are frontend assets,
# served from the CDN alongside the rest of the site; routing them through this
# API would put static files back on a single-region container, which is the
# arrangement the move to Cloudflare Pages existed to undo.

def read_markdown_file(file_path: str) -> str:
    """Read content from markdown file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            content = file.read()
            return content
    except Exception:
        logger.exception("Error reading file %s", file_path)
        return ""

def read_pdf_file(file_path: str) -> str:
    """Read content from PDF file"""
    try:
        with open(file_path, 'rb') as file:
            return "\n".join(page.extract_text() for page in PdfReader(file).pages)
    except Exception:
        logger.exception("Error reading PDF file %s", file_path)
        return ""

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
                
                # A `## Media` value is a location the browser can fetch: an
                # absolute URL, or a root-relative path served by the frontend
                # out of `public/`. Anything else is a mistake in the write-up.
                #
                # The alternative - a bare filename resolved against a backend
                # static directory - was removed rather than kept. That
                # directory did not exist, nothing mounted `/static`, and no
                # write-up used the form, so the branch could only ever produce
                # a URL that 404s. Serving screenshots from the API container
                # would also undo the point of moving the frontend to a CDN.
                media_name = metadata.get('media', '')
                if media_name:
                    if media_name.startswith(('http://', 'https://', '/')):
                        metadata['has_media'] = True
                        metadata['media_url'] = media_name
                    else:
                        # Named rather than silently dropped: a screenshot that
                        # does not appear is otherwise indistinguishable from a
                        # write-up that never had one.
                        logger.warning(
                            "Project %s: media %r is neither an absolute URL nor a "
                            "root-relative path, so it cannot be fetched. Put the file in "
                            "frontend/public/projects/ and reference it as "
                            "/projects/<name>.",
                            filename, media_name,
                        )
                        metadata['has_media'] = False
                        metadata['media_url'] = None
                
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


# ---------------------------------------------------------------------------
# Writing
# ---------------------------------------------------------------------------
#
# Long-form pieces and short posts published elsewhere, republished here with a
# link back to the original. They live in the same docs tree as the projects and
# are assembled into the same corpus, so what a visitor reads and what the chat
# can answer from stay the same bytes.

WRITING_DIR = os.path.join(DOCS_DIR, "writing")

# `media` is deliberately plural here, unlike a project's single screenshot: a
# post often carries two or three images and they are part of the argument.
WRITING_SECTIONS = ("kind", "source", "url", "date", "media", "summary", "related")

# Sections that hold a list, one item per line, rather than a single value.
WRITING_LIST_SECTIONS = ("media", "related")


def _parse_sections(content: str, section_names: tuple) -> Dict[str, List[str]]:
    """Collect the body lines under each recognised `## Section`.

    Returns every section as a list of lines so a caller can decide whether a
    section is single-valued. Parsing stops a section at the next heading of any
    level, so prose headings inside the article body cannot leak into metadata.
    """
    collected: Dict[str, List[str]] = {}
    current: Optional[str] = None

    for raw in content.split('\n'):
        line = raw.strip()

        if line.startswith('#'):
            heading = line.lstrip('#').strip().lower().replace(' ', '_')
            current = heading if (line.startswith('## ') and heading in section_names) else None
            continue

        if current and line:
            collected.setdefault(current, []).append(line)

    return collected


def parse_writing_metadata(content: str) -> Dict[str, Any]:
    """Metadata for one piece of writing, plus its title."""
    sections = _parse_sections(content, WRITING_SECTIONS)

    metadata: Dict[str, Any] = {}
    for name, lines in sections.items():
        metadata[name] = lines if name in WRITING_LIST_SECTIONS else lines[0]

    title_match = re.search(r'^# (.+)$', content, re.MULTILINE)
    if title_match:
        metadata['title'] = title_match.group(1).strip()

    return metadata


def get_all_writing() -> List[Dict[str, Any]]:
    """Every piece, newest first.

    Sorted on the `date` string, which is ISO so it sorts correctly as text.
    Anything missing a date sorts last rather than crashing the list.
    """
    if not os.path.exists(WRITING_DIR):
        logger.warning("Writing directory %s does not exist", WRITING_DIR)
        return []

    entries: List[Dict[str, Any]] = []
    for filename in sorted(os.listdir(WRITING_DIR)):
        if not filename.endswith('.md'):
            continue

        content = read_markdown_file(os.path.join(WRITING_DIR, filename))
        if not content:
            continue

        entry = parse_writing_metadata(content)
        entry['slug'] = filename[:-3]
        entry['content'] = content
        entries.append(entry)

    return sorted(entries, key=lambda e: e.get('date') or '', reverse=True)


def get_writing_by_slug(slug: str) -> Optional[Dict[str, Any]]:
    """One piece, or None. Slug is confined to the writing directory."""
    root = os.path.realpath(WRITING_DIR)
    path = os.path.realpath(os.path.join(root, f"{slug}.md"))

    # The router already refuses a "/" inside a path parameter, but os.path.join
    # honours an absolute path silently, so containment is asserted rather than
    # assumed - the same guard /api/content/ uses.
    if os.path.commonpath([root, path]) != root or not os.path.isfile(path):
        return None

    content = read_markdown_file(path)
    if not content:
        return None

    entry = parse_writing_metadata(content)
    entry['slug'] = slug
    entry['content'] = content
    return entry
