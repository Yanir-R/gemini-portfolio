# React TypeScript Chat Frontend

Frontend for the Gemini AI Chat Application built with React, TypeScript, and TailwindCSS.

## Features

-   Real-time chat interface
-   Markdown and code syntax highlighting
-   Loading states and error handling
-   Responsive design
-   Accessibility features

## Tech Stack

-   React 18+
-   TypeScript
-   TailwindCSS
-   Axios for API calls
-   Vite for development

## Development Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev
# Available at http://localhost:5173

# Build for production
npm run build
```

## Key Components

### Chat.tsx

Main chat interface component:

-   Handles message history
-   Manages API communication
-   Implements loading states
-   Error handling

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

## Environment Variables

```bash
# Create .env file if needed
VITE_API_URL=http://localhost:8000
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
