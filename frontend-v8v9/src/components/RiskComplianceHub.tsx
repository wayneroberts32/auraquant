import React from 'react';

const RiskComplianceHub: React.FC = () => {
  return (
    <div className="risk-compliance-hub">
      <h3>⚖️ Risk & Compliance Hub</h3>
      <div className="risk-metrics">
        <div className="metric">
          <span className="label">Max Daily Loss:</span>
          <span className="value">2%</span>
        </div>
        <div className="metric">
          <span className="label">Current Drawdown:</span>
          <span className="value positive">0.5%</span>
        </div>
        <div className="metric">
          <span className="label">Risk Score:</span>
          <span className="value">Low</span>
        </div>
        <div className="metric">
          <span className="label">Compliance Status:</span>
          <span className="value">✅ Compliant</span>
        </div>
      </div>
    </div>
  );
};

export default RiskComplianceHub;