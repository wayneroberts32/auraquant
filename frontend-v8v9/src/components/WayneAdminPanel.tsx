import React, { useState } from 'react';
import axios from 'axios';
import './WayneAdminPanel.css';

interface WayneAdminPanelProps {
  authToken: string;
  onUnlockV9: () => void;
  onForceV8: () => void;
  onPauseTrading: () => void;
  onResumeTrading: () => void;
}

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const WayneAdminPanel: React.FC<WayneAdminPanelProps> = ({
  authToken,
  onUnlockV9,
  onForceV8,
  onPauseTrading,
  onResumeTrading
}) => {
  const [godPhrase, setGodPhrase] = useState('');
  const [twoFaCode, setTwoFaCode] = useState('');
  const [capitalPercentage, setCapitalPercentage] = useState(10);
  const [selectedBroker, setSelectedBroker] = useState('alpaca');

  const handleUnlockV9 = async () => {
    if (godPhrase !== 'meggie moo') {
      alert('Invalid god phrase! Unlock denied.');
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/admin/unlock-v9`,
        {
          god_phrase: godPhrase,
          two_fa_code: twoFaCode,
          gradual_percentage: capitalPercentage
        },
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );
      
      if (response.data.status === 'success') {
        alert('V9+ Mode successfully unlocked!');
        onUnlockV9();
        setGodPhrase('');
        setTwoFaCode('');
      }
    } catch (error: any) {
      alert(`Failed to unlock V9: ${error.response?.data?.detail || error.message}`);
    }
  };

  const handleAdminOverride = async (action: string, params: any = {}) => {
    try {
      const response = await axios.post(
        `${API_URL}/admin/override`,
        {
          action,
          parameters: params
        },
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );
      
      if (response.data.status === 'success') {
        alert(`Action ${action} executed successfully`);
        
        // Update UI based on action
        switch(action) {
          case 'force_v8':
            onForceV8();
            break;
          case 'pause':
            onPauseTrading();
            break;
          case 'resume':
            onResumeTrading();
            break;
        }
      }
    } catch (error: any) {
      alert(`Failed to execute ${action}: ${error.response?.data?.detail || error.message}`);
    }
  };

  return (
    <div className="wayne-admin-panel">
      <h2>👑 Wayne Admin Quick Panel (God Mode)</h2>
      
      <div className="admin-sections">
        {/* V9 Unlock Section */}
        <div className="admin-section v9-unlock">
          <h3>🔓 Unlock V9+ Mode</h3>
          <div className="unlock-form">
            <input
              type="password"
              placeholder="Enter God Phrase"
              value={godPhrase}
              onChange={(e) => setGodPhrase(e.target.value)}
            />
            <input
              type="text"
              placeholder="2FA Code"
              value={twoFaCode}
              onChange={(e) => setTwoFaCode(e.target.value)}
            />
            <div className="capital-slider">
              <label>Capital Allocation: {capitalPercentage}%</label>
              <input
                type="range"
                min="1"
                max="100"
                value={capitalPercentage}
                onChange={(e) => setCapitalPercentage(Number(e.target.value))}
              />
            </div>
            <button className="btn-unlock" onClick={handleUnlockV9}>
              Unlock V9+ (Gradual {capitalPercentage}%)
            </button>
          </div>
        </div>

        {/* Quick Controls */}
        <div className="admin-section quick-controls">
          <h3>⚡ Quick Controls</h3>
          <div className="control-buttons">
            <button 
              className="btn-control pause"
              onClick={() => handleAdminOverride('pause')}
            >
              ⏸️ Pause Trading
            </button>
            <button 
              className="btn-control resume"
              onClick={() => handleAdminOverride('resume')}
            >
              ▶️ Resume Trading
            </button>
            <button 
              className="btn-control force-v8"
              onClick={() => handleAdminOverride('force_v8')}
            >
              🔒 Force V8 Mode
            </button>
          </div>
        </div>

        {/* Broker Switch */}
        <div className="admin-section broker-switch">
          <h3>🔄 Broker Switch</h3>
          <select 
            value={selectedBroker}
            onChange={(e) => setSelectedBroker(e.target.value)}
          >
            <option value="alpaca">Alpaca</option>
            <option value="binance">Binance</option>
            <option value="interactive_brokers">Interactive Brokers</option>
          </select>
          <button 
            className="btn-control"
            onClick={() => handleAdminOverride('broker_switch', { broker: selectedBroker })}
          >
            Switch to {selectedBroker}
          </button>
        </div>

        {/* System Override */}
        <div className="admin-section system-override">
          <h3>⚠️ System Override</h3>
          <button className="btn-danger">
            Reset Password
          </button>
          <button className="btn-danger">
            Emergency Stop
          </button>
          <button className="btn-danger">
            Clear All Positions
          </button>
        </div>
      </div>

      <div className="admin-footer">
        <small>Admin: wayne@auraquant.com | God Mode Active</small>
      </div>
    </div>
  );
};

export default WayneAdminPanel;