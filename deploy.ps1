# AuraQuant Platform Deployment Script for Windows
# Deploys both backend (Render) and frontend (Cloudflare)

Write-Host "🚀 AuraQuant Platform Deployment Starting..." -ForegroundColor Cyan

# Check if running as administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "⚠️  Please run this script as Administrator" -ForegroundColor Yellow
    pause
    exit
}

function Check-Requirements {
    Write-Host "📋 Checking requirements..." -ForegroundColor Yellow
    
    $requirements = @{
        "git" = "Git"
        "node" = "Node.js"
        "python" = "Python"
        "npm" = "NPM"
    }
    
    $missing = @()
    
    foreach ($cmd in $requirements.Keys) {
        if (!(Get-Command $cmd -ErrorAction SilentlyContinue)) {
            $missing += $requirements[$cmd]
        }
    }
    
    if ($missing.Count -gt 0) {
        Write-Host "❌ Missing requirements: $($missing -join ', ')" -ForegroundColor Red
        Write-Host "Please install missing tools and try again." -ForegroundColor Red
        pause
        exit
    }
    
    # Check for Wrangler
    if (!(Get-Command wrangler -ErrorAction SilentlyContinue)) {
        Write-Host "⚠️  Wrangler not found. Installing..." -ForegroundColor Yellow
        npm install -g wrangler
    }
    
    Write-Host "✅ All requirements met" -ForegroundColor Green
}

function Deploy-Backend {
    Write-Host "🔧 Deploying Backend to Render..." -ForegroundColor Cyan
    
    Set-Location backend
    
    # Create requirements.txt if not exists
    if (!(Test-Path requirements.txt)) {
        Write-Host "Creating requirements.txt..." -ForegroundColor Yellow
        @"
fastapi==0.104.1
uvicorn[standard]==0.24.0
python-dotenv==1.0.0
pydantic==2.5.0
sqlalchemy==2.0.23
alembic==1.12.1
asyncpg==0.29.0
redis==5.0.1
celery==5.3.4
httpx==0.25.2
websockets==12.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
aiofiles==23.2.1
pandas==2.1.3
numpy==1.26.2
yfinance==0.2.33
ccxt==4.1.56
python-binance==1.0.17
openai==1.3.7
discord.py==2.3.2
python-telegram-bot==20.6
tweepy==4.14.0
newsapi-python==0.2.7
beautifulsoup4==4.12.2
lxml==4.9.3
matplotlib==3.8.2
plotly==5.18.0
scikit-learn==1.3.2
ta==0.11.0
backtesting==0.3.3
"@ | Out-File -FilePath requirements.txt -Encoding UTF8
    }
    
    # Initialize git if needed
    if (!(Test-Path .git)) {
        git init
        git add .
        git commit -m "Initial backend commit"
    }
    
    Write-Host "📝 Note: Manual steps required for Render:" -ForegroundColor Yellow
    Write-Host "1. Go to https://dashboard.render.com"
    Write-Host "2. Create a new Web Service"
    Write-Host "3. Connect your GitHub/GitLab repository"
    Write-Host "4. Use the render.yaml blueprint"
    Write-Host "5. Add environment variables in Render dashboard:"
    Write-Host "   - All API keys (BINANCE_API_KEY, etc.)"
    Write-Host "   - Database credentials"
    Write-Host "   - JWT_SECRET and ENCRYPTION_KEY"
    
    Set-Location ..
}

function Deploy-Frontend {
    Write-Host "☁️ Deploying Frontend to Cloudflare..." -ForegroundColor Cyan
    
    # Install dependencies
    if (!(Test-Path node_modules)) {
        Write-Host "Installing dependencies..." -ForegroundColor Yellow
        npm install
    }
    
    # Build the project
    Write-Host "Building frontend..." -ForegroundColor Yellow
    npm run build 2>$null
    
    # Login to Cloudflare
    Write-Host "📝 Cloudflare login required" -ForegroundColor Yellow
    wrangler login
    
    # Create KV namespaces
    Write-Host "Creating KV namespaces..." -ForegroundColor Yellow
    wrangler kv:namespace create "SETTINGS_KV" 2>$null
    wrangler kv:namespace create "CACHE_KV" 2>$null
    
    # Create R2 bucket
    Write-Host "Creating R2 bucket..." -ForegroundColor Yellow
    wrangler r2 bucket create auraquant-backups 2>$null
    
    # Deploy to Cloudflare
    Write-Host "Deploying to Cloudflare Workers..." -ForegroundColor Yellow
    wrangler deploy --env production
    
    Write-Host "📝 Setting up secrets..." -ForegroundColor Yellow
    Write-Host "Run these commands to add your API keys:" -ForegroundColor White
    Write-Host "wrangler secret put ALPACA_API_KEY"
    Write-Host "wrangler secret put BINANCE_API_KEY"
    Write-Host "wrangler secret put OPENAI_API_KEY"
    Write-Host "# ... add all other API keys"
}

function Setup-Local {
    Write-Host "🏠 Setting up local environment..." -ForegroundColor Cyan
    
    # Create .env file if not exists
    if (!(Test-Path .env)) {
        Write-Host "Creating .env file..." -ForegroundColor Yellow
        @"
# Environment
ENVIRONMENT=development

# Backend URLs
BACKEND_URL=http://localhost:8000
WEBSOCKET_URL=ws://localhost:8000/ws
WEBHOOK_URL=http://localhost:8000/webhook

# Database
DATABASE_URL=postgresql://user:password@localhost/auraquant
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=your-jwt-secret-here
ENCRYPTION_KEY=your-encryption-key-here

# API Keys (Add your actual keys)
BINANCE_API_KEY=
BINANCE_API_SECRET=
CRYPTO_COM_API_KEY=
CRYPTO_COM_API_SECRET=
INDEPENDENT_RESERVE_API_KEY=
INDEPENDENT_RESERVE_API_SECRET=
OPENAI_API_KEY=
NEWS_API_KEY=
DISCORD_BOT_TOKEN=
TELEGRAM_BOT_TOKEN=
TWITTER_API_KEY=
TWITTER_API_SECRET=
ALPACA_API_KEY=
ALPACA_API_SECRET=
COINMARKETCAP_API_KEY=
COINGECKO_API_KEY=
TRADINGVIEW_WEBHOOK_SECRET=
"@ | Out-File -FilePath .env -Encoding UTF8
        Write-Host "✅ .env file created. Please add your API keys." -ForegroundColor Green
    }
    
    # Create virtual environment for Python
    Write-Host "Setting up Python virtual environment..." -ForegroundColor Yellow
    python -m venv venv
    
    # Activate and install dependencies
    & ".\venv\Scripts\Activate.ps1"
    pip install -r backend/requirements.txt
}

function Start-Local-Services {
    Write-Host "🚀 Starting local services..." -ForegroundColor Cyan
    
    # Start backend in new terminal
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; python -m uvicorn app:app --reload --port 8000"
    
    # Start frontend dev server
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"
    
    Write-Host "✅ Services started:" -ForegroundColor Green
    Write-Host "Backend: http://localhost:8000" -ForegroundColor White
    Write-Host "Frontend: http://localhost:3000" -ForegroundColor White
    Write-Host "API Docs: http://localhost:8000/docs" -ForegroundColor White
}

function Show-Menu {
    Clear-Host
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "    AuraQuant Deployment Manager" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Deploy Backend (Render)" -ForegroundColor White
    Write-Host "2. Deploy Frontend (Cloudflare)" -ForegroundColor White
    Write-Host "3. Deploy Both" -ForegroundColor White
    Write-Host "4. Setup Local Environment" -ForegroundColor White
    Write-Host "5. Full Setup (Local + Deploy)" -ForegroundColor White
    Write-Host "6. Start Local Services" -ForegroundColor White
    Write-Host "7. Exit" -ForegroundColor White
    Write-Host ""
}

# Main execution
Check-Requirements

do {
    Show-Menu
    $choice = Read-Host "Enter your choice (1-7)"
    
    switch ($choice) {
        '1' {
            Deploy-Backend
            pause
        }
        '2' {
            Deploy-Frontend
            pause
        }
        '3' {
            Deploy-Backend
            Deploy-Frontend
            pause
        }
        '4' {
            Setup-Local
            pause
        }
        '5' {
            Setup-Local
            Deploy-Backend
            Deploy-Frontend
            pause
        }
        '6' {
            Start-Local-Services
            pause
        }
        '7' {
            Write-Host "Exiting..." -ForegroundColor Yellow
            break
        }
        default {
            Write-Host "Invalid choice. Please try again." -ForegroundColor Red
            pause
        }
    }
} while ($choice -ne '7')

Write-Host ""
Write-Host "🎉 Deployment process complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Add your API keys to the .env file"
Write-Host "2. Configure API keys in Render dashboard"
Write-Host "3. Add secrets to Cloudflare using wrangler"
Write-Host "4. Update DNS settings to point to Cloudflare"
Write-Host "5. Test the webhook endpoints"
Write-Host ""
Write-Host "Access your platform:" -ForegroundColor Cyan
Write-Host "Frontend: https://auraquant.com (after DNS setup)"
Write-Host "Backend API: https://auraquant-backend.onrender.com"
Write-Host "Webhooks: https://auraquant-webhooks.onrender.com"
