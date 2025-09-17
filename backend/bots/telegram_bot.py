"""
AuraQuant SUPER_FINAL Telegram Bot
Redundant notification system with Discord mirroring
"""

import os
import asyncio
import logging
from datetime import datetime
from typing import Optional
import telegram
from telegram import Update, Bot
from telegram.ext import Application, CommandHandler, ContextTypes, MessageHandler, filters
from pymongo import MongoClient
import json
import aiohttp
from dotenv import load_dotenv

load_dotenv('../.env.v8v9')

# Configure logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

class AuraQuantTelegramBot:
    def __init__(self):
        self.token = os.getenv('TELEGRAM_BOT_TOKEN', '')
        self.chat_id = os.getenv('TELEGRAM_CHAT_ID', '')
        self.backend_url = os.getenv('BACKEND_URL', 'http://localhost:8000')
        self.discord_webhook = os.getenv('DISCORD_WEBHOOK_URL', '')
        
        # MongoDB connection for logging
        self.mongo_client = MongoClient(os.getenv('MONGODB_URI'))
        self.db = self.mongo_client['auraquant_v8v9']
        self.bot_logs = self.db['bot_logs']
        
        # Bot instance
        self.bot = None
        self.app = None
        
        # System state
        self.system_status = {
            'trading': 'active',
            'v8_mode': 'active',
            'v9_mode': 'dormant',
            'broker': 'alpaca'
        }

    async def start_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /start command"""
        user = update.effective_user
        await update.message.reply_text(
            f"🚀 AuraQuant V8/V9 Bot Active\n"
            f"Welcome {user.first_name}!\n\n"
            f"Commands:\n"
            f"/status - System status\n"
            f"/pause - Pause trading\n"
            f"/resume - Resume trading\n"
            f"/switch <broker> - Switch broker\n"
            f"/help - Show this message"
        )
        
        # Log to MongoDB
        self.log_command('start', user.id, user.username)
        
        # Mirror to Discord
        await self.mirror_to_discord(f"Telegram bot started by {user.username}")

    async def status_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /status command"""
        try:
            # Get status from backend
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.backend_url}/") as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        status_msg = (
                            f"📊 **System Status**\n"
                            f"Trading: {self.system_status['trading'].upper()}\n"
                            f"V8 Mode: {data.get('v8_mode', 'UNKNOWN')}\n"
                            f"V9 Mode: {data.get('v9_mode', 'UNKNOWN')}\n"
                            f"Paper Trading: {'ON' if data.get('paper_trading') else 'OFF'}\n"
                            f"Broker: {self.system_status['broker'].upper()}\n"
                            f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
                        )
                    else:
                        status_msg = "⚠️ Backend unavailable"
        except Exception as e:
            logger.error(f"Status command error: {e}")
            status_msg = f"❌ Error fetching status: {str(e)}"
        
        await update.message.reply_text(status_msg, parse_mode='Markdown')
        
        # Log and mirror
        self.log_command('status', update.effective_user.id, update.effective_user.username)
        await self.mirror_to_discord(f"Status requested via Telegram:\n{status_msg}")

    async def pause_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /pause command"""
        user = update.effective_user
        
        # Check admin permission (simple check - enhance for production)
        if user.username != 'wayne_admin':  # Replace with actual admin check
            await update.message.reply_text("⛔ Unauthorized: Admin access required")
            return
        
        try:
            # Call backend to pause trading
            async with aiohttp.ClientSession() as session:
                payload = {"action": "pause", "parameters": {}}
                headers = {"Authorization": "Bearer demo-jwt-token"}  # Use real token
                async with session.post(
                    f"{self.backend_url}/admin/override",
                    json=payload,
                    headers=headers
                ) as resp:
                    if resp.status == 200:
                        self.system_status['trading'] = 'paused'
                        msg = "⏸️ Trading PAUSED successfully"
                    else:
                        msg = f"❌ Failed to pause trading: {resp.status}"
        except Exception as e:
            msg = f"❌ Error: {str(e)}"
        
        await update.message.reply_text(msg)
        
        # Log and mirror
        self.log_command('pause', user.id, user.username, {'result': msg})
        await self.mirror_to_discord(f"Trading paused via Telegram by {user.username}")

    async def resume_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /resume command"""
        user = update.effective_user
        
        # Check admin permission
        if user.username != 'wayne_admin':
            await update.message.reply_text("⛔ Unauthorized: Admin access required")
            return
        
        try:
            # Call backend to resume trading
            async with aiohttp.ClientSession() as session:
                payload = {"action": "resume", "parameters": {}}
                headers = {"Authorization": "Bearer demo-jwt-token"}
                async with session.post(
                    f"{self.backend_url}/admin/override",
                    json=payload,
                    headers=headers
                ) as resp:
                    if resp.status == 200:
                        self.system_status['trading'] = 'active'
                        msg = "▶️ Trading RESUMED successfully"
                    else:
                        msg = f"❌ Failed to resume trading: {resp.status}"
        except Exception as e:
            msg = f"❌ Error: {str(e)}"
        
        await update.message.reply_text(msg)
        
        # Log and mirror
        self.log_command('resume', user.id, user.username, {'result': msg})
        await self.mirror_to_discord(f"Trading resumed via Telegram by {user.username}")

    async def switch_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /switch <broker> command"""
        user = update.effective_user
        
        # Check admin permission
        if user.username != 'wayne_admin':
            await update.message.reply_text("⛔ Unauthorized: Admin access required")
            return
        
        if not context.args:
            await update.message.reply_text("Usage: /switch <broker>\nOptions: alpaca, binance")
            return
        
        broker = context.args[0].lower()
        if broker not in ['alpaca', 'binance']:
            await update.message.reply_text("❌ Invalid broker. Use: alpaca or binance")
            return
        
        try:
            # Call backend to switch broker
            async with aiohttp.ClientSession() as session:
                payload = {"action": "broker_switch", "parameters": {"broker": broker}}
                headers = {"Authorization": "Bearer demo-jwt-token"}
                async with session.post(
                    f"{self.backend_url}/admin/override",
                    json=payload,
                    headers=headers
                ) as resp:
                    if resp.status == 200:
                        self.system_status['broker'] = broker
                        msg = f"🔄 Switched to {broker.upper()} successfully"
                    else:
                        msg = f"❌ Failed to switch broker: {resp.status}"
        except Exception as e:
            msg = f"❌ Error: {str(e)}"
        
        await update.message.reply_text(msg)
        
        # Log and mirror
        self.log_command('switch', user.id, user.username, {'broker': broker, 'result': msg})
        await self.mirror_to_discord(f"Broker switched to {broker} via Telegram by {user.username}")

    async def help_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /help command"""
        help_text = (
            "🤖 **AuraQuant Bot Commands**\n\n"
            "/status - Show system status\n"
            "/pause - Pause trading (admin only)\n"
            "/resume - Resume trading (admin only)\n"
            "/switch <broker> - Switch broker (admin only)\n"
            "/help - Show this message\n\n"
            "Bot Redundancy: This bot mirrors all commands to Discord"
        )
        await update.message.reply_text(help_text, parse_mode='Markdown')

    def log_command(self, command: str, user_id: int, username: str, data: dict = None):
        """Log command to MongoDB"""
        try:
            log_entry = {
                'timestamp': datetime.utcnow(),
                'bot': 'telegram',
                'command': command,
                'user_id': user_id,
                'username': username,
                'data': data or {}
            }
            self.bot_logs.insert_one(log_entry)
            logger.info(f"Logged command: {command} by {username}")
        except Exception as e:
            logger.error(f"Failed to log command: {e}")

    async def mirror_to_discord(self, message: str):
        """Mirror message to Discord webhook"""
        if not self.discord_webhook:
            return
        
        try:
            async with aiohttp.ClientSession() as session:
                payload = {
                    'content': f"[Telegram Mirror] {message}",
                    'username': 'AuraQuant Telegram Bot'
                }
                await session.post(self.discord_webhook, json=payload)
                logger.info("Mirrored to Discord successfully")
        except Exception as e:
            logger.error(f"Failed to mirror to Discord: {e}")

    async def send_alert(self, message: str, alert_type: str = 'info'):
        """Send alert to Telegram and mirror to Discord"""
        emoji = {
            'info': 'ℹ️',
            'warning': '⚠️',
            'error': '❌',
            'success': '✅',
            'trade': '📈'
        }.get(alert_type, 'ℹ️')
        
        full_message = f"{emoji} {message}"
        
        try:
            # Send to Telegram
            if self.bot and self.chat_id:
                await self.bot.send_message(chat_id=self.chat_id, text=full_message)
            
            # Mirror to Discord
            await self.mirror_to_discord(full_message)
            
            # Log alert
            self.log_command('alert', 0, 'system', {'message': message, 'type': alert_type})
        except Exception as e:
            logger.error(f"Failed to send alert: {e}")

    async def run(self):
        """Start the bot"""
        if not self.token:
            logger.error("No Telegram bot token provided")
            return
        
        # Create application
        self.app = Application.builder().token(self.token).build()
        self.bot = self.app.bot
        
        # Add command handlers
        self.app.add_handler(CommandHandler("start", self.start_command))
        self.app.add_handler(CommandHandler("status", self.status_command))
        self.app.add_handler(CommandHandler("pause", self.pause_command))
        self.app.add_handler(CommandHandler("resume", self.resume_command))
        self.app.add_handler(CommandHandler("switch", self.switch_command))
        self.app.add_handler(CommandHandler("help", self.help_command))
        
        logger.info("Starting Telegram bot...")
        
        # Start polling
        await self.app.initialize()
        await self.app.start()
        await self.app.updater.start_polling()
        
        # Keep running
        logger.info("Telegram bot is running. Press Ctrl+C to stop.")
        try:
            while True:
                await asyncio.sleep(60)
                # Periodic health check
                await self.send_alert("Bot health check - Running", "info")
        except KeyboardInterrupt:
            logger.info("Stopping bot...")
        finally:
            await self.app.updater.stop()
            await self.app.stop()
            await self.app.shutdown()

if __name__ == "__main__":
    bot = AuraQuantTelegramBot()
    asyncio.run(bot.run())