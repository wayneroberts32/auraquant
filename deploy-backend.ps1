# AuraQuant Backend Deployment Script
# Automated deployment to Render

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AuraQuant Backend Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Render CLI is installed
Write-Host "Checking Render CLI..." -ForegroundColor Yellow
$renderCLI = Get-Command render -ErrorAction SilentlyContinue
if (-not $renderCLI) {
    Write-Host "Installing Render CLI..." -ForegroundColor Yellow
    npm install -g @render-com/cli
}

# Create render.yaml if not exists
Write-Host "Creating Render configuration..." -ForegroundColor Yellow
$renderYaml = @"
services:
  - type: web
    name: auraquant-backend
    runtime: python
    buildCommand: cd backend && pip install -r requirements.txt
    startCommand: cd backend && uvicorn main:app --host 0.0.0.0 --port `$PORT
    envVars:
      - key: PYTHON_VERSION
        value: 3.11.0
      - key: ENVIRONMENT
        value: production
      - key: CORS_ORIGINS
        value: https://auraquant-live.pages.dev,https://ai-auraquant.com
"@

Set-Content -Path "render.yaml" -Value $renderYaml

Write-Host "Render configuration created." -ForegroundColor Green

# Push to GitHub to trigger deployment
Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
git add render.yaml
git commit -m "Add Render deployment configuration" -ErrorAction SilentlyContinue
git push

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MANUAL STEPS REQUIRED" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Go to: https://dashboard.render.com" -ForegroundColor White
Write-Host "2. Click 'New +' -> 'Web Service'" -ForegroundColor White
Write-Host "3. Connect GitHub repo: wayneroberts32/auraquant" -ForegroundColor White
Write-Host "4. Select the repository" -ForegroundColor White
Write-Host "5. Configure:" -ForegroundColor White
Write-Host "   - Name: auraquant-backend" -ForegroundColor White
Write-Host "   - Root Directory: backend" -ForegroundColor White
Write-Host "   - Environment: Python 3" -ForegroundColor White
Write-Host "   - Build Command: pip install -r requirements.txt" -ForegroundColor White
Write-Host "   - Start Command: uvicorn main:app --host 0.0.0.0 --port `$PORT" -ForegroundColor White
Write-Host "6. Click 'Create Web Service'" -ForegroundColor White
Write-Host ""
Write-Host "The deployment will take 5-10 minutes." -ForegroundColor Yellow
Write-Host ""
