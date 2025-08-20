"""
Warrior Trading Strategy Knowledge Base
Extracted patterns and strategies for bot learning
Based on Warrior Trading methodology
"""

class WarriorTradingKnowledge:
    """
    Knowledge base of trading strategies and patterns
    Bot uses this to learn and create its own unique strategies
    """
    
    def __init__(self):
        # Core trading concepts from Warrior Trading
        self.trading_concepts = {
            'momentum_trading': {
                'description': 'Trading stocks with strong directional movement',
                'key_factors': [
                    'High relative volume (2x+ average)',
                    'News catalyst or earnings',
                    'Breaking key resistance levels',
                    'Strong bid/ask spread'
                ],
                'entry_signals': [
                    'Break of pre-market high',
                    'First 1-minute candle to make new high',
                    'Break above VWAP with volume',
                    'Flag break on 5-minute chart'
                ],
                'risk_management': {
                    'stop_loss': 'Below previous support or VWAP',
                    'position_size': 'Risk 1-2% of account per trade',
                    'profit_targets': '2:1 or 3:1 risk/reward minimum'
                }
            },
            
            'gap_and_go': {
                'description': 'Trading morning gaps with continuation',
                'criteria': [
                    'Gap up 4% or more',
                    'Low float (under 100M shares)',
                    'Volume above 1M in pre-market',
                    'News catalyst present'
                ],
                'entry_timing': [
                    '9:30-9:45 AM for initial move',
                    'Wait for first pullback to VWAP',
                    'Enter on first green candle after pullback'
                ],
                'exit_strategy': [
                    'Scale out 50% at 2:1 risk/reward',
                    'Trail stop on remaining position',
                    'Full exit if breaks below VWAP'
                ]
            },
            
            'reversal_trading': {
                'description': 'Trading oversold bounces and overbought reversals',
                'indicators': [
                    'RSI below 30 (oversold) or above 70 (overbought)',
                    'Multiple rejections at support/resistance',
                    'Declining volume on trend',
                    'Divergence on MACD'
                ],
                'confirmation': [
                    'Wait for reversal candle pattern',
                    'Volume spike on reversal',
                    'Break of short-term moving average'
                ],
                'risk_points': [
                    'Set stop beyond recent high/low',
                    'Quick exit if reversal fails',
                    'Smaller position size due to counter-trend'
                ]
            },
            
            'bull_flag_pattern': {
                'description': 'Continuation pattern after strong move up',
                'identification': [
                    'Strong upward pole (flagpole)',
                    'Consolidation on declining volume',
                    'Parallel or slightly descending channel',
                    'Duration: 5-15 candles typically'
                ],
                'entry_trigger': [
                    'Break above flag resistance',
                    'Volume surge on breakout',
                    'Reclaim of 9 EMA'
                ],
                'target_calculation': 'Measure flagpole height, project from breakout'
            },
            
            'micro_pullback': {
                'description': 'Small pullbacks in strong trending stocks',
                'setup': [
                    'Stock trending strongly (45+ degree angle)',
                    'Pull back to 9 or 20 EMA',
                    'Pullback less than 50% of prior move',
                    'Maintain above VWAP'
                ],
                'entry': [
                    'First green candle after touching EMA',
                    'Hammer or doji at EMA',
                    'Volume declining on pullback'
                ],
                'management': [
                    'Stop below EMA or prior low',
                    'Target next resistance or 2:1 minimum',
                    'Add on break of prior high'
                ]
            },
            
            'opening_range_breakout': {
                'description': 'Trading breaks of first 15-30 minute range',
                'setup_time': '9:30-10:00 AM EST',
                'requirements': [
                    'Clear range established',
                    'Above average volume',
                    'ATR above $0.50',
                    'Catalyst or momentum present'
                ],
                'execution': [
                    'Enter on break with volume',
                    'Stop at opposite side of range',
                    'Target 2x range or key resistance'
                ]
            }
        }
        
        # Chart patterns recognition
        self.chart_patterns = {
            'ascending_triangle': {
                'bullish': True,
                'description': 'Higher lows with horizontal resistance',
                'breakout_probability': 0.7,
                'volume_pattern': 'Decreasing until breakout',
                'target': 'Height of triangle added to breakout'
            },
            'descending_triangle': {
                'bullish': False,
                'description': 'Lower highs with horizontal support',
                'breakdown_probability': 0.7,
                'volume_pattern': 'Decreasing until breakdown',
                'target': 'Height of triangle subtracted from breakdown'
            },
            'cup_and_handle': {
                'bullish': True,
                'description': 'U-shaped base with small consolidation',
                'duration': '7 weeks to 6 months typically',
                'handle_depth': 'No more than 1/3 of cup depth',
                'breakout_target': 'Depth of cup added to breakout'
            },
            'head_and_shoulders': {
                'bullish': False,
                'description': 'Three peaks with middle highest',
                'neckline': 'Connect two valleys',
                'breakdown_signal': 'Close below neckline',
                'target': 'Head height below neckline'
            },
            'double_top': {
                'bullish': False,
                'description': 'Two peaks at similar level',
                'confirmation': 'Break below valley between peaks',
                'target': 'Pattern height below breakdown'
            },
            'double_bottom': {
                'bullish': True,
                'description': 'Two valleys at similar level',
                'confirmation': 'Break above peak between valleys',
                'target': 'Pattern height above breakout'
            },
            'wedge': {
                'rising': {'bias': 'bearish', 'breakout_direction': 'down'},
                'falling': {'bias': 'bullish', 'breakout_direction': 'up'},
                'characteristics': 'Converging trend lines',
                'volume': 'Decreasing as pattern develops'
            },
            'pennant': {
                'description': 'Small symmetrical triangle after sharp move',
                'duration': '1-3 weeks typically',
                'volume': 'High on pole, low in pennant',
                'breakout': 'Continuation in direction of pole'
            }
        }
        
        # Technical indicators usage
        self.indicators = {
            'moving_averages': {
                '9_ema': 'Short-term trend and micro pullback support',
                '20_ema': 'Intermediate trend and pullback support',
                '50_sma': 'Medium-term trend indicator',
                '200_sma': 'Long-term trend, major support/resistance',
                'vwap': 'Intraday fair value and support/resistance'
            },
            'momentum': {
                'rsi': {
                    'overbought': 70,
                    'oversold': 30,
                    'divergence': 'Price vs RSI divergence signals reversal'
                },
                'macd': {
                    'signal_cross': 'Entry/exit signals',
                    'zero_cross': 'Trend change confirmation',
                    'divergence': 'Weakening momentum'
                },
                'stochastic': {
                    'overbought': 80,
                    'oversold': 20,
                    'cross_signals': 'K crossing D line'
                }
            },
            'volume': {
                'volume_bars': 'Confirm price movement',
                'obv': 'On-Balance Volume for trend confirmation',
                'volume_profile': 'Identify high volume nodes',
                'rvol': 'Relative volume vs average'
            }
        }
        
        # Risk management rules
        self.risk_management = {
            'position_sizing': {
                'max_risk_per_trade': 0.02,  # 2% max risk
                'scaling': {
                    'starter': 0.25,  # 25% initial position
                    'add': 0.25,      # Add 25% on confirmation
                    'full': 0.50      # Final 50% on breakout
                },
                'kelly_criterion': 'Optimal position size based on win rate'
            },
            'stop_loss_types': {
                'hard_stop': 'Fixed price or percentage',
                'trailing_stop': 'Follows price up, locks in profit',
                'time_stop': 'Exit if trade not working within timeframe',
                'volatility_stop': 'ATR-based dynamic stop'
            },
            'profit_targets': {
                'fixed_ratio': '2:1 or 3:1 risk/reward',
                'resistance_levels': 'Prior highs, round numbers',
                'fibonacci': 'Extensions at 1.618, 2.618',
                'measured_moves': 'Pattern-based projections'
            }
        }
        
        # Market conditions
        self.market_conditions = {
            'trending': {
                'characteristics': ['Higher highs/lows', 'ADX > 25', 'Moving averages aligned'],
                'strategies': ['Breakouts', 'Pullbacks', 'Momentum']
            },
            'ranging': {
                'characteristics': ['Horizontal price action', 'ADX < 20', 'Defined support/resistance'],
                'strategies': ['Mean reversion', 'Range trading', 'Fades']
            },
            'volatile': {
                'characteristics': ['Wide price swings', 'High ATR', 'News-driven'],
                'strategies': ['Scalping', 'Quick trades', 'Reduced size']
            },
            'quiet': {
                'characteristics': ['Low volume', 'Tight ranges', 'No catalysts'],
                'strategies': ['Avoid trading', 'Wait for setups', 'Prep watchlist']
            }
        }
        
        # Scanner settings
        self.scanner_configurations = {
            'pre_market_gappers': {
                'gap_percent': {'min': 4, 'max': 100},
                'price': {'min': 1, 'max': 20},
                'volume': {'min': 100000},
                'float': {'max': 100000000},
                'time': '4:00 AM - 9:30 AM EST'
            },
            'momentum_scanner': {
                'change_5min': {'min': 2},
                'volume': {'min': 500000},
                'price': {'min': 2},
                'trades_per_minute': {'min': 10},
                'time': 'Market hours'
            },
            'reversal_scanner': {
                'rsi': {'max': 30, 'min': 70},
                'change_from_open': {'min': -5, 'max': 5},
                'volume_ratio': {'min': 1.5},
                'near_support': True
            },
            'breakout_scanner': {
                'near_resistance': {'percent': 2},
                'volume_surge': {'min': 2},
                'consolidation_period': {'min': 30},
                'atr': {'min': 0.5}
            }
        }
        
        # Time-based strategies
        self.time_strategies = {
            'market_open': {
                '9:30-9:45': 'High volatility, wait for direction',
                '9:45-10:00': 'Initial trend established, look for entries',
                '10:00-10:30': 'First pullback opportunities'
            },
            'mid_day': {
                '11:30-1:30': 'Lunch lull, lower volume',
                'strategy': 'Avoid new positions, manage existing'
            },
            'power_hour': {
                '3:00-4:00': 'Increased volume and volatility',
                'strategy': 'Look for EOD momentum, position unwinds'
            },
            'best_days': {
                'monday': 'Gap plays from weekend news',
                'tuesday-thursday': 'Most consistent trending',
                'friday': 'Position squaring, options expiry'
            }
        }
        
        # Psychology and discipline
        self.trading_psychology = {
            'rules': [
                'Never revenge trade',
                'Stop after 3 consecutive losses',
                'Take breaks after big wins',
                'Keep position size consistent',
                'Follow the plan, not emotions'
            ],
            'daily_goals': {
                'profit_target': '$500-1000',
                'max_loss': '$500',
                'max_trades': 5,
                'quality_over_quantity': True
            },
            'review_process': [
                'Screenshot all trades',
                'Journal entry and exit reasons',
                'Calculate statistics weekly',
                'Identify patterns in mistakes',
                'Continuous improvement'
            ]
        }
    
    def get_strategy_confidence(self, market_condition: str, pattern: str) -> float:
        """
        Calculate confidence level for a strategy based on conditions
        Returns confidence score 0-1
        """
        base_confidence = 0.5
        
        # Adjust based on market condition alignment
        if market_condition in self.market_conditions:
            if pattern in self.market_conditions[market_condition]['strategies']:
                base_confidence += 0.2
        
        # Add pattern-specific confidence
        if pattern in self.chart_patterns:
            pattern_data = self.chart_patterns[pattern]
            if 'breakout_probability' in pattern_data:
                base_confidence *= pattern_data['breakout_probability']
        
        return min(base_confidence, 1.0)
    
    def generate_unique_strategy(self, bot_mode: str) -> dict:
        """
        Bot creates its own strategy by combining learned concepts
        This ensures the bot doesn't just copy but engineers its own approach
        """
        import random
        
        # Base strategy components
        strategy = {
            'name': f'AuraQuant_{bot_mode}_Strategy',
            'components': [],
            'risk_level': 0,
            'time_frame': '',
            'indicators': [],
            'entry_rules': [],
            'exit_rules': [],
            'position_size': 0
        }
        
        # Customize based on bot mode
        if bot_mode == 'V1':
            # Conservative approach
            strategy['risk_level'] = 0.01
            strategy['time_frame'] = '15min'
            strategy['indicators'] = ['9_ema', '20_ema', 'vwap', 'rsi']
            strategy['components'] = ['micro_pullback', 'risk_management']
            strategy['position_size'] = 0.25
            
        elif bot_mode == 'V2':
            # Balanced approach
            strategy['risk_level'] = 0.02
            strategy['time_frame'] = '5min'
            strategy['indicators'] = ['9_ema', 'vwap', 'macd', 'volume']
            strategy['components'] = ['momentum_trading', 'bull_flag_pattern']
            strategy['position_size'] = 0.5
            
        elif bot_mode == 'V3':
            # Aggressive approach
            strategy['risk_level'] = 0.03
            strategy['time_frame'] = '1min'
            strategy['indicators'] = ['vwap', 'rsi', 'volume_profile']
            strategy['components'] = ['gap_and_go', 'opening_range_breakout']
            strategy['position_size'] = 0.75
            
        elif bot_mode == 'V∞':
            # Infinity mode - combining all knowledge
            strategy['risk_level'] = 0.01  # Low risk but high frequency
            strategy['time_frame'] = 'multi'
            strategy['indicators'] = list(self.indicators['moving_averages'].keys())
            strategy['components'] = list(self.trading_concepts.keys())[:3]
            strategy['position_size'] = 'dynamic'
            
            # AI-enhanced rules
            strategy['ai_enhanced'] = True
            strategy['machine_learning'] = 'reinforcement_learning'
            strategy['adaptation_rate'] = 'real-time'
        
        # Generate unique entry rules by combining concepts
        for component in strategy['components']:
            if component in self.trading_concepts:
                concept = self.trading_concepts[component]
                if 'entry_signals' in concept:
                    strategy['entry_rules'].extend(
                        random.sample(concept['entry_signals'], 
                                    min(2, len(concept['entry_signals'])))
                    )
        
        # Generate exit rules
        strategy['exit_rules'] = [
            f"Stop loss at {strategy['risk_level']*100}%",
            f"Profit target at {strategy['risk_level']*100*2}%",
            "Trail stop after 1:1 risk/reward",
            "Time stop after 30 minutes if flat"
        ]
        
        # Add unique signature
        strategy['signature'] = f"AQ_{bot_mode}_{hash(str(strategy['components']))}"
        
        return strategy
    
    def calculate_position_size(self, account_balance: float, risk_percent: float, 
                               stop_distance: float, share_price: float) -> int:
        """
        Calculate optimal position size based on risk management
        """
        dollar_risk = account_balance * risk_percent
        shares = int(dollar_risk / stop_distance)
        max_shares = int((account_balance * 0.25) / share_price)  # Max 25% of account
        
        return min(shares, max_shares)
    
    def evaluate_setup_quality(self, setup_data: dict) -> dict:
        """
        Evaluate the quality of a trading setup
        Returns quality score and reasons
        """
        quality_score = 0
        reasons = []
        
        # Check volume
        if setup_data.get('relative_volume', 0) > 2:
            quality_score += 20
            reasons.append("High relative volume")
        
        # Check catalyst
        if setup_data.get('has_catalyst', False):
            quality_score += 25
            reasons.append("News catalyst present")
        
        # Check technical setup
        if setup_data.get('above_vwap', False):
            quality_score += 15
            reasons.append("Trading above VWAP")
        
        # Check trend alignment
        if setup_data.get('trend_aligned', False):
            quality_score += 20
            reasons.append("Trend alignment confirmed")
        
        # Check risk/reward
        risk_reward = setup_data.get('risk_reward_ratio', 0)
        if risk_reward >= 3:
            quality_score += 20
            reasons.append(f"Excellent R:R ratio ({risk_reward}:1)")
        elif risk_reward >= 2:
            quality_score += 10
            reasons.append(f"Good R:R ratio ({risk_reward}:1)")
        
        # Determine grade
        if quality_score >= 80:
            grade = 'A'
        elif quality_score >= 60:
            grade = 'B'
        elif quality_score >= 40:
            grade = 'C'
        else:
            grade = 'F'
        
        return {
            'score': quality_score,
            'grade': grade,
            'reasons': reasons,
            'tradeable': quality_score >= 60
        }


# Bot Strategy Generator
class BotStrategyEngine:
    """
    Engine that creates unique strategies for the bot
    Learns from Warrior Trading but creates its own approach
    """
    
    def __init__(self):
        self.knowledge = WarriorTradingKnowledge()
        self.active_strategies = {}
        self.performance_history = []
    
    def create_custom_strategy(self, mode: str, market_condition: str) -> dict:
        """
        Create a custom strategy based on mode and market conditions
        The bot engineers its own unique approach
        """
        # Get base strategy from knowledge
        base_strategy = self.knowledge.generate_unique_strategy(mode)
        
        # Adapt to current market condition
        if market_condition in self.knowledge.market_conditions:
            market_data = self.knowledge.market_conditions[market_condition]
            base_strategy['preferred_setups'] = market_data['strategies']
        
        # Add AI enhancements
        base_strategy['ai_features'] = {
            'pattern_recognition': 'neural_network',
            'sentiment_analysis': 'nlp_model',
            'price_prediction': 'lstm_model',
            'risk_calculation': 'monte_carlo'
        }
        
        # Create unique indicator combinations
        import random
        available_indicators = list(self.knowledge.indicators['momentum'].keys())
        base_strategy['custom_indicators'] = random.sample(
            available_indicators, 
            min(3, len(available_indicators))
        )
        
        # Generate unique rules
        base_strategy['entry_conditions'] = self._generate_entry_conditions(mode)
        base_strategy['exit_conditions'] = self._generate_exit_conditions(mode)
        
        # Store strategy
        strategy_id = f"{mode}_{market_condition}_{hash(str(base_strategy))}"
        self.active_strategies[strategy_id] = base_strategy
        
        return base_strategy
    
    def _generate_entry_conditions(self, mode: str) -> list:
        """Generate unique entry conditions"""
        conditions = []
        
        if mode in ['V1', 'V2']:
            conditions = [
                "Price > VWAP",
                "RSI > 50 and RSI < 70",
                "Volume > 20-period average",
                "9 EMA > 20 EMA"
            ]
        elif mode in ['V3', 'V4']:
            conditions = [
                "Breakout above resistance with volume",
                "MACD cross above signal",
                "Price momentum increasing",
                "Relative strength > market"
            ]
        elif mode == 'V∞':
            conditions = [
                "AI confidence > 0.8",
                "Multiple timeframe alignment",
                "Smart money flow positive",
                "Quantum probability > threshold",
                "Zero-loss guarantee conditions met"
            ]
        
        return conditions
    
    def _generate_exit_conditions(self, mode: str) -> list:
        """Generate unique exit conditions"""
        conditions = [
            "Stop loss triggered",
            "Profit target reached",
            "Trailing stop activated",
            "Time-based exit",
            "Reversal signal detected"
        ]
        
        if mode == 'V∞':
            conditions.extend([
                "AI predicts reversal",
                "Risk threshold exceeded",
                "Better opportunity detected",
                "Quantum state changed"
            ])
        
        return conditions
    
    def optimize_strategy(self, strategy_id: str, performance_data: dict):
        """
        Optimize strategy based on performance
        The bot learns and improves
        """
        if strategy_id not in self.active_strategies:
            return
        
        strategy = self.active_strategies[strategy_id]
        
        # Analyze performance
        win_rate = performance_data.get('win_rate', 0)
        profit_factor = performance_data.get('profit_factor', 0)
        
        # Adjust parameters based on performance
        if win_rate < 0.5:
            # Tighten entry conditions
            strategy['risk_level'] *= 0.9
            strategy['entry_conditions'].append("Additional confirmation required")
        elif win_rate > 0.7:
            # Can be slightly more aggressive
            strategy['risk_level'] *= 1.05
            strategy['position_size'] *= 1.1
        
        if profit_factor < 1.5:
            # Improve risk/reward
            strategy['exit_conditions'][1] = "Profit target at 3:1 minimum"
        
        # Store performance for learning
        self.performance_history.append({
            'strategy_id': strategy_id,
            'timestamp': datetime.now(),
            'metrics': performance_data
        })
        
        return strategy


# Export for use in bot
if __name__ == "__main__":
    # Test the knowledge base
    knowledge = WarriorTradingKnowledge()
    engine = BotStrategyEngine()
    
    # Create strategies for different modes
    for mode in ['V1', 'V2', 'V3', 'V∞']:
        strategy = engine.create_custom_strategy(mode, 'trending')
        print(f"\n{mode} Strategy Created:")
        print(f"  Risk Level: {strategy['risk_level']}")
        print(f"  Components: {strategy['components']}")
        print(f"  Entry Rules: {strategy['entry_conditions'][:3]}")
        
    # Test setup evaluation
    test_setup = {
        'relative_volume': 3.5,
        'has_catalyst': True,
        'above_vwap': True,
        'trend_aligned': True,
        'risk_reward_ratio': 3.2
    }
    
    quality = knowledge.evaluate_setup_quality(test_setup)
    print(f"\nSetup Quality: {quality['grade']} ({quality['score']}/100)")
    print(f"Reasons: {', '.join(quality['reasons'])}")
    print(f"Tradeable: {quality['tradeable']}")
