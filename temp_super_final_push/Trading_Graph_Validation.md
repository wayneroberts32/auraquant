# Trading Graph Validation – AuraQuant

This document locks in ALL graph and charting requirements for Warp to implement and validate.

## Core Chart Features
- **Candlestick Charts**: Full OHLC rendering at all standard timeframes.
- **Volume Bars**: Color-coded, aligned with candlesticks (green = buy volume, red = sell volume).
- **MACD Crossover**: Configurable (fast, slow, signal lines) with histogram display.
- **Moving Averages**: Supports SMA, EMA, WMA. Multi-line overlays (configurable lengths).

## Indicators
- Bollinger Bands with margin call logic overlay.
- Klinger Oscillator with histogram.
- RSI, stochastic, VWAP overlays.

## Validation
1. **Charts**: Must update in real-time with WebSocket feeds (60fps target).
2. **Volume Bars**: Accurate tick-volume mapping, synchronized with candles.
3. **MACD**: Line crossover and histogram must match TA-lib results.
4. **Overlays**: User must toggle SMA, EMA, Bollinger, VWAP dynamically.
5. **Backtest Replay**: Indicators must work consistently in Strategy Tester.

## Testing Steps
- Run Trading Graph validation as part of UI/GUI validation.
- Capture chart screenshots with volume + MACD visible.
- Confirm trade signals (buy/sell arrows) sync with strategy logic.

✅ Warp must confirm **Trading Graph Validation** in `ReadinessReport.md` and `UI/GUI Validation PDFs`.
