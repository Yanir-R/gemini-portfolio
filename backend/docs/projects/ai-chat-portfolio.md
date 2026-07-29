# AI Chat Portfolio

## Overview
This site. Visitors ask questions and an assistant answers in my voice, grounded in a handful of markdown documents - it is not trained on anything, it is given those documents and told not to go beyond them. The interesting part is the refusal: when the documents do not cover a question it says so rather than inventing an employer or a date.

## Technical Details
- **Frontend**: React 19, TypeScript, Vite, TailwindCSS, deployed on Cloudflare Pages
- **Backend**: FastAPI, Python 3.12, Google Gemini AI, deployed on Google Cloud Run
- **Cloud Platform**: Google Cloud Platform (GCP)
- **Database**: Document-based system with markdown files
- **Deployment**: Google Cloud Run
- **CI/CD**: GitHub Actions with automated deployment

## Key Features
- Real-time AI chat interface with context awareness
- Document management system for private/public information
- Responsive design with dark theme and particle animations
- Email contact system with validation
- Multi-environment configuration (dev/prod)

## Architecture
The application follows a clean separation of concerns:
- React frontend handles UI/UX with TypeScript for type safety
- FastAPI backend manages AI integration and document processing
- Google Gemini AI provides intelligent responses based on uploaded documents
- Docker containerization ensures consistent deployment across environments

## Project Type
web-app

## Status
production

## Demo URL
https://yanir-portfolio.pages.dev

## Repository
https://github.com/Yanir-R/gemini-portfolio

## Media
/projects/portfolio-home.png

## Featured
true

## Category
Full-Stack Development