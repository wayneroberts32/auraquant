"""
Discord Notification Handler
Sends trading signals and alerts to Discord channel
"""

import discord
from discord.ext import commands
import asyncio
import json
import os
from datetime import datetime
from typing import Dict, Any, Optional, List
import aiohttp
from collections import deque
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DiscordNotificationHandler:
    def __init__(self):
        """Initialize Discord notification handler"""
        # Load configuration
        self.token = os.getenv('DISCORD_BOT_TOKEN')
        self.channel_id = int(os.getenv('DISCORD_CHANNEL_ID', '1407369896089616635'))
        self.webhook_url = os.getenv('DISCORD_WEBHOOK_URL')
        
        # Bot settings
        self.bot_name = "AuraQuant Trading Bot"
        self.bot_avatar = "https://i.imgur.com/your-avatar.png"  # Replace with your avatar
        
        # Message queue
        self.message_queue = deque(maxlen=100)
        self.is_connected = False
        
        # Discord client
        intents = discord.Intents.default()
        intents.message_content = True
        self.bot = commands.Bot(command_prefix='!', intents=intents)
        
        # Setup bot events
        self.setup_events()
        
        # Alert colors
        self.colors = {
            'buy': 0x00ff00,      # Green
            'sell': 0xff0000,     # Red
            'alert': 0xffff00,    # Yellow
            'info': 0x0099ff,     # Blue
            'warning': 0xff9900,  # Orange
            'error': 0xff0000,    # Red
            'success': 0x00ff00,  # Green
            'critical': 0xff00ff  # Magenta
        }
        
    def setup_events(self):
        """Setup Discord bot events"""
        
        @self.bot.event
        async def on_ready():
            """Called when bot is ready"""
            logger.info(f'{self.bot.user} has connected to Discord!')
            self.is_connected = True
            
            # Set bot activity
            await self.bot.change_presence(
                activity=discord.Activity(
                    type=discord.ActivityType.watching,
                    name="AuraQuant Markets"
                )
            )
            
            # Process queued messages
            await self.process_queue()
            
        @self.bot.event
        async def on_disconnect():
            """Called when bot disconnects"""
            logger.warning('Bot disconnected from Discord')
            self.is_connected = False
            
        @self.bot.command(name='status')
        async def status(ctx):
            """Check bot status"""
            if ctx.channel.id == self.channel_id:
                await ctx.send('🟢 AuraQuant Trading Bot is online and monitoring markets!')
                
        @self.bot.command(name='balance')
        async def balance(ctx):
            """Get account balance"""
            if ctx.channel.id == self.channel_id:
                # Fetch balance from backend
                balance_info = await self.fetch_balance()
                embed = self.create_balance_embed(balance_info)
                await ctx.send(embed=embed)
                
        @self.bot.command(name='positions')
        async def positions(ctx):
            """Get open positions"""
            if ctx.channel.id == self.channel_id:
                positions_info = await self.fetch_positions()
                embed = self.create_positions_embed(positions_info)
                await ctx.send(embed=embed)
                
        @self.bot.command(name='alerts')
        async def alerts(ctx, action: str = 'list'):
            """Manage alerts (list/pause/resume)"""
            if ctx.channel.id == self.channel_id:
                if action == 'pause':
                    await ctx.send('⏸️ Alerts paused')
                elif action == 'resume':
                    await ctx.send('▶️ Alerts resumed')
                else:
                    await ctx.send('📊 Active alerts: All TradingView webhooks')
                    
    async def start(self):
        """Start the Discord bot"""
        try:
            if self.token:
                await self.bot.start(self.token)
            else:
                logger.error("Discord bot token not found!")
        except Exception as e:
            logger.error(f"Failed to start Discord bot: {e}")
            
    async def stop(self):
        """Stop the Discord bot"""
        await self.bot.close()
        
    async def send_trading_signal(self, signal: Dict[str, Any]):
        """
        Send trading signal to Discord
        
        Args:
            signal: Trading signal data
        """
        try:
            # Create embed for trading signal
            embed = self.create_signal_embed(signal)
            
            if self.is_connected:
                channel = self.bot.get_channel(self.channel_id)
                if channel:
                    # Send main signal
                    message = await channel.send(embed=embed)
                    
                    # Add reaction buttons for manual traders
                    if signal.get('requires_manual', False):
                        await message.add_reaction('✅')  # Execute
                        await message.add_reaction('❌')  # Skip
                        await message.add_reaction('⏰')  # Snooze
                        
                    logger.info(f"Signal sent to Discord: {signal.get('symbol')}")
                else:
                    logger.error(f"Channel {self.channel_id} not found")
                    self.queue_message(embed)
            else:
                # Queue message if not connected
                self.queue_message(embed)
                
            # Also send via webhook if available
            if self.webhook_url:
                await self.send_webhook(embed)
                
        except Exception as e:
            logger.error(f"Error sending trading signal: {e}")
            
    def create_signal_embed(self, signal: Dict[str, Any]) -> discord.Embed:
        """Create Discord embed for trading signal"""
        
        # Determine color based on action
        action = signal.get('action', 'info').lower()
        color = self.colors.get(action, self.colors['info'])
        
        # Create embed
        embed = discord.Embed(
            title=f"🎯 {signal.get('action', 'SIGNAL').upper()} Signal - {signal.get('symbol', 'N/A')}",
            color=color,
            timestamp=datetime.utcnow()
        )
        
        # Add signal details
        embed.add_field(
            name="Entry Price",
            value=f"${signal.get('entry', 'Market')}",
            inline=True
        )
        
        embed.add_field(
            name="Stop Loss",
            value=f"${signal.get('stop_loss', 'N/A')}",
            inline=True
        )
        
        embed.add_field(
            name="Take Profit",
            value=f"${signal.get('take_profit', 'N/A')}",
            inline=True
        )
        
        # Add additional info
        if signal.get('confidence'):
            embed.add_field(
                name="Confidence",
                value=f"{signal['confidence']}%",
                inline=True
            )
            
        if signal.get('timeframe'):
            embed.add_field(
                name="Timeframe",
                value=signal['timeframe'],
                inline=True
            )
            
        if signal.get('strategy'):
            embed.add_field(
                name="Strategy",
                value=signal['strategy'],
                inline=True
            )
            
        # Add source
        embed.add_field(
            name="Source",
            value=signal.get('source', 'TradingView'),
            inline=False
        )
        
        # Add message if present
        if signal.get('message'):
            embed.add_field(
                name="Notes",
                value=signal['message'],
                inline=False
            )
            
        # Add risk metrics
        if signal.get('risk_reward'):
            embed.add_field(
                name="Risk/Reward",
                value=f"1:{signal['risk_reward']}",
                inline=True
            )
            
        # Manual action required
        if signal.get('requires_manual', False):
            embed.add_field(
                name="⚠️ Action Required",
                value="Manual execution needed on broker platform",
                inline=False
            )
            
        # Set footer
        embed.set_footer(
            text=f"AuraQuant • {signal.get('broker', 'Multi-Broker')}",
            icon_url=self.bot_avatar
        )
        
        return embed
        
    async def send_alert(self, 
                         title: str, 
                         message: str, 
                         alert_type: str = 'info',
                         fields: Optional[Dict[str, str]] = None):
        """
        Send general alert to Discord
        
        Args:
            title: Alert title
            message: Alert message
            alert_type: Type of alert (info, warning, error, success)
            fields: Additional fields to include
        """
        try:
            color = self.colors.get(alert_type, self.colors['info'])
            
            embed = discord.Embed(
                title=title,
                description=message,
                color=color,
                timestamp=datetime.utcnow()
            )
            
            # Add fields if provided
            if fields:
                for name, value in fields.items():
                    embed.add_field(name=name, value=value, inline=True)
                    
            embed.set_footer(text="AuraQuant Alert System")
            
            if self.is_connected:
                channel = self.bot.get_channel(self.channel_id)
                if channel:
                    await channel.send(embed=embed)
            else:
                self.queue_message(embed)
                
        except Exception as e:
            logger.error(f"Error sending alert: {e}")
            
    async def send_performance_update(self, stats: Dict[str, Any]):
        """Send daily performance update"""
        
        embed = discord.Embed(
            title="📊 Daily Performance Report",
            color=self.colors['info'],
            timestamp=datetime.utcnow()
        )
        
        # Add performance metrics
        embed.add_field(
            name="P&L Today",
            value=f"${stats.get('pnl_today', 0):,.2f}",
            inline=True
        )
        
        embed.add_field(
            name="Win Rate",
            value=f"{stats.get('win_rate', 0):.1f}%",
            inline=True
        )
        
        embed.add_field(
            name="Total Trades",
            value=stats.get('total_trades', 0),
            inline=True
        )
        
        embed.add_field(
            name="Account Balance",
            value=f"${stats.get('balance', 0):,.2f}",
            inline=True
        )
        
        embed.add_field(
            name="Open Positions",
            value=stats.get('open_positions', 0),
            inline=True
        )
        
        embed.add_field(
            name="Bot Status",
            value="🟢 Active" if stats.get('bot_active', False) else "🔴 Inactive",
            inline=True
        )
        
        # Add top performers
        if stats.get('top_performers'):
            performers = "\n".join([
                f"{i+1}. {p['symbol']}: +{p['gain']:.2f}%"
                for i, p in enumerate(stats['top_performers'][:3])
            ])
            embed.add_field(
                name="🏆 Top Performers",
                value=performers or "N/A",
                inline=False
            )
            
        embed.set_footer(text="AuraQuant Daily Report")
        
        if self.is_connected:
            channel = self.bot.get_channel(self.channel_id)
            if channel:
                await channel.send(embed=embed)
                
    async def send_webhook(self, embed: discord.Embed):
        """Send message via webhook (backup method)"""
        if not self.webhook_url:
            return
            
        try:
            webhook_data = {
                "embeds": [embed.to_dict()]
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.webhook_url,
                    json=webhook_data
                ) as response:
                    if response.status != 204:
                        logger.error(f"Webhook failed: {response.status}")
                        
        except Exception as e:
            logger.error(f"Webhook error: {e}")
            
    def queue_message(self, embed: discord.Embed):
        """Queue message for later sending"""
        self.message_queue.append({
            'embed': embed,
            'timestamp': datetime.utcnow()
        })
        logger.info("Message queued for sending")
        
    async def process_queue(self):
        """Process queued messages"""
        if not self.is_connected:
            return
            
        channel = self.bot.get_channel(self.channel_id)
        if not channel:
            return
            
        processed = 0
        while self.message_queue and processed < 10:  # Limit to 10 messages at once
            msg = self.message_queue.popleft()
            try:
                await channel.send(embed=msg['embed'])
                processed += 1
                await asyncio.sleep(1)  # Rate limiting
            except Exception as e:
                logger.error(f"Error processing queued message: {e}")
                
        if processed > 0:
            logger.info(f"Processed {processed} queued messages")
            
    async def fetch_balance(self) -> Dict[str, Any]:
        """Fetch account balance from backend"""
        # TODO: Implement backend API call
        return {
            'total': 10000.00,
            'available': 8500.00,
            'margin_used': 1500.00,
            'pnl_today': 250.00
        }
        
    async def fetch_positions(self) -> List[Dict[str, Any]]:
        """Fetch open positions from backend"""
        # TODO: Implement backend API call
        return []
        
    def create_balance_embed(self, balance: Dict[str, Any]) -> discord.Embed:
        """Create balance embed"""
        
        embed = discord.Embed(
            title="💰 Account Balance",
            color=self.colors['info'],
            timestamp=datetime.utcnow()
        )
        
        embed.add_field(
            name="Total Balance",
            value=f"${balance.get('total', 0):,.2f}",
            inline=True
        )
        
        embed.add_field(
            name="Available",
            value=f"${balance.get('available', 0):,.2f}",
            inline=True
        )
        
        embed.add_field(
            name="Margin Used",
            value=f"${balance.get('margin_used', 0):,.2f}",
            inline=True
        )
        
        pnl = balance.get('pnl_today', 0)
        pnl_emoji = "📈" if pnl >= 0 else "📉"
        embed.add_field(
            name=f"{pnl_emoji} P&L Today",
            value=f"${pnl:+,.2f}",
            inline=False
        )
        
        return embed
        
    def create_positions_embed(self, positions: List[Dict[str, Any]]) -> discord.Embed:
        """Create positions embed"""
        
        embed = discord.Embed(
            title="📊 Open Positions",
            color=self.colors['info'],
            timestamp=datetime.utcnow()
        )
        
        if not positions:
            embed.description = "No open positions"
        else:
            for pos in positions[:10]:  # Limit to 10 positions
                pnl = pos.get('unrealized_pnl', 0)
                pnl_emoji = "🟢" if pnl >= 0 else "🔴"
                
                embed.add_field(
                    name=f"{pnl_emoji} {pos['symbol']}",
                    value=(
                        f"Side: {pos['side']}\n"
                        f"Qty: {pos['quantity']}\n"
                        f"Entry: ${pos['entry_price']:.2f}\n"
                        f"P&L: ${pnl:+,.2f}"
                    ),
                    inline=True
                )
                
        return embed


# Singleton instance
discord_handler = None

async def initialize_discord():
    """Initialize Discord handler"""
    global discord_handler
    discord_handler = DiscordNotificationHandler()
    
    # Start bot in background
    asyncio.create_task(discord_handler.start())
    
    return discord_handler
    
async def send_signal(signal: Dict[str, Any]):
    """Send trading signal to Discord"""
    if discord_handler:
        await discord_handler.send_trading_signal(signal)
    else:
        logger.error("Discord handler not initialized")
        
async def send_alert(title: str, message: str, alert_type: str = 'info'):
    """Send alert to Discord"""
    if discord_handler:
        await discord_handler.send_alert(title, message, alert_type)
    else:
        logger.error("Discord handler not initialized")


if __name__ == "__main__":
    # Test Discord handler
    async def test():
        handler = DiscordNotificationHandler()
        
        # Test signal
        test_signal = {
            'symbol': 'AAPL',
            'action': 'BUY',
            'entry': 150.50,
            'stop_loss': 148.00,
            'take_profit': 155.00,
            'confidence': 85,
            'timeframe': '1H',
            'strategy': 'Momentum',
            'source': 'TradingView',
            'requires_manual': True,
            'message': 'Strong bullish momentum detected'
        }
        
        await handler.send_trading_signal(test_signal)
        
        # Keep bot running
        await asyncio.Event().wait()
        
    asyncio.run(test())
