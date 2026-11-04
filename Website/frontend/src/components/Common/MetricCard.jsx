import React from 'react';

export function MetricCard({ title, value, subtext, icon: Icon, color = 'indigo' }) {
  const colorMap = {
    indigo: { bg: 'rgba(99, 102, 241, 0.15)', text: '#818cf8' },
    emerald: { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399' },
    amber: { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24' },
    rose: { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171' },
    cyan: { bg: 'rgba(6, 182, 212, 0.15)', text: '#38bdf8' }
  };

  const theme = colorMap[color] || colorMap.indigo;

  return (
    <div className="glass-card metric-card">
      <div className="metric-header">
        <span>{title}</span>
        {Icon && (
          <div className="metric-icon-box" style={{ backgroundColor: theme.bg, color: theme.text }}>
            <Icon size={18} />
          </div>
        )}
      </div>
      <div>
        <div className="metric-value">{value}</div>
        {subtext && <div className="metric-subtext">{subtext}</div>}
      </div>
    </div>
  );
}
