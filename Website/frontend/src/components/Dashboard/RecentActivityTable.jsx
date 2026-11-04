import React from 'react';
import { StatusBadge } from '../Common/StatusBadge';
import { ShieldCheck, ShieldAlert, AlertTriangle } from 'lucide-react';

export function RecentActivityTable({ activities, onSelectActivity }) {
  return (
    <div className="table-container">
      <table className="custom-table">
        <thead>
          <tr>
            <th>TIME</th>
            <th>AGENT</th>
            <th>THREAT</th>
            <th>RISK</th>
            <th>ACTION</th>
          </tr>
        </thead>
        <tbody>
          {activities.map((item, idx) => (
            <tr 
              key={idx} 
              style={{ cursor: onSelectActivity ? 'pointer' : 'default' }}
              onClick={() => onSelectActivity && onSelectActivity(item)}
            >
              <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                {item.time}
              </td>
              <td style={{ fontWeight: 600 }}>
                {item.agent}
              </td>
              <td>
                {item.threat === '—' || !item.threat ? (
                  <span style={{ color: 'var(--text-muted)' }}>—</span>
                ) : (
                  <span className="token-highlight" style={{ fontSize: '11px' }}>
                    {item.threat}
                  </span>
                )}
              </td>
              <td>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  color: item.risk === 'High' ? '#ef4444' : item.risk === 'Medium' ? '#f59e0b' : '#10b981',
                  fontWeight: 600
                }}>
                  {item.risk}
                </span>
              </td>
              <td>
                <StatusBadge value={item.action} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
