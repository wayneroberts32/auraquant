# AuraQuant V7 Assessment Script - Following Golden Rule
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "AuraQuant V7 Build Assessment" -ForegroundColor Cyan
Write-Host "Following FINAL_BUILD_FIRST.zip Golden Rule" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$RootDir = "D:\AuraQuant_Rich_Bot\Warp\AuraQuant"
$BuildTasks = @()
$CompletedTasks = @()

# Phase 1: Check Frontend Components
Write-Host "Phase 1: Frontend Components" -ForegroundColor Yellow
Write-Host "----------------------------" -ForegroundColor Gray

$components = @{
    "index.html" = "Main Dashboard"
    "help.html" = "Help Centre"
    "plus500_mimic.html" = "Plus500 Mimic Interface"
    "tradingview_dashboard.html" = "TradingView Dashboard"
    "warrior_screener.html" = "Warrior Trading Screener"
    "risk_hub.html" = "Risk Hub"
    "compliance_hub.html" = "Compliance Hub"
    "projection_panels.html" = "Projection Panels"
    "ai_dashboard.html" = "AI Dashboard Hub"
    "codex.html" = "Codex Integration"
}

foreach ($file in $components.Keys) {
    $path = Join-Path $RootDir $file
    if (Test-Path $path) {
        Write-Host "[OK] $($components[$file])" -ForegroundColor Green
        $CompletedTasks += $components[$file]
    } else {
        Write-Host "[MISSING] $($components[$file])" -ForegroundColor Red
        $BuildTasks += $components[$file]
    }
}

# Phase 2: Check Backend Systems
Write-Host ""
Write-Host "Phase 2: Backend Systems" -ForegroundColor Yellow
Write-Host "------------------------" -ForegroundColor Gray

$backend = @{
    "backend\main.py" = "Main API"
    "backend\core\bot_engine.py" = "Bot Engine"
    "backend\core\infinity_engine.py" = "Infinity Engine"
    "backend\core\risk_manager.py" = "Risk Manager"
    "backend\core\vault.py" = "Vault Manager"
    "backend\webhooks\webhook_handler.py" = "Webhook Handler"
    "backend\strategies\quantum_infinity.py" = "Quantum Strategy"
    "backend\engine\trading_core.py" = "Trading Core"
    "backend\engine\strategy_innovation.py" = "Strategy Innovation"
    "backend\engine\self_heal.py" = "Self-Heal System"
    "backend\compliance\global_rules.py" = "Global Compliance"
    "backend\research\ingestion.py" = "Research Ingestion"
}

foreach ($file in $backend.Keys) {
    $path = Join-Path $RootDir $file
    if (Test-Path $path) {
        Write-Host "[OK] $($backend[$file])" -ForegroundColor Green
        $CompletedTasks += $backend[$file]
    } else {
        Write-Host "[MISSING] $($backend[$file])" -ForegroundColor Red
        $BuildTasks += $backend[$file]
        
        # Create directory if needed
        $dir = Split-Path $path -Parent
        if (!(Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
        }
    }
}

# Phase 3: Check JavaScript Modules
Write-Host ""
Write-Host "Phase 3: JavaScript Modules" -ForegroundColor Yellow
Write-Host "---------------------------" -ForegroundColor Gray

$jsModules = @{
    "js\app.js" = "App Controller"
    "js\config.js" = "Configuration"
    "js\main.js" = "Main Entry"
    "js\websocket.js" = "WebSocket"
    "js\trading.js" = "Trading Module"
    "js\screener.js" = "Screener Module"
    "js\charts.js" = "Charts Module"
    "js\ai.js" = "AI Module"
    "js\social.js" = "Social Module"
    "js\backup.js" = "Backup Module"
    "js\timezone.js" = "Timezone Module"
}

foreach ($file in $jsModules.Keys) {
    $path = Join-Path $RootDir $file
    if (Test-Path $path) {
        Write-Host "[OK] $($jsModules[$file])" -ForegroundColor Green
        $CompletedTasks += $jsModules[$file]
    } else {
        Write-Host "[MISSING] $($jsModules[$file])" -ForegroundColor Red
        $BuildTasks += $jsModules[$file]
    }
}

# Phase 4: Check Data & Assets
Write-Host ""
Write-Host "Phase 4: Data & Assets" -ForegroundColor Yellow
Write-Host "----------------------" -ForegroundColor Gray

$assets = @{
    "data\warrior_screeners.csv" = "Warrior Screeners"
    "assets\logo.svg" = "Logo"
    "css\premium.css" = "Premium CSS"
    "css\styles.css" = "Main Styles"
}

foreach ($file in $assets.Keys) {
    $path = Join-Path $RootDir $file
    if (Test-Path $path) {
        Write-Host "[OK] $($assets[$file])" -ForegroundColor Green
        $CompletedTasks += $assets[$file]
    } else {
        Write-Host "[MISSING] $($assets[$file])" -ForegroundColor Red
        $BuildTasks += $assets[$file]
    }
}

# Calculate completion
$total = $CompletedTasks.Count + $BuildTasks.Count
$percent = if ($total -gt 0) { [math]::Round(($CompletedTasks.Count / $total) * 100, 2) } else { 0 }

# Generate Reports
Write-Host ""
Write-Host "Generating Reports..." -ForegroundColor Yellow

# Create ReadinessReport.md
$readiness = @"
# AuraQuant V7 Readiness Report
Generated: $(Get-Date)

## Summary
Total Components: $total
Completed: $($CompletedTasks.Count)
Pending: $($BuildTasks.Count)
Completion: $percent%

## Status
$(if ($percent -eq 100) { "READY FOR DEPLOYMENT" } else { "NOT READY - Build Incomplete" })

## Pending Tasks
$(if ($BuildTasks.Count -gt 0) { $BuildTasks | ForEach-Object { "* $_" } | Out-String } else { "None" })
"@

$readiness | Out-File "$RootDir\ReadinessReport.md" -Force

# Create HealthCheck.md
$health = @"
# AuraQuant V7 Health Check
Generated: $(Get-Date)

## System Components
Frontend: $(if (Test-Path "$RootDir\index.html") { "OK" } else { "FAIL" })
Backend: $(if (Test-Path "$RootDir\backend\main.py") { "OK" } else { "FAIL" })
Database: $(if (Test-Path "$RootDir\backend\.env") { "Configured" } else { "Not Configured" })
WebSocket: $(if (Test-Path "$RootDir\js\websocket.js") { "OK" } else { "FAIL" })

## Overall Status
$(if ($percent -eq 100) { "HEALTHY" } else { "DEGRADED - $($BuildTasks.Count) components missing" })
"@

$health | Out-File "$RootDir\HealthCheck.md" -Force

# Summary
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Assessment Complete" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Summary:" -ForegroundColor White
Write-Host "  Total: $total components" -ForegroundColor White
Write-Host "  Completed: $($CompletedTasks.Count)" -ForegroundColor Green
Write-Host "  Missing: $($BuildTasks.Count)" -ForegroundColor Red
Write-Host "  Progress: $percent%" -ForegroundColor $(if ($percent -eq 100) { "Green" } else { "Yellow" })

if ($BuildTasks.Count -gt 0) {
    Write-Host ""
    Write-Host "V7 GOLDEN RULE:" -ForegroundColor Red
    Write-Host "  BUILD ALL missing parts BEFORE deployment" -ForegroundColor Yellow
    Write-Host "  No deployment until 100% complete" -ForegroundColor Yellow
    Write-Host "  Wayne's approval required after completion" -ForegroundColor Yellow
    
    Write-Host ""
    Write-Host "Priority Missing Components:" -ForegroundColor Red
    $BuildTasks | Select-Object -First 5 | ForEach-Object {
        Write-Host "  - $_" -ForegroundColor White
    }
} else {
    Write-Host ""
    Write-Host "BUILD COMPLETE - Ready for Wayne's approval!" -ForegroundColor Green
}

Write-Host ""
Write-Host "Reports saved:" -ForegroundColor Cyan
Write-Host "  ReadinessReport.md" -ForegroundColor White
Write-Host "  HealthCheck.md" -ForegroundColor White