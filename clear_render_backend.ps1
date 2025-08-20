# Clear Render Backend Script for AuraQuant
# This script helps clear old backend files and prepare for fresh deployment

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "   AuraQuant - Clear Render Backend & Deploy     " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
$currentDir = Get-Location
if (-not (Test-Path "backend\app.py")) {
    Write-Host "ERROR: Please run this script from the AuraQuant directory" -ForegroundColor Red
    Write-Host "Current directory: $currentDir" -ForegroundColor Yellow
    exit 1
}

Write-Host "This script will help you:" -ForegroundColor Green
Write-Host "1. Clear old backend files on Render" -ForegroundColor White
Write-Host "2. Prepare fresh deployment" -ForegroundColor White
Write-Host "3. Deploy new backend with your API keys" -ForegroundColor White
Write-Host ""

# Function to check for Render CLI
function Check-RenderCLI {
    try {
        $renderVersion = render --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Render CLI found" -ForegroundColor Green
            return $true
        }
    } catch {
        Write-Host "✗ Render CLI not found" -ForegroundColor Yellow
        Write-Host "Installing Render CLI..." -ForegroundColor Cyan
        
        # Install render-cli via npm
        if (Get-Command npm -ErrorAction SilentlyContinue) {
            npm install -g @render-com/cli
            return $true
        } else {
            Write-Host "Please install Node.js first to get npm" -ForegroundColor Red
            return $false
        }
    }
    return $false
}

# Function to login to Render
function Login-Render {
    Write-Host ""
    Write-Host "Logging into Render..." -ForegroundColor Cyan
    Write-Host "Please enter your Render API key (from https://dashboard.render.com/u/settings)" -ForegroundColor Yellow
    $renderApiKey = Read-Host -Prompt "Render API Key" -AsSecureString
    $renderApiKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($renderApiKey))
    
    $env:RENDER_API_KEY = $renderApiKeyPlain
    
    Write-Host "✓ Logged into Render" -ForegroundColor Green
    return $renderApiKeyPlain
}

# Function to clear backend via Git
function Clear-BackendGit {
    Write-Host ""
    Write-Host "Clearing old backend files..." -ForegroundColor Cyan
    
    # Initialize git if not already
    if (-not (Test-Path ".git")) {
        Write-Host "Initializing Git repository..." -ForegroundColor Yellow
        git init
        git config user.email "auraquant@bot.com"
        git config user.name "AuraQuant Bot"
    }
    
    # Create a clean commit with only necessary files
    Write-Host "Creating clean deployment..." -ForegroundColor Yellow
    
    # Remove all files from git tracking
    git rm -r --cached . 2>$null
    
    # Add only backend files
    git add backend/
    git add .gitignore 2>$null
    
    # Commit the clean state
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    git commit -m "Clean deployment - $timestamp" 2>$null
    
    Write-Host "✓ Backend cleaned and ready" -ForegroundColor Green
}

# Function to setup environment variables
function Setup-Environment {
    Write-Host ""
    Write-Host "Setting up environment variables..." -ForegroundColor Cyan
    
    # Check if .env file exists in backend
    $envPath = "backend\.env"
    if (-not (Test-Path $envPath)) {
        Write-Host "Creating .env file from template..." -ForegroundColor Yellow
        
        if (Test-Path "backend\.env.example") {
            Copy-Item "backend\.env.example" $envPath
            Write-Host "✓ Created .env file - Please add your API keys!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Opening .env file for editing..." -ForegroundColor Cyan
            notepad $envPath
            
            Write-Host ""
            Write-Host "Press Enter after adding your API keys..." -ForegroundColor Yellow
            Read-Host
        }
    } else {
        Write-Host "✓ .env file exists" -ForegroundColor Green
        Write-Host "Do you want to edit it? (y/n)" -ForegroundColor Yellow
        $edit = Read-Host
        if ($edit -eq 'y') {
            notepad $envPath
            Write-Host "Press Enter when done editing..." -ForegroundColor Yellow
            Read-Host
        }
    }
}

# Function to deploy to Render
function Deploy-ToRender {
    param($apiKey)
    
    Write-Host ""
    Write-Host "Deploying to Render..." -ForegroundColor Cyan
    
    # Check if render.yaml exists
    if (-not (Test-Path "backend\render.yaml")) {
        Write-Host "ERROR: render.yaml not found in backend folder" -ForegroundColor Red
        return $false
    }
    
    # Get Render service details
    Write-Host "Enter your Render service name (or press Enter to create new):" -ForegroundColor Yellow
    $serviceName = Read-Host -Prompt "Service Name"
    
    if ($serviceName -eq "") {
        $serviceName = "auraquant-backend"
    }
    
    # Add Render remote if not exists
    $gitRemotes = git remote 2>$null
    if ($gitRemotes -notcontains "render") {
        Write-Host "Enter your Render Git URL (from Render dashboard):" -ForegroundColor Yellow
        Write-Host "Example: https://github.com/yourusername/auraquant.git" -ForegroundColor Gray
        $renderGitUrl = Read-Host -Prompt "Render Git URL"
        
        if ($renderGitUrl -ne "") {
            git remote add render $renderGitUrl
            Write-Host "✓ Added Render remote" -ForegroundColor Green
        }
    }
    
    # Push to Render
    Write-Host "Pushing to Render..." -ForegroundColor Cyan
    git push render main --force
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Successfully deployed to Render!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Your backend is being deployed at:" -ForegroundColor Cyan
        Write-Host "https://$serviceName.onrender.com" -ForegroundColor White
        Write-Host ""
        Write-Host "Check deployment status at:" -ForegroundColor Cyan
        Write-Host "https://dashboard.render.com" -ForegroundColor White
    } else {
        Write-Host "✗ Deployment failed. Please check your Git configuration." -ForegroundColor Red
        return $false
    }
    
    return $true
}

# Main execution
Write-Host "Starting Render backend cleanup and deployment..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Check dependencies
if (-not (Check-RenderCLI)) {
    Write-Host "Please install dependencies and run again" -ForegroundColor Red
    exit 1
}

# Step 2: Login to Render (optional for CLI)
Write-Host ""
Write-Host "Do you want to use Render CLI? (y/n)" -ForegroundColor Yellow
Write-Host "(Choose 'n' to use Git deployment instead)" -ForegroundColor Gray
$useRenderCli = Read-Host

$renderApiKey = ""
if ($useRenderCli -eq 'y') {
    $renderApiKey = Login-Render
}

# Step 3: Clear old backend
Clear-BackendGit

# Step 4: Setup environment
Setup-Environment

# Step 5: Deploy
Write-Host ""
Write-Host "Ready to deploy. Continue? (y/n)" -ForegroundColor Yellow
$continue = Read-Host

if ($continue -eq 'y') {
    if (Deploy-ToRender -apiKey $renderApiKey) {
        Write-Host ""
        Write-Host "==================================================" -ForegroundColor Green
        Write-Host "   Deployment Complete!" -ForegroundColor Green
        Write-Host "==================================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "1. Check Render dashboard for deployment status" -ForegroundColor White
        Write-Host "2. Set environment variables in Render dashboard" -ForegroundColor White
        Write-Host "3. Test your endpoints" -ForegroundColor White
        Write-Host "4. Deploy frontend to Cloudflare" -ForegroundColor White
    }
} else {
    Write-Host "Deployment cancelled" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
