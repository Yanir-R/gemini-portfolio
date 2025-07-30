# AI Portfolio Backend

FastAPI backend service deployed on Google Cloud Run with automated GitHub Actions deployment.

## Project Structure

```bash
backend/
├── docs/
│   ├── private/     # Private markdown files (resume, about-me)
│   └── templates/   # Template files
├── main.py         # FastAPI application
├── gemini_helper.py # Gemini AI integration
├── docs_helper.py  # Documentation handling
├── requirements.txt # Python dependencies
└── Dockerfile      # Container configuration
```

## Technical Stack

-   FastAPI: Web framework
-   Python 3.8+: Runtime environment
-   Gemini AI: Language model
-   PyPDF2: PDF processing
-   Google Cloud Run: Deployment platform
-   GitHub Actions: CI/CD automation

## Environment Configuration

### Development

```bash
# backend/.env.development
FRONTEND_DEV_URL=http://localhost:3000
FRONTEND_VITE_URL=http://localhost:5173
GEMINI_API_KEY=your_api_key_here
EMAIL_ADDRESS=your_gmail@gmail.com
EMAIL_PASSWORD=your_app_password_here
YOUR_EMAIL=your_receiving_email@gmail.com
```

### Production

```bash
# backend/.env.production
FRONTEND_PROD_URL=https://frontend-240663900746.me-west1.run.app
GEMINI_API_KEY=your_api_key_here
EMAIL_ADDRESS=your_gmail@gmail.com
EMAIL_PASSWORD=your_app_password_here
YOUR_EMAIL=your_receiving_email@gmail.com
```

## API Endpoints

-   `GET /health`: Service health check and status
-   `GET /check-paths`: Document system verification
-   `POST /chat-with-files`: Context-aware AI chat
-   `GET /api/content/{file_name}`: Markdown content retrieval

## Local Development

1. Create virtual environment:

```bash
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Run development server:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Deployment

### Automated Deployment (GitHub Actions)

Push to main branch triggers automatic deployment to Cloud Run via GitHub Actions workflow.

Required GitHub Secrets:

-   `GCP_PROJECT_ID`: Google Cloud project identifier
-   `GCP_SA_KEY`: Service account key with Cloud Run access
-   `GEMINI_API_KEY`: Gemini API key for production
-   `EMAIL_ADDRESS`: Gmail address for SMTP
-   `EMAIL_PASSWORD`: Gmail App Password (16-digit code)
-   `YOUR_EMAIL`: Email address to receive contact form submissions

### Manual Deployment (if needed)

```bash
# Build and deploy to Cloud Run
gcloud run deploy backend \
  --source . \
  --platform managed \
  --region me-west1 \
  --allow-unauthenticated
```

## Documentation System

### Directory Structure

```bash
docs/
├── private/    # Personal documents (gitignored)
│   ├── resume.md
│   └── about-me.md
└── templates/  # Public templates
```

### Supported Formats

-   Markdown (.md)
-   PDF (.pdf)

## Troubleshooting

### Cloud Run Issues

```bash
# View service logs
gcloud logs tail --project YOUR_PROJECT_ID

# Check service status
gcloud run services describe backend

# Verify deployment
gcloud run services list
```

### Local Development Issues

1. File Permission Errors:

```bash
chmod 755 docs
chmod 644 docs/private/*.md
```

2. Missing Directories:

```bash
mkdir -p docs/private
touch docs/private/.gitkeep
```

3. Environment Issues:

-   Verify .env files exist and are properly configured
-   Check GEMINI_API_KEY validity
-   Confirm CORS settings match frontend URLs

### GitHub Actions Issues

-   Check Actions tab in repository for build logs
-   Verify GitHub secrets are properly set
-   Ensure service account has necessary permissions

## Security Considerations

-   Environment variables managed via GitHub Secrets
-   CORS configuration for allowed origins
-   Private documents protected via .gitignore
-   Cloud Run security best practices
