# Gemini AI Chat Application

A full-stack chat application built with React TypeScript frontend and FastAPI backend, integrated with Google's Gemini AI API and deployed on Google Cloud Run.

## Features

-   Real-time chat interface with Gemini AI
-   Document-aware responses
-   Private/public document management
-   Automated deployment with GitHub Actions
-   Cloud Run hosting for both frontend and backend

## Prerequisites

-   Node.js v14.0.0+ and npm v6.0.0+
-   Python 3.8+
-   Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
-   Google Cloud account with Cloud Run enabled
-   GitHub account for automated deployments

## Quick Start

### 1. Environment Setup

```bash
# Clone the repository
git clone <your-repository-url>
cd <project-directory>

# Create documentation directories
mkdir -p backend/docs/private backend/docs/templates
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
# Development server at http://localhost:3000
```

### 3. Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: .\venv\Scripts\activate
pip3 install -r requirements.txt

# Start development server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Environment Configuration

### Frontend (.env files)

```bash
# frontend/.env.development
VITE_BACKEND_URL=http://localhost:8000
VITE_ENV=development

# frontend/.env.production
VITE_BACKEND_URL=https://backend-240663900746.me-west1.run.app
VITE_ENV=production
```

### Backend (.env files)

```bash
# backend/.env.development
FRONTEND_DEV_URL=http://localhost:3000
GEMINI_API_KEY=your_api_key_here
EMAIL_ADDRESS=your_gmail@gmail.com
EMAIL_PASSWORD=your_app_password_here
YOUR_EMAIL=your_receiving_email@gmail.com

# backend/.env.production
FRONTEND_PROD_URL=https://frontend-240663900746.me-west1.run.app
GEMINI_API_KEY=your_api_key_here
EMAIL_ADDRESS=your_gmail@gmail.com
EMAIL_PASSWORD=your_app_password_here
YOUR_EMAIL=your_receiving_email@gmail.com
```

## Deployment

The application uses GitHub Actions for automated deployment to Google Cloud Run.

### Required GitHub Secrets

-   `GCP_PROJECT_ID`: Your Google Cloud project ID
-   `GCP_SA_KEY`: Service account key with Cloud Run access
-   `GEMINI_API_KEY`: Gemini API key for production
-   `EMAIL_ADDRESS`: Gmail address for SMTP
-   `EMAIL_PASSWORD`: Gmail App Password (16-digit code)
-   `YOUR_EMAIL`: Email address to receive contact form submissions

### Production URLs

-   Frontend: https://frontend-240663900746.me-west1.run.app
-   Backend: https://backend-240663900746.me-west1.run.app

## Documentation System

```bash
backend/docs/
├── private/    # Private docs (gitignored)
│   └── resume.md
└── templates/  # Public templates
```

For detailed documentation:

-   [Frontend README](frontend/README.md)
-   [Backend README](backend/README.md)

## License

[MIT License](LICENSE)

## API Overview

-   `GET /`: Health check
-   `GET /check-paths`: Check available documents
-   `GET /api/content/{file_name}`: Retrieve specific file content
-   `POST /generate-text`: Basic chat
-   `POST /chat-with-files`: Context-aware chat

## Contributing

1. Fork repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Open Pull Request

# Test workflow
