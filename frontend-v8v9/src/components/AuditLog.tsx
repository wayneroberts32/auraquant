import React from 'react';

const AuditLog: React.FC = () => {
  const logs = [
    { time: '2025-09-16 13:45:00', event: 'System started', user: 'system' },
    { time: '2025-09-16 13:46:00', event: 'V8 mode activated', user: 'system' },
    { time: '2025-09-16 13:47:00', event: 'Paper trading enabled', user: 'wayne@auraquant.com' },
  ];

  return (
    <div className="audit-log">
      <h3>📜 Audit Log</h3>
      <div className="log-entries">
        {logs.map((log, index) => (
          <div key={index} className="log-entry">
            <span className="time">{log.time}</span>
            <span className="event">{log.event}</span>
            <span className="user">{log.user}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AuditLog;