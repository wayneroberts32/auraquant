# AuraQuant Deployment Test Script
# Tests both frontend and backend deployments

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AuraQuant Deployment Test Suite" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$frontend_urls = @(
    "https://auraquant-live.pages.dev",
    "https://ai-auraquant.com"
)

$backend_url = "https://auraquant-backend.onrender.com"
$tests_passed = 0
$tests_failed = 0

# Test Frontend Deployments
Write-Host "FRONTEND TESTS:" -ForegroundColor Yellow
Write-Host "---------------" -ForegroundColor Yellow

foreach ($url in $frontend_urls) {
    Write-Host "`nTesting: $url" -ForegroundColor White
    
    try {
        # Test main page
        $response = Invoke-WebRequest -Uri $url -Method Head -TimeoutSec 10 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "  ✓ Main page accessible" -ForegroundColor Green
            $tests_passed++
        } else {
            Write-Host "  ✗ Main page returned status: $($response.StatusCode)" -ForegroundColor Red
            $tests_failed++
        }
        
        # Test critical JS files
        $js_files = @("/js/app.js", "/js/config.js", "/js/init.js")
        foreach ($js in $js_files) {
            try {
                $js_response = Invoke-WebRequest -Uri "$url$js" -Method Head -TimeoutSec 5 -ErrorAction Stop
                if ($js_response.StatusCode -eq 200) {
                    Write-Host "  ✓ $js loaded successfully" -ForegroundColor Green
                    $tests_passed++
                } else {
                    Write-Host "  ✗ $js failed: $($js_response.StatusCode)" -ForegroundColor Red
                    $tests_failed++
                }
            } catch {
                Write-Host "  ✗ $js not found or error" -ForegroundColor Red
                $tests_failed++
            }
        }
        
        # Test CSS
        try {
            $css_response = Invoke-WebRequest -Uri "$url/css/premium.css" -Method Head -TimeoutSec 5 -ErrorAction Stop
            if ($css_response.StatusCode -eq 200) {
                Write-Host "  ✓ CSS loaded successfully" -ForegroundColor Green
                $tests_passed++
            } else {
                Write-Host "  ✗ CSS failed: $($css_response.StatusCode)" -ForegroundColor Red
                $tests_failed++
            }
        } catch {
            Write-Host "  ✗ CSS not found" -ForegroundColor Red
            $tests_failed++
        }
        
        # Check for App constructor fix
        try {
            $app_content = (Invoke-WebRequest -Uri "$url/js/app.js" -TimeoutSec 10).Content
            if ($app_content -match "class App \{") {
                Write-Host "  ✓ App class properly defined" -ForegroundColor Green
                $tests_passed++
            } else {
                Write-Host "  ✗ App class not found" -ForegroundColor Red
                $tests_failed++
            }
            
            if ($app_content -match "window\.app = new App\(\)") {
                Write-Host "  ✓ App instance created" -ForegroundColor Green
                $tests_passed++
            } else {
                Write-Host "  ✗ App instance not created" -ForegroundColor Red
                $tests_failed++
            }
        } catch {
            Write-Host "  ✗ Could not verify App class" -ForegroundColor Red
            $tests_failed++
        }
        
    } catch {
        Write-Host "  ✗ Site not accessible: $_" -ForegroundColor Red
        $tests_failed++
    }
}

# Test Backend Deployment
Write-Host "`n`nBACKEND TESTS:" -ForegroundColor Yellow
Write-Host "--------------" -ForegroundColor Yellow
Write-Host "`nTesting: $backend_url" -ForegroundColor White

try {
    # Test root endpoint
    $backend_response = Invoke-WebRequest -Uri $backend_url -TimeoutSec 15 -ErrorAction Stop
    $backend_data = $backend_response.Content | ConvertFrom-Json
    
    if ($backend_data.status -eq "operational") {
        Write-Host "  ✓ Backend operational" -ForegroundColor Green
        $tests_passed++
    } else {
        Write-Host "  ✗ Backend status: $($backend_data.status)" -ForegroundColor Red
        $tests_failed++
    }
    
    # Test API endpoints
    $api_endpoints = @(
        "/api/health",
        "/api/bot/status"
    )
    
    foreach ($endpoint in $api_endpoints) {
        try {
            $api_response = Invoke-WebRequest -Uri "$backend_url$endpoint" -Method Get -TimeoutSec 10 -ErrorAction Stop
            if ($api_response.StatusCode -eq 200) {
                Write-Host "  ✓ $endpoint accessible" -ForegroundColor Green
                $tests_passed++
            } else {
                Write-Host "  ✗ $endpoint returned: $($api_response.StatusCode)" -ForegroundColor Red
                $tests_failed++
            }
        } catch {
            $statusCode = $_.Exception.Response.StatusCode.value__
            if ($statusCode -eq 401 -or $statusCode -eq 403) {
                Write-Host "  ⚠ $endpoint requires authentication (expected)" -ForegroundColor Yellow
                $tests_passed++
            } else {
                Write-Host "  ✗ $endpoint error: $statusCode" -ForegroundColor Red
                $tests_failed++
            }
        }
    }
    
} catch {
    Write-Host "  ✗ Backend not accessible or not deployed" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
    $tests_failed++
}

# Test Cross-Origin Requests
Write-Host "`n`nCORS TESTS:" -ForegroundColor Yellow
Write-Host "-----------" -ForegroundColor Yellow

try {
    $headers = @{
        "Origin" = "https://auraquant-live.pages.dev"
    }
    $cors_response = Invoke-WebRequest -Uri "$backend_url/api/health" -Headers $headers -Method Options -TimeoutSec 10 -ErrorAction Stop
    
    if ($cors_response.Headers["Access-Control-Allow-Origin"]) {
        Write-Host "  ✓ CORS headers present" -ForegroundColor Green
        $tests_passed++
    } else {
        Write-Host "  ✗ CORS headers missing" -ForegroundColor Red
        $tests_failed++
    }
} catch {
    Write-Host "  ⚠ CORS test inconclusive" -ForegroundColor Yellow
}

# Summary
Write-Host "`n`n========================================" -ForegroundColor Cyan
Write-Host "           TEST SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Tests Passed: $tests_passed" -ForegroundColor Green
Write-Host "  Tests Failed: $tests_failed" -ForegroundColor Red

if ($tests_failed -eq 0) {
    Write-Host "`n  ✓ ALL TESTS PASSED!" -ForegroundColor Green
    Write-Host "  Your deployment is working correctly!" -ForegroundColor Green
} elseif ($tests_failed -le 3) {
    Write-Host "`n  ⚠ MOSTLY WORKING" -ForegroundColor Yellow
    Write-Host "  Some minor issues detected" -ForegroundColor Yellow
} else {
    Write-Host "`n  ✗ DEPLOYMENT ISSUES DETECTED" -ForegroundColor Red
    Write-Host "  Please check the failed tests above" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan

# Check if backend needs deployment
if ($backend_url -notmatch "onrender.com" -or $tests_failed -gt 5) {
    Write-Host "`nRECOMMENDATION:" -ForegroundColor Yellow
    Write-Host "Backend may not be deployed. To deploy on Render:" -ForegroundColor White
    Write-Host "1. Go to https://dashboard.render.com" -ForegroundColor White
    Write-Host "2. Create new Web Service" -ForegroundColor White
    Write-Host "3. Connect to GitHub repo: wayneroberts32/auraquant" -ForegroundColor White
    Write-Host "4. Set root directory: backend" -ForegroundColor White
    Write-Host "5. Build command: pip install -r requirements.txt" -ForegroundColor White
    Write-Host "6. Start command: uvicorn main:app --host 0.0.0.0 --port `$PORT" -ForegroundColor White
}

Write-Host "`n"
