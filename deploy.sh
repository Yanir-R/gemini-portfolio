#!/bin/bash

# Set environment variables
export PROJECT_ID=$(gcloud config get-value project)
export REGION="me-west1"  # Your current region
export REPOSITORY="docker-repo"

# Create Artifact Registry repository if it doesn't exist
gcloud artifacts repositories create $REPOSITORY \
    --repository-format=docker \
    --location=$REGION \
    --description="Docker repository" || true

# Deploy backend
echo "Deploying backend..."
gcloud run deploy backend \
  --source ./backend \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 3 \
  --set-env-vars="GEMINI_API_KEY=${GEMINI_API_KEY}"

# Get backend URL
BACKEND_URL=$(gcloud run services describe backend --region $REGION --format='value(status.url)')
echo "Backend URL: $BACKEND_URL"

# Deploy frontend with backend URL
echo "Deploying frontend..."
gcloud run deploy frontend \
  --source ./frontend \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --memory 256Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 3 \
  --set-env-vars="VITE_BACKEND_URL=$BACKEND_URL"

echo "Deployment complete!" 