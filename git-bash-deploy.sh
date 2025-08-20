#!/bin/bash

# AuraQuant Git Bash Deployment Commands
# Run this in Git Bash on Windows

echo "================================================"
echo "     AuraQuant Git Bash Deployment"
echo "================================================"
echo ""

# Navigate to project directory (Git Bash path format)
cd /d/AuraQuant_Rich_Bot/Warp/AuraQuant

# Step 1: Initialize Git (if needed)
if [ ! -d .git ]; then
    echo "Initializing Git repository..."
    git init
    git config user.email "wayneroberts32@gmail.com"
    git config user.name "Wayne Roberts"
else
    echo "Git already initialized"
fi

# Step 2: Add GitHub remote (if needed)
if ! git remote | grep -q origin; then
    echo "Adding GitHub remote..."
    git remote add origin https://github.com/wayneroberts32/auraquant.git
else
    echo "GitHub remote already exists"
fi

# Step 3: Create production API config
echo "Creating production API configuration..."
cat > js/api-config.js << 'EOF'
// Production API Configuration
window.API_CONFIG = {
    BACKEND_URL: 'https://auraquant-backend.onrender.com',
    WEBSOCKET_URL: 'wss://auraquant-backend.onrender.com',
    WEBHOOK_URL: 'https://auraquant-backend.onrender.com/webhook/tradingview'
};
EOF

# Step 4: Stage all files
echo "Staging all files..."
git add .

# Step 5: Commit changes
echo "Committing changes..."
git commit -m "Deploy AuraQuant with NAB and Plus500 integrations" || echo "No changes to commit"

# Step 6: Push to GitHub
echo "Pushing to GitHub..."
git branch -M main
git push -u origin main

echo ""
echo "================================================"
echo "✅ Git push complete!"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Deploy backend on Render.com"
echo "2. Deploy frontend on Cloudflare Pages"
echo "3. Both will auto-deploy from your GitHub repo"
echo ""
echo "See DEPLOYMENT_GUIDE.md for detailed instructions"
