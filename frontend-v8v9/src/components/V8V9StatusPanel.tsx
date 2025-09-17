import React from 'react';
import './V8V9StatusPanel.css';

interface V8V9StatusPanelProps {
  v8Active: boolean;
  v9Locked: boolean;
  paperTrading: boolean;
}

const V8V9StatusPanel: React.FC<V8V9StatusPanelProps> = ({
  v8Active,
  v9Locked,
  paperTrading
}) => {
  return (
    <div className="v8v9-status-panel">
      <h2>System Mode Status</h2>
      
      <div className="mode-cards">
        <div className={`mode-card v8-card ${v8Active ? 'active' : 'inactive'}`}>
          <h3>V8 Profit Core</h3>
          <div className="mode-status">
            <span className="status-icon">{v8Active ? '✅' : '❌'}</span>
            <span className="status-text">{v8Active ? 'ACTIVE' : 'INACTIVE'}</span>
          </div>
          <p>Executing live trading strategies</p>
          <ul>
            <li>Real-time market analysis</li>
            <li>Automated order execution</li>
            <li>Risk management active</li>
            <li>P&L tracking enabled</li>
          </ul>
        </div>

        <div className={`mode-card v9-card ${v9Locked ? 'locked' : 'unlocked'}`}>
          <h3>V9+ Learning Brain</h3>
          <div className="mode-status">
            <span className="status-icon">{v9Locked ? '🔒' : '🔓'}</span>
            <span className="status-text">{v9Locked ? 'DORMANT (LOCKED)' : 'UNLOCKED'}</span>
          </div>
          <p>{v9Locked ? 'Learning mode only - no execution' : 'Advanced AI trading enabled'}</p>
          <ul>
            <li>Pattern recognition: {v9Locked ? 'Learning' : 'Active'}</li>
            <li>Market prediction: {v9Locked ? 'Training' : 'Predicting'}</li>
            <li>Capital allocation: {v9Locked ? 'Simulated' : 'Live'}</li>
            <li>Neural networks: {v9Locked ? 'Dormant' : 'Processing'}</li>
          </ul>
          {v9Locked && (
            <div className="unlock-notice">
              ⚠️ Requires "meggie moo" + 2FA to unlock
            </div>
          )}
        </div>
      </div>

      <div className="trading-mode-indicator">
        <h3>Trading Mode</h3>
        <div className={`trading-badge ${paperTrading ? 'paper' : 'live'}`}>
          {paperTrading ? '📝 PAPER TRADING' : '💰 LIVE TRADING'}
        </div>
        <p>{paperTrading ? 
          'Safe mode - no real money at risk' : 
          'CAUTION: Real money trading active'}</p>
      </div>
    </div>
  );
};

export default V8V9StatusPanel;