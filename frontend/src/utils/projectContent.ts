export const getProjectTerminalContent = (slug: string): string | null => {
    switch (slug) {
        case 'reelsensei':
            return `# ReelSensei - AI Gaming Highlights

🎮 AI-Powered Gaming Video Highlight Generation

An innovative platform that automatically transforms gaming videos into epic 
highlight reels using advanced AI technology. Built with modern cloud-native 
architecture for optimal performance and scalability.

## 🎯 Core Features
• Vertex AI Integration - Intelligent video analysis
• Smart Detection - Identifies epic gaming moments and clutch plays  
• Multi-Game Support - Optimized for FPS, MOBA, and other genres
• Quality Scoring - AI-powered confidence ratings
• Gaming Profile System - XP-based progression with achievements

## ⚙️ Technical Architecture

### Frontend Stack
• Next.js 15.3.1 with App Router pattern
• React 19 with TypeScript for type safety
• Tailwind CSS with custom gaming-themed design
• Firebase Authentication with persistent sessions
• Real-time updates via Firestore listeners

### Backend Infrastructure  
• FastAPI with async/await patterns
• Firebase for real-time operations
• Google Cloud Platform integration
• Vertex AI for video analysis
• Cloud Storage for file management
• GCP Batch for video processing
• Cloud Tasks for job orchestration

### Performance & Cost Optimization
• Spot VM Strategy - 70-80% compute cost savings
• CDN Edge Optimization - Global content delivery
• Intelligent Batching - Efficient resource utilization
• Regional Data Placement - Minimized egress costs
• Auto-scaling Workers - Dynamic load management

### Security & Infrastructure
• Google Cloud Armor - DDoS protection & WAF rules
• Load Balancers - Global HTTP(S) with health checks
• HTTP-only Cookies - Secure session management
• Rate Limiting - 100 requests/minute per IP
• Comprehensive Security Headers

## 🚀 Video Processing Pipeline
1. Upload → File validation and GCS storage
2. Job Creation → Firestore job document  
3. Batch Processing → GCP Batch worker
4. AI Analysis → Vertex AI multimodal LLM
5. Clip Extraction → FFmpeg-based processing
6. Storage & CDN → Public highlight delivery
7. Completion → Real-time status updates

## 📊 Key Metrics
• 76-88% cost reduction through intelligent optimization
• Real-time processing status without polling overhead
• Concurrent job limits (3 per user, 10 global)
• Microservice architecture with clean separation
• Production-ready with Google Cloud Run deployment

Built with ❤️ for the gaming community`;

        case 'ai-chat-portfolio':
            return `# AI Chat Portfolio

🤖 Intelligent Portfolio Website with AI Assistant

A full-stack AI-powered portfolio website that allows visitors to interact 
with an AI assistant trained on personal and professional information. 
Built with modern web technologies and deployed on Google Cloud Run.

## 🎯 Core Features
• Real-time AI Chat Interface - Context-aware conversations
• Document Management System - Private/public information handling
• Responsive Design - Dark theme with particle animations
• Email Contact System - Validation and notification
• Multi-environment Configuration - Dev/prod deployment

## ⚙️ Technical Architecture

### Frontend Stack
• React 18 with TypeScript for type safety
• Vite for fast development and building
• TailwindCSS for modern styling
• Particle animations for visual appeal
• Responsive design with mobile optimization

### Backend Infrastructure
• FastAPI with Python 3.8+ for high performance
• Google Gemini AI for intelligent responses
• Document-based system with markdown files
• RESTful API design with proper error handling
• CORS configuration for cross-origin requests

### AI Integration
• Google Gemini AI for natural language processing
• Context-aware responses based on uploaded documents
• Intelligent document parsing and indexing
• Real-time AI response generation
• Conversation memory and context retention

### Cloud & Deployment
• Google Cloud Platform (GCP) hosting
• Google Cloud Run for serverless deployment
• Docker containerization for consistency
• GitHub Actions for automated CI/CD
• Multi-stage builds for optimized containers

## 🏗️ Architecture Overview
The application follows clean separation of concerns:
• React frontend handles UI/UX with TypeScript
• FastAPI backend manages AI integration
• Google Gemini AI provides intelligent responses
• Docker ensures consistent deployment
• Cloud Run provides scalable hosting

## 🚀 Development Workflow
1. Document Upload → Markdown file processing
2. AI Training → Context building from documents
3. User Query → Natural language processing
4. AI Response → Contextual answer generation
5. Real-time Display → Instant chat interface
6. Continuous Learning → Context improvement

## 📊 Key Features
• Intelligent conversation with portfolio context
• Real-time response generation
• Mobile-responsive design
• Dark theme with modern aesthetics
• Production-ready deployment
• Scalable cloud architecture

Built to showcase modern full-stack development skills`;

        default:
            return null;
    }
};
