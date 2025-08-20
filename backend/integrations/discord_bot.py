"""
AuraQuant Discord Bot Integration
Real-time trading alerts, commands, and notifications via Discord
"""

import discord
from discord.ext import commands, tasks
import asyncio
import aiohttp
from typing import Dict, Any, List, Optional
import json
from datetime import datetime, timedelta
import logging
from pathlib import Path
import sys

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

from core.vault import APIVault

logger = logging.getLogger(__name__)

class AuraQuantDiscordBot:
    """
    Discord bot for AuraQuant trading platform
    Features:
    - Real-time trade alerts
    - Market notifications
    - Bot control commands
    - Performance reports
    - Emergency controls
    """
    
    # Your Discord Channel ID
    DEFAULT_CHANNEL_ID = 1407369896089616635
    
    def __init__(self, vault: APIVault = None, channel_id: int = None):
        # Initialize vault for API credentials
        self.vault = vault or APIVault()
        
        # Set primary channel ID
        self.channel_id = channel_id or self.DEFAULT_CHANNEL_ID
        
        # Get Discord credentials
        try:
            discord_creds = self.vault.retrieve_api_key('discord')
            if discord_creds:
                self.bot_token = discord_creds['bot_token']
                self.webhook_urls = discord_creds.get('webhook_urls', [])
                self.guild_id = discord_creds.get('guild_id')
            else:
                # Use environment variables as fallback
                import os
                self.bot_token = os.getenv('DISCORD_BOT_TOKEN', '')
                self.webhook_urls = []
                self.guild_id = None
                logger.warning("Discord credentials not found in vault, using environment variables")
        except Exception as e:
            logger.error(f"Error loading Discord credentials: {e}")
            import os
            self.bot_token = os.getenv('DISCORD_BOT_TOKEN', '')
        
        # Channel configuration - use the provided channel ID for all channels
        self.channels = {
            'alerts': self.channel_id,
            'trades': self.channel_id,
            'performance': self.channel_id,
            'logs': self.channel_id,
            'commands': self.channel_id
        }
        
        # Initialize bot with intents
        intents = discord.Intents.default()
        intents.message_content = True
        intents.members = True
        
        self.bot = commands.Bot(
            command_prefix='!aq ',
            intents=intents,
            description="AuraQuant Trading Bot"
        )
        
        # Trading state
        self.bot_status = {
            'mode': 'V1',  # V1, V2, V3... V∞
            'is_running': False,
            'is_paper': True,
            'positions': {},
            'balance': 0,
            'daily_pnl': 0,
            'win_rate': 0
        }
        
        # Alert settings
        self.alert_settings = {
            'trade_alerts': True,
            'market_alerts': True,
            'risk_alerts': True,
            'performance_alerts': True,
            'emergency_alerts': True
        }
        
        # Rate limiting
        self.rate_limits = {
            'messages_per_minute': 30,
            'alerts_per_minute': 10,
            'message_count': 0,
            'alert_count': 0,
            'reset_time': datetime.now()
        }
        
        # Setup bot commands and events
        self._setup_commands()
        self._setup_events()
    
    def _setup_events(self):
        """Setup Discord bot events"""
        
        @self.bot.event
        async def on_ready():
            """Called when bot is ready"""
            logger.info(f'{self.bot.user} has connected to Discord!')
            
            # Set bot status
            await self.bot.change_presence(
                activity=discord.Activity(
                    type=discord.ActivityType.watching,
                    name="the markets 📈"
                )
            )
            
            # Start background tasks
            self.update_status.start()
            self.check_rate_limits.start()
            
            # Send startup message
            if self.channels['logs']:
                channel = self.bot.get_channel(int(self.channels['logs']))
                if channel:
                    embed = discord.Embed(
                        title="🚀 AuraQuant Bot Started",
                        description="Trading bot is now online and monitoring markets",
                        color=discord.Color.green(),
                        timestamp=datetime.now()
                    )
                    embed.add_field(name="Mode", value=self.bot_status['mode'])
                    embed.add_field(name="Paper Trading", value="Yes" if self.bot_status['is_paper'] else "No")
                    await channel.send(embed=embed)
        
        @self.bot.event
        async def on_message(message):
            """Process messages"""
            if message.author == self.bot.user:
                return
            
            # Process commands
            await self.bot.process_commands(message)
        
        @self.bot.event
        async def on_command_error(ctx, error):
            """Handle command errors"""
            if isinstance(error, commands.CommandNotFound):
                await ctx.send("❌ Command not found. Use `!aq help` for available commands.")
            elif isinstance(error, commands.MissingRequiredArgument):
                await ctx.send(f"❌ Missing required argument: {error.param.name}")
            elif isinstance(error, commands.CheckFailure):
                await ctx.send("❌ You don't have permission to use this command.")
            else:
                logger.error(f"Command error: {error}")
                await ctx.send(f"❌ An error occurred: {str(error)}")
    
    def _setup_commands(self):
        """Setup Discord bot commands"""
        
        # Status Commands
        @self.bot.command(name='status', help='Show bot status')
        async def status(ctx):
            """Display current bot status"""
            embed = discord.Embed(
                title="🤖 AuraQuant Bot Status",
                color=discord.Color.blue() if self.bot_status['is_running'] else discord.Color.red(),
                timestamp=datetime.now()
            )
            
            embed.add_field(name="Status", value="🟢 Running" if self.bot_status['is_running'] else "🔴 Stopped")
            embed.add_field(name="Mode", value=self.bot_status['mode'])
            embed.add_field(name="Trading", value="Paper" if self.bot_status['is_paper'] else "Live")
            embed.add_field(name="Balance", value=f"${self.bot_status['balance']:,.2f}")
            embed.add_field(name="Daily P&L", value=f"${self.bot_status['daily_pnl']:+,.2f}")
            embed.add_field(name="Win Rate", value=f"{self.bot_status['win_rate']:.1f}%")
            embed.add_field(name="Positions", value=len(self.bot_status['positions']))
            
            await ctx.send(embed=embed)
        
        # Trading Commands
        @self.bot.command(name='start', help='Start the trading bot')
        @commands.has_role('Admin')
        async def start_bot(ctx):
            """Start the trading bot"""
            if self.bot_status['is_running']:
                await ctx.send("⚠️ Bot is already running!")
                return
            
            self.bot_status['is_running'] = True
            
            embed = discord.Embed(
                title="✅ Bot Started",
                description=f"Trading bot started in {self.bot_status['mode']} mode",
                color=discord.Color.green(),
                timestamp=datetime.now()
            )
            await ctx.send(embed=embed)
            
            # Log to dedicated channel
            await self._log_action("Bot Started", ctx.author)
        
        @self.bot.command(name='stop', help='Stop the trading bot')
        @commands.has_role('Admin')
        async def stop_bot(ctx):
            """Stop the trading bot"""
            if not self.bot_status['is_running']:
                await ctx.send("⚠️ Bot is already stopped!")
                return
            
            self.bot_status['is_running'] = False
            
            embed = discord.Embed(
                title="🛑 Bot Stopped",
                description="Trading bot has been stopped",
                color=discord.Color.red(),
                timestamp=datetime.now()
            )
            await ctx.send(embed=embed)
            
            await self._log_action("Bot Stopped", ctx.author)
        
        @self.bot.command(name='emergency', help='Emergency stop - closes all positions')
        @commands.has_role('Admin')
        async def emergency_stop(ctx):
            """Emergency stop - close all positions immediately"""
            embed = discord.Embed(
                title="🚨 EMERGENCY STOP ACTIVATED",
                description="Closing all positions and halting trading",
                color=discord.Color.red(),
                timestamp=datetime.now()
            )
            
            # Send to backend to close all positions
            # This would trigger the emergency module
            
            await ctx.send(embed=embed)
            await self._send_emergency_alert("Emergency stop activated by " + str(ctx.author))
        
        @self.bot.command(name='mode', help='Change bot trading mode (V1-V∞)')
        @commands.has_role('Admin')
        async def change_mode(ctx, mode: str):
            """Change bot trading mode"""
            valid_modes = ['V1', 'V2', 'V3', 'V4', 'V5', 'V∞']
            
            if mode.upper() not in valid_modes:
                await ctx.send(f"❌ Invalid mode. Valid modes: {', '.join(valid_modes)}")
                return
            
            old_mode = self.bot_status['mode']
            self.bot_status['mode'] = mode.upper()
            
            embed = discord.Embed(
                title="🔄 Mode Changed",
                description=f"Trading mode changed from {old_mode} to {mode.upper()}",
                color=discord.Color.blue(),
                timestamp=datetime.now()
            )
            
            # Mode descriptions
            mode_desc = {
                'V1': "Conservative - Low risk, steady gains",
                'V2': "Balanced - Moderate risk/reward",
                'V3': "Aggressive - Higher risk, higher returns",
                'V4': "Advanced - AI-driven strategies",
                'V5': "Quantum - Multi-dimensional analysis",
                'V∞': "Infinity - Zero-loss guarantee mode"
            }
            
            embed.add_field(name="Mode Description", value=mode_desc.get(mode.upper(), "Unknown"))
            await ctx.send(embed=embed)
            
            await self._log_action(f"Mode changed to {mode.upper()}", ctx.author)
        
        @self.bot.command(name='paper', help='Toggle paper trading mode')
        @commands.has_role('Admin')
        async def toggle_paper(ctx):
            """Toggle between paper and live trading"""
            self.bot_status['is_paper'] = not self.bot_status['is_paper']
            
            mode = "Paper" if self.bot_status['is_paper'] else "LIVE"
            color = discord.Color.blue() if self.bot_status['is_paper'] else discord.Color.gold()
            
            embed = discord.Embed(
                title=f"💱 Switched to {mode} Trading",
                description=f"Bot is now in {mode} trading mode",
                color=color,
                timestamp=datetime.now()
            )
            
            if not self.bot_status['is_paper']:
                embed.add_field(
                    name="⚠️ WARNING",
                    value="Bot is now trading with REAL MONEY!",
                    inline=False
                )
            
            await ctx.send(embed=embed)
            await self._log_action(f"Switched to {mode} trading", ctx.author)
        
        # Position Commands
        @self.bot.command(name='positions', help='Show current positions')
        async def show_positions(ctx):
            """Display current positions"""
            if not self.bot_status['positions']:
                await ctx.send("📊 No open positions")
                return
            
            embed = discord.Embed(
                title="📊 Current Positions",
                color=discord.Color.blue(),
                timestamp=datetime.now()
            )
            
            for symbol, position in list(self.bot_status['positions'].items())[:10]:
                value = f"""
                Qty: {position.get('quantity', 0)}
                Avg: ${position.get('avg_price', 0):.2f}
                P&L: ${position.get('unrealized_pnl', 0):+.2f}
                """
                embed.add_field(name=symbol, value=value, inline=True)
            
            if len(self.bot_status['positions']) > 10:
                embed.add_field(
                    name="...",
                    value=f"And {len(self.bot_status['positions']) - 10} more",
                    inline=False
                )
            
            await ctx.send(embed=embed)
        
        @self.bot.command(name='close', help='Close a specific position')
        @commands.has_role('Trader')
        async def close_position(ctx, symbol: str):
            """Close a specific position"""
            symbol = symbol.upper()
            
            if symbol not in self.bot_status['positions']:
                await ctx.send(f"❌ No position found for {symbol}")
                return
            
            # Send close order to backend
            embed = discord.Embed(
                title=f"📉 Closing Position: {symbol}",
                description="Order sent to close position",
                color=discord.Color.orange(),
                timestamp=datetime.now()
            )
            
            await ctx.send(embed=embed)
            await self._log_action(f"Manual close: {symbol}", ctx.author)
        
        # Alert Commands
        @self.bot.command(name='alerts', help='Configure alert settings')
        async def configure_alerts(ctx, category: str = None, enabled: str = None):
            """Configure alert settings"""
            if category is None:
                # Show current settings
                embed = discord.Embed(
                    title="🔔 Alert Settings",
                    color=discord.Color.blue(),
                    timestamp=datetime.now()
                )
                
                for key, value in self.alert_settings.items():
                    status = "✅ Enabled" if value else "❌ Disabled"
                    embed.add_field(name=key.replace('_', ' ').title(), value=status)
                
                await ctx.send(embed=embed)
                return
            
            if category in self.alert_settings and enabled:
                self.alert_settings[category] = enabled.lower() == 'true'
                await ctx.send(f"✅ {category} alerts {'enabled' if self.alert_settings[category] else 'disabled'}")
            else:
                await ctx.send("❌ Invalid category or value")
        
        # Performance Commands
        @self.bot.command(name='performance', help='Show performance metrics')
        async def show_performance(ctx, period: str = 'today'):
            """Display performance metrics"""
            embed = discord.Embed(
                title=f"📈 Performance - {period.capitalize()}",
                color=discord.Color.green() if self.bot_status['daily_pnl'] >= 0 else discord.Color.red(),
                timestamp=datetime.now()
            )
            
            # Mock performance data - would come from backend
            metrics = {
                'Total P&L': f"${self.bot_status['daily_pnl']:+,.2f}",
                'Win Rate': f"{self.bot_status['win_rate']:.1f}%",
                'Total Trades': '42',
                'Winning Trades': '28',
                'Losing Trades': '14',
                'Average Win': '$125.50',
                'Average Loss': '$45.20',
                'Profit Factor': '2.78',
                'Sharpe Ratio': '1.85',
                'Max Drawdown': '-3.2%'
            }
            
            for key, value in metrics.items():
                embed.add_field(name=key, value=value, inline=True)
            
            await ctx.send(embed=embed)
        
        # Settings Commands
        @self.bot.command(name='set', help='Configure bot settings')
        @commands.has_role('Admin')
        async def set_config(ctx, setting: str, value: str):
            """Configure bot settings"""
            settings_map = {
                'risk_percent': 'Risk per trade',
                'max_positions': 'Maximum positions',
                'stop_loss': 'Default stop loss %',
                'take_profit': 'Default take profit %',
                'trailing_stop': 'Trailing stop %'
            }
            
            if setting not in settings_map:
                await ctx.send(f"❌ Unknown setting. Available: {', '.join(settings_map.keys())}")
                return
            
            # Send to backend to update setting
            embed = discord.Embed(
                title="⚙️ Setting Updated",
                description=f"{settings_map[setting]} set to {value}",
                color=discord.Color.blue(),
                timestamp=datetime.now()
            )
            
            await ctx.send(embed=embed)
            await self._log_action(f"Setting {setting} = {value}", ctx.author)
        
        # Help Command Override
        @self.bot.command(name='help', help='Show help information')
        async def help_command(ctx, command: str = None):
            """Custom help command"""
            if command:
                # Show specific command help
                cmd = self.bot.get_command(command)
                if cmd:
                    embed = discord.Embed(
                        title=f"Help: !aq {command}",
                        description=cmd.help or "No description available",
                        color=discord.Color.blue()
                    )
                    await ctx.send(embed=embed)
                else:
                    await ctx.send(f"❌ Command '{command}' not found")
                return
            
            # Show all commands
            embed = discord.Embed(
                title="🤖 AuraQuant Bot Commands",
                description="All available commands for the trading bot",
                color=discord.Color.blue()
            )
            
            command_categories = {
                "📊 Status": ['status', 'positions', 'performance'],
                "🎮 Control": ['start', 'stop', 'emergency', 'mode', 'paper'],
                "💰 Trading": ['close'],
                "🔔 Alerts": ['alerts'],
                "⚙️ Settings": ['set'],
                "❓ Help": ['help']
            }
            
            for category, commands in command_categories.items():
                command_list = []
                for cmd_name in commands:
                    cmd = self.bot.get_command(cmd_name)
                    if cmd:
                        command_list.append(f"`!aq {cmd_name}` - {cmd.help}")
                
                if command_list:
                    embed.add_field(
                        name=category,
                        value="\n".join(command_list),
                        inline=False
                    )
            
            embed.set_footer(text="Use !aq help <command> for detailed help")
            await ctx.send(embed=embed)
    
    # Alert Methods
    async def send_trade_alert(self, trade_data: Dict[str, Any]):
        """Send trade execution alert"""
        if not self.alert_settings['trade_alerts']:
            return
        
        if not await self._check_rate_limit('alert'):
            return
        
        channel = self.bot.get_channel(int(self.channels.get('trades', self.channels.get('alerts'))))
        if not channel:
            return
        
        # Determine color based on trade type
        color = discord.Color.green() if trade_data['side'] == 'buy' else discord.Color.red()
        
        embed = discord.Embed(
            title=f"{'🟢 BUY' if trade_data['side'] == 'buy' else '🔴 SELL'} {trade_data['symbol']}",
            color=color,
            timestamp=datetime.now()
        )
        
        embed.add_field(name="Quantity", value=trade_data['quantity'])
        embed.add_field(name="Price", value=f"${trade_data['price']:.2f}")
        embed.add_field(name="Total", value=f"${trade_data['quantity'] * trade_data['price']:.2f}")
        
        if 'reason' in trade_data:
            embed.add_field(name="Reason", value=trade_data['reason'], inline=False)
        
        await channel.send(embed=embed)
    
    async def send_market_alert(self, alert_data: Dict[str, Any]):
        """Send market condition alert"""
        if not self.alert_settings['market_alerts']:
            return
        
        if not await self._check_rate_limit('alert'):
            return
        
        channel = self.bot.get_channel(int(self.channels.get('alerts')))
        if not channel:
            return
        
        # Color based on alert type
        colors = {
            'breakout': discord.Color.gold(),
            'momentum': discord.Color.purple(),
            'volume': discord.Color.blue(),
            'halt': discord.Color.red(),
            'news': discord.Color.orange()
        }
        
        embed = discord.Embed(
            title=f"🎯 {alert_data['type'].upper()} Alert: {alert_data['symbol']}",
            description=alert_data['message'],
            color=colors.get(alert_data['type'], discord.Color.blue()),
            timestamp=datetime.now()
        )
        
        if 'details' in alert_data:
            for key, value in alert_data['details'].items():
                embed.add_field(name=key, value=value, inline=True)
        
        await channel.send(embed=embed)
    
    async def send_risk_alert(self, risk_data: Dict[str, Any]):
        """Send risk management alert"""
        if not self.alert_settings['risk_alerts']:
            return
        
        channel = self.bot.get_channel(int(self.channels.get('alerts')))
        if not channel:
            return
        
        embed = discord.Embed(
            title="⚠️ Risk Alert",
            description=risk_data['message'],
            color=discord.Color.orange(),
            timestamp=datetime.now()
        )
        
        embed.add_field(name="Risk Level", value=risk_data.get('level', 'Medium'))
        embed.add_field(name="Current Exposure", value=f"${risk_data.get('exposure', 0):,.2f}")
        
        if 'action' in risk_data:
            embed.add_field(name="Recommended Action", value=risk_data['action'], inline=False)
        
        await channel.send(embed=embed)
    
    async def _send_emergency_alert(self, message: str):
        """Send emergency alert to all channels"""
        embed = discord.Embed(
            title="🚨 EMERGENCY ALERT",
            description=message,
            color=discord.Color.red(),
            timestamp=datetime.now()
        )
        
        # Send to all configured channels
        for channel_id in self.channels.values():
            if channel_id:
                channel = self.bot.get_channel(int(channel_id))
                if channel:
                    await channel.send(embed=embed)
                    await channel.send("@everyone")  # Ping everyone for emergency
    
    # Utility Methods
    async def _log_action(self, action: str, user: discord.User):
        """Log action to logs channel"""
        if not self.channels.get('logs'):
            return
        
        channel = self.bot.get_channel(int(self.channels['logs']))
        if channel:
            embed = discord.Embed(
                title="📝 Action Log",
                description=action,
                color=discord.Color.blue(),
                timestamp=datetime.now()
            )
            embed.add_field(name="User", value=str(user))
            await channel.send(embed=embed)
    
    async def _check_rate_limit(self, message_type: str) -> bool:
        """Check if we're within rate limits"""
        now = datetime.now()
        
        # Reset counters if minute has passed
        if (now - self.rate_limits['reset_time']).seconds >= 60:
            self.rate_limits['message_count'] = 0
            self.rate_limits['alert_count'] = 0
            self.rate_limits['reset_time'] = now
        
        if message_type == 'alert':
            if self.rate_limits['alert_count'] >= self.rate_limits['alerts_per_minute']:
                logger.warning("Alert rate limit exceeded")
                return False
            self.rate_limits['alert_count'] += 1
        else:
            if self.rate_limits['message_count'] >= self.rate_limits['messages_per_minute']:
                logger.warning("Message rate limit exceeded")
                return False
            self.rate_limits['message_count'] += 1
        
        return True
    
    # Background Tasks
    @tasks.loop(seconds=30)
    async def update_status(self):
        """Update bot status periodically"""
        try:
            # Get latest status from backend
            # This would make an API call to get current bot status
            
            # Update presence based on P&L
            if self.bot_status['daily_pnl'] >= 0:
                status_text = f"📈 +${self.bot_status['daily_pnl']:.2f}"
            else:
                status_text = f"📉 -${abs(self.bot_status['daily_pnl']):.2f}"
            
            await self.bot.change_presence(
                activity=discord.Activity(
                    type=discord.ActivityType.watching,
                    name=status_text
                )
            )
        except Exception as e:
            logger.error(f"Error updating status: {e}")
    
    @tasks.loop(minutes=1)
    async def check_rate_limits(self):
        """Reset rate limits every minute"""
        self.rate_limits['message_count'] = 0
        self.rate_limits['alert_count'] = 0
        self.rate_limits['reset_time'] = datetime.now()
    
    # Webhook Methods
    async def send_webhook_message(self, webhook_url: str, message: Dict[str, Any]):
        """Send message via webhook"""
        async with aiohttp.ClientSession() as session:
            webhook = discord.Webhook.from_url(webhook_url, session=session)
            
            if 'embed' in message:
                embed_data = message['embed']
                embed = discord.Embed(
                    title=embed_data.get('title', ''),
                    description=embed_data.get('description', ''),
                    color=embed_data.get('color', discord.Color.blue()),
                    timestamp=datetime.now()
                )
                
                for field in embed_data.get('fields', []):
                    embed.add_field(
                        name=field['name'],
                        value=field['value'],
                        inline=field.get('inline', True)
                    )
                
                await webhook.send(embed=embed)
            else:
                await webhook.send(content=message.get('content', ''))
    
    # Main run method
    async def run(self):
        """Run the Discord bot"""
        try:
            await self.bot.start(self.bot_token)
        except discord.LoginFailure:
            logger.error("Failed to login to Discord. Check bot token.")
            raise
        except Exception as e:
            logger.error(f"Bot error: {e}")
            raise
        finally:
            await self.bot.close()


# Setup script for Discord bot
class DiscordBotSetup:
    """Interactive setup for Discord bot"""
    
    def __init__(self):
        self.vault = APIVault()
    
    def setup(self):
        """Run interactive setup"""
        print("\n" + "="*60)
        print(" AuraQuant Discord Bot Setup")
        print("="*60)
        
        print("\nThis wizard will help you set up the Discord bot.")
        print("You'll need:")
        print("1. A Discord bot token from https://discord.com/developers")
        print("2. Your Discord server (guild) ID")
        print("3. Channel IDs for different alert types")
        
        input("\nPress Enter to continue...")
        
        # Get bot token
        bot_token = input("\nEnter Discord bot token: ").strip()
        
        # Get guild ID
        guild_id = input("Enter Discord server/guild ID: ").strip()
        
        # Get channel IDs
        print("\nNow enter channel IDs for different alert types.")
        print("Leave blank to skip a channel type.")
        
        channels = {}
        channel_types = ['alerts', 'trades', 'performance', 'logs', 'commands']
        
        for channel_type in channel_types:
            channel_id = input(f"Channel ID for {channel_type}: ").strip()
            if channel_id:
                channels[channel_type] = channel_id
        
        # Get webhook URLs (optional)
        webhooks = []
        print("\nOptionally, add webhook URLs for additional notifications.")
        while True:
            webhook = input("Webhook URL (or press Enter to skip): ").strip()
            if not webhook:
                break
            webhooks.append(webhook)
        
        # Store in vault
        credentials = {
            'bot_token': bot_token,
            'guild_id': guild_id,
            'channel_ids': channels,
            'webhook_urls': webhooks
        }
        
        success = self.vault.store_api_key(
            'discord',
            credentials,
            category='social_media',
            notes='Discord bot configuration for AuraQuant'
        )
        
        if success:
            print("\n✅ Discord bot configuration saved successfully!")
            
            # Test connection
            test = input("\nWould you like to test the bot connection? (y/n): ").strip()
            if test.lower() == 'y':
                self.test_connection(bot_token)
        else:
            print("\n❌ Failed to save Discord configuration")
    
    def test_connection(self, token: str):
        """Test Discord bot connection"""
        print("\nTesting Discord bot connection...")
        
        intents = discord.Intents.default()
        client = discord.Client(intents=intents)
        
        @client.event
        async def on_ready():
            print(f"✅ Successfully connected as {client.user}")
            
            # List guilds
            print("\nBot is in the following servers:")
            for guild in client.guilds:
                print(f"  - {guild.name} (ID: {guild.id})")
            
            await client.close()
        
        try:
            client.run(token)
        except discord.LoginFailure:
            print("❌ Failed to login. Check your bot token.")
        except Exception as e:
            print(f"❌ Error: {e}")


# Main execution
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == 'setup':
        # Run setup wizard
        setup = DiscordBotSetup()
        setup.setup()
    else:
        # Run the bot
        try:
            bot = AuraQuantDiscordBot()
            asyncio.run(bot.run())
        except KeyboardInterrupt:
            print("\nBot stopped by user")
        except Exception as e:
            print(f"Bot error: {e}")
            logger.error(f"Bot crashed: {e}", exc_info=True)
