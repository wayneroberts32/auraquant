import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface HealthCheckHubProps {
  apiUrl: string;
}

const HealthCheckHub: React.FC<HealthCheckHubProps> = ({ apiUrl }) => {
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [checklist, setChecklist] = useState<any>(null);

  useEffect(() => {
    fetchHealthStatus();
    fetchDeploymentChecklist();
    const interval = setInterval(fetchHealthStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchHealthStatus = async () => {
    try {
      const response = await axios.get(`${apiUrl}/health`);
      setHealthStatus(response.data);
    } catch (error) {
      console.error('Failed to fetch health status:', error);
    }
  };

  const fetchDeploymentChecklist = async () => {
    try {
      const response = await axios.get(`${apiUrl}/deployment/checklist`);
      setChecklist(response.data);
    } catch (error) {
      console.error('Failed to fetch deployment checklist:', error);
    }
  };

  return (
    <div className="health-check-hub">
      <h3>🏥 System Health Check</h3>
      {healthStatus && (
        <div className="health-grid">
          <div className={`health-item ${healthStatus.status === 'healthy' ? 'healthy' : 'degraded'}`}>
            <span>Overall: {healthStatus.status === 'healthy' ? '✅' : '⚠️'}</span>
          </div>
          <div className={`health-item ${healthStatus.checks?.mongodb === 'ok' ? 'healthy' : 'error'}`}>
            <span>MongoDB: {healthStatus.checks?.mongodb === 'ok' ? '✅' : '❌'}</span>
          </div>
          <div className={`health-item ${healthStatus.checks?.v8_engine === 'active' ? 'healthy' : 'error'}`}>
            <span>V8 Engine: {healthStatus.checks?.v8_engine === 'active' ? '✅' : '❌'}</span>
          </div>
          <div className={`health-item ${healthStatus.checks?.v9_engine === 'dormant' ? 'healthy' : 'warning'}`}>
            <span>V9 Engine: {healthStatus.checks?.v9_engine === 'dormant' ? '🔒' : '🔓'}</span>
          </div>
          <div className={`health-item ${healthStatus.checks?.websocket === 'enabled' ? 'healthy' : 'error'}`}>
            <span>WebSocket: {healthStatus.checks?.websocket === 'enabled' ? '✅' : '❌'}</span>
          </div>
        </div>
      )}
      {checklist && (
        <div className="deployment-status">
          <h4>Deployment Checklist</h4>
          <div className={`ready-status ${checklist.ready_for_deployment ? 'ready' : 'not-ready'}`}>
            {checklist.ready_for_deployment ? '✅ READY FOR DEPLOYMENT' : '⚠️ NOT READY'}
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthCheckHub;