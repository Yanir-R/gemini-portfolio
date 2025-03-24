import os
from typing import List, Optional

DOCS_DIR = os.path.join(os.path.dirname(__file__), "docs")
PRIVATE_DIR = os.path.join(DOCS_DIR, "private")

def read_markdown_file(file_path: str) -> str:
    """Read content from markdown file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            return file.read()
    except Exception as e:
        print(f"Error reading file {file_path}: {str(e)}")
        return ""

def load_all_files() -> str:
    """Load all markdown files from the private directory"""
    all_content = []
    
    if os.path.exists(PRIVATE_DIR):
        for filename in os.listdir(PRIVATE_DIR):
            if filename.endswith('.md'):
                file_path = os.path.join(PRIVATE_DIR, filename)
                content = read_markdown_file(file_path)
                if content:
                    all_content.append(f"Content from {filename}:\n{content}\n")
    
    return "\n".join(all_content) if all_content else "" 