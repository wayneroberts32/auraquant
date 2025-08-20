#!/bin/bash

# Cloudflare Pages Deployment Script
# Run this from Git Bash after logging in with: wrangler login

echo "========================================="
echo "AuraQuant Cloudflare Pages Deployment"
echo "========================================="

# Check if we're in the right directory
if [ ! -f "index.html" ]; then
    echo "Error: index.html not found. Please run this script from the AuraQuant directory."
    exit 1
fi

# Project configuration
PROJECT_NAME="auraquant-frontend"
BRANCH="main"

echo ""
echo "Deploying to Cloudflare Pages..."
echo "Project: $PROJECT_NAME"
echo "Branch: $BRANCH"
echo ""

# Deploy to Cloudflare Pages
wrangler pages deploy . \
  --project-name="$PROJECT_NAME" \
  --branch="$BRANCH" \
  --commit-message="Deploy with fixed JavaScript loading order and all updates"

# Check if deployment was successful
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo ""
    echo "Your site should be live at:"
    echo "  - https://ai-auraquant.com"
    echo "  - https://auraquant-frontend.pages.dev"
    echo ""
    echo "Check the deployment status at:"
    echo "  https://dash.cloudflare.com/pages/project/auraquant-frontend"
else
    echo ""
    echo "❌ Deployment failed!"
    echo ""
    echo "Troubleshooting:"
    echo "1. Make sure you're logged in: wrangler login"
    echo "2. Check if the project exists in Cloudflare dashboard"
    echo "3. Verify your account has Pages access"
fi
