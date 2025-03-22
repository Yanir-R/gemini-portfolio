# Gemini AI Chat Application

A full-stack chat application built with React TypeScript frontend and FastAPI backend, integrated with Google's Gemini AI API.

## Features

-   Real-time chat interface with Gemini AI
-   Document-aware responses
-   Private/public document management
-   Built with TypeScript and FastAPI

## Prerequisites

-   Node.js v14.0.0+ and npm v6.0.0+
-   Python 3.8+
-   Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

## Quick Start

### 1. Clone and Setup Docs

```bash
# Create documentation directories
mkdir -p docs/private docs/templates
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
# Available at http://localhost:5173
```

For detailed API documentation and frontend configuration, see [frontend/README.md](frontend/README.md)

### 3. Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: .\venv\Scripts\activate
pip3 install -r requirements.txt

# Setup Gemini
cp gemini_helper.template.py gemini_helper.py
echo "GEMINI_API_KEY=your_api_key_here" > .env

# Start server
uvicorn main:app --reload
# Available at http://localhost:8000
```

## Documentation System

```bash
docs/
├── private/    # Your private docs (gitignored)
└── templates/  # Public templates
```

### Usage

-   Add personal files to `private/` (automatically gitignored)
-   Use templates from `templates/` for public sharing
-   Supports Markdown (.md) and PDF files
-   AI reads private files first, falls back to templates

### Available Templates

-   `about-me.md`: Professional profile
-   `resume.md`: Resume structure

## API Overview

-   `GET /`: Health check
-   `GET /check-paths`: Check available documents
-   `POST /generate-text`: Basic chat
-   `POST /chat-with-files`: Context-aware chat

For detailed API documentation and backend configuration, see [backend/README.md](backend/README.md)

## Contributing

1. Fork repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Open Pull Request

## License

[MIT License](LICENSE)
