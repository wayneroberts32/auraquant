"""
AuraQuant Infinity - Advanced Backtesting Engine
Historical data analysis and strategy validation
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import asyncio
import aiohttp
import json
from typing import Dict, List, Optional, Tuple
import logging
from dataclasses import dataclass
import yfinance as yf
import ccxt

logger = logging.getLogger(__name__)

@dataclass
class BacktestResult:
    """Container for backtest results"""
    initial_capital: float
    final_capital: float
    total_return: float
    annualized_return: float
    sharpe_ratio: float
    sortino_ratio: float
    max_drawdown: float
    win_rate: float
    profit_factor: float
    total_trades: int
    winning_trades: int
    losing_trades: int
    avg_win: float
    avg_loss: float
    best_trade: float
    worst_trade: float
    recovery_factor: float
    calmar_ratio: float
    trade_history: List[Dict]
    equity_curve: pd.Series
    daily_returns: pd.Series
    

class BacktestEngine:
    """
    Advanced backtesting engine for strategy validation
    Includes slippage, fees, and realistic market simulation
    """
    
    def __init__(self, config: Dict):
        self.config = config
        self.initial_capital = config.get("initial_capital", 10000)
        self.broker_fee = config.get("broker_fee", 0.001)  # 0.1%
        self.slippage = config.get("slippage", 0.0005)  # 0.05%
        self.spread = config.get("spread", 0.0005)  # 0.05%
        self.tax_rate = config.get("tax_rate", 0.30)  # 30% capital gains
        
        # Market data cache
        self.data_cache = {}
        
        # Supported exchanges for crypto
        self.exchanges = {
            'binance': ccxt.binance(),
            'coinbase': ccxt.coinbase(),
            'bybit': ccxt.bybit()
        }
        
    async def run_backtest(self, strategy, symbols: List[str], 
                          start_date: str, end_date: str,
                          timeframe: str = '1h') -> BacktestResult:
        """
        Run comprehensive backtest on strategy
        
        Args:
            strategy: Strategy object with execute_strategy method
            symbols: List of symbols to test
            start_date: Start date (YYYY-MM-DD)
            end_date: End date (YYYY-MM-DD)
            timeframe: Timeframe for data (1m, 5m, 15m, 1h, 1d, etc)
        """
        logger.info(f"🔬 Starting backtest from {start_date} to {end_date}")
        
        # Load historical data
        market_data = await self.load_historical_data(symbols, start_date, end_date, timeframe)
        
        # Initialize backtest state
        capital = self.initial_capital
        positions = []
        trades = []
        equity_curve = [capital]
        timestamps = []
        
        # Process each time period
        for timestamp, data in market_data.iterrows():
            # Check existing positions
            positions = await self.check_positions(positions, data, trades)
            
            # Get strategy signals for all symbols
            signals = []
            for symbol in symbols:
                if symbol in data:
                    market_info = self.prepare_market_data(symbol, data[symbol], market_data, timestamp)
                    signal = await strategy.execute_strategy(market_info)
                    if signal:
                        signals.append(signal)
            
            # Execute best signal if any
            if signals:
                best_signal = self.select_best_signal(signals)
                if best_signal:
                    position = await self.execute_trade(best_signal, capital, data, timestamp)
                    if position:
                        positions.append(position)
                        capital -= position['cost']
                        trades.append({
                            'timestamp': timestamp,
                            'signal': best_signal,
                            'position': position
                        })
            
            # Update equity
            current_equity = capital + sum(self.get_position_value(p, data) for p in positions if not p.get('closed'))
            equity_curve.append(current_equity)
            timestamps.append(timestamp)
        
        # Close all remaining positions
        for position in positions:
            if not position.get('closed'):
                await self.close_position(position, data, trades, capital)
        
        # Calculate results
        result = self.calculate_results(trades, equity_curve, timestamps)
        
        # Log summary
        self.log_results(result)
        
        return result
    
    async def load_historical_data(self, symbols: List[str], 
                                  start_date: str, end_date: str,
                                  timeframe: str) -> pd.DataFrame:
        """Load historical market data"""
        logger.info(f"📚 Loading historical data for {len(symbols)} symbols")
        
        all_data = {}
        
        for symbol in symbols:
            try:
                # Check if crypto or stock
                if self.is_crypto(symbol):
                    data = await self.load_crypto_data(symbol, start_date, end_date, timeframe)
                else:
                    data = await self.load_stock_data(symbol, start_date, end_date, timeframe)
                
                if data is not None and not data.empty:
                    all_data[symbol] = data
                    logger.info(f"✅ Loaded {len(data)} bars for {symbol}")
                    
            except Exception as e:
                logger.error(f"❌ Failed to load data for {symbol}: {e}")
        
        # Combine all data into single DataFrame
        if all_data:
            combined = pd.concat(all_data, axis=1)
            combined = combined.fillna(method='ffill')  # Forward fill missing data
            return combined
        else:
            return pd.DataFrame()
    
    async def load_crypto_data(self, symbol: str, start_date: str, 
                              end_date: str, timeframe: str) -> pd.DataFrame:
        """Load cryptocurrency historical data"""
        try:
            # Try Binance first
            exchange = self.exchanges['binance']
            
            # Convert timeframe to ccxt format
            tf_map = {
                '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m',
                '1h': '1h', '4h': '4h', '1d': '1d', '1w': '1w'
            }
            ccxt_timeframe = tf_map.get(timeframe, '1h')
            
            # Fetch OHLCV data
            since = exchange.parse8601(f"{start_date}T00:00:00Z")
            ohlcv = exchange.fetch_ohlcv(symbol, ccxt_timeframe, since)
            
            # Convert to DataFrame
            df = pd.DataFrame(ohlcv, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
            df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
            df.set_index('timestamp', inplace=True)
            
            # Add technical indicators
            df = self.add_technical_indicators(df)
            
            return df
            
        except Exception as e:
            logger.error(f"Error loading crypto data for {symbol}: {e}")
            # Fallback to simulated data
            return self.generate_simulated_data(symbol, start_date, end_date, timeframe)
    
    async def load_stock_data(self, symbol: str, start_date: str, 
                            end_date: str, timeframe: str) -> pd.DataFrame:
        """Load stock market historical data"""
        try:
            # Use yfinance for stock data
            ticker = yf.Ticker(symbol)
            
            # Map timeframe to yfinance interval
            interval_map = {
                '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m',
                '1h': '60m', '1d': '1d', '1w': '1wk'
            }
            interval = interval_map.get(timeframe, '1h')
            
            # Download data
            df = ticker.history(start=start_date, end=end_date, interval=interval)
            
            # Add technical indicators
            df = self.add_technical_indicators(df)
            
            return df
            
        except Exception as e:
            logger.error(f"Error loading stock data for {symbol}: {e}")
            return self.generate_simulated_data(symbol, start_date, end_date, timeframe)
    
    def add_technical_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add technical indicators to price data"""
        if df.empty:
            return df
            
        try:
            # Simple Moving Averages
            df['sma_20'] = df['close'].rolling(window=20).mean()
            df['sma_50'] = df['close'].rolling(window=50).mean()
            df['sma_200'] = df['close'].rolling(window=200).mean()
            
            # Exponential Moving Averages
            df['ema_12'] = df['close'].ewm(span=12).mean()
            df['ema_26'] = df['close'].ewm(span=26).mean()
            
            # MACD
            df['macd'] = df['ema_12'] - df['ema_26']
            df['macd_signal'] = df['macd'].ewm(span=9).mean()
            df['macd_histogram'] = df['macd'] - df['macd_signal']
            
            # RSI
            delta = df['close'].diff()
            gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
            rs = gain / loss
            df['rsi'] = 100 - (100 / (1 + rs))
            
            # Bollinger Bands
            df['bb_middle'] = df['close'].rolling(window=20).mean()
            bb_std = df['close'].rolling(window=20).std()
            df['bb_upper'] = df['bb_middle'] + (bb_std * 2)
            df['bb_lower'] = df['bb_middle'] - (bb_std * 2)
            
            # Volume indicators
            df['volume_sma'] = df['volume'].rolling(window=20).mean()
            df['volume_ratio'] = df['volume'] / df['volume_sma']
            
            # Support and Resistance (simplified)
            df['resistance'] = df['high'].rolling(window=20).max()
            df['support'] = df['low'].rolling(window=20).min()
            
            # Price changes
            df['price_change_1'] = df['close'].pct_change(1)
            df['price_change_5'] = df['close'].pct_change(5)
            df['price_change_20'] = df['close'].pct_change(20)
            
        except Exception as e:
            logger.error(f"Error adding indicators: {e}")
            
        return df
    
    def generate_simulated_data(self, symbol: str, start_date: str, 
                               end_date: str, timeframe: str) -> pd.DataFrame:
        """Generate simulated price data for testing"""
        # Create date range
        freq_map = {
            '1m': 'T', '5m': '5T', '15m': '15T', '30m': '30T',
            '1h': 'H', '4h': '4H', '1d': 'D', '1w': 'W'
        }
        freq = freq_map.get(timeframe, 'H')
        
        dates = pd.date_range(start=start_date, end=end_date, freq=freq)
        
        # Generate random walk price data
        returns = np.random.normal(0.0005, 0.02, len(dates))  # 0.05% mean, 2% std
        price = 100 * np.exp(np.cumsum(returns))
        
        # Create OHLCV data
        df = pd.DataFrame(index=dates)
        df['open'] = price * (1 + np.random.uniform(-0.005, 0.005, len(dates)))
        df['high'] = price * (1 + np.random.uniform(0, 0.01, len(dates)))
        df['low'] = price * (1 + np.random.uniform(-0.01, 0, len(dates)))
        df['close'] = price
        df['volume'] = np.random.uniform(1000000, 10000000, len(dates))
        
        # Add indicators
        df = self.add_technical_indicators(df)
        
        return df
    
    def prepare_market_data(self, symbol: str, data: pd.Series, 
                          full_data: pd.DataFrame, timestamp) -> Dict:
        """Prepare market data for strategy"""
        market_info = {
            'symbol': symbol,
            'timestamp': timestamp,
            'price': data.get('close', 0),
            'open': data.get('open', 0),
            'high': data.get('high', 0),
            'low': data.get('low', 0),
            'volume': data.get('volume', 0),
            'rsi': data.get('rsi', 50),
            'macd': {
                'value': data.get('macd', 0),
                'signal': data.get('macd_signal', 0),
                'histogram': data.get('macd_histogram', 0)
            },
            'bollinger': {
                'upper': data.get('bb_upper', 0),
                'middle': data.get('bb_middle', 0),
                'lower': data.get('bb_lower', 0)
            },
            'sma_20': data.get('sma_20', 0),
            'sma_50': data.get('sma_50', 0),
            'resistance': data.get('resistance', 0),
            'support': data.get('support', 0),
            'volume_ratio': data.get('volume_ratio', 1),
            'price_change_1': data.get('price_change_1', 0),
            'price_change_5': data.get('price_change_5', 0)
        }
        
        # Add sentiment (simulated for backtest)
        market_info['sentiment'] = np.random.uniform(0.3, 0.7)
        market_info['fear_greed'] = np.random.uniform(30, 70)
        
        return market_info
    
    async def execute_trade(self, signal: Dict, capital: float, 
                          market_data: pd.Series, timestamp) -> Optional[Dict]:
        """Execute trade in backtest"""
        symbol = signal['symbol']
        price = signal['price']
        
        # Calculate position size
        position_size = capital * signal.get('position_size', 0.1)
        
        # Apply slippage
        if signal['action'] == 'BUY':
            entry_price = price * (1 + self.slippage)
        else:
            entry_price = price * (1 - self.slippage)
        
        # Calculate costs
        broker_fee = position_size * self.broker_fee
        spread_cost = position_size * self.spread
        total_cost = position_size + broker_fee + spread_cost
        
        # Check if enough capital
        if total_cost > capital:
            return None
        
        position = {
            'symbol': symbol,
            'action': signal['action'],
            'entry_price': entry_price,
            'entry_time': timestamp,
            'position_size': position_size,
            'stop_loss': signal.get('stop_loss'),
            'take_profit': signal.get('take_profit'),
            'cost': total_cost,
            'fees_paid': broker_fee + spread_cost,
            'strategy': signal.get('strategy', 'unknown')
        }
        
        return position
    
    async def check_positions(self, positions: List[Dict], 
                            market_data: pd.Series, trades: List[Dict]) -> List[Dict]:
        """Check and update existing positions"""
        updated_positions = []
        
        for position in positions:
            if position.get('closed'):
                updated_positions.append(position)
                continue
            
            symbol = position['symbol']
            if symbol not in market_data:
                updated_positions.append(position)
                continue
            
            current_price = market_data[symbol].get('close', position['entry_price'])
            
            # Check stop loss
            if position['stop_loss']:
                if position['action'] == 'BUY' and current_price <= position['stop_loss']:
                    position = await self.close_position(position, market_data, trades, current_price)
                elif position['action'] == 'SELL' and current_price >= position['stop_loss']:
                    position = await self.close_position(position, market_data, trades, current_price)
            
            # Check take profit
            if position['take_profit'] and not position.get('closed'):
                if position['action'] == 'BUY' and current_price >= position['take_profit']:
                    position = await self.close_position(position, market_data, trades, current_price)
                elif position['action'] == 'SELL' and current_price <= position['take_profit']:
                    position = await self.close_position(position, market_data, trades, current_price)
            
            updated_positions.append(position)
        
        return updated_positions
    
    async def close_position(self, position: Dict, market_data, 
                           trades: List[Dict], exit_price: float = None) -> Dict:
        """Close a position"""
        if position.get('closed'):
            return position
        
        symbol = position['symbol']
        
        # Get exit price
        if exit_price is None:
            if hasattr(market_data, 'get'):
                exit_price = market_data.get(symbol, {}).get('close', position['entry_price'])
            else:
                exit_price = position['entry_price']
        
        # Apply slippage
        if position['action'] == 'BUY':
            exit_price = exit_price * (1 - self.slippage)
        else:
            exit_price = exit_price * (1 + self.slippage)
        
        # Calculate profit/loss
        if position['action'] == 'BUY':
            gross_pnl = (exit_price - position['entry_price']) * position['position_size'] / position['entry_price']
        else:  # SELL/SHORT
            gross_pnl = (position['entry_price'] - exit_price) * position['position_size'] / position['entry_price']
        
        # Deduct fees
        exit_fee = position['position_size'] * self.broker_fee
        net_pnl = gross_pnl - exit_fee - position['fees_paid']
        
        # Apply tax on profits
        if net_pnl > 0:
            tax = net_pnl * self.tax_rate
            net_pnl -= tax
        
        position['closed'] = True
        position['exit_price'] = exit_price
        position['exit_time'] = datetime.now()
        position['gross_pnl'] = gross_pnl
        position['net_pnl'] = net_pnl
        position['return_pct'] = (net_pnl / position['position_size']) * 100
        
        return position
    
    def get_position_value(self, position: Dict, market_data) -> float:
        """Get current value of position"""
        if position.get('closed'):
            return 0
        
        symbol = position['symbol']
        current_price = market_data.get(symbol, {}).get('close', position['entry_price'])
        
        if position['action'] == 'BUY':
            value = position['position_size'] * (current_price / position['entry_price'])
        else:  # SELL/SHORT
            value = position['position_size'] * (2 - current_price / position['entry_price'])
        
        return value
    
    def select_best_signal(self, signals: List[Dict]) -> Optional[Dict]:
        """Select best signal from multiple signals"""
        if not signals:
            return None
        
        # Sort by confidence and expected return
        for signal in signals:
            expected_return = 0
            if signal.get('take_profit') and signal.get('stop_loss'):
                tp_distance = abs(signal['take_profit'] - signal['price'])
                sl_distance = abs(signal['stop_loss'] - signal['price'])
                risk_reward = tp_distance / sl_distance if sl_distance > 0 else 0
                signal['score'] = signal.get('confidence', 0.5) * risk_reward
            else:
                signal['score'] = signal.get('confidence', 0.5)
        
        # Return highest scoring signal
        return max(signals, key=lambda x: x['score'])
    
    def calculate_results(self, trades: List[Dict], equity_curve: List[float], 
                         timestamps: List) -> BacktestResult:
        """Calculate comprehensive backtest results"""
        if not trades:
            return BacktestResult(
                initial_capital=self.initial_capital,
                final_capital=self.initial_capital,
                total_return=0,
                annualized_return=0,
                sharpe_ratio=0,
                sortino_ratio=0,
                max_drawdown=0,
                win_rate=0,
                profit_factor=0,
                total_trades=0,
                winning_trades=0,
                losing_trades=0,
                avg_win=0,
                avg_loss=0,
                best_trade=0,
                worst_trade=0,
                recovery_factor=0,
                calmar_ratio=0,
                trade_history=trades,
                equity_curve=pd.Series(equity_curve, index=timestamps),
                daily_returns=pd.Series()
            )
        
        # Extract closed positions
        closed_positions = [t['position'] for t in trades if t['position'].get('closed')]
        
        # Basic metrics
        final_capital = equity_curve[-1] if equity_curve else self.initial_capital
        total_return = (final_capital - self.initial_capital) / self.initial_capital * 100
        
        # Win/Loss statistics
        wins = [p for p in closed_positions if p.get('net_pnl', 0) > 0]
        losses = [p for p in closed_positions if p.get('net_pnl', 0) <= 0]
        
        win_rate = len(wins) / len(closed_positions) if closed_positions else 0
        
        # Profit factor
        gross_profit = sum(p.get('net_pnl', 0) for p in wins)
        gross_loss = abs(sum(p.get('net_pnl', 0) for p in losses))
        profit_factor = gross_profit / gross_loss if gross_loss > 0 else gross_profit
        
        # Average win/loss
        avg_win = np.mean([p.get('net_pnl', 0) for p in wins]) if wins else 0
        avg_loss = np.mean([p.get('net_pnl', 0) for p in losses]) if losses else 0
        
        # Best/Worst trades
        all_pnl = [p.get('net_pnl', 0) for p in closed_positions]
        best_trade = max(all_pnl) if all_pnl else 0
        worst_trade = min(all_pnl) if all_pnl else 0
        
        # Create equity series
        equity_series = pd.Series(equity_curve, index=timestamps[:len(equity_curve)])
        
        # Calculate returns
        returns = equity_series.pct_change().dropna()
        
        # Annualized return
        if len(timestamps) > 1:
            days = (timestamps[-1] - timestamps[0]).days
            years = days / 365.25
            annualized_return = ((final_capital / self.initial_capital) ** (1/years) - 1) * 100 if years > 0 else 0
        else:
            annualized_return = 0
        
        # Sharpe Ratio (assuming 0% risk-free rate)
        if len(returns) > 1 and returns.std() > 0:
            sharpe_ratio = np.sqrt(252) * returns.mean() / returns.std()
        else:
            sharpe_ratio = 0
        
        # Sortino Ratio
        downside_returns = returns[returns < 0]
        if len(downside_returns) > 1 and downside_returns.std() > 0:
            sortino_ratio = np.sqrt(252) * returns.mean() / downside_returns.std()
        else:
            sortino_ratio = 0
        
        # Maximum Drawdown
        peak = equity_series.expanding(min_periods=1).max()
        drawdown = (equity_series - peak) / peak * 100
        max_drawdown = abs(drawdown.min())
        
        # Recovery Factor
        recovery_factor = total_return / max_drawdown if max_drawdown > 0 else 0
        
        # Calmar Ratio
        calmar_ratio = annualized_return / max_drawdown if max_drawdown > 0 else 0
        
        return BacktestResult(
            initial_capital=self.initial_capital,
            final_capital=final_capital,
            total_return=total_return,
            annualized_return=annualized_return,
            sharpe_ratio=sharpe_ratio,
            sortino_ratio=sortino_ratio,
            max_drawdown=max_drawdown,
            win_rate=win_rate,
            profit_factor=profit_factor,
            total_trades=len(closed_positions),
            winning_trades=len(wins),
            losing_trades=len(losses),
            avg_win=avg_win,
            avg_loss=avg_loss,
            best_trade=best_trade,
            worst_trade=worst_trade,
            recovery_factor=recovery_factor,
            calmar_ratio=calmar_ratio,
            trade_history=trades,
            equity_curve=equity_series,
            daily_returns=returns
        )
    
    def is_crypto(self, symbol: str) -> bool:
        """Check if symbol is cryptocurrency"""
        crypto_indicators = ['BTC', 'ETH', 'USDT', 'BNB', 'SOL', 'ADA', 'DOGE', 'SHIB']
        return any(indicator in symbol.upper() for indicator in crypto_indicators)
    
    def log_results(self, result: BacktestResult):
        """Log backtest results"""
        logger.info(f"""
        =====================================
        📊 BACKTEST RESULTS
        =====================================
        💰 Initial Capital: ${result.initial_capital:,.2f}
        💎 Final Capital: ${result.final_capital:,.2f}
        📈 Total Return: {result.total_return:.2f}%
        📅 Annualized Return: {result.annualized_return:.2f}%
        
        📊 Risk Metrics:
        ├─ Sharpe Ratio: {result.sharpe_ratio:.2f}
        ├─ Sortino Ratio: {result.sortino_ratio:.2f}
        ├─ Max Drawdown: {result.max_drawdown:.2f}%
        ├─ Calmar Ratio: {result.calmar_ratio:.2f}
        └─ Recovery Factor: {result.recovery_factor:.2f}
        
        🎯 Trading Statistics:
        ├─ Total Trades: {result.total_trades}
        ├─ Win Rate: {result.win_rate:.2%}
        ├─ Profit Factor: {result.profit_factor:.2f}
        ├─ Winning Trades: {result.winning_trades}
        ├─ Losing Trades: {result.losing_trades}
        ├─ Avg Win: ${result.avg_win:.2f}
        ├─ Avg Loss: ${result.avg_loss:.2f}
        ├─ Best Trade: ${result.best_trade:.2f}
        └─ Worst Trade: ${result.worst_trade:.2f}
        =====================================
        """)
    
    async def optimize_strategy(self, strategy, symbols: List[str],
                               start_date: str, end_date: str,
                               param_grid: Dict) -> Dict:
        """
        Optimize strategy parameters using grid search
        
        Args:
            strategy: Strategy object
            symbols: List of symbols
            start_date: Start date
            end_date: End date
            param_grid: Dictionary of parameters to optimize
        """
        logger.info("🔧 Starting strategy optimization...")
        
        best_params = {}
        best_score = -float('inf')
        results = []
        
        # Generate parameter combinations
        param_combinations = self.generate_param_combinations(param_grid)
        
        for params in param_combinations:
            # Update strategy parameters
            for key, value in params.items():
                setattr(strategy, key, value)
            
            # Run backtest
            result = await self.run_backtest(strategy, symbols, start_date, end_date)
            
            # Calculate score (you can customize this)
            score = result.sharpe_ratio * result.win_rate - result.max_drawdown / 100
            
            results.append({
                'params': params,
                'score': score,
                'sharpe': result.sharpe_ratio,
                'return': result.total_return,
                'drawdown': result.max_drawdown
            })
            
            if score > best_score:
                best_score = score
                best_params = params
                
        logger.info(f"""
        🏆 Optimization Complete!
        Best Parameters: {best_params}
        Best Score: {best_score:.4f}
        """)
        
        return {
            'best_params': best_params,
            'best_score': best_score,
            'all_results': results
        }
    
    def generate_param_combinations(self, param_grid: Dict) -> List[Dict]:
        """Generate all parameter combinations from grid"""
        import itertools
        
        keys = param_grid.keys()
        values = param_grid.values()
        
        combinations = []
        for combo in itertools.product(*values):
            combinations.append(dict(zip(keys, combo)))
        
        return combinations


# Create singleton instance
backtest_engine = BacktestEngine({
    'initial_capital': 10000,
    'broker_fee': 0.001,
    'slippage': 0.0005,
    'spread': 0.0005,
    'tax_rate': 0.30
})
