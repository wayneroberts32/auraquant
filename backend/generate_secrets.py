#!/usr/bin/env python3
"""
Generate secure secret keys for AuraQuant .env configuration
"""

import secrets
import string
import os
from pathlib import Path

def generate_secret_key(length=64):
    """Generate a cryptographically secure secret key"""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(alphabet) for _ in range(length))

def generate_webhook_token(length=32):
    """Generate a secure webhook token"""
    return secrets.token_urlsafe(length)

def update_env_file():
    """Update .env file with generated secrets"""
    env_path = Path(__file__).parent / '.env'
    
    if not env_path.exists():
        print(f"❌ .env file not found at {env_path}")
        return
    
    # Generate new secrets
    secret_key = generate_secret_key(64)
    jwt_secret = generate_secret_key(64)
    webhook_token = generate_webhook_token(32)
    
    # Read current .env
    with open(env_path, 'r') as f:
        lines = f.readlines()
    
    # Update placeholders
    updated_lines = []
    for line in lines:
        if line.startswith('SECRET_KEY=') and 'your-secret-key-here' in line:
            updated_lines.append(f'SECRET_KEY={secret_key}\n')
            print(f"✅ Generated SECRET_KEY")
        elif line.startswith('JWT_SECRET_KEY=') and 'your-jwt-secret-key-here' in line:
            updated_lines.append(f'JWT_SECRET_KEY={jwt_secret}\n')
            print(f"✅ Generated JWT_SECRET_KEY")
        elif line.startswith('WEBHOOK_SECRET_TOKEN=') and 'generate-strong-webhook-secret' in line:
            updated_lines.append(f'WEBHOOK_SECRET_TOKEN={webhook_token}\n')
            print(f"✅ Generated WEBHOOK_SECRET_TOKEN")
        else:
            updated_lines.append(line)
    
    # Write updated .env
    with open(env_path, 'w') as f:
        f.writelines(updated_lines)
    
    print("\n✅ Secret keys have been generated and saved to .env")
    print("\n⚠️  IMPORTANT: Keep these secrets secure and never commit .env to git!")
    
    # Create .env.example if it doesn't exist
    example_path = env_path.parent / '.env.example'
    if not example_path.exists():
        with open(env_path, 'r') as f:
            content = f.read()
        
        # Replace sensitive values with placeholders
        import re
        
        # Patterns to replace
        patterns = [
            (r'OPENAI_API_KEY=sk-proj-.*', 'OPENAI_API_KEY=your-openai-api-key'),
            (r'DISCORD_BOT_TOKEN=.*', 'DISCORD_BOT_TOKEN=your-discord-bot-token'),
            (r'CLOUDFLARE_API_TOKEN=.*', 'CLOUDFLARE_API_TOKEN=your-cloudflare-token'),
            (r'ONEDRIVE_PASSWORD=.*', 'ONEDRIVE_PASSWORD=your-onedrive-password'),
            (r'SECRET_KEY=.*', 'SECRET_KEY=generate-a-strong-secret-key'),
            (r'JWT_SECRET_KEY=.*', 'JWT_SECRET_KEY=generate-a-strong-jwt-key'),
            (r'WEBHOOK_SECRET_TOKEN=.*', 'WEBHOOK_SECRET_TOKEN=generate-a-webhook-token'),
        ]
        
        example_content = content
        for pattern, replacement in patterns:
            example_content = re.sub(pattern, replacement, example_content)
        
        with open(example_path, 'w') as f:
            f.write(example_content)
        
        print(f"\n✅ Created .env.example for version control")

if __name__ == "__main__":
    print("🔐 AuraQuant Secret Key Generator")
    print("=" * 40)
    
    update_env_file()
    
    print("\n📝 Next steps:")
    print("1. Review the .env file and add any missing API keys")
    print("2. Update broker API keys when you receive them")
    print("3. Set up Gmail App Password for email notifications")
    print("4. Configure database connection string if using PostgreSQL")
    print("5. Never commit .env to version control!")
