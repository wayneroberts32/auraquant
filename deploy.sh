#!/bin/bash
# AuraQuant Platform Deployment Script
# Deploys both backend (Render) and frontend (Cloudflare)

set -e

echo "🚀 AuraQuant Platform Deployment Starting..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if required tools are installed
check_requirements() {
    echo "📋 Checking requirements..."
    
    # Check Git
    if ! command -v git &> /dev/null; then
        echo -e "${RED}❌ Git is not installed${NC}"
        exit 1
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js is not installed${NC}"
        exit 1
    fi
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        echo -e "${RED}❌ Python 3 is not installed${NC}"
        exit 1
    fi
    
    # Check Wrangler (Cloudflare CLI)
    if ! command -v wrangler &> /dev/null; then
        echo -e "${YELLOW}⚠️  Wrangler not found. Installing...${NC}"
        npm install -g wrangler
    fi
    
    echo -e "${GREEN}✅ All requirements met${NC}"
}

# Deploy Backend to Render
deploy_backend() {
    echo "🔧 Deploying Backend to Render..."
    
    cd backend
    
    # Create requirements.txt if not exists
    if [ ! -f requirements.txt ]; then
        echo "Creating requirements.txt..."
        cat > requirements.txt << EOF
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
EOF
    fi
    
    # Initialize git if needed
    if [ ! -d .git ]; then
        git init
        git add .
        git commit -m "Initial backend commit"
    fi
    
    # Create Render blueprint
    echo -e "${YELLOW}📝 Note: Manual steps required for Render:${NC}"
    echo "1. Go to https://dashboard.render.com"
    echo "2. Create a new Web Service"
    echo "3. Connect your GitHub/GitLab repository"
    echo "4. Use the render.yaml blueprint"
    echo "5. Add environment variables in Render dashboard:"
    echo "   - All API keys (BINANCE_API_KEY, etc.)"
    echo "   - Database credentials"
    echo "   - JWT_SECRET and ENCRYPTION_KEY"
    
    cd ..
}

# Deploy Frontend to Cloudflare
deploy_frontend() {
    echo "☁️ Deploying Frontend to Cloudflare..."
    
    # Install dependencies
    if [ ! -d node_modules ]; then
        echo "Installing dependencies..."
        npm install
    fi
    
    # Build the project
    echo "Building frontend..."
    npm run build || true
    
    # Login to Cloudflare
    echo -e "${YELLOW}📝 Cloudflare login required${NC}"
    wrangler login
    
    # Create KV namespaces if they don't exist
    echo "Creating KV namespaces..."
    wrangler kv:namespace create "SETTINGS_KV" || true
    wrangler kv:namespace create "CACHE_KV" || true
    
    # Create R2 bucket
    echo "Creating R2 bucket..."
    wrangler r2 bucket create auraquant-backups || true
    
    # Deploy to Cloudflare
    echo "Deploying to Cloudflare Workers..."
    wrangler deploy --env production
    
    # Set secrets
    echo -e "${YELLOW}📝 Setting up secrets...${NC}"
    echo "Run these commands to add your API keys:"
    echo "wrangler secret put ALPACA_API_KEY"
    echo "wrangler secret put BINANCE_API_KEY"
    echo "wrangler secret put OPENAI_API_KEY"
    echo "# ... add all other API keys"
}

# Setup local environment
setup_local() {
    echo "🏠 Setting up local environment..."
    
    # Create .env file if not exists
    if [ ! -f .env ]; then
        echo "Creating .env file..."
        cat > .env << EOF
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
EOF
        echo -e "${GREEN}✅ .env file created. Please add your API keys.${NC}"
    fi
}

# Main deployment flow
main() {
    echo "Select deployment option:"
    echo "1) Deploy Backend (Render)"
    echo "2) Deploy Frontend (Cloudflare)"
    echo "3) Deploy Both"
    echo "4) Setup Local Environment"
    echo "5) Full Setup (Local + Deploy)"
    
    read -p "Enter choice [1-5]: " choice
    
    check_requirements
    
    case $choice in
        1)
            deploy_backend
            ;;
        2)
            deploy_frontend
            ;;
        3)
            deploy_backend
            deploy_frontend
            ;;
        4)
            setup_local
            ;;
        5)
            setup_local
            deploy_backend
            deploy_frontend
            ;;
        *)
            echo -e "${RED}Invalid choice${NC}"
            exit 1
            ;;
    esac
    
    echo -e "${GREEN}🎉 Deployment process complete!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Add your API keys to the .env file"
    echo "2. Configure API keys in Render dashboard"
    echo "3. Add secrets to Cloudflare using wrangler"
    echo "4. Update DNS settings to point to Cloudflare"
    echo "5. Test the webhook endpoints"
    echo ""
    echo "Access your platform:"
    echo "Frontend: https://auraquant.com (after DNS setup)"
    echo "Backend API: https://auraquant-backend.onrender.com"
    echo "Webhooks: https://auraquant-webhooks.onrender.com"
}

# Run main function
main
