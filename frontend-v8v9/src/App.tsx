import React, { useState, useEffect } from 'react';
import './App.css';
import axios from 'axios';
import WayneAdminPanel from './components/WayneAdminPanel';
import V8V9StatusPanel from './components/V8V9StatusPanel';
import TradingChart from './components/TradingChart';
import ExecutionPanel from './components/ExecutionPanel';
import RiskComplianceHub from './components/RiskComplianceHub';
import HealthCheckHub from './components/HealthCheckHub';
import AuditLog from './components/AuditLog';

// Backend API URL - change this for production
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8000/ws';

interface SystemStatus {
  v8_mode: string;
  v9_mode: string;
  paper_trading: boolean;
  platform: string;
  timestamp: string;
}

const App: React.FC = () => {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [v9Locked, setV9Locked] = useState(true);
  const [tradingPaused, setTradingPaused] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);

  useEffect(() => {
    // Fetch initial system status
    fetchSystemStatus();
    
    // Connect WebSocket for real-time updates
    connectWebSocket();
  }, []);

  const fetchSystemStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/`);
      setSystemStatus(response.data);
      setV9Locked(response.data.v9_mode === 'DORMANT_LOCKED');
    } catch (error) {
      console.error('Failed to fetch system status:', error);
    }
  };

  const connectWebSocket = () => {
    const ws = new WebSocket(WS_URL);
    
    ws.onopen = () => {
      console.log('WebSocket connected to AuraQuant V8/V9 backend');
      setWsConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleWebSocketMessage(data);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setWsConnected(false);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setWsConnected(false);
      // Reconnect after 5 seconds
      setTimeout(connectWebSocket, 5000);
    };
  };

  const handleWebSocketMessage = (data: any) => {
    console.log('WebSocket message:', data);
    
    if (data.type === 'heartbeat') {
      // Update system status from heartbeat
      setV9Locked(data.v9_status === 'locked');
    } else if (data.event === 'v9_unlocked') {
      setV9Locked(false);
      alert(`V9+ Mode Unlocked by ${data.admin} - Capital: ${data.capital_percentage}%`);
    } else if (data.event === 'forced_v8_mode') {
      setV9Locked(true);
      alert('V8 Mode Forced - V9 Locked');
    } else if (data.event === 'trading_paused') {
      setTradingPaused(true);
    } else if (data.event === 'trading_resumed') {
      setTradingPaused(false);
    }
  };

  const handleAdminLogin = (token: string) => {
    setAuthToken(token);
    setIsAdmin(true);
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-content">
          <h1>🚀 AuraQuant V8/V9 Sovereign Quantum Infinity</h1>
          <div className="header-status">
            <span className={`status-badge ${wsConnected ? 'connected' : 'disconnected'}`}>
              {wsConnected ? '🟢 Connected' : '🔴 Disconnected'}
            </span>
            <span className={`status-badge ${tradingPaused ? 'paused' : 'active'}`}>
              {tradingPaused ? '⏸️ PAUSED' : '▶️ ACTIVE'}
            </span>
            <span className="status-badge">
              {systemStatus?.paper_trading ? '📝 PAPER' : '💰 LIVE'}
            </span>
          </div>
        </div>
      </header>

      <div className="main-container">
        {/* V8/V9 Status Panel - Always visible */}
        <V8V9StatusPanel 
          v8Active={systemStatus?.v8_mode === 'ACTIVE'}
          v9Locked={v9Locked}
          paperTrading={systemStatus?.paper_trading || true}
        />

        {/* Wayne Admin Panel - Only for authenticated admin */}
        {isAdmin && authToken && (
          <WayneAdminPanel 
            authToken={authToken}
            onUnlockV9={() => setV9Locked(false)}
            onForceV8={() => setV9Locked(true)}
            onPauseTrading={() => setTradingPaused(true)}
            onResumeTrading={() => setTradingPaused(false)}
          />
        )}

        {/* Main Trading Interface */}
        <div className="trading-grid">
          <div className="chart-section">
            <TradingChart />
          </div>
          
          <div className="execution-section">
            <ExecutionPanel 
              isDisabled={tradingPaused}
              isPaperTrading={systemStatus?.paper_trading || true}
            />
          </div>
        </div>

        {/* Risk and Compliance Hub */}
        <RiskComplianceHub />

        {/* Health Check Hub */}
        <HealthCheckHub apiUrl={API_URL} />

        {/* Audit Log for Admin */}
        {isAdmin && <AuditLog />}
      </div>

      {/* Admin Login Button */}
      {!isAdmin && (
        <button 
          className="admin-login-btn"
          onClick={() => {
            // Simple demo login - in production, implement proper auth
            const token = prompt('Enter admin token (demo: use "wayne-admin")');
            if (token === 'wayne-admin') {
              handleAdminLogin('demo-jwt-token');
            }
          }}
        >
          👤 Admin Login
        </button>
      )}

      <footer className="App-footer">
        <p>Following Golden Rules: BUILD → TEST → DEPLOY → EXPLAIN → TRADE</p>
        <p>V8 Profit Core: ACTIVE | V9+ Learning: {v9Locked ? 'DORMANT (LOCKED)' : 'UNLOCKED'}</p>
        <small>MASTER_SUPER_FINAL_WITH_FINAL_PUSH Implementation</small>
      </footer>
    </div>
  );
};

export default App;
