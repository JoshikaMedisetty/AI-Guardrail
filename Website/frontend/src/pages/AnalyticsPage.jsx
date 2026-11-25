import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  PieChart, 
  ShieldCheck, 
  ShieldAlert, 
  Globe, 
  Activity, 
  TrendingUp, 
  AlertTriangle,
  Lock,
  Layers,
  Bot
} from 'lucide-react';
import { MetricCard } from '../components/Common/MetricCard';
import { fetchAnalytics } from '../services/api';

export function AnalyticsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchAnalytics();
        setAnalytics(data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const totalReqs = analytics?.total_requests || 18265;
  const safeReqs = analytics?.safe_requests || 17993;
  const blockedReqs = analytics?.blocked_threats || 272;
  const threatPct = analytics?.threat_percentage || 1.5;

  const threatTypes = analytics?.threat_types || [
    { label: 'Indirect Web Injection', count: 104, percent: 38.2, color: '#ef4444', owasp_code: 'LLM01:2025' },
    { label: 'Prompt Injection (Direct)', count: 76, percent: 27.9, color: '#f97316', owasp_code: 'LLM01:2025' },
    { label: 'Data Exfiltration Channels', count: 48, percent: 17.6, color: '#06b6d4', owasp_code: 'LLM02:2025' },
    { label: 'Hidden DOM Instructions', count: 28, percent: 10.3, color: '#8b5cf6', owasp_code: 'LLM03:2025' },
    { label: 'Jailbreak & Role Overrides', count: 16, percent: 5.9, color: '#ec4899', owasp_code: 'LLM01:2025' }
  ];

  const targetedWebsites = analytics?.targeted_websites || [
    { domain: 'pastebin.com', hits: 34, threats: 18, block_rate: 52.9, risk_level: 'CRITICAL' },
    { domain: 'raw.githubusercontent.com', hits: 62, threats: 14, block_rate: 22.6, risk_level: 'HIGH' },
    { domain: 'untrusted-blog.xyz', hits: 28, threats: 12, block_rate: 42.9, risk_level: 'CRITICAL' },
    { domain: 'kb.zendesk.com', hits: 840, threats: 8, block_rate: 0.9, risk_level: 'HIGH' },
    { domain: 'api.github.com', hits: 3120, threats: 4, block_rate: 0.1, risk_level: 'LOW' },
    { domain: 'finance.yahoo.com', hits: 2450, threats: 2, block_rate: 0.08, risk_level: 'LOW' }
  ];

  const timeline = analytics?.activity_timeline || [
    { timestamp: '02:00', safe: 120, blocked: 2 },
    { timestamp: '06:00', safe: 240, blocked: 4 },
    { timestamp: '10:00', safe: 580, blocked: 18 },
    { timestamp: '14:00', safe: 720, blocked: 22 },
    { timestamp: '18:00', safe: 490, blocked: 11 },
    { timestamp: '22:00', safe: 210, blocked: 5 }
  ];

  const agentBreakdown = analytics?.agent_breakdown || [
    { agent_id: 'financial-copilot', name: 'Financial Copilot', icon: '📈', requests: 3840, threats: 48, threat_rate: 1.25, posture: 'PROTECTED' },
    { agent_id: 'research-assistant', name: 'Research Assistant', icon: '🔬', requests: 2915, threats: 34, threat_rate: 1.17, posture: 'PROTECTED' },
    { agent_id: 'devops-automator', name: 'DevOps Automator', icon: '⚡', requests: 4120, threats: 72, threat_rate: 1.75, posture: 'HIGH_ACTIVITY' },
    { agent_id: 'customer-support-bot', name: 'Customer Care Concierge', icon: '💬', requests: 5210, threats: 89, threat_rate: 1.71, posture: 'HIGH_ACTIVITY' },
    { agent_id: 'code-review-agent', name: 'Code Review Agent', icon: '💻', requests: 2180, threats: 29, threat_rate: 1.33, posture: 'OPTIMAL' }
  ];

  const maxTimelineVal = Math.max(...timeline.map(t => t.safe + t.blocked), 10);

  return (
    <div className="content-page">
      {/* 4 Top Core Security KPIs */}
      <div className="grid-4">
        <MetricCard
          title="Total Requests Processed"
          value={totalReqs.toLocaleString()}
          subtext="Total agent calls intercepted"
          icon={Activity}
          color="indigo"
        />
        <MetricCard
          title="Safe Requests Allowed"
          value={safeReqs.toLocaleString()}
          subtext={`${((safeReqs / Math.max(1, totalReqs)) * 100).toFixed(1)}% verified clean traffic`}
          icon={ShieldCheck}
          color="emerald"
        />
        <MetricCard
          title="Blocked Security Threats"
          value={blockedReqs.toLocaleString()}
          subtext="Neutralized malicious payloads"
          icon={ShieldAlert}
          color="rose"
        />
        <MetricCard
          title="Threat Percentage"
          value={`${threatPct}%`}
          subtext="Global attack encounter rate"
          icon={TrendingUp}
          color="amber"
        />
      </div>

      {/* 2-Column Section: Threat Types & Targeted Websites */}
      <div className="grid-2" style={{ marginBottom: '28px' }}>
        
        {/* Threat Types Distribution */}
        <div className="glass-card">
          <div className="card-header-row">
            <div>
              <h3 className="card-title">
                <PieChart size={17} color="#ef4444" />
                Threat Types Distribution
              </h3>
              <p className="card-subtitle">
                Categorization of intercepted attacks by OWASP LLM security taxonomy
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '8px' }}>
            {threatTypes.map((item, i) => (
              <div key={i} className="threat-dist-bar-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: item.color }}></span>
                    <span style={{ fontWeight: 600, color: '#fff' }}>{item.label}</span>
                    <span className="badge-pill" style={{ fontSize: '10px' }}>{item.owasp_code}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <strong style={{ color: '#fff' }}>{item.count}</strong>
                    <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                      ({item.percent}%)
                    </span>
                  </div>
                </div>

                <div className="progress-track">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${item.percent}%`, backgroundColor: item.color }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Frequently Targeted Websites */}
        <div className="glass-card">
          <div className="card-header-row">
            <div>
              <h3 className="card-title">
                <Globe size={17} color="#06b6d4" />
                Frequently Targeted Websites & Domains
              </h3>
              <p className="card-subtitle">
                External sources generating the highest injection or exfiltration risk
              </p>
            </div>
          </div>

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>External Domain</th>
                  <th>Total Hits</th>
                  <th>Threats</th>
                  <th>Block Rate</th>
                  <th>Risk Rating</th>
                </tr>
              </thead>
              <tbody>
                {targetedWebsites.map((site, i) => (
                  <tr key={i}>
                    <td>
                      <span className="font-mono" style={{ color: '#38bdf8', fontSize: '12px' }}>
                        {site.domain}
                      </span>
                    </td>
                    <td className="font-mono text-muted">{site.hits}</td>
                    <td>
                      <span style={{ color: site.threats > 0 ? '#ef4444' : '#10b981', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                        {site.threats}
                      </span>
                    </td>
                    <td className="font-mono text-muted">{site.block_rate}%</td>
                    <td>
                      <span className={`status-badge badge-${site.risk_level === 'CRITICAL' ? 'critical' : site.risk_level === 'HIGH' ? 'high' : 'low'}`}>
                        {site.risk_level}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* 24-Hour Traffic & Attack Activity Timeline */}
      <div className="glass-card" style={{ marginBottom: '28px' }}>
        <div className="card-header-row">
          <div>
            <h3 className="card-title">
              <Activity size={17} color="#10b981" />
              24-Hour Security & Volume Trends
            </h3>
            <p className="card-subtitle">
              Cumulative agent traffic vs blocked security threat spikes
            </p>
          </div>
          <div className="chart-legend">
            <div className="legend-item">
              <span className="legend-dot safe"></span>
              <span>Safe Requests Allowed</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot blocked"></span>
              <span>Attacks Intercepted</span>
            </div>
          </div>
        </div>

        <div className="svg-chart-container">
          <svg viewBox="0 0 700 150" className="activity-svg" preserveAspectRatio="none">
            {timeline.map((pt, i) => {
              const x = 60 + (i * (580 / Math.max(1, timeline.length - 1)));
              const safeHeight = Math.max(6, (pt.safe / maxTimelineVal) * 90);
              const blockedHeight = Math.max(0, (pt.blocked / maxTimelineVal) * 90);
              const ySafe = 120 - safeHeight;
              const yBlocked = ySafe - blockedHeight;

              return (
                <g key={i}>
                  <rect x={x - 16} y={ySafe} width="32" height={safeHeight} fill="#10b981" rx="4" opacity="0.85" />
                  {pt.blocked > 0 && (
                    <rect x={x - 16} y={yBlocked} width="32" height={blockedHeight} fill="#ef4444" rx="4" opacity="0.95" />
                  )}
                  <text x={x} y="140" textAnchor="middle" fill="#64748b" fontSize="11" fontFamily="var(--font-mono)">
                    {pt.timestamp}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Connected Agent Security Posture */}
      <div className="glass-card">
        <div className="card-header-row">
          <div>
            <h3 className="card-title">
              <Bot size={17} color="#6366f1" />
              Connected Agent Security Posture
            </h3>
            <p className="card-subtitle">
              Live threat exposure and mitigation rating for each protected AI agent
            </p>
          </div>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Requests Handled</th>
                <th>Threats Neutralized</th>
                <th>Threat Encounter Rate</th>
                <th>Security Posture</th>
              </tr>
            </thead>
            <tbody>
              {agentBreakdown.map((ag) => (
                <tr key={ag.agent_id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '18px' }}>{ag.icon || '🤖'}</span>
                      <div>
                        <div style={{ fontWeight: 600, color: '#fff', fontSize: '13px' }}>{ag.name}</div>
                        <div className="font-mono text-muted" style={{ fontSize: '11px' }}>{ag.agent_id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="font-mono text-muted">{ag.requests.toLocaleString()}</td>
                  <td>
                    <span style={{ color: '#ef4444', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                      {ag.threats}
                    </span>
                  </td>
                  <td className="font-mono text-muted">{ag.threat_rate}%</td>
                  <td>
                    <span className="badge-pill" style={{
                      backgroundColor: ag.posture === 'OPTIMAL' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                      color: ag.posture === 'OPTIMAL' ? '#10b981' : '#818cf8',
                      border: `1px solid ${ag.posture === 'OPTIMAL' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`
                    }}>
                      🛡️ {ag.posture}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
