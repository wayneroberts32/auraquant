"""
Import Credentials to API Vault
This script imports usernames and passwords from the Usernames.txt file
"""

import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent))

from core.api_vault import APIVault

def import_credentials():
    """Import credentials from Usernames.txt to API vault"""
    
    # Initialize vault
    vault = APIVault()
    
    # Credentials to import (parsed from Usernames.txt)
    credentials = [
        {
            "service": "Claude",
            "username": "wayneroberts32@gmail.com",
            "password": "Zeke29072@22",
            "org_id": "3f16aab1-34cf-4925-985d-b93484d30fd0",
            "key_type": "user_credentials"
        },
        {
            "service": "DeepSeek",
            "username": "wayneroberts32@gmail.com",
            "password": "Zeke29@72@22",
            "key_type": "user_credentials"
        },
        {
            "service": "ChatGPT",
            "username": "wayneroberts32@outlook.com.au",
            "password": "Zeke29072@22",
            "key_type": "user_credentials"
        },
        {
            "service": "Copilot",
            "username": "wayneroberts32@outlook.com.au",
            "password": "Zeke29072@22",
            "key_type": "user_credentials"
        },
        {
            "service": "Warp AI",
            "username": "wayneroberts32@gmail.com",
            "password": "Zeke29@72022",
            "key_type": "user_credentials"
        },
        {
            "service": "Google App",
            "app_name": "AuraQuant",
            "app_password": "xkuj xpwx ksyu dgme",
            "key_type": "app_password"
        }
    ]
    
    print("=" * 60)
    print("IMPORTING CREDENTIALS TO API VAULT")
    print("=" * 60)
    
    for cred in credentials:
        service = cred["service"]
        
        # Check if already exists
        existing = vault.list_keys()
        service_exists = any(k["service"] == service for k in existing)
        
        if service_exists:
            print(f"⚠️  {service} credentials already exist in vault")
            response = input(f"   Update {service}? (y/n): ").lower()
            if response != 'y':
                print(f"   Skipping {service}")
                continue
        
        # Store credentials based on type
        if cred["key_type"] == "user_credentials":
            # Store username
            vault.store_key(
                service=service,
                key_name="username",
                key_value=cred["username"],
                environment="production"
            )
            
            # Store password (encrypted)
            vault.store_key(
                service=service,
                key_name="password",
                key_value=cred["password"],
                environment="production",
                encrypted=True
            )
            
            # Store org_id if present
            if "org_id" in cred:
                vault.store_key(
                    service=service,
                    key_name="org_id",
                    key_value=cred["org_id"],
                    environment="production"
                )
            
            print(f"✅ Imported {service} credentials")
            
        elif cred["key_type"] == "app_password":
            # Store app password
            vault.store_key(
                service=service,
                key_name="app_name",
                key_value=cred.get("app_name", ""),
                environment="production"
            )
            
            vault.store_key(
                service=service,
                key_name="app_password",
                key_value=cred["app_password"],
                environment="production",
                encrypted=True
            )
            
            print(f"✅ Imported {service} app password")
    
    # Also add Gmail app password for email notifications
    gmail_app_password = "xkuj xpwx ksyu dgme"
    vault.store_key(
        service="Gmail",
        key_name="app_password",
        key_value=gmail_app_password,
        environment="production",
        encrypted=True
    )
    print(f"✅ Imported Gmail app password for notifications")
    
    print("\n" + "=" * 60)
    print("CREDENTIAL IMPORT COMPLETE")
    print("=" * 60)
    
    # Show summary
    print("\n📊 Vault Summary:")
    all_keys = vault.list_keys()
    services = set(k["service"] for k in all_keys)
    
    for service in sorted(services):
        service_keys = [k for k in all_keys if k["service"] == service]
        print(f"\n  {service}:")
        for key in service_keys:
            status = "🔒" if key.get("encrypted") else "🔓"
            print(f"    {status} {key['key_name']}")
    
    print("\n" + "=" * 60)
    print("All credentials have been securely stored in the vault.")
    print("Use 'python -m core.api_vault' to manage credentials.")
    print("=" * 60)

if __name__ == "__main__":
    try:
        import_credentials()
    except Exception as e:
        print(f"❌ Error importing credentials: {e}")
        sys.exit(1)
