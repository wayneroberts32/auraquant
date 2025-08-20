# Cloudflare Pages Deployment Script
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host " Cloudflare Pages Deployment Script" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if token exists in environment
if (-not $env:CLOUDFLARE_API_TOKEN) {
    Write-Host "CLOUDFLARE_API_TOKEN not found in environment." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To create a token:" -ForegroundColor Green
    Write-Host "1. Go to: https://dash.cloudflare.com/profile/api-tokens" -ForegroundColor White
    Write-Host "2. Click 'Create Token'" -ForegroundColor White
    Write-Host "3. Select 'Custom token' template" -ForegroundColor White
    Write-Host "4. Add permission: Account -> Cloudflare Pages:Edit" -ForegroundColor White
    Write-Host "5. Create and copy the token" -ForegroundColor White
    Write-Host ""
    
    $token = Read-Host "Please enter your Cloudflare API Token"
    if ($token) {
        $env:CLOUDFLARE_API_TOKEN = $token
        Write-Host "Token set successfully!" -ForegroundColor Green
    } else {
        Write-Host "No token provided. Exiting." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Deploying to Cloudflare Pages..." -ForegroundColor Yellow
Write-Host ""

# Run deployment
npx wrangler pages deploy . --project-name=auraquant-frontend --branch=main --commit-message="Manual deployment from PowerShell"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host " Deployment Successful!" -ForegroundColor Green
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your site should be available at:" -ForegroundColor Cyan
    Write-Host "  https://auraquant-frontend.pages.dev" -ForegroundColor White
    Write-Host "  https://ai-auraquant.com (custom domain)" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "=====================================" -ForegroundColor Red
    Write-Host " Deployment Failed!" -ForegroundColor Red
    Write-Host "=====================================" -ForegroundColor Red
    Write-Host "Please check the error messages above." -ForegroundColor Yellow
}

Write-Host ""
Read-Host "Press Enter to continue"
