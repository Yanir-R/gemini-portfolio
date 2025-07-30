# ReelSensei - AI Gaming Highlights

🎮 **AI-Powered Gaming Video Highlight Generation**

ReelSensei automatically transforms gaming videos records into epic highlight reels using advanced AI technology. Built with clean separation between frontend and backend services for optimal performance and scalability.

## ✨ Features

### 🤖 AI-Powered Highlight Generation
- **Vertex AI Integration**: Leverages Google Cloud's powerful AI for intelligent video analysis
- **Smart Detection**: Automatically identifies epic gaming moments, clutch plays, and skill shots
- **Multi-Game Support**: Optimized for FPS, MOBA, and other gaming genres
- **Quality Scoring**: AI-powered confidence ratings for each highlight

### 🏆 Gaming Profile System
- **Leveling System**: XP-based progression with visual level indicators
- **Achievement System**: Unlock badges for various gaming milestones

## ⚙️ Technical Details
- **Frontend**: Next.js 15.3.1, React 19, TypeScript, Tailwind CSS
- **Backend**: FastAPI, Python 3.9+, Firebase/Firestore, Google Gemini AI
- **AI/ML**: Google Cloud Vertex AI, Multimodal LLM
- **Cloud Platform**: Google Cloud Platform (GCP)
- **Database**: Firebase Firestore, Real-time listeners
- **Authentication**: Firebase Auth, HTTP-only cookies
- **Storage**: Google Cloud Storage, CDN optimization
- **Video Processing**: FFmpeg, GCP Batch, Cloud Tasks
- **Deployment**: Google Cloud Run with Spot VM worker instances
- **Security & Infrastructure**: Google Cloud Armor, Load Balancers, CDN warming
- **Cost Optimization**: Spot VMs, Egress traffic optimization, Regional data placement
- **Container Orchestration**: Docker, Multi-stage builds

## 🚀 Technology Stack

### Frontend (Next.js)
- **Next.js 15.3.1** with App Router pattern
- **React 19** with TypeScript for type safety
- **Tailwind CSS** with custom gaming-themed design system
- **Firebase Authentication** with persistent sessions
- **Real-time updates** via Firebase Firestore listeners
- **Multi-file upload** with drag-and-drop and progress tracking

### Backend (Python FastAPI)
- **FastAPI** with async/await patterns
- **Firebase/Firestore** for real-time database operations
- **Google Cloud Platform** integration:
  - Vertex AI for video analysis
  - Cloud Storage for file management
  - Cloud Batch for video processing
  - Cloud Tasks for job orchestration
- **Video processing pipeline** with AI highlight detection
- **Concurrent job management** with quotas and resource tracking

## 🏗️ Architecture Overview

### Frontend Components
- `VideoUploader.tsx` - Multi-file upload with quota management
- `ProcessingStatusSimplified.tsx` - Real-time processing status
- `UnifiedUploadStatus.tsx` - Global upload state management
- `HighlightsGallery.tsx` - Video highlights display
- `AuthGuard.tsx` - Route protection and authentication

### Backend Services
- `services/firestore.py` - Database operations with batch updates
- `services/job_manager.py` - Concurrent job processing
- `services/storage.py` - GCS operations with CDN optimization
- `services/vertex_ai.py` - AI video analysis integration
- `services/video_processing.py` - GCP Batch job orchestration

### Infrastructure & Security
- **Google Cloud Armor** - DDoS protection and WAF rules for API endpoints
- **Load Balancer** - Global HTTP(S) load balancing with health checks
- **CDN Warming** - Proactive cache warming for video content delivery
- **Spot VM Management** - Cost-efficient preemptible instances for video processing
- **Egress Optimization** - Strategic regional placement to minimize data transfer costs

### API Endpoints
- `/api/jobs/{job_id}/status` - Job status polling
- `/api/batch/` - Internal batch processing
- `/api/highlights/` - Highlight management
- `/api/users/` - User profile operations

## 🎯 Video Processing Workflow

### Processing Pipeline
1. **Upload** → File validation and GCS storage
2. **Job Creation** → Firestore job document
3. **Batch Processing** → GCP Batch worker
4. **AI Analysis** → Vertex AI multimodal LLM
5. **Clip Extraction** → FFmpeg-based processing
6. **Storage & CDN** → Public highlight storage
7. **Completion** → Firestore updates

### Authentication Flow
- Firebase Authentication with ID tokens
- HTTP-only cookies for session management
- Route-level protection via middleware
- Service account credentials for backend operations

### State Management
- **React Context** for global state (Auth, Upload)
- **Firebase Firestore** for real-time data synchronization

## 📁 File Structure

```
/
├── frontend/           # Next.js web frontend application
│   ├── app/           # Next.js App Router pages
│   ├── src/           # Reusable components and utilities
│   │   ├── components/    # React components
│   │   ├── contexts/      # React Context providers
│   │   ├── services/      # API integrations
│   │   └── types/         # TypeScript definitions
│   └── package.json
├── backend/            # Python FastAPI backend
│   ├── app/           # Main application code
│   │   ├── api/           # REST API endpoints
│   │   ├── middleware/    # Request processing middleware
│   │   ├── core/          # Configuration and utilities
│   │   ├── services/      # Business logic services
│   │   └── main.py        # FastAPI application
│   ├── scripts/       # Utility scripts
│   └── requirements.txt
└── docs/               # Comprehensive documentation
```

## 🚀 Performance & Cost Optimization

### Advanced Cost Engineering
- **Spot VM Strategy** - Leverages Google Cloud preemptible instances for 70-80% compute savings
- **Egress Traffic Optimization** - Strategic data placement and CDN edge locations to minimize cross-region charges
- **Cloud Run Cold Start Mitigation** - Intelligent instance warming and connection pooling
- **Regional Data Affinity** - Co-locates compute and storage resources to reduce network costs

### Cost Optimization Features
- **76-88% cost reduction** through intelligent batching and spot VM usage
- **Egress cost efficiency** with regional data placement and CDN edge optimization
- **Spot VM orchestration** - Up to 80% savings on compute with preemptible instances
- **Smart polling** with background tab detection to reduce API calls
- **Direct GCS uploads** to eliminate network transfers and reduce egress
- **CDN optimization** with proactive cache warming and global distribution

### Scalability Features
- **Microservice architecture** with clean service separation
- **Real-time updates** without polling overhead
- **Concurrent job limits** (3 per user, 10 global)
- **Intelligent caching** using Firestore for metadata and FastAPI in-memory cache for hot data
- **Load balancing** with automatic failover and health monitoring
- **Spot VM auto-scaling** for cost-efficient processing workload optimization
- **Regional compute placement** to minimize cross-region egress charges

## 🔒 Security & Privacy

### Authentication & Authorization
- Firebase Admin SDK for server-side verification
- Bearer token validation with rate limiting
- CORS configuration for production/development
- **Google Cloud Armor** with custom WAF rules for malicious pattern detection
- **DDoS protection** with adaptive throttling and IP reputation filtering

### Data Protection
- HTTP-only cookies for session management
- Signed URLs for secure file access
- Rate limiting (100 requests/minute per IP)
- Comprehensive security headers

## 🚀 Deployment

### Frontend Deployment
- **Cloud Run Static Hosting**: The frontend is built as a static site (using `next export` for Next.js), then served via a lightweight container on Google Cloud Run. This enables serverless, scalable, and cost-efficient global delivery.
- **Build & Deploy Workflow**:
  1. Run `next build && next export` to generate static assets in the `out/` directory.
  2. Use a minimal web server (e.g., [serve](https://www.npmjs.com/package/serve) or [nginx]) in a Docker container to serve the static files.
  3. Deploy the container to Cloud Run for automatic HTTPS, scaling, and global availability.
- **CDN Integration**: Optionally, connect Cloud Run to Google Cloud CDN or a third-party CDN for even faster global delivery and edge caching.
- **CI/CD**: Automated builds and deployments via GitHub Actions or Cloud Build for zero-downtime updates.
- **Static export** mode for cost optimization
- **CDN integration** for global content delivery

### Backend Deployment
- **Google Cloud Run** for scalable container hosting
- **Docker** containerization with multi-stage builds
- **Load balancer** integration with health checks

---

**Built with ❤️ for the gaming community**

*Transform your gaming moments into epic highlights with ReelSensei* 🎮✨

This project uses a fully asynchronous, cloud-native architecture for all video processing. The workflow is orchestrated through Google Cloud Tasks and GCP Batch to ensure scalability and cost-efficiency.

## Project Type
web-app

## Status
production

## Demo URL
https://reelsensei.com

## Repository
Private Repository

## Media
https://i.ibb.co/JFwxp9wk/Screenshot-2025-07-30-at-15-03-45.png

## Featured
true

## Category
AI/ML & Gaming