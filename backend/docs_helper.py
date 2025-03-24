from PyPDF2 import PdfReader
import os
from typing import List, Optional

# Get the absolute path of the current file's directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__)) 
DOCS_DIR = os.path.join(BASE_DIR, "docs")
PRIVATE_DIR = os.path.join(DOCS_DIR, "private")
TEMPLATES_DIR = os.path.join(DOCS_DIR, "templates")

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