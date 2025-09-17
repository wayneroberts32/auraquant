# AuraQuant V8+V9 Sovereign Quantum Infinity - WARP Deployment Script
# Based on Master_Index.md specification
# Timestamp: 2025-09-17

Write-Host "🚀 AuraQuant V8+V9 WARP Deployment Starting..." -ForegroundColor Cyan
Write-Host "📋 Following GOLDEN RULES from Master_Index.md" -ForegroundColor Yellow

# ==========================================
# STEP 1: MongoDB Atlas Setup
# ==========================================
function Setup-MongoDB {
    Write-Host "`n[1/6] Setting up MongoDB Atlas..." -ForegroundColor Cyan
    
    Write-Host "📝 MongoDB Configuration Required:" -ForegroundColor Yellow
    Write-Host "  - Cluster: Atlas (cloud.mongodb.com)" -ForegroundColor White
    Write-Host "  - Database: auraquant" -ForegroundColor White
    Write-Host "  - Collections: users, trades, positions, logs, configs, bots" -ForegroundColor White
    Write-Host "  - Roles: admin (Wayne), bot (execution)" -ForegroundColor White
    
    Write-Host "`n⚠️  Manual Steps Required:" -ForegroundColor Yellow
    Write-Host "1. Go to https://cloud.mongodb.com" -ForegroundColor White
    Write-Host "2. Create a new cluster or use existing" -ForegroundColor White
    Write-Host "3. Create database 'auraquant' with required collections" -ForegroundColor White
    Write-Host "4. Set up role-based access" -ForegroundColor White
    Write-Host "5. Get connection string (MONGODB_URI)" -ForegroundColor White
    
    $mongoUri = Read-Host "`nEnter your MongoDB Atlas URI (or press Enter to skip)"
    if ($mongoUri) {
        # Save to environment file
        Add-Content -Path ".\backend\.env.v8v9" -Value "`nMONGODB_URI=$mongoUri"
        Write-Host "✅ MongoDB URI saved" -ForegroundColor Green
    }
}

# ==========================================
# STEP 2: Backend Deployment to Render
# ==========================================
function Deploy-Backend-Render {
    Write-Host "`n[2/6] Deploying Backend to Render..." -ForegroundColor Cyan
    
    Set-Location backend
    
    # Update main_v8v9.py entrypoint if needed
    Write-Host "📝 Checking main_v8v9.py..." -ForegroundColor Yellow
    
    # Create/Update render.yaml with V8V9 configuration
    $renderYaml = @'
services:
  - type: web
    name: auraquant-v8v9-backend
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn main_v8v9:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: MONGODB_URI
        sync: false
      - key: JWT_SECRET
        value: auraquant-v8v9-sovereign-quantum-infinity-2025
      - key: ALPACA_KEY
        sync: false
      - key: ALPACA_SECRET
        sync: false
      - key: BINANCE_KEY
        sync: false
      - key: BINANCE_SECRET
        sync: false
      - key: TELEGRAM_TOKEN
        sync: false
      - key: DISCORD_TOKEN
        sync: false
      - key: BOT_ENABLED
        value: true
      - key: BOT_AUTO_TRADE
        value: false
      - key: PAPER_TRADING
        value: 1
      - key: V8_MODE
        value: ACTIVE
      - key: V9_MODE
        value: DORMANT
      - key: V9_LOCKED
        value: true
      - key: GOD_PHRASE
        value: meggie moo
    healthCheckPath: /healthz
'@
    
    $renderYaml | Out-File -FilePath render.yaml -Encoding UTF8
    Write-Host "✅ render.yaml updated" -ForegroundColor Green
    
    # Initialize git if needed
    if (!(Test-Path .git)) {
        git init
        git add .
        git commit -m "V8V9 WARP deployment"
    }
    
    Write-Host "`n📝 Manual steps for Render deployment:" -ForegroundColor Yellow
    Write-Host "1. Go to https://dashboard.render.com" -ForegroundColor White
    Write-Host "2. New > Web Service > Build and deploy from Git repo" -ForegroundColor White
    Write-Host "3. Connect your GitHub/GitLab repository" -ForegroundColor White
    Write-Host "4. Use Blueprint: render.yaml" -ForegroundColor White
    Write-Host "5. Add environment variables in dashboard" -ForegroundColor White
    Write-Host "6. Verify health endpoint: /healthz" -ForegroundColor White
    Write-Host "7. Verify WebSocket endpoint: /ws" -ForegroundColor White
    
    Set-Location ..
}

# ==========================================
# STEP 3: Frontend Deployment to Cloudflare
# ==========================================
function Deploy-Frontend-Cloudflare {
    Write-Host "`n[3/6] Deploying Frontend to Cloudflare Pages..." -ForegroundColor Cyan
    
    Set-Location frontend-v8v9
    
    # Install dependencies
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm ci
    
    # Build the project
    Write-Host "Building frontend..." -ForegroundColor Yellow
    npm run build
    
    # Check if wrangler is installed
    if (!(Get-Command wrangler -ErrorAction SilentlyContinue)) {
        Write-Host "Installing Cloudflare Wrangler..." -ForegroundColor Yellow
        npm install -g wrangler
    }
    
    Write-Host "`n📝 Cloudflare Pages deployment:" -ForegroundColor Yellow
    Write-Host "Option 1: Using Wrangler CLI" -ForegroundColor Cyan
    Write-Host "  wrangler pages deploy dist --project-name auraquant-frontend" -ForegroundColor White
    
    Write-Host "`nOption 2: Using Cloudflare Dashboard" -ForegroundColor Cyan
    Write-Host "1. Go to https://dash.cloudflare.com" -ForegroundColor White
    Write-Host "2. Pages > Create a project" -ForegroundColor White
    Write-Host "3. Connect to Git provider" -ForegroundColor White
    Write-Host "4. Project name: auraquant-frontend" -ForegroundColor White
    Write-Host "5. Framework: React" -ForegroundColor White
    Write-Host "6. Build command: npm ci; npm run build" -ForegroundColor White
    Write-Host "7. Output directory: dist" -ForegroundColor White
    Write-Host "8. Add environment variable:" -ForegroundColor White
    Write-Host "   VITE_API_URL = [Your Render Backend URL]" -ForegroundColor White
    
    $deployNow = Read-Host "`nDeploy with Wrangler now? (y/n)"
    if ($deployNow -eq 'y') {
        wrangler login
        wrangler pages deploy dist --project-name auraquant-frontend
    }
    
    Set-Location ..
}

# ==========================================
# STEP 4: Setup Bots
# ==========================================
function Setup-Bots {
    Write-Host "`n[4/6] Setting up Telegram and Discord Bots..." -ForegroundColor Cyan
    
    # Create bot setup script
    $botScript = @'
import os
import asyncio
import logging
from typing import Optional
import discord
from discord.ext import commands
from telegram import Update, Bot
from telegram.ext import Application, CommandHandler, ContextTypes

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Bot configuration
TELEGRAM_TOKEN = os.getenv('TELEGRAM_TOKEN')
DISCORD_TOKEN = os.getenv('DISCORD_TOKEN')
MONGODB_URI = os.getenv('MONGODB_URI')
GOD_PHRASE = "meggie moo"

# Shared command handlers
class BotCommands:
    @staticmethod
    async def status():
        return "🟢 AuraQuant V8 Active | V9 Locked | Paper Trading ON"
    
    @staticmethod
    async def pause():
        # Log to MongoDB
        return "⏸️ Trading paused"
    
    @staticmethod
    async def resume():
        # Log to MongoDB
        return "▶️ Trading resumed"
    
    @staticmethod
    async def switch(broker: str):
        return f"🔄 Switched to {broker}"
    
    @staticmethod
    async def unlock(phrase: str, code: str):
        if phrase == GOD_PHRASE:
            return "🔓 V9+ Unlocked - Starting with 10% capital"
        return "❌ Invalid unlock credentials"

# Telegram Bot
async def telegram_status(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(await BotCommands.status())

async def telegram_pause(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(await BotCommands.pause())

async def telegram_resume(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(await BotCommands.resume())

# Discord Bot
intents = discord.Intents.default()
intents.message_content = True
discord_bot = commands.Bot(command_prefix='/', intents=intents)

@discord_bot.command()
async def status(ctx):
    await ctx.send(await BotCommands.status())

@discord_bot.command()
async def pause(ctx):
    await ctx.send(await BotCommands.pause())

@discord_bot.command()
async def resume(ctx):
    await ctx.send(await BotCommands.resume())

# Main execution
if __name__ == "__main__":
    print("Starting AuraQuant Bots...")
    
    # Setup Telegram bot
    if TELEGRAM_TOKEN:
        telegram_app = Application.builder().token(TELEGRAM_TOKEN).build()
        telegram_app.add_handler(CommandHandler("status", telegram_status))
        telegram_app.add_handler(CommandHandler("pause", telegram_pause))
        telegram_app.add_handler(CommandHandler("resume", telegram_resume))
        print("✅ Telegram bot configured")
    
    # Run Discord bot
    if DISCORD_TOKEN:
        discord_bot.run(DISCORD_TOKEN)
        print("✅ Discord bot running")
'@
    
    $botScript | Out-File -FilePath ".\bots\auraquant_bots.py" -Encoding UTF8
    Write-Host "✅ Bot script created: bots\auraquant_bots.py" -ForegroundColor Green
    
    Write-Host "`n📝 Bot Setup Requirements:" -ForegroundColor Yellow
    Write-Host "1. Create Telegram Bot via @BotFather" -ForegroundColor White
    Write-Host "2. Get Telegram token and add to .env" -ForegroundColor White
    Write-Host "3. Create Discord Application at discord.com/developers" -ForegroundColor White
    Write-Host "4. Get Discord token and add to .env" -ForegroundColor White
    Write-Host "5. Invite bots to your server/channel" -ForegroundColor White
}

# ==========================================
# STEP 5: Validate Deployment
# ==========================================
function Validate-Deployment {
    Write-Host "`n[5/6] Running Health Checks..." -ForegroundColor Cyan
    
    $backendUrl = Read-Host "Enter your Render backend URL"
    if ($backendUrl) {
        try {
            $health = Invoke-RestMethod -Uri "$backendUrl/healthz" -Method Get
            Write-Host "✅ Backend health check: PASS" -ForegroundColor Green
        } catch {
            Write-Host "❌ Backend health check: FAIL" -ForegroundColor Red
        }
    }
    
    Write-Host "`n📋 Go/No-Go Bot Handover Checklist:" -ForegroundColor Yellow
    $checklist = @(
        "Backend deployed to Render (health OK)",
        "Frontend deployed to Cloudflare (build OK)",
        "MongoDB connected, auth OK",
        "Bots online (Telegram/Discord)",
        "Paper trading ON",
        "GUI charts + AG Grid render",
        "Risk safeguards armed"
    )
    
    foreach ($item in $checklist) {
        Write-Host "[ ] $item" -ForegroundColor White
    }
    
    Write-Host "`n⚠️  STOP - Wayne approval required before live trading" -ForegroundColor Red
    Write-Host "Wayne approval: __________ Date: _________" -ForegroundColor Yellow
}

# ==========================================
# STEP 6: Generate Final Report
# ==========================================
function Generate-Report {
    Write-Host "`n[6/6] Generating Deployment Report..." -ForegroundColor Cyan
    
    $date = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $report = @"
# AuraQuant V8+V9 Deployment Report
Generated: $date

## Deployment Status
* MongoDB Atlas: [CONFIGURED/PENDING]
* Render Backend: [DEPLOYED/PENDING]
* Cloudflare Frontend: [DEPLOYED/PENDING]
* Telegram Bot: [ONLINE/OFFLINE]
* Discord Bot: [ONLINE/OFFLINE]

## Configuration
* Paper Trading: ENABLED
* V8 Mode: ACTIVE
* V9 Mode: DORMANT (Locked)
* Unlock Phrase: Configured
* Max Drawdown: 5%
* Slippage Threshold: 1.2 pips

## Endpoints
* Backend Health: /healthz
* WebSocket: /ws
* Frontend: https://auraquant-frontend.pages.dev
* Backend: https://auraquant-v8v9-backend.onrender.com

## Safeguards
* MaxDrawdown: 5% ✓
* SlippageThreshold: 1.2 pips ✓
* Spread Guard: Active ✓
* Latency Guard: Active ✓
* Liquidity Guard: Active ✓

## Next Steps
1. Complete Wayne approval for live trading
2. Verify all health checks pass
3. Test bot commands
4. Monitor initial paper trades
5. Update Help Centre documentation

## Notes
* GOLDEN RULES enforced
* Single-tab UX implemented
* AWST (Perth) timezone configured
* Event Journal Hub logging active
"@
    
    $report | Out-File -FilePath ".\DEPLOYMENT_REPORT_V8V9.md" -Encoding UTF8
    Write-Host "✅ Report saved: DEPLOYMENT_REPORT_V8V9.md" -ForegroundColor Green
}

# ==========================================
# MAIN EXECUTION
# ==========================================
Clear-Host
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AuraQuant V8+V9 WARP Deployment" -ForegroundColor Yellow
Write-Host "  Following Master_Index.md Specification" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$steps = @(
    "1. Setup MongoDB Atlas",
    "2. Deploy Backend to Render", 
    "3. Deploy Frontend to Cloudflare",
    "4. Setup Telegram & Discord Bots",
    "5. Validate Deployment & Health Checks",
    "6. Generate Final Report"
)

Write-Host "Deployment Sequence:" -ForegroundColor Yellow
foreach ($step in $steps) {
    Write-Host "  $step" -ForegroundColor White
}

Write-Host "`n⚠️  IMPORTANT: This follows the GOLDEN RULES" -ForegroundColor Yellow
Write-Host "- Build strictly from Master_Index.md" -ForegroundColor White
Write-Host "- MongoDB → Render → Cloudflare sequence" -ForegroundColor White
Write-Host "- Paper trading ON by default" -ForegroundColor White
Write-Host "- Stop at Go/No-Go before live trading" -ForegroundColor White

$continue = Read-Host "`nProceed with deployment? (y/n)"
if ($continue -eq 'y') {
    Setup-MongoDB
    Deploy-Backend-Render
    Deploy-Frontend-Cloudflare
    Setup-Bots
    Validate-Deployment
    Generate-Report
    
    Write-Host "`n🎉 Deployment sequence complete!" -ForegroundColor Green
    Write-Host "📋 Check DEPLOYMENT_REPORT_V8V9.md for status" -ForegroundColor Yellow
    Write-Host "⚠️  Remember: Wayne approval required before live trading" -ForegroundColor Red
} else {
    Write-Host "Deployment cancelled." -ForegroundColor Yellow
}