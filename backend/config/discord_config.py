"""
Discord Configuration for AuraQuant Bot
Channel ID: 1407369896089616635
"""

import os
from typing import Dict, Any

class DiscordConfig:
    """Discord bot configuration"""
    
    # Your Discord Channel ID
    CHANNEL_ID = 1407369896089616635
    
    # Bot Token (will be loaded from environment or vault)
    BOT_TOKEN = os.getenv('DISCORD_BOT_TOKEN', '')
    
    # Channel IDs for different alert types
    CHANNELS = {
        'main': 1407369896089616635,  # Main trading alerts channel
        'alerts': 1407369896089616635,  # High priority alerts (same channel for now)
        'trades': 1407369896089616635,  # Trade executions (same channel for now)
        'errors': 1407369896089616635,  # Error notifications (same channel for now)
    }
    
    # Alert Settings
    ALERT_SETTINGS = {
        'embed_color': {
            'profit': 0x00FF00,  # Green for profits
            'loss': 0xFF0000,    # Red for losses
            'info': 0x3498DB,    # Blue for info
            'warning': 0xFFFF00,  # Yellow for warnings
            'critical': 0xFF00FF, # Magenta for critical alerts
        },
        'mention_roles': {
            'critical': '@everyone',  # Mention everyone for critical alerts
            'high': '',              # Add role ID if needed
            'medium': '',            # Add role ID if needed
            'low': ''               # Add role ID if needed
        }
    }
    
    # Command Prefix
    COMMAND_PREFIX = '!'
    
    # Enabled Features
    FEATURES = {
        'trade_alerts': True,
        'profit_alerts': True,
        'risk_alerts': True,
        'market_updates': True,
        'bot_status': True,
        'commands': True,
        'emergency_alerts': True,
        'daily_summary': True,
        'weekly_report': True
    }
    
    # Message Templates
    TEMPLATES = {
        'trade_opened': "🚀 **New Position Opened**\n{details}",
        'trade_closed': "✅ **Position Closed**\n{details}",
        'profit_alert': "💰 **Profit Alert**\n{details}",
        'loss_alert': "⚠️ **Loss Alert**\n{details}",
        'emergency_stop': "🛑 **EMERGENCY STOP ACTIVATED**\n{details}",
        'daily_summary': "📊 **Daily Trading Summary**\n{details}",
        'bot_status': "🤖 **Bot Status Update**\n{details}",
    }
    
    @classmethod
    def get_config(cls) -> Dict[str, Any]:
        """Get full configuration as dictionary"""
        return {
            'channel_id': cls.CHANNEL_ID,
            'bot_token': cls.BOT_TOKEN,
            'channels': cls.CHANNELS,
            'alert_settings': cls.ALERT_SETTINGS,
            'command_prefix': cls.COMMAND_PREFIX,
            'features': cls.FEATURES,
            'templates': cls.TEMPLATES
        }
    
    @classmethod
    def validate(cls) -> bool:
        """Validate Discord configuration"""
        if not cls.BOT_TOKEN:
            print("❌ Discord bot token not configured")
            return False
        
        if not cls.CHANNEL_ID:
            print("❌ Discord channel ID not configured")
            return False
        
        print(f"✅ Discord configured for channel: {cls.CHANNEL_ID}")
        return True

# Export configuration
discord_config = DiscordConfig()
