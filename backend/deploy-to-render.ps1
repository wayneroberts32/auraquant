# AuraQuant Backend Deployment Script for Render
# Run this from PowerShell in the backend directory

Write-Host "🚀 AuraQuant Backend Deployment to Render" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Check if we're in the backend directory
if (-not (Test-Path "app.py")) {
    Write-Host "❌ Error: Please run this script from the backend directory" -ForegroundColor Red
    exit 1
}

Write-Host "`n📋 Step 1: Initializing Git repository..." -ForegroundColor Yellow

# Initialize git if not already initialized
if (-not (Test-Path ".git")) {
    git init
    Write-Host "✅ Git repository initialized" -ForegroundColor Green
} else {
    Write-Host "✅ Git repository already exists" -ForegroundColor Green
}

# Add all files
Write-Host "`n📋 Step 2: Adding files to Git..." -ForegroundColor Yellow
git add .
git status --short

# Commit changes
Write-Host "`n📋 Step 3: Committing changes..." -ForegroundColor Yellow
$commitMessage = Read-Host "Enter commit message (or press Enter for default)"
if ([string]::IsNullOrWhiteSpace($commitMessage)) {
    $commitMessage = "Deploy AuraQuant backend with webhook support"
}
git commit -m "$commitMessage"

Write-Host "`n📋 Step 4: Setting up GitHub remote..." -ForegroundColor Yellow
Write-Host "You need to create a new repository on GitHub first." -ForegroundColor Cyan
Write-Host "Go to: https://github.com/new" -ForegroundColor Cyan
Write-Host "Repository name suggestion: auraquant-backend" -ForegroundColor Cyan
Write-Host ""
$repoUrl = Read-Host "Enter your new GitHub repository URL (e.g., https://github.com/wayneroberts32/auraquant-backend.git)"

if (![string]::IsNullOrWhiteSpace($repoUrl)) {
    # Remove existing origin if it exists
    git remote remove origin 2>$null
    
    # Add new origin
    git remote add origin $repoUrl
    Write-Host "✅ Remote repository added" -ForegroundColor Green
    
    # Push to GitHub
    Write-Host "`n📋 Step 5: Pushing to GitHub..." -ForegroundColor Yellow
    git branch -M main
    git push -u origin main
    Write-Host "✅ Code pushed to GitHub" -ForegroundColor Green
    
    Write-Host "`n📋 Step 6: Deploy to Render" -ForegroundColor Yellow
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Now complete these steps in Render Dashboard:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Go to: https://dashboard.render.com" -ForegroundColor White
    Write-Host "2. Click on your service: srv-d1r5mmodl3ps73f3mdog" -ForegroundColor White
    Write-Host "3. Go to Settings tab" -ForegroundColor White
    Write-Host "4. In 'Build & Deploy' section:" -ForegroundColor White
    Write-Host "   - Change GitHub repository to: $repoUrl" -ForegroundColor Yellow
    Write-Host "   - Branch: main" -ForegroundColor Yellow
    Write-Host "   - Build Command: pip install -r requirements.txt" -ForegroundColor Yellow
    Write-Host "   - Start Command: uvicorn app:app --host 0.0.0.0 --port `$PORT" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "5. Click 'Save Changes'" -ForegroundColor White
    Write-Host "6. Go to 'Manual Deploy' and click 'Deploy latest commit'" -ForegroundColor White
    Write-Host ""
    Write-Host "7. Add Environment Variables in Render:" -ForegroundColor Cyan
    Write-Host "   Go to Environment tab and add all keys from .env.example" -ForegroundColor White
    Write-Host ""
    Write-Host "✅ Deployment script complete!" -ForegroundColor Green
    Write-Host "🔗 Your backend will be available at: https://auraquant-backend.onrender.com" -ForegroundColor Cyan
} else {
    Write-Host "❌ No repository URL provided. Please create a GitHub repository first." -ForegroundColor Red
}

Write-Host "`n📝 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Monitor deployment in Render dashboard" -ForegroundColor White
Write-Host "2. Check logs for any errors" -ForegroundColor White
Write-Host "3. Test webhook endpoints once deployed" -ForegroundColor White
Write-Host "4. Update frontend config.js if URL changes" -ForegroundColor White
