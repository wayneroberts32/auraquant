import React, { useState } from 'react';

interface ExecutionPanelProps {
  isDisabled: boolean;
  isPaperTrading: boolean;
}

const ExecutionPanel: React.FC<ExecutionPanelProps> = ({ isDisabled, isPaperTrading }) => {
  const [symbol, setSymbol] = useState('SPY');
  const [quantity, setQuantity] = useState(100);
  const [orderType, setOrderType] = useState('market');

  return (
    <div className="execution-panel">
      <h3>📈 Order Execution</h3>
      <div className={`trading-mode-banner ${isPaperTrading ? 'paper' : 'live'}`}>
        {isPaperTrading ? '📝 PAPER TRADING' : '💰 LIVE TRADING'}
      </div>
      <div className="order-form">
        <input 
          type="text" 
          value={symbol} 
          onChange={(e) => setSymbol(e.target.value)}
          placeholder="Symbol"
        />
        <input 
          type="number" 
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          placeholder="Quantity"
        />
        <select value={orderType} onChange={(e) => setOrderType(e.target.value)}>
          <option value="market">Market</option>
          <option value="limit">Limit</option>
          <option value="stop">Stop</option>
        </select>
        <button className="btn-buy" disabled={isDisabled}>BUY</button>
        <button className="btn-sell" disabled={isDisabled}>SELL</button>
      </div>
      {isDisabled && <div className="warning">⚠️ Trading is currently paused</div>}
    </div>
  );
};

export default ExecutionPanel;