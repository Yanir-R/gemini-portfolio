# AI Portfolio Backend

This is the backend service for the AI Portfolio application, built with FastAPI and Python.

## Project Structure

├── docs/ # Documentation files
│ └── private/ # Private markdown files (resume, about-me)
├── main.py # Main FastAPI application
├── gemini_helper.py # Gemini AI integration
├── docs_helper.py # Documentation handling
├── requirements.txt # Python dependencies
└── Dockerfile # Container configuration

## Technical Stack

-   FastAPI: Web framework
-   Python 3.8+: Runtime environment
-   Gemini AI: Language model
-   PyPDF2: PDF processing
-   Pydantic: Data validation

## API Endpoints

### Health Check

`GET /health`

```json
{ "message": "FastAPI is running", "timestamp": "2023-04-01T12:00:00" }
```

### Document System Check

`GET /check-paths`

```json
{
    "private_files": ["resume.md", "about-me.md"],
    "private_exists": true
}
```

### Content Retrieval

`GET /api/content/{file_name}`

```json
{
    "content": "Markdown content of the requested file"
}
```

-   Retrieves content of specific markdown files

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

The backend handles documents in the following location:

-   `/docs/private/`: Personal documents (gitignored)

### Supported Formats

-   Markdown (.md)
-   PDF (.pdf)

### Processing Logic

1. Reads from private directory
2. Combines all document content for AI context

## Setup and Installation

1. Create a virtual environment:

```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Set up environment variables:
   Create a `.env` file with:

    ```
    GEMINI_API_KEY=your_api_key_here
    FRONTEND_PROD_URL=your_production_frontend_url
    FRONTEND_DEV_URL=http://localhost:3000
    FRONTEND_VITE_URL=http://localhost:5173
    ```

4. Run the development server:

```bash
uvicorn main:app --reload
```

## Deployment

Deploy to Google Cloud Run:

```bash
gcloud run deploy backend \
  --source . \
  --platform managed \
  --region me-west1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=your_api_key
```

## API Endpoints

-   `GET /check-paths`: Verify documentation files
-   `POST /chat-with-files`: Chat with AI about documentation
-   `GET /api/content/{filename}`: Get markdown content
-   `GET /health`: Health check endpoint that returns service status and timestamp

## Documentation Structure

The `docs/` directory contains:

-   `private/`: Personal markdown files like resume and about-me (gitignored)

## Development Guidelines

### Error Handling

-   All endpoints include try-catch blocks
-   Standardized error responses
-   Detailed logging for debugging

### File Processing

-   Automatic file type detection
-   Error recovery for corrupt files

### Security

-   Private documents stay local
-   API key protection
-   CORS configuration

## Troubleshooting

### Common Issues

1. File Permission Errors

```bash
chmod 755 docs
chmod 644 docs/private/*.md
```

2. Missing Directories

```bash
mkdir -p docs/private
touch docs/private/.gitkeep
```

3. API Key Issues

-   Verify .env file exists with GEMINI_API_KEY
-   Check API key validity

4. Cloud Run Issues

-   Check Cloud Build logs: `gcloud builds list`
-   Verify service status: `gcloud run services describe backend`
-   Check service URL is accessible
-   Verify environment variables are set correctly in Cloud Run
