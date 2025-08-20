@echo off
echo =====================================
echo  Cloudflare Pages Manual Deployment
echo =====================================
echo.

REM Check if API token is set
if "%CLOUDFLARE_API_TOKEN%"=="" (
    echo ERROR: CLOUDFLARE_API_TOKEN not set!
    echo.
    echo Please set your Cloudflare API token:
    echo   1. Go to https://dash.cloudflare.com/profile/api-tokens
    echo   2. Create a token with "Cloudflare Pages:Edit" permission
    echo   3. Run: set CLOUDFLARE_API_TOKEN=your-token-here
    echo   4. Then run this script again
    echo.
    pause
    exit /b 1
)

echo Using API token for authentication...
echo.

REM Deploy to Cloudflare Pages
echo Deploying to Cloudflare Pages...
npx wrangler pages deploy . --project-name=auraquant-frontend --branch=main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo =====================================
    echo  Deployment Successful!
    echo =====================================
    echo Your site should be live at:
    echo   https://auraquant-frontend.pages.dev
    echo   https://ai-auraquant.com (if custom domain is configured)
) else (
    echo.
    echo =====================================
    echo  Deployment Failed!
    echo =====================================
    echo Please check the error messages above.
)

echo.
pause
