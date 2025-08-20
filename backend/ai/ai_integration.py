"""
AuraQuant AI Integration
Integrates OpenAI, Claude, and custom ML models for market analysis
"""

import openai
import anthropic
from typing import Dict, List, Any, Optional
import numpy as np
import pandas as pd
from datetime import datetime
import asyncio
import logging

logger = logging.getLogger(__name__)

class AITradingAssistant:
    """AI-powered trading analysis and signal generation"""
    
    def __init__(self, config: Dict[str, Any]):
        self.openai_client = openai.AsyncOpenAI(api_key=config.get("openai_api_key"))
        self.anthropic_client = anthropic.AsyncAnthropic(api_key=config.get("anthropic_api_key"))
        self.model_configs = {
            "market_analysis": "gpt-4-turbo-preview",
            "risk_assessment": "claude-3-opus-20240229",
            "signal_generation": "gpt-4"
        }
        
    async def analyze_market(self, symbol: str, data: pd.DataFrame) -> Dict[str, Any]:
        """Analyze market conditions using AI"""
        
        # Prepare market data summary
        summary = self._prepare_market_summary(data)
        
        # Get AI analysis
        prompt = f"""Analyze the following market data for {symbol}:
        {summary}
        
        Provide:
        1. Current market sentiment
        2. Key support/resistance levels
        3. Potential trading opportunities
        4. Risk factors to consider
        """
        
        response = await self.openai_client.chat.completions.create(
            model=self.model_configs["market_analysis"],
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3
        )
        
        return {
            "symbol": symbol,
            "analysis": response.choices[0].message.content,
            "timestamp": datetime.now().isoformat()
        }
        
    async def assess_risk(self, position: Dict) -> Dict[str, Any]:
        """Assess risk using Claude"""
        
        prompt = f"""Assess the risk for this position:
        {json.dumps(position, indent=2)}
        
        Consider:
        - Market volatility
        - Position size relative to portfolio
        - Current market conditions
        - Potential black swan events
        
        Provide a risk score (0-100) and detailed explanation.
        """
        
        response = await self.anthropic_client.messages.create(
            model=self.model_configs["risk_assessment"],
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1000
        )
        
        return {
            "position_id": position.get("id"),
            "risk_assessment": response.content[0].text,
            "timestamp": datetime.now().isoformat()
        }
        
    async def generate_signals(self, market_data: Dict) -> List[Dict]:
        """Generate trading signals using AI ensemble"""
        
        signals = []
        
        # Use multiple AI models for consensus
        tasks = [
            self._get_openai_signal(market_data),
            self._get_claude_signal(market_data)
        ]
        
        results = await asyncio.gather(*tasks)
        
        # Combine signals with voting mechanism
        for result in results:
            if result["confidence"] > 0.7:
                signals.append(result)
        
        return signals
        
    def _prepare_market_summary(self, data: pd.DataFrame) -> str:
        """Prepare market data summary for AI analysis"""
        
        return f"""
        Recent Price Action:
        - Current Price: {data['close'].iloc[-1]}
        - 24h Change: {((data['close'].iloc[-1] / data['close'].iloc[-24] - 1) * 100):.2f}%
        - Volume: {data['volume'].iloc[-1]:,.0f}
        - RSI: {self._calculate_rsi(data)}
        - MACD: {self._calculate_macd(data)}
        """
        
    def _calculate_rsi(self, data: pd.DataFrame, period: int = 14) -> float:
        """Calculate RSI indicator"""
        delta = data['close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        return rsi.iloc[-1]
        
    def _calculate_macd(self, data: pd.DataFrame) -> Dict:
        """Calculate MACD indicator"""
        exp1 = data['close'].ewm(span=12, adjust=False).mean()
        exp2 = data['close'].ewm(span=26, adjust=False).mean()
        macd = exp1 - exp2
        signal = macd.ewm(span=9, adjust=False).mean()
        return {
            "macd": macd.iloc[-1],
            "signal": signal.iloc[-1],
            "histogram": (macd - signal).iloc[-1]
        }
