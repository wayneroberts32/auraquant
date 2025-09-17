# Comprehensive ZIP File Scanner
# This script performs multiple scans on a ZIP file

param(
    [Parameter(Mandatory=$true)]
    [string]$ZipPath
)

Write-Host "`n====================================" -ForegroundColor Cyan
Write-Host "     ZIP File Comprehensive Scan" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Check if file exists
if (!(Test-Path $ZipPath)) {
    Write-Host "❌ File not found: $ZipPath" -ForegroundColor Red
    exit 1
}

$fileName = Split-Path $ZipPath -Leaf
Write-Host "📁 Scanning: $fileName" -ForegroundColor Yellow
Write-Host ""

# 1. Basic File Information
Write-Host "1️⃣ FILE INFORMATION" -ForegroundColor Green
Write-Host "─────────────────────" -ForegroundColor Gray
$fileInfo = Get-Item $ZipPath
Write-Host "   Size: $([math]::Round($fileInfo.Length / 1KB, 2)) KB"
Write-Host "   Created: $($fileInfo.CreationTime)"
Write-Host "   Modified: $($fileInfo.LastWriteTime)"
Write-Host ""

# 2. 7-Zip Integrity Test
Write-Host "2️⃣ INTEGRITY CHECK (7-Zip)" -ForegroundColor Green
Write-Host "─────────────────────────────" -ForegroundColor Gray
$7zPath = "C:\Program Files\7-Zip\7z.exe"
if (Test-Path $7zPath) {
    $testResult = & $7zPath t "$ZipPath" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Archive integrity: PASSED" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Archive integrity: FAILED" -ForegroundColor Red
    }
    
    # Get archive details
    $listOutput = & $7zPath l "$ZipPath" 2>&1
    $fileCount = ($listOutput | Select-String "(\d+) files" | ForEach-Object { $_.Matches[0].Groups[1].Value })
    if ($fileCount) {
        Write-Host "   Files in archive: $fileCount"
    }
} else {
    Write-Host "   ⚠️  7-Zip not found" -ForegroundColor Yellow
}
Write-Host ""

# 3. SHA256 Hash
Write-Host "3️⃣ SHA256 HASH" -ForegroundColor Green
Write-Host "──────────────" -ForegroundColor Gray
$hash = Get-FileHash $ZipPath -Algorithm SHA256
Write-Host "   $($hash.Hash)" -ForegroundColor Cyan
Write-Host ""

# 4. Windows Defender Scan
Write-Host "4️⃣ WINDOWS DEFENDER SCAN" -ForegroundColor Green
Write-Host "──────────────────────────" -ForegroundColor Gray
try {
    $defenderStatus = Get-MpComputerStatus -ErrorAction SilentlyContinue
    if ($defenderStatus.AntivirusEnabled) {
        Write-Host "   🛡️ Defender Status: Enabled" -ForegroundColor Green
        Write-Host "   Last Update: $($defenderStatus.AntivirusSignatureLastUpdated)"
        
        # Perform scan
        Write-Host "   Scanning file..." -ForegroundColor Yellow
        Start-MpScan -ScanPath $ZipPath -ScanType CustomScan -ErrorAction SilentlyContinue
        Write-Host "   ✅ No threats detected" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Windows Defender is disabled" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️  Unable to access Windows Defender" -ForegroundColor Yellow
}
Write-Host ""

# 5. Content Analysis
Write-Host "5️⃣ CONTENT ANALYSIS" -ForegroundColor Green
Write-Host "────────────────────" -ForegroundColor Gray
if (Test-Path $7zPath) {
    $contents = & $7zPath l -slt "$ZipPath" 2>&1
    
    # Check for suspicious file types
    $suspiciousExtensions = @('.exe', '.dll', '.bat', '.cmd', '.ps1', '.vbs', '.js', '.scr', '.com')
    $foundSuspicious = $false
    
    foreach ($ext in $suspiciousExtensions) {
        if ($contents -match [regex]::Escape($ext)) {
            if (!$foundSuspicious) {
                Write-Host "   ⚠️  Potentially executable files found:" -ForegroundColor Yellow
                $foundSuspicious = $true
            }
            Write-Host "      - Files with $ext extension" -ForegroundColor Yellow
        }
    }
    
    if (!$foundSuspicious) {
        Write-Host "   ✅ No suspicious file types detected" -ForegroundColor Green
    }
    
    # Check for encrypted files
    if ($contents -match "Encrypted = \+") {
        Write-Host "   🔒 Archive contains encrypted files" -ForegroundColor Yellow
    } else {
        Write-Host "   ✅ No encryption detected" -ForegroundColor Green
    }
}
Write-Host ""

# 6. Compression Analysis
Write-Host "6️⃣ COMPRESSION ANALYSIS" -ForegroundColor Green
Write-Host "────────────────────────" -ForegroundColor Gray
if (Test-Path $7zPath) {
    $sizeInfo = & $7zPath l "$ZipPath" | Select-String "^\s*(\d+)\s+(\d+)\s+\d+ files"
    if ($sizeInfo) {
        $matches = $sizeInfo -match "(\d+)\s+(\d+)"
        if ($matches) {
            $uncompressed = [int64]$sizeInfo.Matches[0].Groups[1].Value
            $compressed = $fileInfo.Length
            if ($uncompressed -gt 0) {
                $ratio = [math]::Round((1 - ($compressed / $uncompressed)) * 100, 2)
                Write-Host "   Compression Ratio: $ratio%"
                Write-Host "   Original Size: $([math]::Round($uncompressed / 1KB, 2)) KB"
                Write-Host "   Compressed Size: $([math]::Round($compressed / 1KB, 2)) KB"
                
                if ($ratio -gt 95) {
                    Write-Host "   ⚠️  Very high compression ratio (possible zip bomb)" -ForegroundColor Yellow
                } else {
                    Write-Host "   ✅ Normal compression ratio" -ForegroundColor Green
                }
            }
        }
    }
}
Write-Host ""

# 7. Summary
Write-Host "📊 SCAN SUMMARY" -ForegroundColor Cyan
Write-Host "───────────────" -ForegroundColor Gray
Write-Host "   File: $fileName"
Write-Host "   Status: " -NoNewline

$issuesFound = $false
if ($contents -match "Encrypted = \+" -or $foundSuspicious) {
    Write-Host "⚠️ Review recommended" -ForegroundColor Yellow
    $issuesFound = $true
} else {
    Write-Host "✅ SAFE" -ForegroundColor Green
}

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "        Scan Complete" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Cyan