"""
AuraQuant API Vault System
Secure storage and management of API keys and secrets
"""

import os
import json
import base64
import hashlib
from typing import Dict, Optional, Any, List
from datetime import datetime, timedelta
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2
import sqlite3
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

class APIVault:
    """
    Secure vault for storing and managing API keys
    Features:
    - Encrypted storage with master password
    - API key rotation tracking
    - Access logging and audit trail
    - Automatic key expiration warnings
    - Multi-broker API support
    """
    
    def __init__(self, vault_path: str = None, master_password: str = None):
        self.vault_path = vault_path or os.path.join(
            os.path.dirname(__file__), '..', '..', 'data', 'vault.db'
        )
        Path(os.path.dirname(self.vault_path)).mkdir(parents=True, exist_ok=True)
        
        # Initialize encryption
        self.master_password = master_password or os.getenv('VAULT_MASTER_PASSWORD', '')
        self.cipher_suite = self._init_encryption()
        
        # Initialize database
        self._init_database()
        
        # Supported API categories
        self.api_categories = {
            'brokers': [
                'alpaca', 'binance', 'interactive_brokers', 'td_ameritrade',
                'robinhood', 'plus500', 'coinbase', 'kraken', 'ftx'
            ],
            'data_providers': [
                'polygon', 'alpha_vantage', 'iex_cloud', 'yahoo_finance',
                'finnhub', 'twelve_data', 'tradingview'
            ],
            'ai_services': [
                'openai', 'anthropic', 'google_ai', 'hugging_face',
                'replicate', 'cohere'
            ],
            'social_media': [
                'discord', 'telegram', 'twitter', 'reddit', 'stocktwits'
            ],
            'payment': [
                'stripe', 'paypal', 'coinbase_commerce'
            ],
            'monitoring': [
                'sentry', 'datadog', 'new_relic', 'prometheus'
            ],
            'utilities': [
                'sendgrid', 'twilio', 'aws', 'google_cloud', 'azure'
            ]
        }
        
        # API key templates with required fields
        self.api_templates = {
            'alpaca': {
                'api_key': '',
                'secret_key': '',
                'endpoint': 'https://paper-api.alpaca.markets',  # or https://api.alpaca.markets
                'paper_mode': True
            },
            'binance': {
                'api_key': '',
                'secret_key': '',
                'testnet': False,
                'futures_enabled': False
            },
            'discord': {
                'bot_token': '',
                'webhook_urls': [],
                'guild_id': '',
                'channel_ids': {}
            },
            'openai': {
                'api_key': '',
                'organization_id': '',
                'model': 'gpt-4'
            },
            'polygon': {
                'api_key': '',
                'tier': 'basic',  # basic, developer, advanced
                'websocket_enabled': True
            },
            'tradingview': {
                'webhook_secret': '',
                'alert_webhook_url': ''
            },
            'plus500': {
                'api_key': '',
                'account_id': '',
                'demo_mode': True
            }
        }
        
        logger.info(f"API Vault initialized at {self.vault_path}")
    
    def _init_encryption(self) -> Fernet:
        """Initialize encryption using master password"""
        if not self.master_password:
            # Generate a new master password if not provided
            self.master_password = Fernet.generate_key().decode()
            logger.warning(f"Generated new master password: {self.master_password}")
            logger.warning("SAVE THIS PASSWORD SECURELY! It's required to access the vault.")
        
        # Derive encryption key from master password
        kdf = PBKDF2(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b'auraquant_vault_salt_2024',  # Fixed salt for consistency
            iterations=100000,
        )
        
        key = base64.urlsafe_b64encode(
            kdf.derive(self.master_password.encode())
        )
        return Fernet(key)
    
    def _init_database(self):
        """Initialize SQLite database for vault storage"""
        conn = sqlite3.connect(self.vault_path)
        cursor = conn.cursor()
        
        # Create tables
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS api_keys (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                service TEXT NOT NULL UNIQUE,
                category TEXT NOT NULL,
                encrypted_data TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                last_accessed TEXT,
                rotation_date TEXT,
                expires_at TEXT,
                is_active BOOLEAN DEFAULT 1,
                environment TEXT DEFAULT 'production',
                notes TEXT
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS access_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                service TEXT NOT NULL,
                action TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                ip_address TEXT,
                user_agent TEXT,
                success BOOLEAN,
                error_message TEXT
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS api_limits (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                service TEXT NOT NULL UNIQUE,
                rate_limit INTEGER,
                rate_window INTEGER,
                daily_limit INTEGER,
                monthly_limit INTEGER,
                current_usage INTEGER DEFAULT 0,
                reset_time TEXT
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def store_api_key(self, service: str, credentials: Dict[str, Any], 
                     category: str = None, environment: str = 'production',
                     expires_days: int = None, notes: str = None) -> bool:
        """
        Store API credentials securely in the vault
        
        Args:
            service: Name of the service (e.g., 'alpaca', 'discord')
            credentials: Dictionary containing API credentials
            category: Category of the service
            environment: 'production', 'sandbox', or 'development'
            expires_days: Number of days until key expires
            notes: Optional notes about the API key
        
        Returns:
            bool: Success status
        """
        try:
            # Determine category if not provided
            if not category:
                for cat, services in self.api_categories.items():
                    if service.lower() in services:
                        category = cat
                        break
                else:
                    category = 'custom'
            
            # Merge with template if available
            if service in self.api_templates:
                template = self.api_templates[service].copy()
                template.update(credentials)
                credentials = template
            
            # Encrypt credentials
            encrypted_data = self.cipher_suite.encrypt(
                json.dumps(credentials).encode()
            ).decode()
            
            # Calculate expiration
            expires_at = None
            rotation_date = None
            if expires_days:
                expires_at = (datetime.now() + timedelta(days=expires_days)).isoformat()
                # Suggest rotation 7 days before expiration
                rotation_date = (datetime.now() + timedelta(days=expires_days-7)).isoformat()
            
            # Store in database
            conn = sqlite3.connect(self.vault_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO api_keys 
                (service, category, encrypted_data, created_at, updated_at, 
                 environment, expires_at, rotation_date, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                service, category, encrypted_data,
                datetime.now().isoformat(), datetime.now().isoformat(),
                environment, expires_at, rotation_date, notes
            ))
            
            conn.commit()
            conn.close()
            
            # Log access
            self._log_access(service, 'store', True)
            
            logger.info(f"API key for {service} stored successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to store API key for {service}: {e}")
            self._log_access(service, 'store', False, str(e))
            return False
    
    def retrieve_api_key(self, service: str, environment: str = None) -> Optional[Dict[str, Any]]:
        """
        Retrieve decrypted API credentials from vault
        
        Args:
            service: Name of the service
            environment: Optional environment filter
        
        Returns:
            Dict containing decrypted credentials or None
        """
        try:
            conn = sqlite3.connect(self.vault_path)
            cursor = conn.cursor()
            
            # Build query
            query = '''
                SELECT encrypted_data, expires_at, rotation_date, environment, notes
                FROM api_keys 
                WHERE service = ? AND is_active = 1
            '''
            params = [service]
            
            if environment:
                query += ' AND environment = ?'
                params.append(environment)
            
            cursor.execute(query, params)
            result = cursor.fetchone()
            
            if not result:
                logger.warning(f"No API key found for {service}")
                self._log_access(service, 'retrieve', False, 'Not found')
                return None
            
            encrypted_data, expires_at, rotation_date, env, notes = result
            
            # Check expiration
            if expires_at and datetime.fromisoformat(expires_at) < datetime.now():
                logger.warning(f"API key for {service} has expired")
                self._log_access(service, 'retrieve', False, 'Expired')
                return None
            
            # Check rotation warning
            if rotation_date and datetime.fromisoformat(rotation_date) < datetime.now():
                logger.warning(f"API key for {service} should be rotated")
            
            # Decrypt credentials
            decrypted_data = json.loads(
                self.cipher_suite.decrypt(encrypted_data.encode()).decode()
            )
            
            # Update last accessed
            cursor.execute('''
                UPDATE api_keys 
                SET last_accessed = ? 
                WHERE service = ?
            ''', (datetime.now().isoformat(), service))
            
            conn.commit()
            conn.close()
            
            # Log successful access
            self._log_access(service, 'retrieve', True)
            
            # Add metadata
            decrypted_data['_metadata'] = {
                'environment': env,
                'expires_at': expires_at,
                'rotation_date': rotation_date,
                'notes': notes
            }
            
            return decrypted_data
            
        except Exception as e:
            logger.error(f"Failed to retrieve API key for {service}: {e}")
            self._log_access(service, 'retrieve', False, str(e))
            return None
    
    def list_stored_keys(self, category: str = None, include_inactive: bool = False) -> List[Dict]:
        """List all stored API keys with metadata"""
        try:
            conn = sqlite3.connect(self.vault_path)
            cursor = conn.cursor()
            
            query = '''
                SELECT service, category, created_at, updated_at, last_accessed,
                       expires_at, rotation_date, is_active, environment, notes
                FROM api_keys
            '''
            conditions = []
            params = []
            
            if not include_inactive:
                conditions.append('is_active = 1')
            
            if category:
                conditions.append('category = ?')
                params.append(category)
            
            if conditions:
                query += ' WHERE ' + ' AND '.join(conditions)
            
            cursor.execute(query, params)
            results = cursor.fetchall()
            
            keys = []
            for row in results:
                key_info = {
                    'service': row[0],
                    'category': row[1],
                    'created_at': row[2],
                    'updated_at': row[3],
                    'last_accessed': row[4],
                    'expires_at': row[5],
                    'rotation_date': row[6],
                    'is_active': bool(row[7]),
                    'environment': row[8],
                    'notes': row[9]
                }
                
                # Check status
                if key_info['expires_at']:
                    if datetime.fromisoformat(key_info['expires_at']) < datetime.now():
                        key_info['status'] = 'expired'
                    elif key_info['rotation_date'] and \
                         datetime.fromisoformat(key_info['rotation_date']) < datetime.now():
                        key_info['status'] = 'needs_rotation'
                    else:
                        key_info['status'] = 'active'
                else:
                    key_info['status'] = 'active' if key_info['is_active'] else 'inactive'
                
                keys.append(key_info)
            
            conn.close()
            return keys
            
        except Exception as e:
            logger.error(f"Failed to list API keys: {e}")
            return []
    
    def rotate_api_key(self, service: str, new_credentials: Dict[str, Any]) -> bool:
        """Rotate an API key while preserving history"""
        try:
            # Get current key
            current = self.retrieve_api_key(service)
            if not current:
                logger.warning(f"No existing key for {service} to rotate")
                return False
            
            # Archive current key
            conn = sqlite3.connect(self.vault_path)
            cursor = conn.cursor()
            
            # Mark current as inactive
            cursor.execute('''
                UPDATE api_keys 
                SET is_active = 0, notes = ?
                WHERE service = ? AND is_active = 1
            ''', (f"Rotated on {datetime.now().isoformat()}", service))
            
            conn.commit()
            conn.close()
            
            # Store new key
            metadata = current.get('_metadata', {})
            return self.store_api_key(
                service, 
                new_credentials,
                environment=metadata.get('environment', 'production'),
                notes=f"Rotated from previous key"
            )
            
        except Exception as e:
            logger.error(f"Failed to rotate API key for {service}: {e}")
            return False
    
    def delete_api_key(self, service: str, hard_delete: bool = False) -> bool:
        """Delete or deactivate an API key"""
        try:
            conn = sqlite3.connect(self.vault_path)
            cursor = conn.cursor()
            
            if hard_delete:
                cursor.execute('DELETE FROM api_keys WHERE service = ?', (service,))
                action = 'deleted'
            else:
                cursor.execute('''
                    UPDATE api_keys 
                    SET is_active = 0, notes = ?
                    WHERE service = ?
                ''', (f"Deactivated on {datetime.now().isoformat()}", service))
                action = 'deactivated'
            
            conn.commit()
            conn.close()
            
            self._log_access(service, f'{action}', True)
            logger.info(f"API key for {service} {action}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete API key for {service}: {e}")
            return False
    
    def set_rate_limits(self, service: str, rate_limit: int = None, 
                       rate_window: int = None, daily_limit: int = None,
                       monthly_limit: int = None) -> bool:
        """Set API rate limits for a service"""
        try:
            conn = sqlite3.connect(self.vault_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO api_limits
                (service, rate_limit, rate_window, daily_limit, monthly_limit, reset_time)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                service, rate_limit, rate_window, daily_limit, monthly_limit,
                datetime.now().isoformat()
            ))
            
            conn.commit()
            conn.close()
            
            logger.info(f"Rate limits set for {service}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to set rate limits for {service}: {e}")
            return False
    
    def check_rate_limit(self, service: str) -> Dict[str, Any]:
        """Check current rate limit status for a service"""
        try:
            conn = sqlite3.connect(self.vault_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT rate_limit, rate_window, daily_limit, monthly_limit,
                       current_usage, reset_time
                FROM api_limits
                WHERE service = ?
            ''', (service,))
            
            result = cursor.fetchone()
            conn.close()
            
            if not result:
                return {'unlimited': True}
            
            rate_limit, rate_window, daily_limit, monthly_limit, current_usage, reset_time = result
            
            # Check if reset needed
            if reset_time:
                reset_dt = datetime.fromisoformat(reset_time)
                if datetime.now() - reset_dt > timedelta(seconds=rate_window or 60):
                    # Reset usage counter
                    self._reset_rate_limit(service)
                    current_usage = 0
            
            return {
                'rate_limit': rate_limit,
                'rate_window': rate_window,
                'daily_limit': daily_limit,
                'monthly_limit': monthly_limit,
                'current_usage': current_usage,
                'remaining': (rate_limit or float('inf')) - current_usage,
                'reset_time': reset_time
            }
            
        except Exception as e:
            logger.error(f"Failed to check rate limit for {service}: {e}")
            return {'error': str(e)}
    
    def increment_usage(self, service: str, count: int = 1) -> bool:
        """Increment API usage counter"""
        try:
            conn = sqlite3.connect(self.vault_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                UPDATE api_limits
                SET current_usage = current_usage + ?
                WHERE service = ?
            ''', (count, service))
            
            conn.commit()
            conn.close()
            return True
            
        except Exception as e:
            logger.error(f"Failed to increment usage for {service}: {e}")
            return False
    
    def _reset_rate_limit(self, service: str):
        """Reset rate limit counter"""
        try:
            conn = sqlite3.connect(self.vault_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                UPDATE api_limits
                SET current_usage = 0, reset_time = ?
                WHERE service = ?
            ''', (datetime.now().isoformat(), service))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Failed to reset rate limit for {service}: {e}")
    
    def _log_access(self, service: str, action: str, success: bool, 
                   error_message: str = None):
        """Log vault access for audit trail"""
        try:
            conn = sqlite3.connect(self.vault_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO access_log
                (service, action, timestamp, success, error_message)
                VALUES (?, ?, ?, ?, ?)
            ''', (
                service, action, datetime.now().isoformat(),
                success, error_message
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Failed to log access: {e}")
    
    def get_access_log(self, service: str = None, limit: int = 100) -> List[Dict]:
        """Retrieve access log entries"""
        try:
            conn = sqlite3.connect(self.vault_path)
            cursor = conn.cursor()
            
            query = 'SELECT * FROM access_log'
            params = []
            
            if service:
                query += ' WHERE service = ?'
                params.append(service)
            
            query += ' ORDER BY timestamp DESC LIMIT ?'
            params.append(limit)
            
            cursor.execute(query, params)
            results = cursor.fetchall()
            
            conn.close()
            
            logs = []
            for row in results:
                logs.append({
                    'id': row[0],
                    'service': row[1],
                    'action': row[2],
                    'timestamp': row[3],
                    'ip_address': row[4],
                    'user_agent': row[5],
                    'success': bool(row[6]),
                    'error_message': row[7]
                })
            
            return logs
            
        except Exception as e:
            logger.error(f"Failed to retrieve access log: {e}")
            return []
    
    def export_vault(self, export_path: str, include_keys: bool = False) -> bool:
        """Export vault configuration (optionally with encrypted keys)"""
        try:
            export_data = {
                'vault_version': '1.0',
                'exported_at': datetime.now().isoformat(),
                'categories': self.api_categories,
                'templates': self.api_templates,
                'stored_keys': self.list_stored_keys(include_inactive=True)
            }
            
            if include_keys:
                # Include encrypted keys (still require master password to decrypt)
                conn = sqlite3.connect(self.vault_path)
                cursor = conn.cursor()
                cursor.execute('SELECT service, encrypted_data FROM api_keys')
                encrypted_keys = {row[0]: row[1] for row in cursor.fetchall()}
                conn.close()
                export_data['encrypted_keys'] = encrypted_keys
            
            with open(export_path, 'w') as f:
                json.dump(export_data, f, indent=2)
            
            logger.info(f"Vault exported to {export_path}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to export vault: {e}")
            return False
    
    def import_vault(self, import_path: str, merge: bool = True) -> bool:
        """Import vault configuration from backup"""
        try:
            with open(import_path, 'r') as f:
                import_data = json.load(f)
            
            if not merge:
                # Clear existing data
                conn = sqlite3.connect(self.vault_path)
                cursor = conn.cursor()
                cursor.execute('DELETE FROM api_keys')
                conn.commit()
                conn.close()
            
            # Import categories and templates
            self.api_categories.update(import_data.get('categories', {}))
            self.api_templates.update(import_data.get('templates', {}))
            
            # Import encrypted keys if available
            if 'encrypted_keys' in import_data:
                conn = sqlite3.connect(self.vault_path)
                cursor = conn.cursor()
                
                for service, encrypted_data in import_data['encrypted_keys'].items():
                    cursor.execute('''
                        INSERT OR REPLACE INTO api_keys
                        (service, category, encrypted_data, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?)
                    ''', (
                        service, 'imported', encrypted_data,
                        datetime.now().isoformat(), datetime.now().isoformat()
                    ))
                
                conn.commit()
                conn.close()
            
            logger.info(f"Vault imported from {import_path}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to import vault: {e}")
            return False
    
    def validate_credentials(self, service: str) -> bool:
        """
        Test API credentials by making a simple API call
        Service-specific validation logic
        """
        try:
            creds = self.retrieve_api_key(service)
            if not creds:
                return False
            
            # Service-specific validation
            if service == 'alpaca':
                import requests
                headers = {
                    'APCA-API-KEY-ID': creds['api_key'],
                    'APCA-API-SECRET-KEY': creds['secret_key']
                }
                response = requests.get(
                    f"{creds['endpoint']}/v2/account",
                    headers=headers
                )
                return response.status_code == 200
            
            elif service == 'discord':
                import requests
                headers = {'Authorization': f"Bot {creds['bot_token']}"}
                response = requests.get(
                    'https://discord.com/api/v10/users/@me',
                    headers=headers
                )
                return response.status_code == 200
            
            elif service == 'openai':
                import openai
                openai.api_key = creds['api_key']
                # Try a minimal API call
                try:
                    openai.Model.list()
                    return True
                except:
                    return False
            
            # Add more service validations as needed
            
            logger.warning(f"No validation logic for {service}")
            return True  # Assume valid if no specific validation
            
        except Exception as e:
            logger.error(f"Failed to validate {service} credentials: {e}")
            return False
    
    def get_bot_credentials(self) -> Dict[str, Any]:
        """
        Retrieve all credentials needed for bot operation
        Returns a unified credential dictionary
        """
        required_services = [
            'alpaca',      # Primary broker
            'binance',     # Crypto trading
            'polygon',     # Market data
            'discord',     # Notifications
            'openai',      # AI predictions
            'tradingview'  # Webhook signals
        ]
        
        credentials = {}
        missing = []
        
        for service in required_services:
            creds = self.retrieve_api_key(service)
            if creds:
                # Remove metadata before returning
                if '_metadata' in creds:
                    del creds['_metadata']
                credentials[service] = creds
            else:
                missing.append(service)
        
        if missing:
            logger.warning(f"Missing credentials for: {', '.join(missing)}")
        
        return {
            'credentials': credentials,
            'missing': missing,
            'complete': len(missing) == 0
        }


# Vault CLI Interface
class VaultCLI:
    """Command-line interface for managing the API vault"""
    
    def __init__(self, vault: APIVault = None):
        self.vault = vault or APIVault()
    
    def interactive_setup(self):
        """Interactive setup wizard for API keys"""
        print("\n" + "="*60)
        print(" AuraQuant API Vault Setup Wizard")
        print("="*60)
        
        while True:
            print("\n1. Add API Key")
            print("2. View Stored Keys")
            print("3. Test API Key")
            print("4. Rotate API Key")
            print("5. Delete API Key")
            print("6. Export Vault")
            print("7. Import Vault")
            print("8. Exit")
            
            choice = input("\nSelect option: ").strip()
            
            if choice == '1':
                self.add_api_key()
            elif choice == '2':
                self.view_keys()
            elif choice == '3':
                self.test_key()
            elif choice == '4':
                self.rotate_key()
            elif choice == '5':
                self.delete_key()
            elif choice == '6':
                self.export_vault()
            elif choice == '7':
                self.import_vault()
            elif choice == '8':
                break
    
    def add_api_key(self):
        """Add a new API key"""
        print("\nAvailable services:")
        for category, services in self.vault.api_categories.items():
            print(f"\n{category.upper()}:")
            for service in services:
                print(f"  - {service}")
        
        service = input("\nEnter service name: ").strip().lower()
        
        # Get template if available
        if service in self.vault.api_templates:
            template = self.vault.api_templates[service]
            print(f"\nRequired fields for {service}:")
            credentials = {}
            
            for field, default in template.items():
                if isinstance(default, bool):
                    value = input(f"{field} (y/n, default={default}): ").strip()
                    credentials[field] = value.lower() == 'y' if value else default
                elif isinstance(default, list):
                    value = input(f"{field} (comma-separated): ").strip()
                    credentials[field] = value.split(',') if value else default
                else:
                    value = input(f"{field}: ").strip()
                    credentials[field] = value if value else default
        else:
            print("\nEnter credentials as key=value pairs (empty line to finish):")
            credentials = {}
            while True:
                line = input().strip()
                if not line:
                    break
                if '=' in line:
                    key, value = line.split('=', 1)
                    credentials[key.strip()] = value.strip()
        
        environment = input("Environment (production/sandbox/development): ").strip() or 'production'
        expires = input("Expires in days (leave empty for no expiration): ").strip()
        notes = input("Notes (optional): ").strip()
        
        success = self.vault.store_api_key(
            service,
            credentials,
            environment=environment,
            expires_days=int(expires) if expires else None,
            notes=notes
        )
        
        if success:
            print(f"✅ API key for {service} stored successfully!")
        else:
            print(f"❌ Failed to store API key for {service}")
    
    def view_keys(self):
        """View stored API keys"""
        keys = self.vault.list_stored_keys()
        
        if not keys:
            print("\nNo API keys stored")
            return
        
        print(f"\n{'Service':<20} {'Category':<15} {'Environment':<12} {'Status':<10} {'Last Accessed':<20}")
        print("-" * 80)
        
        for key in keys:
            print(f"{key['service']:<20} {key['category']:<15} {key['environment']:<12} "
                  f"{key['status']:<10} {key['last_accessed'] or 'Never':<20}")
    
    def test_key(self):
        """Test an API key"""
        service = input("\nEnter service name to test: ").strip().lower()
        
        if self.vault.validate_credentials(service):
            print(f"✅ {service} credentials are valid!")
        else:
            print(f"❌ {service} credentials validation failed")
    
    def rotate_key(self):
        """Rotate an API key"""
        service = input("\nEnter service name to rotate: ").strip().lower()
        
        print(f"\nEnter new credentials for {service}:")
        if service in self.vault.api_templates:
            template = self.vault.api_templates[service]
            credentials = {}
            
            for field, default in template.items():
                if not isinstance(default, (list, dict)):
                    value = input(f"{field}: ").strip()
                    if value:
                        credentials[field] = value
        else:
            credentials = {}
            print("Enter as key=value pairs (empty line to finish):")
            while True:
                line = input().strip()
                if not line:
                    break
                if '=' in line:
                    key, value = line.split('=', 1)
                    credentials[key.strip()] = value.strip()
        
        if self.vault.rotate_api_key(service, credentials):
            print(f"✅ API key for {service} rotated successfully!")
        else:
            print(f"❌ Failed to rotate API key for {service}")
    
    def delete_key(self):
        """Delete an API key"""
        service = input("\nEnter service name to delete: ").strip().lower()
        hard = input("Permanently delete? (y/n): ").strip().lower() == 'y'
        
        if self.vault.delete_api_key(service, hard_delete=hard):
            print(f"✅ API key for {service} {'deleted' if hard else 'deactivated'}")
        else:
            print(f"❌ Failed to delete API key for {service}")
    
    def export_vault(self):
        """Export vault configuration"""
        path = input("\nExport path (e.g., vault_backup.json): ").strip()
        include_keys = input("Include encrypted keys? (y/n): ").strip().lower() == 'y'
        
        if self.vault.export_vault(path, include_keys):
            print(f"✅ Vault exported to {path}")
        else:
            print("❌ Failed to export vault")
    
    def import_vault(self):
        """Import vault configuration"""
        path = input("\nImport path: ").strip()
        merge = input("Merge with existing data? (y/n): ").strip().lower() == 'y'
        
        if self.vault.import_vault(path, merge):
            print(f"✅ Vault imported from {path}")
        else:
            print("❌ Failed to import vault")


# Example usage and testing
if __name__ == "__main__":
    import sys
    
    # Check for master password
    master_password = os.getenv('VAULT_MASTER_PASSWORD')
    if not master_password and len(sys.argv) > 1:
        master_password = sys.argv[1]
    
    if not master_password:
        print("⚠️  No master password provided!")
        print("Set VAULT_MASTER_PASSWORD environment variable or pass as argument")
        create_new = input("Create new vault with auto-generated password? (y/n): ")
        if create_new.lower() != 'y':
            sys.exit(1)
    
    # Initialize vault
    vault = APIVault(master_password=master_password)
    
    # Run CLI
    cli = VaultCLI(vault)
    cli.interactive_setup()
