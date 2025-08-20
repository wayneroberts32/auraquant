# Database Setup Guide for AuraQuant

## Database Configuration

AuraQuant uses PostgreSQL for persistent data storage and Redis for caching and real-time data.

### Option 1: Local Development (Recommended for Testing)

#### PostgreSQL Local Setup

1. **Using SQLite (Simplest for Development)**
   ```bash
   # No installation needed - SQLite is file-based
   # Update your .env file:
   DATABASE_URL=sqlite:///./auraquant.db
   ```

2. **Using PostgreSQL Docker**
   ```bash
   # Run PostgreSQL in Docker
   docker run --name auraquant-postgres \
     -e POSTGRES_PASSWORD=yourpassword \
     -e POSTGRES_USER=auraquant \
     -e POSTGRES_DB=auraquant \
     -p 5432:5432 \
     -d postgres:15
   
   # Update your .env file:
   DATABASE_URL=postgresql://auraquant:yourpassword@localhost:5432/auraquant
   ```

#### Redis Local Setup

```bash
# Using Docker
docker run --name auraquant-redis \
  -p 6379:6379 \
  -d redis:7-alpine

# Update your .env file:
REDIS_URL=redis://localhost:6379
```

### Option 2: Cloud Databases (Production)

#### Free PostgreSQL Options

1. **Supabase (Recommended - Free Tier)**
   - Go to https://supabase.com
   - Create a new project
   - Get your database URL from Settings > Database
   - Update .env:
     ```
     DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
     ```

2. **Neon (Free Tier)**
   - Go to https://neon.tech
   - Create a new database
   - Copy the connection string
   - Update .env:
     ```
     DATABASE_URL=postgresql://[username]:[password]@[hostname]/[database]?sslmode=require
     ```

3. **ElephantSQL (Free Tiny Turtle Plan)**
   - Go to https://elephantsql.com
   - Create a new instance (Tiny Turtle - Free)
   - Copy the URL from details page
   - Update .env:
     ```
     DATABASE_URL=postgresql://[username]:[password]@[server]/[database]
     ```

4. **Render PostgreSQL (Free for 90 days)**
   - Go to https://render.com
   - Create a new PostgreSQL database
   - Copy the External Database URL
   - Update .env:
     ```
     DATABASE_URL=[External Database URL from Render]
     ```

#### Free Redis Options

1. **Upstash Redis (Recommended - Free Tier)**
   - Go to https://upstash.com
   - Create a new Redis database
   - Copy the Redis REST URL
   - Update .env:
     ```
     REDIS_URL=redis://default:[password]@[endpoint]:6379
     ```

2. **Redis Cloud (Free 30MB)**
   - Go to https://redis.com/try-free/
   - Create a new database
   - Get connection details
   - Update .env:
     ```
     REDIS_URL=redis://default:[password]@[endpoint]:[port]
     ```

3. **Railway Redis (Free Trial)**
   - Go to https://railway.app
   - Deploy Redis
   - Get the connection URL
   - Update .env:
     ```
     REDIS_URL=[REDIS_URL from Railway]
     ```

### Option 3: No Database (File-Based)

For simplest setup without any database:

```python
# Update .env:
DATABASE_URL=sqlite:///./auraquant.db
REDIS_URL=memory://  # Uses in-memory cache

# Or use JSON file storage:
USE_FILE_STORAGE=true
DATA_DIR=./data
```

## Quick Start (Easiest Setup)

1. **For immediate testing without any setup:**
   ```bash
   # Add to your .env file:
   DATABASE_URL=sqlite:///./auraquant.db
   REDIS_URL=memory://
   ```

2. **For production with free cloud services:**
   ```bash
   # Sign up for Supabase (PostgreSQL) and Upstash (Redis)
   # Add to your .env file:
   DATABASE_URL=[Supabase connection string]
   REDIS_URL=[Upstash connection string]
   ```

## Database Initialization

Once configured, initialize the database:

```bash
# From the backend directory
cd backend

# Initialize database tables
python -c "from app import init_database; init_database()"

# Or run migrations (if using Alembic)
alembic upgrade head
```

## Connection Testing

Test your database connections:

```python
# test_db.py
import os
from dotenv import load_dotenv

load_dotenv()

# Test PostgreSQL
from sqlalchemy import create_engine
db_url = os.getenv('DATABASE_URL', 'sqlite:///./auraquant.db')
engine = create_engine(db_url)
print(f"PostgreSQL connected: {engine.connect()}")

# Test Redis (if not using memory://)
if not os.getenv('REDIS_URL', '').startswith('memory://'):
    import redis
    r = redis.from_url(os.getenv('REDIS_URL'))
    r.ping()
    print("Redis connected!")
```

## Fallback Configuration

The system automatically falls back to file-based storage if databases are unavailable:

```python
# backend/core/database.py handles fallback:
- SQLite for PostgreSQL fallback
- In-memory dict for Redis fallback
- JSON files for persistent cache
```

## Environment Variables Summary

Add to your `.env` file:

```bash
# Option 1: Local/Development (No external services needed)
DATABASE_URL=sqlite:///./auraquant.db
REDIS_URL=memory://

# Option 2: Free Cloud Services
DATABASE_URL=postgresql://user:pass@host/db  # From Supabase/Neon/ElephantSQL
REDIS_URL=redis://default:pass@host:6379     # From Upstash/Redis Cloud

# Option 3: Docker Local
DATABASE_URL=postgresql://auraquant:password@localhost:5432/auraquant
REDIS_URL=redis://localhost:6379
```

## Troubleshooting

1. **"DATABASE_URL not found"**
   - The system will automatically use SQLite: `sqlite:///./auraquant.db`

2. **"REDIS_URL not found"**
   - The system will use in-memory caching

3. **"Connection refused"**
   - Check if services are running
   - Verify firewall/network settings
   - Ensure correct ports are open

4. **SSL/TLS errors**
   - Add `?sslmode=require` to PostgreSQL URL
   - Some services require SSL by default

## Support

For issues or questions:
- Check logs in `backend/logs/`
- Review connection strings in `.env`
- Test with simple SQLite first
- Use cloud free tiers for production
