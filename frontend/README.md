# AI Portfolio Frontend

React-based frontend for the AI Portfolio application, deployed on Google Cloud Run.

## Project Structure

```bash
frontend/
├── src/
│   ├── api/          # API integration
│   ├── components/   # React components
│   └── pages/        # Page components
├── .env.development  # Development environment
├── .env.production   # Production environment
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
-   Axios
-   Vite

## Environment Setup

1. Development environment:

```bash
# frontend/.env.development
VITE_BACKEND_URL=http://localhost:8000
VITE_ENV=development
```

2. Production environment:

```bash
# frontend/.env.production
VITE_BACKEND_URL=https://backend-240663900746.me-west1.run.app
VITE_ENV=production
```

## Development

```bash
npm install
npm run dev
```

## Deployment

Deployment is handled automatically by GitHub Actions when pushing to main branch.

### Manual Deployment (if needed)

```bash
npm run build
gcloud run deploy frontend \
  --source . \
  --platform managed \
  --region me-west1 \
  --allow-unauthenticated
```

## API Integration

Backend endpoints:

-   Health: `${BACKEND_URL}/health`
-   Chat: `${BACKEND_URL}/chat-with-files`
-   Files: `${BACKEND_URL}/check-paths`
-   Content: `${BACKEND_URL}/api/content/${fileName}`

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
