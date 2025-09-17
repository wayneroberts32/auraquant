"""
AuraQuant SUPER_FINAL Discord Bot
Redundant notification system with Telegram mirroring
"""

import os
import asyncio
import logging
from datetime import datetime
import discord
from discord.ext import commands
from pymongo import MongoClient
import aiohttp
from dotenv import load_dotenv

load_dotenv('../.env.v8v9')

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AuraQuantDiscordBot(commands.Bot):
    def __init__(self):
        intents = discord.Intents.default()
        intents.message_content = True
        intents.guilds = True
        
        super().__init__(command_prefix='/', intents=intents)
        
        self.backend_url = os.getenv('BACKEND_URL', 'http://localhost:8000')
        self.telegram_webhook = os.getenv('TELEGRAM_WEBHOOK_URL', '')
        
        # MongoDB connection for logging
        self.mongo_client = MongoClient(os.getenv('MONGODB_URI'))
        self.db = self.mongo_client['auraquant_v8v9']
        self.bot_logs = self.db['bot_logs']
        
        # System state
        self.system_status = {
            'trading': 'active',
            'v8_mode': 'active', 
            'v9_mode': 'dormant',
            'broker': 'alpaca'
        }

    async def setup_hook(self):
        """Setup bot hooks"""
        await self.add_cog(TradingCommands(self))
        logger.info("Discord bot setup complete")

    async def on_ready(self):
        """Called when bot is ready"""
        logger.info(f'Discord bot logged in as {self.user}')
        await self.change_presence(
            activity=discord.Activity(
                type=discord.ActivityType.watching,
                name="AuraQuant V8/V9 Trading"
            )
        )
        
        # Send startup notification
        await self.send_alert("Discord bot started", "info")

    def log_command(self, command: str, user_id: int, username: str, data: dict = None):
        """Log command to MongoDB"""
        try:
            log_entry = {
                'timestamp': datetime.utcnow(),
                'bot': 'discord',
                'command': command,
                'user_id': user_id,
                'username': username,
                'data': data or {}
            }
            self.bot_logs.insert_one(log_entry)
            logger.info(f"Logged command: {command} by {username}")
        except Exception as e:
            logger.error(f"Failed to log command: {e}")

    async def mirror_to_telegram(self, message: str):
        """Mirror message to Telegram (placeholder - implement webhook)"""
        # This would typically use a webhook or Telegram API
        logger.info(f"Would mirror to Telegram: {message}")

    async def send_alert(self, message: str, alert_type: str = 'info'):
        """Send alert to Discord channels"""
        emoji = {
            'info': 'ℹ️',
            'warning': '⚠️', 
            'error': '❌',
            'success': '✅',
            'trade': '📈'
        }.get(alert_type, 'ℹ️')
        
        full_message = f"{emoji} {message}"
        
        # Send to configured channels
        for guild in self.guilds:
            for channel in guild.text_channels:
                if channel.name == 'auraquant-alerts':  # Configure channel name
                    try:
                        await channel.send(full_message)
                        logger.info(f"Alert sent to {channel.name}")
                    except Exception as e:
                        logger.error(f"Failed to send alert to {channel.name}: {e}")
        
        # Mirror to Telegram
        await self.mirror_to_telegram(full_message)
        
        # Log alert
        self.log_command('alert', 0, 'system', {'message': message, 'type': alert_type})


class TradingCommands(commands.Cog):
    """Trading commands for Discord bot"""
    
    def __init__(self, bot):
        self.bot = bot

    @commands.command(name='status')
    async def status_command(self, ctx):
        """Show system status"""
        try:
            # Get status from backend
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.bot.backend_url}/") as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        
                        embed = discord.Embed(
                            title="📊 System Status",
                            color=discord.Color.green() if self.bot.system_status['trading'] == 'active' else discord.Color.orange()
                        )
                        embed.add_field(name="Trading", value=self.bot.system_status['trading'].upper(), inline=True)
                        embed.add_field(name="V8 Mode", value=data.get('v8_mode', 'UNKNOWN'), inline=True)
                        embed.add_field(name="V9 Mode", value=data.get('v9_mode', 'UNKNOWN'), inline=True)
                        embed.add_field(name="Paper Trading", value='ON' if data.get('paper_trading') else 'OFF', inline=True)
                        embed.add_field(name="Broker", value=self.bot.system_status['broker'].upper(), inline=True)
                        embed.set_footer(text=f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
                        
                        await ctx.send(embed=embed)
                    else:
                        await ctx.send("⚠️ Backend unavailable")
        except Exception as e:
            logger.error(f"Status command error: {e}")
            await ctx.send(f"❌ Error fetching status: {str(e)}")
        
        # Log and mirror
        self.bot.log_command('status', ctx.author.id, str(ctx.author))
        await self.bot.mirror_to_telegram(f"Status requested via Discord by {ctx.author}")

    @commands.command(name='pause')
    @commands.has_role('Admin')  # Requires Admin role
    async def pause_command(self, ctx):
        """Pause trading (admin only)"""
        try:
            # Call backend to pause trading
            async with aiohttp.ClientSession() as session:
                payload = {"action": "pause", "parameters": {}}
                headers = {"Authorization": "Bearer demo-jwt-token"}  # Use real token
                async with session.post(
                    f"{self.bot.backend_url}/admin/override",
                    json=payload,
                    headers=headers
                ) as resp:
                    if resp.status == 200:
                        self.bot.system_status['trading'] = 'paused'
                        
                        embed = discord.Embed(
                            title="⏸️ Trading Paused",
                            description="Trading has been paused successfully",
                            color=discord.Color.orange()
                        )
                        await ctx.send(embed=embed)
                        msg = "Trading paused successfully"
                    else:
                        await ctx.send(f"❌ Failed to pause trading: {resp.status}")
                        msg = f"Failed to pause: {resp.status}"
        except Exception as e:
            await ctx.send(f"❌ Error: {str(e)}")
            msg = str(e)
        
        # Log and mirror
        self.bot.log_command('pause', ctx.author.id, str(ctx.author), {'result': msg})
        await self.bot.mirror_to_telegram(f"Trading paused via Discord by {ctx.author}")

    @commands.command(name='resume')
    @commands.has_role('Admin')
    async def resume_command(self, ctx):
        """Resume trading (admin only)"""
        try:
            # Call backend to resume trading
            async with aiohttp.ClientSession() as session:
                payload = {"action": "resume", "parameters": {}}
                headers = {"Authorization": "Bearer demo-jwt-token"}
                async with session.post(
                    f"{self.bot.backend_url}/admin/override",
                    json=payload,
                    headers=headers
                ) as resp:
                    if resp.status == 200:
                        self.bot.system_status['trading'] = 'active'
                        
                        embed = discord.Embed(
                            title="▶️ Trading Resumed",
                            description="Trading has been resumed successfully",
                            color=discord.Color.green()
                        )
                        await ctx.send(embed=embed)
                        msg = "Trading resumed successfully"
                    else:
                        await ctx.send(f"❌ Failed to resume trading: {resp.status}")
                        msg = f"Failed to resume: {resp.status}"
        except Exception as e:
            await ctx.send(f"❌ Error: {str(e)}")
            msg = str(e)
        
        # Log and mirror
        self.bot.log_command('resume', ctx.author.id, str(ctx.author), {'result': msg})
        await self.bot.mirror_to_telegram(f"Trading resumed via Discord by {ctx.author}")

    @commands.command(name='switch')
    @commands.has_role('Admin')
    async def switch_command(self, ctx, broker: str = None):
        """Switch broker (admin only)"""
        if not broker:
            await ctx.send("Usage: /switch <broker>\nOptions: alpaca, binance")
            return
        
        broker = broker.lower()
        if broker not in ['alpaca', 'binance']:
            await ctx.send("❌ Invalid broker. Use: alpaca or binance")
            return
        
        try:
            # Call backend to switch broker
            async with aiohttp.ClientSession() as session:
                payload = {"action": "broker_switch", "parameters": {"broker": broker}}
                headers = {"Authorization": "Bearer demo-jwt-token"}
                async with session.post(
                    f"{self.bot.backend_url}/admin/override",
                    json=payload,
                    headers=headers
                ) as resp:
                    if resp.status == 200:
                        self.bot.system_status['broker'] = broker
                        
                        embed = discord.Embed(
                            title="🔄 Broker Switched",
                            description=f"Successfully switched to {broker.upper()}",
                            color=discord.Color.blue()
                        )
                        await ctx.send(embed=embed)
                        msg = f"Switched to {broker}"
                    else:
                        await ctx.send(f"❌ Failed to switch broker: {resp.status}")
                        msg = f"Failed to switch: {resp.status}"
        except Exception as e:
            await ctx.send(f"❌ Error: {str(e)}")
            msg = str(e)
        
        # Log and mirror
        self.bot.log_command('switch', ctx.author.id, str(ctx.author), {'broker': broker, 'result': msg})
        await self.bot.mirror_to_telegram(f"Broker switched to {broker} via Discord by {ctx.author}")

    @commands.command(name='help')
    async def help_command(self, ctx):
        """Show help message"""
        embed = discord.Embed(
            title="🤖 AuraQuant Bot Commands",
            description="Available commands for AuraQuant V8/V9",
            color=discord.Color.blue()
        )
        embed.add_field(
            name="General Commands",
            value="/status - Show system status\n/help - Show this message",
            inline=False
        )
        embed.add_field(
            name="Admin Commands",
            value="/pause - Pause trading\n/resume - Resume trading\n/switch <broker> - Switch broker",
            inline=False
        )
        embed.add_field(
            name="Bot Redundancy",
            value="This bot mirrors all commands to Telegram for redundancy",
            inline=False
        )
        embed.set_footer(text="AuraQuant SUPER_FINAL")
        
        await ctx.send(embed=embed)


async def main():
    """Main function to run the bot"""
    token = os.getenv('DISCORD_BOT_TOKEN')
    if not token:
        logger.error("No Discord bot token provided")
        return
    
    bot = AuraQuantDiscordBot()
    
    try:
        logger.info("Starting Discord bot...")
        await bot.start(token)
    except KeyboardInterrupt:
        logger.info("Stopping Discord bot...")
    finally:
        await bot.close()


if __name__ == "__main__":
    asyncio.run(main())