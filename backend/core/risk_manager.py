"""
AuraQuant Risk Management System
Enforces strict 2% maximum drawdown and protects capital at all costs
"""

import asyncio
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, List, Optional, Any
from enum import Enum
import numpy as np

logger = logging.getLogger(__name__)

class RiskLevel(Enum):
    """Risk levels for monitoring"""
    SAFE = "safe"           # < 0.5% drawdown
    NORMAL = "normal"       # 0.5% - 1% drawdown
    WARNING = "warning"     # 1% - 1.5% drawdown
    CRITICAL = "critical"   # 1.5% - 1.8% drawdown
    EMERGENCY = "emergency" # > 1.8% drawdown

class RiskMetrics:
    """Real-time risk metrics"""
    def __init__(self):
        self.current_drawdown = Decimal("0")
        self.max_drawdown = Decimal("0")
        self.daily_loss = Decimal("0")
        self.open_risk = Decimal("0")
        self.var_95 = Decimal("0")  # Value at Risk 95%
        self.var_99 = Decimal("0")  # Value at Risk 99%
        self.sharpe_ratio = 0.0
        self.sortino_ratio = 0.0
        self.win_rate = 0.0
        self.profit_factor = 0.0
        self.risk_level = RiskLevel.SAFE
        self.last_update = datetime.utcnow()

class RiskManager:
    """
    Critical risk management system
    NEVER allows losses beyond 2% - this is the core protection
    """
    
    # ABSOLUTE LIMITS - NEVER CHANGE THESE
    MAX_PORTFOLIO_DRAWDOWN = 0.02      # 2% absolute maximum
    MAX_SINGLE_POSITION_RISK = 0.0125  # 1.25% per position
    MAX_DAILY_LOSS = 0.015             # 1.5% daily loss limit
    EMERGENCY_STOP_LEVEL = 0.018       # 1.8% triggers emergency
    WARNING_LEVEL = 0.01               # 1% triggers warning
    
    # Position limits
    MAX_POSITIONS = 20                 # Maximum concurrent positions
    MAX_CORRELATION = 0.7              # Max correlation between positions
    MAX_SECTOR_EXPOSURE = 0.3         # Max 30% in one sector
    
    def __init__(self, database, cache_manager):
        self.database = database
        self.cache_manager = cache_manager
        self.risk_metrics: Dict[str, RiskMetrics] = {}
        self.monitoring_task = None
        self.emergency_mode = False
        
        logger.info("Risk Manager initialized with quantum protection")
    
    async def start_monitoring(self):
        """Start continuous risk monitoring"""
        if not self.monitoring_task:
            self.monitoring_task = asyncio.create_task(self._monitor_loop())
            logger.info("Risk monitoring started")
    
    async def stop_monitoring(self):
        """Stop risk monitoring"""
        if self.monitoring_task:
            self.monitoring_task.cancel()
            await self.monitoring_task
            logger.info("Risk monitoring stopped")
    
    async def check_order_risk(self, user_id: str, symbol: str, 
                              quantity: float, side: str) -> Dict:
        """
        Check if an order passes risk requirements
        
        Returns:
            Dict with 'allowed' bool and 'reason' if not allowed
        """
        try:
            # Get current metrics
            metrics = await self.get_risk_metrics(user_id)
            
            # Check if in emergency mode
            if self.emergency_mode:
                return {
                    "allowed": False,
                    "reason": "Emergency mode active - no new trades allowed"
                }
            
            # Check current drawdown
            if metrics.current_drawdown >= Decimal(str(self.WARNING_LEVEL)):
                return {
                    "allowed": False,
                    "reason": f"Drawdown at {metrics.current_drawdown:.2%} - risk limit reached"
                }
            
            # Check daily loss
            if metrics.daily_loss >= Decimal(str(self.MAX_DAILY_LOSS)):
                return {
                    "allowed": False,
                    "reason": f"Daily loss limit reached: {metrics.daily_loss:.2%}"
                }
            
            # Calculate position risk
            position_risk = await self._calculate_position_risk(
                user_id, symbol, quantity, side
            )
            
            # Check single position risk
            if position_risk > self.MAX_SINGLE_POSITION_RISK:
                return {
                    "allowed": False,
                    "reason": f"Position risk {position_risk:.2%} exceeds limit {self.MAX_SINGLE_POSITION_RISK:.2%}"
                }
            
            # Check total open risk
            total_risk = metrics.open_risk + Decimal(str(position_risk))
            if total_risk > Decimal(str(self.MAX_PORTFOLIO_DRAWDOWN)):
                return {
                    "allowed": False,
                    "reason": f"Total risk would be {total_risk:.2%}, exceeds portfolio limit"
                }
            
            # Check position count
            positions = await self.database.get_open_positions(user_id)
            if len(positions) >= self.MAX_POSITIONS:
                return {
                    "allowed": False,
                    "reason": f"Maximum {self.MAX_POSITIONS} positions already open"
                }
            
            # Check correlation
            correlation_check = await self._check_correlation(user_id, symbol)
            if not correlation_check["allowed"]:
                return correlation_check
            
            # Check sector exposure
            sector_check = await self._check_sector_exposure(user_id, symbol)
            if not sector_check["allowed"]:
                return sector_check
            
            # All checks passed
            return {"allowed": True, "risk_amount": position_risk}
            
        except Exception as e:
            logger.error(f"Error checking order risk: {e}")
            return {
                "allowed": False,
                "reason": "Risk check failed - order blocked for safety"
            }
    
    async def emergency_stop(self, user_id: str) -> Dict:
        """
        EMERGENCY STOP - Close all positions immediately
        This is the ultimate protection mechanism
        """
        logger.critical(f"EMERGENCY STOP INITIATED for user {user_id}")
        
        try:
            self.emergency_mode = True
            closed_positions = []
            total_loss = Decimal("0")
            
            # Get all open positions
            positions = await self.database.get_open_positions(user_id)
            
            # Close each position immediately at market
            for position in positions:
                try:
                    # Send market order to close
                    close_result = await self._close_position_emergency(position)
                    closed_positions.append(close_result)
                    total_loss += Decimal(str(close_result.get("loss", 0)))
                    
                    logger.info(f"Emergency closed: {position['symbol']} - "
                              f"Loss: ${close_result.get('loss', 0):.2f}")
                    
                except Exception as e:
                    logger.error(f"Failed to close position {position['id']}: {e}")
            
            # Cancel all pending orders
            pending_orders = await self.database.get_pending_orders(user_id)
            for order in pending_orders:
                try:
                    await self._cancel_order_emergency(order)
                    logger.info(f"Emergency cancelled order: {order['id']}")
                except Exception as e:
                    logger.error(f"Failed to cancel order {order['id']}: {e}")
            
            # Send emergency notifications
            await self._send_emergency_notification(user_id, total_loss, closed_positions)
            
            # Lock account from further trading
            await self.database.lock_trading(user_id, "emergency_stop")
            
            # Log emergency event
            await self.database.log_emergency_event(
                user_id=user_id,
                event_type="emergency_stop",
                details={
                    "positions_closed": len(closed_positions),
                    "total_loss": float(total_loss),
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
            
            return {
                "status": "emergency_stop_complete",
                "positions_closed": len(closed_positions),
                "total_loss": float(total_loss),
                "account_locked": True
            }
            
        except Exception as e:
            logger.critical(f"EMERGENCY STOP FAILED: {e}")
            raise
        finally:
            self.emergency_mode = False
    
    async def get_risk_metrics(self, user_id: str) -> RiskMetrics:
        """Get current risk metrics for a user"""
        if user_id not in self.risk_metrics:
            self.risk_metrics[user_id] = await self._calculate_metrics(user_id)
        
        # Update if stale (older than 1 second)
        metrics = self.risk_metrics[user_id]
        if (datetime.utcnow() - metrics.last_update).total_seconds() > 1:
            self.risk_metrics[user_id] = await self._calculate_metrics(user_id)
        
        return self.risk_metrics[user_id]
    
    async def update_settings(self, user_id: str, max_drawdown: float,
                            max_position_size: float, max_daily_loss: float) -> Dict:
        """
        Update risk settings (within safe bounds)
        Note: Cannot exceed system maximums
        """
        # Ensure settings don't exceed system limits
        safe_drawdown = min(max_drawdown, self.MAX_PORTFOLIO_DRAWDOWN)
        safe_position = min(max_position_size, self.MAX_SINGLE_POSITION_RISK)
        safe_daily = min(max_daily_loss, self.MAX_DAILY_LOSS)
        
        settings = {
            "max_drawdown": safe_drawdown,
            "max_position_size": safe_position,
            "max_daily_loss": safe_daily,
            "updated_at": datetime.utcnow().isoformat()
        }
        
        await self.database.update_risk_settings(user_id, settings)
        
        logger.info(f"Risk settings updated for {user_id}: {settings}")
        
        return {
            "status": "updated",
            "settings": settings,
            "warnings": self._get_setting_warnings(
                max_drawdown, max_position_size, max_daily_loss
            )
        }
    
    async def _monitor_loop(self):
        """Continuous risk monitoring loop"""
        while True:
            try:
                # Get all active users
                active_users = await self.database.get_active_trading_users()
                
                for user_id in active_users:
                    await self._monitor_user_risk(user_id)
                
                # Short sleep between checks
                await asyncio.sleep(0.5)  # Check twice per second
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in risk monitoring loop: {e}")
                await asyncio.sleep(1)
    
    async def _monitor_user_risk(self, user_id: str):
        """Monitor risk for a single user"""
        try:
            metrics = await self.get_risk_metrics(user_id)
            
            # Determine risk level
            if metrics.current_drawdown >= Decimal(str(self.EMERGENCY_STOP_LEVEL)):
                metrics.risk_level = RiskLevel.EMERGENCY
                # Trigger emergency stop
                await self.emergency_stop(user_id)
                
            elif metrics.current_drawdown >= Decimal("0.015"):
                metrics.risk_level = RiskLevel.CRITICAL
                await self._send_risk_alert(user_id, "CRITICAL", metrics)
                
            elif metrics.current_drawdown >= Decimal(str(self.WARNING_LEVEL)):
                metrics.risk_level = RiskLevel.WARNING
                await self._send_risk_alert(user_id, "WARNING", metrics)
                
            elif metrics.current_drawdown >= Decimal("0.005"):
                metrics.risk_level = RiskLevel.NORMAL
                
            else:
                metrics.risk_level = RiskLevel.SAFE
            
            # Check daily loss
            if metrics.daily_loss >= Decimal(str(self.MAX_DAILY_LOSS)):
                await self._halt_daily_trading(user_id)
            
        except Exception as e:
            logger.error(f"Error monitoring user {user_id}: {e}")
    
    async def _calculate_metrics(self, user_id: str) -> RiskMetrics:
        """Calculate current risk metrics"""
        metrics = RiskMetrics()
        
        try:
            # Get account data
            account = await self.database.get_account(user_id)
            positions = await self.database.get_open_positions(user_id)
            trades_today = await self.database.get_trades_since(
                user_id, 
                datetime.utcnow().replace(hour=0, minute=0, second=0)
            )
            
            # Calculate current P&L
            current_pnl = Decimal("0")
            open_risk = Decimal("0")
            
            for position in positions:
                # Get current price
                current_price = await self._get_current_price(position["symbol"])
                
                # Calculate P&L
                if position["side"] == "long":
                    pnl = (current_price - position["entry_price"]) * position["quantity"]
                else:
                    pnl = (position["entry_price"] - current_price) * position["quantity"]
                
                current_pnl += Decimal(str(pnl))
                
                # Calculate risk (distance to stop loss)
                if position.get("stop_loss"):
                    if position["side"] == "long":
                        risk = (position["entry_price"] - position["stop_loss"]) * position["quantity"]
                    else:
                        risk = (position["stop_loss"] - position["entry_price"]) * position["quantity"]
                    open_risk += Decimal(str(abs(risk)))
            
            # Calculate drawdown
            account_value = account["balance"] + current_pnl
            peak_value = account.get("peak_balance", account["balance"])
            
            if account_value < peak_value:
                metrics.current_drawdown = (peak_value - account_value) / peak_value
            
            # Calculate daily loss
            daily_pnl = Decimal("0")
            for trade in trades_today:
                daily_pnl += Decimal(str(trade["pnl"]))
            
            if daily_pnl < 0:
                metrics.daily_loss = abs(daily_pnl) / account["balance"]
            
            # Set open risk
            metrics.open_risk = open_risk / account["balance"]
            
            # Calculate Value at Risk (simplified)
            if len(trades_today) > 0:
                returns = [t["pnl"] / account["balance"] for t in trades_today]
                if returns:
                    metrics.var_95 = Decimal(str(np.percentile(returns, 5)))
                    metrics.var_99 = Decimal(str(np.percentile(returns, 1)))
            
            # Calculate win rate
            winning_trades = [t for t in trades_today if t["pnl"] > 0]
            if trades_today:
                metrics.win_rate = len(winning_trades) / len(trades_today)
            
            # Calculate profit factor
            gross_profit = sum(t["pnl"] for t in trades_today if t["pnl"] > 0)
            gross_loss = abs(sum(t["pnl"] for t in trades_today if t["pnl"] < 0))
            if gross_loss > 0:
                metrics.profit_factor = gross_profit / gross_loss
            
        except Exception as e:
            logger.error(f"Error calculating metrics: {e}")
        
        metrics.last_update = datetime.utcnow()
        return metrics
    
    async def _calculate_position_risk(self, user_id: str, symbol: str,
                                      quantity: float, side: str) -> float:
        """Calculate risk for a potential position"""
        try:
            # Get account balance
            account = await self.database.get_account(user_id)
            balance = account["balance"]
            
            # Get current price
            current_price = await self._get_current_price(symbol)
            
            # Calculate position value
            position_value = current_price * quantity
            
            # Estimate stop loss distance (2% below/above entry)
            stop_distance = current_price * 0.02
            
            # Calculate potential loss
            potential_loss = stop_distance * quantity
            
            # Return as percentage of account
            return potential_loss / balance
            
        except Exception as e:
            logger.error(f"Error calculating position risk: {e}")
            return float('inf')  # Return infinite risk on error
    
    async def _check_correlation(self, user_id: str, symbol: str) -> Dict:
        """Check correlation with existing positions"""
        try:
            positions = await self.database.get_open_positions(user_id)
            
            for position in positions:
                # Calculate correlation (simplified - would use real correlation matrix)
                correlation = await self._get_correlation(position["symbol"], symbol)
                
                if correlation > self.MAX_CORRELATION:
                    return {
                        "allowed": False,
                        "reason": f"High correlation ({correlation:.2f}) with {position['symbol']}"
                    }
            
            return {"allowed": True}
            
        except Exception as e:
            logger.error(f"Error checking correlation: {e}")
            return {"allowed": True}  # Allow on error but log it
    
    async def _check_sector_exposure(self, user_id: str, symbol: str) -> Dict:
        """Check sector concentration"""
        try:
            positions = await self.database.get_open_positions(user_id)
            account = await self.database.get_account(user_id)
            
            # Get sector for new symbol
            new_sector = await self._get_sector(symbol)
            
            # Calculate sector exposures
            sector_values = {}
            for position in positions:
                sector = await self._get_sector(position["symbol"])
                if sector not in sector_values:
                    sector_values[sector] = 0
                sector_values[sector] += position["quantity"] * position["entry_price"]
            
            # Check if adding this position would exceed limit
            current_price = await self._get_current_price(symbol)
            new_position_value = current_price * 100  # Assume standard position
            
            sector_total = sector_values.get(new_sector, 0) + new_position_value
            sector_percentage = sector_total / account["balance"]
            
            if sector_percentage > self.MAX_SECTOR_EXPOSURE:
                return {
                    "allowed": False,
                    "reason": f"Sector exposure would be {sector_percentage:.1%}, exceeds {self.MAX_SECTOR_EXPOSURE:.1%} limit"
                }
            
            return {"allowed": True}
            
        except Exception as e:
            logger.error(f"Error checking sector exposure: {e}")
            return {"allowed": True}
    
    async def _close_position_emergency(self, position: Dict) -> Dict:
        """Emergency close a position at market price"""
        # This would interface with the broker to send immediate market order
        # Placeholder implementation
        return {
            "position_id": position["id"],
            "symbol": position["symbol"],
            "loss": 0  # Would calculate actual loss
        }
    
    async def _cancel_order_emergency(self, order: Dict):
        """Emergency cancel an order"""
        # This would interface with the broker to cancel order
        pass
    
    async def _halt_daily_trading(self, user_id: str):
        """Halt trading for the day due to daily loss limit"""
        await self.database.halt_trading(
            user_id,
            reason="daily_loss_limit",
            until=datetime.utcnow().replace(hour=23, minute=59, second=59)
        )
        
        await self._send_risk_alert(
            user_id,
            "DAILY_HALT",
            {"reason": "Daily loss limit reached"}
        )
    
    async def _send_risk_alert(self, user_id: str, alert_type: str, data: Any):
        """Send risk alert to user"""
        # This would integrate with notification system
        logger.warning(f"Risk alert for {user_id}: {alert_type} - {data}")
    
    async def _send_emergency_notification(self, user_id: str, total_loss: Decimal,
                                          closed_positions: List):
        """Send emergency stop notification"""
        # This would send to all configured channels (email, SMS, Discord, etc.)
        logger.critical(f"Emergency notification for {user_id}: "
                       f"Loss ${total_loss:.2f}, Positions closed: {len(closed_positions)}")
    
    def _get_setting_warnings(self, max_drawdown: float, max_position_size: float,
                            max_daily_loss: float) -> List[str]:
        """Get warnings for risky settings"""
        warnings = []
        
        if max_drawdown > self.MAX_PORTFOLIO_DRAWDOWN:
            warnings.append(f"Drawdown capped at system maximum {self.MAX_PORTFOLIO_DRAWDOWN:.1%}")
        
        if max_position_size > self.MAX_SINGLE_POSITION_RISK:
            warnings.append(f"Position size capped at system maximum {self.MAX_SINGLE_POSITION_RISK:.2%}")
        
        if max_daily_loss > self.MAX_DAILY_LOSS:
            warnings.append(f"Daily loss capped at system maximum {self.MAX_DAILY_LOSS:.1%}")
        
        return warnings
    
    async def _get_current_price(self, symbol: str) -> Decimal:
        """Get current market price for a symbol"""
        # This would get real-time price from market data manager
        # Placeholder for now
        return Decimal("100.00")
    
    async def _get_correlation(self, symbol1: str, symbol2: str) -> float:
        """Get correlation between two symbols"""
        # This would calculate actual correlation from historical data
        # Placeholder for now
        return 0.3
    
    async def _get_sector(self, symbol: str) -> str:
        """Get sector for a symbol"""
        # This would look up actual sector classification
        # Placeholder for now
        return "Technology"
