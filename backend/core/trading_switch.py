"""
AuraQuant Paper/Real Trading Switch
Intelligent switching between paper and real trading modes
"""

from enum import Enum
from typing import Dict, Any, Optional
from decimal import Decimal
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class TradingEnvironment(Enum):
    PAPER = "paper"
    MICRO = "micro"
    REAL = "real"

class TradingModeManager:
    """Manages switching between paper and real trading modes"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.current_mode = TradingEnvironment.PAPER
        self.mode_history = []
        self.safety_checks = {
            "min_paper_trades": 100,
            "min_paper_profit": Decimal("1000"),
            "min_win_rate": 0.55,
            "max_drawdown": 0.10,
            "required_equity": Decimal("25000")
        }
        
    async def switch_mode(self, target_mode: TradingEnvironment, 
                         force: bool = False) -> Dict[str, Any]:
        """Switch trading mode with safety checks"""
        
        if not force:
            # Perform safety checks
            checks_passed, reason = await self._perform_safety_checks(target_mode)
            
            if not checks_passed:
                logger.warning(f"Mode switch blocked: {reason}")
                return {
                    "success": False,
                    "reason": reason,
                    "current_mode": self.current_mode.value
                }
        
        # Log mode change
        self.mode_history.append({
            "from": self.current_mode.value,
            "to": target_mode.value,
            "timestamp": datetime.now().isoformat(),
            "forced": force
        })
        
        # Update configuration
        old_mode = self.current_mode
        self.current_mode = target_mode
        
        # Update broker connections
        await self._update_broker_connections(target_mode)
        
        logger.info(f"Trading mode switched from {old_mode.value} to {target_mode.value}")
        
        return {
            "success": True,
            "previous_mode": old_mode.value,
            "current_mode": target_mode.value,
            "timestamp": datetime.now().isoformat()
        }
        
    async def _perform_safety_checks(self, target_mode: TradingEnvironment) -> tuple:
        """Perform safety checks before mode switch"""
        
        # Check progression path
        if target_mode == TradingEnvironment.REAL:
            # Must go through paper -> micro -> real
            if self.current_mode == TradingEnvironment.PAPER:
                return False, "Must complete micro trading before real trading"
            
            # Check performance metrics
            metrics = await self._get_performance_metrics()
            
            if metrics["total_trades"] < self.safety_checks["min_paper_trades"]:
                return False, f"Insufficient trades: {metrics['total_trades']}"
            
            if metrics["win_rate"] < self.safety_checks["min_win_rate"]:
                return False, f"Win rate too low: {metrics['win_rate']:.2%}"
            
            if metrics["max_drawdown"] > self.safety_checks["max_drawdown"]:
                return False, f"Drawdown too high: {metrics['max_drawdown']:.2%}"
            
            if metrics["equity"] < self.safety_checks["required_equity"]:
                return False, f"Insufficient equity: ${metrics['equity']}"
        
        return True, "All checks passed"
        
    async def _update_broker_connections(self, mode: TradingEnvironment):
        """Update broker connections for new mode"""
        
        if mode == TradingEnvironment.PAPER:
            # Connect to paper trading endpoints
            self.config["alpaca_base_url"] = "https://paper-api.alpaca.markets"
            self.config["binance_testnet"] = True
            
        elif mode == TradingEnvironment.REAL:
            # Connect to live trading endpoints
            self.config["alpaca_base_url"] = "https://api.alpaca.markets"
            self.config["binance_testnet"] = False
            
    async def _get_performance_metrics(self) -> Dict[str, Any]:
        """Get current performance metrics"""
        # Would fetch from database
        return {
            "total_trades": 150,
            "win_rate": 0.58,
            "max_drawdown": 0.08,
            "equity": Decimal("30000")
        }
