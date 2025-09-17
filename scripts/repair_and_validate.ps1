# AuraQuant Platform Repair and Validation Script
# This script will scan, verify, and repair all coding components

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "AuraQuant Platform Repair & Validation" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Set the root directory
$RootDir = "D:\AuraQuant_Rich_Bot\Warp\AuraQuant"
Set-Location $RootDir

# Track issues and fixes
$issues = @()
$fixes = @()

# Function to check if file exists
function Test-FileExists {
    param($FilePath)
    if (!(Test-Path $FilePath)) {
        $script:issues += "Missing file: $FilePath"
        return $false
    }
    return $true
}

# Function to validate file content
function Test-FileContent {
    param($FilePath, $RequiredContent)
    if (Test-Path $FilePath) {
        $content = Get-Content $FilePath -Raw
        if ($content -notmatch $RequiredContent) {
            $script:issues += "Invalid content in: $FilePath (missing: $RequiredContent)"
            return $false
        }
    }
    return $true
}

Write-Host "Step 1: Checking Directory Structure" -ForegroundColor Yellow
Write-Host "-------------------------------------" -ForegroundColor Gray

# Check frontend directories
$frontendDirs = @(
    "assets",
    "css", 
    "js",
    "data",
    "scripts"
)

foreach ($dir in $frontendDirs) {
    if (Test-Path "$RootDir\$dir") {
        Write-Host "✓ $dir directory exists" -ForegroundColor Green
    } else {
        Write-Host "✗ $dir directory missing" -ForegroundColor Red
        $issues += "Missing directory: $dir"
        New-Item -ItemType Directory -Path "$RootDir\$dir" -Force | Out-Null
        $fixes += "Created directory: $dir"
    }
}

# Check backend directories
$backendDirs = @(
    "backend\api",
    "backend\core",
    "backend\strategies",
    "backend\webhooks",
    "backend\brokers",
    "backend\compliance",
    "backend\integrations"
)

foreach ($dir in $backendDirs) {
    if (Test-Path "$RootDir\$dir") {
        Write-Host "✓ $dir directory exists" -ForegroundColor Green
    } else {
        Write-Host "✗ $dir directory missing" -ForegroundColor Red
        $issues += "Missing directory: $dir"
        New-Item -ItemType Directory -Path "$RootDir\$dir" -Force | Out-Null
        $fixes += "Created directory: $dir"
    }
}

Write-Host ""
Write-Host "Step 2: Checking Critical Frontend Files" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray

# Check critical HTML files
$htmlFiles = @{
    "index.html" = "AuraQuant.*Quantum Trading Cockpit"
    "help.html" = "Help Center|Documentation"
}

foreach ($file in $htmlFiles.Keys) {
    if (Test-FileExists "$RootDir\$file") {
        if (Test-FileContent "$RootDir\$file" $htmlFiles[$file]) {
            Write-Host "✓ $file is valid" -ForegroundColor Green
        } else {
            Write-Host "⚠ $file needs update" -ForegroundColor Yellow
        }
    } else {
        Write-Host "✗ $file missing" -ForegroundColor Red
    }
}

# Check critical CSS files
$cssFiles = @(
    "css\premium.css",
    "css\styles.css",
    "css\animations.css"
)

foreach ($file in $cssFiles) {
    if (Test-FileExists "$RootDir\$file") {
        Write-Host "✓ $file exists" -ForegroundColor Green
    } else {
        Write-Host "✗ $file missing" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Step 3: Checking JavaScript Modules" -ForegroundColor Yellow
Write-Host "-----------------------------------" -ForegroundColor Gray

# Check critical JS files
$jsFiles = @{
    "js\app.js" = "class App"
    "js\config.js" = "API_BASE_URL|window.Config"
    "js\main.js" = "DOMContentLoaded|initialize"
    "js\integration.js" = "IntegrationModule|WebSocket"
    "js\websocket.js" = "WebSocketManager|connect"
    "js\trading.js" = "TradingModule|placeOrder"
    "js\screener.js" = "ScreenerModule|scanMarket"
    "js\charts.js" = "ChartModule|initChart"
    "js\ai.js" = "AIModule|analyze"
    "js\social.js" = "SocialModule|broadcast"
    "js\timezone.js" = "TimezoneModule|AWST"
    "js\backup.js" = "BackupModule|createBackup"
    "js\emergency.js" = "EmergencyModule|stopAll"
}

foreach ($file in $jsFiles.Keys) {
    if (Test-FileExists "$RootDir\$file") {
        if (Test-FileContent "$RootDir\$file" $jsFiles[$file]) {
            Write-Host "✓ $file is valid" -ForegroundColor Green
        } else {
            Write-Host "⚠ $file needs validation" -ForegroundColor Yellow
        }
    } else {
        Write-Host "✗ $file missing" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Step 4: Checking Backend Core Files" -ForegroundColor Yellow
Write-Host "-----------------------------------" -ForegroundColor Gray

# Check critical backend files
$backendFiles = @{
    "backend\main.py" = "FastAPI|app = FastAPI"
    "backend\requirements.txt" = "fastapi|uvicorn"
    "backend\.env" = "API_KEY|DATABASE_URL"
    "backend\core\bot_engine.py" = "BotEngine|class"
    "backend\core\infinity_engine.py" = "InfinityEngine|zero_loss"
    "backend\core\risk_manager.py" = "RiskManager|max_drawdown"
    "backend\core\vault.py" = "VaultManager|encrypt"
    "backend\webhooks\webhook_handler.py" = "WebhookHandler|process"
    "backend\strategies\quantum_infinity.py" = "QuantumStrategy|execute"
}

foreach ($file in $backendFiles.Keys) {
    if (Test-FileExists "$RootDir\$file") {
        if (Test-FileContent "$RootDir\$file" $backendFiles[$file]) {
            Write-Host "✓ $file is valid" -ForegroundColor Green
        } else {
            Write-Host "⚠ $file needs validation" -ForegroundColor Yellow
        }
    } else {
        Write-Host "✗ $file missing" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Step 5: Checking Data and Configuration Files" -ForegroundColor Yellow
Write-Host "---------------------------------------------" -ForegroundColor Gray

# Check data files
$dataFiles = @(
    "data\warrior_screeners.csv",
    "assets\logo.svg"
)

foreach ($file in $dataFiles) {
    if (Test-FileExists "$RootDir\$file") {
        Write-Host "✓ $file exists" -ForegroundColor Green
    } else {
        Write-Host "✗ $file missing" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Step 6: Validating Package Files" -ForegroundColor Yellow
Write-Host "--------------------------------" -ForegroundColor Gray

# Check package.json
if (Test-FileExists "$RootDir\package.json") {
    $packageJson = Get-Content "$RootDir\package.json" | ConvertFrom-Json
    if ($packageJson.name -eq "auraquant-frontend") {
        Write-Host "✓ package.json is valid" -ForegroundColor Green
    } else {
        Write-Host "⚠ package.json needs update" -ForegroundColor Yellow
        $issues += "package.json name mismatch"
    }
} else {
    Write-Host "✗ package.json missing" -ForegroundColor Red
}

Write-Host ""
Write-Host "Step 7: Checking Environment Variables" -ForegroundColor Yellow
Write-Host "--------------------------------------" -ForegroundColor Gray

# Check backend .env file
$envFile = "$RootDir\backend\.env"
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile -Raw
    $requiredVars = @(
        "ALPACA_API_KEY",
        "BINANCE_API_KEY",
        "DISCORD_WEBHOOK_URL",
        "TELEGRAM_BOT_TOKEN",
        "DATABASE_URL"
    )
    
    foreach ($var in $requiredVars) {
        if ($envContent -match $var) {
            Write-Host "✓ $var configured" -ForegroundColor Green
        } else {
            Write-Host "⚠ $var not configured" -ForegroundColor Yellow
            $issues += "Missing env var: $var"
        }
    }
} else {
    Write-Host "✗ Backend .env file missing" -ForegroundColor Red
    $issues += "Missing backend .env file"
}

Write-Host ""
Write-Host "Step 8: Testing Frontend Build" -ForegroundColor Yellow
Write-Host "------------------------------" -ForegroundColor Gray

# Check if node_modules exists
if (Test-Path "$RootDir\node_modules") {
    Write-Host "✓ node_modules exists" -ForegroundColor Green
} else {
    Write-Host "⚠ node_modules missing - run 'npm install'" -ForegroundColor Yellow
    $issues += "node_modules not installed"
}

Write-Host ""
Write-Host "Step 9: Testing Backend Dependencies" -ForegroundColor Yellow
Write-Host "------------------------------------" -ForegroundColor Gray

# Check Python version
try {
    $pythonVersion = python --version 2>&1
    if ($pythonVersion -match "Python 3\.(9|10|11|12)") {
        Write-Host "✓ Python version compatible: $pythonVersion" -ForegroundColor Green
    } else {
        Write-Host "⚠ Python version may not be compatible: $pythonVersion" -ForegroundColor Yellow
    }
} catch {
    Write-Host "✗ Python not found" -ForegroundColor Red
    $issues += "Python not installed"
}

Write-Host ""
Write-Host "Step 10: Checking Git Repository" -ForegroundColor Yellow
Write-Host "--------------------------------" -ForegroundColor Gray

# Check git status
if (Test-Path "$RootDir\.git") {
    $gitStatus = git status --porcelain
    if ($gitStatus) {
        Write-Host "⚠ Uncommitted changes detected" -ForegroundColor Yellow
        Write-Host "  Files to commit: $($gitStatus.Count)" -ForegroundColor Gray
    } else {
        Write-Host "✓ Git repository clean" -ForegroundColor Green
    }
    
    # Check remote
    $gitRemote = git remote -v
    if ($gitRemote -match "github.com") {
        Write-Host "✓ GitHub remote configured" -ForegroundColor Green
    } else {
        Write-Host "⚠ GitHub remote not configured" -ForegroundColor Yellow
    }
} else {
    Write-Host "✗ Not a git repository" -ForegroundColor Red
    $issues += "Git not initialized"
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Validation Complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Summary
Write-Host "Summary:" -ForegroundColor White
Write-Host "--------" -ForegroundColor Gray
Write-Host "Issues Found: $($issues.Count)" -ForegroundColor $(if ($issues.Count -eq 0) { "Green" } else { "Yellow" })
Write-Host "Fixes Applied: $($fixes.Count)" -ForegroundColor $(if ($fixes.Count -gt 0) { "Green" } else { "Gray" })

if ($issues.Count -gt 0) {
    Write-Host ""
    Write-Host "Issues that need attention:" -ForegroundColor Yellow
    foreach ($issue in $issues) {
        Write-Host "  - $issue" -ForegroundColor Red
    }
}

if ($fixes.Count -gt 0) {
    Write-Host ""
    Write-Host "Fixes applied:" -ForegroundColor Green
    foreach ($fix in $fixes) {
        Write-Host "  + $fix" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "-----------" -ForegroundColor Gray

# Provide recommendations
if ($issues -match "node_modules") {
    Write-Host "1. Run 'npm install' to install frontend dependencies" -ForegroundColor White
}

if ($issues -match "env var") {
    Write-Host "2. Configure missing environment variables in backend\.env" -ForegroundColor White
}

if ($issues -match "Git") {
    Write-Host "3. Initialize git repository: git init" -ForegroundColor White
}

if ($gitStatus) {
    Write-Host "4. Commit pending changes: git add . ; git commit -m 'Updates'" -ForegroundColor White
}

Write-Host ""
Write-Host "To run full platform locally:" -ForegroundColor Cyan
Write-Host "  Frontend: npm run dev (or open index.html)" -ForegroundColor White
Write-Host "  Backend: cd backend ; python main.py" -ForegroundColor White

Write-Host ""
Write-Host "Repair and validation complete!" -ForegroundColor Green

# Create a report file
$reportPath = "$RootDir\validation_report_$(Get-Date -Format 'yyyyMMdd_HHmmss').txt"
@"
AuraQuant Platform Validation Report
Generated: $(Get-Date)
=====================================

Issues Found: $($issues.Count)
Fixes Applied: $($fixes.Count)

ISSUES:
$(if ($issues.Count -gt 0) { $issues -join "`r`n" } else { "None" })

FIXES:
$(if ($fixes.Count -gt 0) { $fixes -join "`r`n" } else { "None" })

STATUS: $(if ($issues.Count -eq 0) { "READY FOR DEPLOYMENT" } else { "NEEDS ATTENTION" })
"@ | Out-File $reportPath

Write-Host ""
Write-Host "Report saved to: $reportPath" -ForegroundColor Cyan