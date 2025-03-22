# FastAPI Gemini AI Backend

## Overview

Backend service for the AI chat application, handling document processing and Gemini AI integration.

## Technical Stack

-   FastAPI: Web framework
-   Python 3.8+: Runtime environment
-   Gemini AI: Language model
-   PyPDF2: PDF processing
-   Pydantic: Data validation

## API Endpoints

### Health Check

`GET /`

```json
{ "message": "FastAPI is running" }
```

### Document System Check

`GET /check-paths`

```json
{
    "private_files": ["resume.md", "about-me.md"],
    "template_files": ["resume.md", "about-me.md"],
    "private_exists": true,
    "templates_exists": true
}
```

### Chat Endpoints

#### Basic Chat

`POST /generate-text`

```json
{
    "message": "Your message here"
}
```

-   Simple chat without document context
-   Direct Gemini AI interaction

#### Context-Aware Chat

`POST /chat-with-files`

```json
{
    "message": "Your message here",
    "conversation_history": [
        { "type": "user", "content": "Previous message" },
        { "type": "ai", "content": "Previous response" }
    ]
}
```

-   Includes document context
-   Maintains conversation history
-   Supports up to 4 previous messages

## Document Processing

The backend handles two types of document locations:

-   `/docs/private/`: Personal documents (gitignored)
-   `/docs/templates/`: Public templates

### Supported Formats

-   Markdown (.md)
-   PDF (.pdf)

### Processing Logic

1. Attempts to read from private directory first
2. Falls back to templates if no private files exist
3. Combines all document content for AI context

## Setup Instructions

### 1. Environment Setup

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # Windows: .\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configuration

Create `.env` file:

```bash
GEMINI_API_KEY=your_api_key_here
```

### 3. Gemini Integration

```bash
# Copy template
cp gemini_helper.template.py gemini_helper.py

# Edit configuration as needed
```

### 4. Running the Server

```bash
uvicorn main:app --reload --port 8000
```

## Development Guidelines

### Error Handling

-   All endpoints include try-catch blocks
-   Standardized error responses
-   Detailed logging for debugging

### File Processing

-   Automatic file type detection
-   Error recovery for corrupt files
-   Graceful fallback to templates

### Security

-   Private documents stay local
-   API key protection
-   CORS configuration

## Troubleshooting

### Common Issues

1. File Permission Errors

```bash
chmod 755 ../docs
chmod 644 ../docs/**/*.md
chmod 644 ../docs/**/*.pdf
```

2. Missing Directories

```bash
mkdir -p ../docs/private ../docs/templates
touch ../docs/private/.gitkeep ../docs/templates/.gitkeep
```

3. API Key Issues

-   Verify .env file exists
-   Check API key validity
-   Ensure proper environment loading
