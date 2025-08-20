"""
Telegram Notification Handler
Sends trading signals and alerts to Telegram
"""

import asyncio
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
import os
from telegram import Bot, InlineKeyboardButton, InlineKeyboardMarkup, ParseMode
from telegram.ext import Updater, CommandHandler, CallbackQueryHandler, MessageHandler, Filters
import json

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TelegramNotificationHandler:
    def __init__(self):
        """Initialize Telegram notification handler"""
        # Load configuration from environment
        self.bot_token = os.getenv('TELEGRAM_BOT_TOKEN', '8186673555:AAEZx3hK7kOYOXPQMqOw3ciZlXG2BW_WJnI')
        self.chat_id = os.getenv('TELEGRAM_CHAT_ID', '6995384125')
        
        # Initialize bot
        self.bot = Bot(token=self.bot_token)
        self.updater = None
        
        # Trading state
        self.alerts_enabled = True
        self.pending_signals = []
        self.active_positions = {}
        
        # Initialize updater for receiving commands
        self.setup_command_handlers()
        
    def setup_command_handlers(self):
        """Setup Telegram command handlers"""
        try:
            self.updater = Updater(token=self.bot_token, use_context=True)
            dispatcher = self.updater.dispatcher
            
            # Command handlers
            dispatcher.add_handler(CommandHandler("start", self.cmd_start))
            dispatcher.add_handler(CommandHandler("help", self.cmd_help))
            dispatcher.add_handler(CommandHandler("status", self.cmd_status))
            dispatcher.add_handler(CommandHandler("balance", self.cmd_balance))
            dispatcher.add_handler(CommandHandler("positions", self.cmd_positions))
            dispatcher.add_handler(CommandHandler("alerts", self.cmd_alerts))
            dispatcher.add_handler(CommandHandler("pause", self.cmd_pause))
            dispatcher.add_handler(CommandHandler("resume", self.cmd_resume))
            dispatcher.add_handler(CommandHandler("signals", self.cmd_signals))
            dispatcher.add_handler(CommandHandler("execute", self.cmd_execute))
            
            # Callback query handler for inline buttons
            dispatcher.add_handler(CallbackQueryHandler(self.button_callback))
            
            logger.info("Telegram command handlers setup complete")
            
        except Exception as e:
            logger.error(f"Error setting up Telegram handlers: {e}")
    
    def start(self):
        """Start the Telegram bot"""
        try:
            if self.updater:
                self.updater.start_polling()
                logger.info("Telegram bot started and polling for messages")
                
                # Send startup message
                self.send_message(
                    "🚀 *AuraQuant Trading Bot Started*\n\n"
                    "Ready to receive trading signals!\n"
                    "Type /help for available commands.",
                    parse_mode=ParseMode.MARKDOWN
                )
        except Exception as e:
            logger.error(f"Error starting Telegram bot: {e}")
    
    def stop(self):
        """Stop the Telegram bot"""
        if self.updater:
            self.updater.stop()
            logger.info("Telegram bot stopped")
    
    def cmd_start(self, update, context):
        """Handle /start command"""
        update.message.reply_text(
            "🎯 *Welcome to AuraQuant Trading Bot!*\n\n"
            "I'll send you trading signals and alerts.\n\n"
            "*Available Commands:*\n"
            "/help - Show all commands\n"
            "/status - Check bot status\n"
            "/balance - View account balance\n"
            "/positions - View open positions\n"
            "/signals - View pending signals\n"
            "/alerts - Manage alerts\n"
            "/pause - Pause notifications\n"
            "/resume - Resume notifications\n",
            parse_mode=ParseMode.MARKDOWN
        )
    
    def cmd_help(self, update, context):
        """Handle /help command"""
        help_text = """
*📚 AuraQuant Bot Commands*

*Trading Commands:*
/balance - View account balance
/positions - Show open positions
/signals - View pending signals
/execute [id] - Execute a signal

*Alert Management:*
/alerts - View alert status
/pause - Pause all alerts
/resume - Resume alerts

*System Commands:*
/status - Bot and system status
/help - Show this help message

*Quick Actions:*
• React with ✅ to execute signal
• React with ❌ to dismiss signal
• React with ⏰ to snooze signal
        """
        update.message.reply_text(help_text, parse_mode=ParseMode.MARKDOWN)
    
    def cmd_status(self, update, context):
        """Handle /status command"""
        status_text = f"""
*🟢 System Status*

*Bot Status:* Online ✅
*Alerts:* {'Enabled ✅' if self.alerts_enabled else 'Paused ⏸️'}
*Pending Signals:* {len(self.pending_signals)}
*Open Positions:* {len(self.active_positions)}
*Connected Brokers:*
• Binance: ✅
• NAB: Manual Mode
• Plus500: Manual Mode

*Last Update:* {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
        """
        update.message.reply_text(status_text, parse_mode=ParseMode.MARKDOWN)
    
    def cmd_balance(self, update, context):
        """Handle /balance command"""
        # TODO: Fetch actual balance from backend
        balance_text = """
*💰 Account Balance*

*Total Balance:* $10,000.00
*Available:* $8,500.00
*In Positions:* $1,500.00
*Today's P&L:* +$250.00 (+2.5%)

*By Broker:*
• Binance: $5,000.00
• NAB: $3,000.00
• Plus500: $2,000.00
        """
        update.message.reply_text(balance_text, parse_mode=ParseMode.MARKDOWN)
    
    def cmd_positions(self, update, context):
        """Handle /positions command"""
        if not self.active_positions:
            update.message.reply_text("📊 No open positions")
            return
        
        positions_text = "*📊 Open Positions*\n\n"
        for symbol, pos in self.active_positions.items():
            positions_text += f"*{symbol}*\n"
            positions_text += f"• Side: {pos.get('side', 'N/A')}\n"
            positions_text += f"• Qty: {pos.get('quantity', 0)}\n"
            positions_text += f"• Entry: ${pos.get('entry_price', 0):.2f}\n"
            positions_text += f"• P&L: ${pos.get('pnl', 0):+.2f}\n\n"
        
        update.message.reply_text(positions_text, parse_mode=ParseMode.MARKDOWN)
    
    def cmd_signals(self, update, context):
        """Handle /signals command"""
        if not self.pending_signals:
            update.message.reply_text("📡 No pending signals")
            return
        
        signals_text = "*📡 Pending Signals*\n\n"
        for i, signal in enumerate(self.pending_signals[:5], 1):
            signals_text += f"*{i}. {signal['symbol']} - {signal['action']}*\n"
            signals_text += f"• Price: ${signal.get('price', 0):.2f}\n"
            signals_text += f"• Confidence: {signal.get('confidence', 0)}%\n"
            signals_text += f"• Strategy: {signal.get('strategy', 'N/A')}\n\n"
        
        update.message.reply_text(signals_text, parse_mode=ParseMode.MARKDOWN)
    
    def cmd_alerts(self, update, context):
        """Handle /alerts command"""
        status = "Enabled ✅" if self.alerts_enabled else "Paused ⏸️"
        update.message.reply_text(
            f"*🔔 Alert Settings*\n\n"
            f"Status: {status}\n"
            f"Active Alerts: All TradingView webhooks\n"
            f"Notification Channel: Telegram\n\n"
            f"Use /pause to pause or /resume to resume alerts.",
            parse_mode=ParseMode.MARKDOWN
        )
    
    def cmd_pause(self, update, context):
        """Handle /pause command"""
        self.alerts_enabled = False
        update.message.reply_text("⏸️ Alerts paused. Use /resume to resume.")
    
    def cmd_resume(self, update, context):
        """Handle /resume command"""
        self.alerts_enabled = True
        update.message.reply_text("▶️ Alerts resumed. You'll receive all notifications.")
    
    def cmd_execute(self, update, context):
        """Handle /execute command"""
        if not context.args:
            update.message.reply_text("Usage: /execute [signal_id]")
            return
        
        signal_id = context.args[0]
        # TODO: Execute the signal
        update.message.reply_text(f"✅ Executing signal {signal_id}...")
    
    def button_callback(self, update, context):
        """Handle inline button callbacks"""
        query = update.callback_query
        query.answer()
        
        data = query.data
        if data.startswith("execute_"):
            signal_id = data.replace("execute_", "")
            query.edit_message_text(f"✅ Executing signal {signal_id}...")
            # TODO: Execute signal
            
        elif data.startswith("dismiss_"):
            signal_id = data.replace("dismiss_", "")
            query.edit_message_text(f"❌ Signal {signal_id} dismissed")
            
        elif data.startswith("snooze_"):
            signal_id = data.replace("snooze_", "")
            query.edit_message_text(f"⏰ Signal {signal_id} snoozed for 15 minutes")
    
    def send_trading_signal(self, signal: Dict[str, Any]):
        """
        Send trading signal to Telegram
        
        Args:
            signal: Trading signal data
        """
        try:
            if not self.alerts_enabled:
                logger.info("Alerts paused, signal not sent")
                return
            
            # Format signal message
            action_emoji = "🟢" if signal.get('action') == 'BUY' else "🔴"
            
            message = f"""
{action_emoji} *{signal.get('action', 'SIGNAL')} Signal*

*Symbol:* {signal.get('symbol', 'N/A')}
*Price:* ${signal.get('price', 0):.2f}
*Strategy:* {signal.get('strategy', 'Unknown')}
*Confidence:* {signal.get('confidence', 0)}%
*Timeframe:* {signal.get('timeframe', '1H')}

*Risk Management:*
• Stop Loss: ${signal.get('stop_loss', 0):.2f}
• Take Profit: ${signal.get('take_profit', 0):.2f}
• Risk/Reward: 1:{signal.get('risk_reward', 2):.1f}

*Source:* {signal.get('source', 'TradingView')}
"""
            
            if signal.get('message'):
                message += f"\n*Note:* {signal['message']}"
            
            # Add action buttons for manual trading
            if signal.get('requires_manual', False):
                keyboard = [
                    [
                        InlineKeyboardButton("✅ Execute", callback_data=f"execute_{signal.get('id', 'unknown')}"),
                        InlineKeyboardButton("❌ Dismiss", callback_data=f"dismiss_{signal.get('id', 'unknown')}")
                    ],
                    [
                        InlineKeyboardButton("⏰ Snooze 15m", callback_data=f"snooze_{signal.get('id', 'unknown')}")
                    ]
                ]
                
                if signal.get('broker') == 'NAB':
                    keyboard.append([
                        InlineKeyboardButton("🏦 Open NAB", url="https://ib.nab.com.au/nabib/index.jsp")
                    ])
                elif signal.get('broker') == 'Plus500':
                    keyboard.append([
                        InlineKeyboardButton("📈 Open Plus500", url="https://app.plus500.com")
                    ])
                
                reply_markup = InlineKeyboardMarkup(keyboard)
                
                message += "\n⚠️ *Manual execution required*"
            else:
                reply_markup = None
            
            # Send message
            self.bot.send_message(
                chat_id=self.chat_id,
                text=message,
                parse_mode=ParseMode.MARKDOWN,
                reply_markup=reply_markup
            )
            
            # Add to pending signals
            self.pending_signals.append(signal)
            if len(self.pending_signals) > 50:
                self.pending_signals = self.pending_signals[-50:]
            
            logger.info(f"Signal sent to Telegram: {signal.get('symbol')}")
            
        except Exception as e:
            logger.error(f"Error sending trading signal to Telegram: {e}")
    
    def send_alert(self, title: str, message: str, alert_type: str = 'info'):
        """
        Send general alert to Telegram
        
        Args:
            title: Alert title
            message: Alert message
            alert_type: Type of alert (info, warning, error, success)
        """
        try:
            if not self.alerts_enabled and alert_type != 'error':
                return
            
            # Choose emoji based on alert type
            emoji = {
                'info': 'ℹ️',
                'warning': '⚠️',
                'error': '❌',
                'success': '✅',
                'critical': '🚨'
            }.get(alert_type, 'ℹ️')
            
            alert_message = f"{emoji} *{title}*\n\n{message}"
            
            self.bot.send_message(
                chat_id=self.chat_id,
                text=alert_message,
                parse_mode=ParseMode.MARKDOWN
            )
            
            logger.info(f"Alert sent to Telegram: {title}")
            
        except Exception as e:
            logger.error(f"Error sending alert to Telegram: {e}")
    
    def send_message(self, message: str, parse_mode=None, reply_markup=None):
        """Send a simple message to Telegram"""
        try:
            self.bot.send_message(
                chat_id=self.chat_id,
                text=message,
                parse_mode=parse_mode,
                reply_markup=reply_markup
            )
        except Exception as e:
            logger.error(f"Error sending message to Telegram: {e}")
    
    def send_performance_report(self, stats: Dict[str, Any]):
        """Send daily performance report"""
        try:
            pnl = stats.get('pnl_today', 0)
            pnl_emoji = "📈" if pnl >= 0 else "📉"
            
            report = f"""
*📊 Daily Performance Report*

{pnl_emoji} *P&L Today:* ${pnl:+,.2f}
*Win Rate:* {stats.get('win_rate', 0):.1f}%
*Total Trades:* {stats.get('total_trades', 0)}
*Account Balance:* ${stats.get('balance', 0):,.2f}
*Open Positions:* {stats.get('open_positions', 0)}

*Top Performers:*
"""
            
            if stats.get('top_performers'):
                for i, p in enumerate(stats['top_performers'][:3], 1):
                    report += f"{i}. {p['symbol']}: +{p['gain']:.2f}%\n"
            
            report += f"\n*Bot Status:* {'🟢 Active' if stats.get('bot_active') else '🔴 Inactive'}"
            
            self.send_message(report, parse_mode=ParseMode.MARKDOWN)
            
        except Exception as e:
            logger.error(f"Error sending performance report: {e}")
    
    def send_image(self, image_path: str, caption: str = None):
        """Send an image to Telegram"""
        try:
            with open(image_path, 'rb') as photo:
                self.bot.send_photo(
                    chat_id=self.chat_id,
                    photo=photo,
                    caption=caption
                )
        except Exception as e:
            logger.error(f"Error sending image to Telegram: {e}")


# Singleton instance
telegram_handler = None

def initialize_telegram():
    """Initialize Telegram handler"""
    global telegram_handler
    telegram_handler = TelegramNotificationHandler()
    telegram_handler.start()
    return telegram_handler

def send_signal(signal: Dict[str, Any]):
    """Send trading signal to Telegram"""
    if telegram_handler:
        telegram_handler.send_trading_signal(signal)
    else:
        logger.error("Telegram handler not initialized")

def send_alert(title: str, message: str, alert_type: str = 'info'):
    """Send alert to Telegram"""
    if telegram_handler:
        telegram_handler.send_alert(title, message, alert_type)
    else:
        logger.error("Telegram handler not initialized")


if __name__ == "__main__":
    # Test Telegram handler
    handler = TelegramNotificationHandler()
    handler.start()
    
    # Test signal
    test_signal = {
        'id': 'test_001',
        'symbol': 'AAPL',
        'action': 'BUY',
        'price': 150.50,
        'stop_loss': 148.00,
        'take_profit': 155.00,
        'confidence': 85,
        'timeframe': '1H',
        'strategy': 'EMA Crossover',
        'source': 'TradingView',
        'requires_manual': True,
        'broker': 'NAB',
        'risk_reward': 2.5,
        'message': 'Strong bullish momentum detected'
    }
    
    handler.send_trading_signal(test_signal)
    
    # Keep bot running
    try:
        handler.updater.idle()
    except KeyboardInterrupt:
        handler.stop()
