# AI Portfolio Frontend

React-based frontend for the AI Portfolio application.

## Project Structure

```
frontend/
├── src/
│   ├── api/          # API integration
│   ├── components/   # React components
│   └── pages/        # Page components
├── public/           # Static assets
└── vite.config.mts   # Vite configuration
```

## Features

-   Real-time chat interface
-   Markdown and code syntax highlighting
-   Loading states and error handling
-   Responsive design
-   Accessibility features
-   Interactive message quick-actions

## Tech Stack

-   React 18+
-   TypeScript
-   TailwindCSS
-   Axios for API calls
-   Vite for development

## Setup and Installation

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables:
   Create `.env.development` for local development:

    ```
    VITE_BACKEND_URL=http://localhost:8000
    ```

    Create `.env.production` for production:

    ```
    VITE_BACKEND_URL=your_cloud_run_backend_url
    ```

## Development

Run the development server:

```bash
npm run dev
```

## Building and Deployment

1. Build the application:

```bash
npm run build
```

2. Deploy to Google Cloud Run:

```bash
gcloud run deploy frontend \
  --source . \
  --platform managed \
  --region me-west1 \
  --allow-unauthenticated \
  --set-env-vars VITE_BACKEND_URL=your_backend_url
```

## Documentation Integration

The frontend fetches documentation from the backend service. The documentation includes:

-   Resume
-   About Me
-   AI chat responses

Note: All documentation files are managed directly in the backend service's docs directory.

## Key Components

### Chat.tsx

Main chat interface component:

-   Handles message history
-   Manages API communication
-   Implements loading states
-   Error handling
-   Interactive message boxes for quick responses

### Available Props and Types

```typescript
interface ChatMessage {
    type: 'user' | 'ai' | 'initial' | 'system';
    content: string;
}

interface ChatRequest {
    message: string;
    conversation_history?: ChatMessage[];
}
```

## API Integration

The frontend communicates with the backend at `http://localhost:8000` using:

-   Health check: `GET /`
-   Document check: `GET /check-paths`
-   Basic chat: `POST /generate-text`
-   Context chat: `POST /chat-with-files`

## Contributing

See main [README.md](../README.md) for contribution guidelines.

## Prerequisites

Before you begin, ensure you have the following installed:

-   Node.js (v14.0.0 or higher)
-   npm (v6.0.0 or higher)

## Installation

1. Clone the repository:

```bash
git clone <your-repository-url>
cd <project-directory>
```

2. Install the dependencies:

```bash
npm install react react-dom
npm install --save-dev typescript @types/react @types/react-dom vite axios
```
