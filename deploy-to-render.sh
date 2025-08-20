#!/bin/bash

# AuraQuant Backend Deployment to Render
# Run this script to deploy manually if GitHub connection fails

echo "🚀 Starting Render deployment..."

# Check if Render CLI is installed
if ! command -v render &> /dev/null; then
    echo "Installing Render CLI..."
    npm install -g @render-cli/cli
fi

# Login to Render (you'll need to authenticate)
echo "Logging into Render..."
render login

# Deploy the backend
echo "Deploying backend to Render..."
cd backend

# Create render.yaml if it doesn't exist
if [ ! -f "render.yaml" ]; then
    echo "Creating render.yaml..."
    cat > render.yaml << EOF
services:
  - type: web
    name: auraquant-backend
    runtime: python
    plan: free
    buildCommand: "pip install -r requirements-minimal.txt"
    startCommand: "python main.py"
    healthCheckPath: /api/health
    envVars:
      - key: PYTHON_VERSION
        value: "3.11"
      - key: ENVIRONMENT
        value: production
EOF
fi

# Deploy
render up

echo "✅ Deployment initiated!"
echo "Check your Render dashboard for deployment status."
