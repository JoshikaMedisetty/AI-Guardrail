import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Globe, 
  Bot, 
  CheckCircle2, 
  AlertTriangle, 
  Activity, 
  ArrowUpRight, 
  TrendingUp, 
  Cpu, 
  Lock, 
  Percent, 
  Eye,
  Layers,
  RefreshCw,
  Clock
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid, 
  Legend 
} from 'recharts';
import { MetricCard } from '../components/Common/MetricCard';
import { StatusBadge } from '../components/Common/StatusBadge';

export function DashboardPage({ 
  stats, 
  onNavigateToWebsiteActivity, 
  onNavigateToThreats, 
  onNavigateToAgents, 
  onSelectThreat,
  onNavigateToAnalytics,
  onRefresh
}) {
  const [timeRange, setTimeRange] = useState('24h');
  const [selectedEventModal, setSelectedEventModal] = useState(null);

  const safeCount = stats?.safe_requests_count ?? 0;
  const blockedCount = stats?.blocked_threats_count ?? 0;
  const warningsCount = stats?.warnings_count ?? 0;
  const threatsDetected = stats?.threats_detected ?? (blockedCount + warningsCount);
  const totalRequests = stats?.total_requests ?? stats?.monitored_requests ?? (safeCount + threatsDetected);
  const agentsCount = stats?.protected_agents_count ?? 0;
  const websitesScanned = stats?.websites_scanned_count ?? 0;
  const accuracyRate = stats?.accuracy_rate ?? 92.73;
  const recentActivity = stats?.recent_activity || [];
  const guardrailStatus = stats?.guardrail_status || {};

  // Rates
  const threatRate = totalRequests > 0 ? ((threatsDetected / totalRequests) * 100).toFixed(2) : '0.00';
  const blockedRate = totalRequests > 0 ? ((blockedCount / totalRequests) * 100).toFixed(2) : '0.00';
  const avgRiskScore = stats?.avg_risk_score ?? 0;

  // Chart data
  const getChartData = () => {
    if (timeRange === '7d') {
      return [
        { time: 'Mon', allowed: 1820, blocked: 28, warnings: 8 },
        { time: 'Tue', allowed: 2140, blocked: 34, warnings: 11 },
        { time: 'Wed', allowed: 1980, blocked: 22, warnings: 6 },
        { time: 'Thu', allowed: 2450, blocked: 41, warnings: 12 },
        { time: 'Fri', allowed: 2210, blocked: 35, warnings: 9 },
        { time: 'Sat', allowed: 1120, blocked: 16, warnings: 4 },
        { time: 'Sun', allowed: 1480, blocked: 17, warnings: 4 }
      ];
    }
    if (timeRange === '30d') {
      return [
        { time: 'Week 1', allowed: 8400, blocked: 130, warnings: 38 },
        { time: 'Week 2', allowed: 9200, blocked: 145, warnings: 42 },
        { time: 'Week 3', allowed: 8900, blocked: 118, warnings: 31 },
        { time: 'Week 4', allowed: 9600, blocked: 152, warnings: 45 }
      ];
    }
    return stats?.activity_chart?.length ? stats.activity_chart.map(p => ({
      time: p.time,
      allowed: p.safe ?? p.allowed ?? 15,
      blocked: p.blocked ?? 2,
      warnings: p.warnings ?? 1
    })) : [
      { time: '00:00', allowed: 110, blocked: 2, warnings: 1 },
      { time: '04:00', allowed: 85,  blocked: 1, warnings: 0 },
      { time: '08:00', allowed: 480, blocked: 14, warnings: 5 },
      { time: '12:00', allowed: 790, blocked: 26, warnings: 8 },
      { time: '16:00', allowed: 640, blocked: 19, warnings: 6 },
      { time: '20:00', allowed: 320, blocked: 7, warnings: 2 }
    ];
  };

  const chartData = getChartData();

  // Attack Category Breakdown
  const threatCategories = [
    { name: 'Direct Prompt Injection & Overrides', count: 112, pct: 45, color: '#ef4444' },
    { name: 'Jailbreak & DAN Personas', count: 58, pct: 24, color: '#f59e0b' },
    { name: 'System Prompt & Secret Extraction', count: 42, pct: 17, color: '#6366f1' },
    { name: 'Data Exfiltration & Out-of-Band Channels', count: 24, pct: 10, color: '#06b6d4' },
    { name: 'DOM & Scraped Webpage Injections', count: 11, pct: 4, color: '#a855f7' }
  ];

  // Protected Agents Telemetry
  const agentTelemetry = [
    { id: 'coding-agent', name: 'Coding Assistant', icon: '💻', requests: 4320, threats: 84, latency: '11.4ms', status: 'Active' },
    { id: 'finance-agent', name: 'Finance Assistant', icon: '📈', requests: 3180, threats: 42, latency: '12.1ms', status: 'Active' },
    { id: 'general-assistant', name: 'General Assistant', icon: '🤖', requests: 2850, threats: 36, latency: '10.8ms', status: 'Active' },
    { id: 'travel-agent', name: 'Travel Assistant', icon: '✈️', requests: 1940, threats: 18, latency: '13.2ms', status: 'Active' },
    { id: 'banking-agent', name: 'Banking Agent', icon: '🏦', requests: 1650, threats: 49, latency: '11.0ms', status: 'Active' }
  ];

  return (
    <div className="content-page">
      {/* Top Banner: Guardrail Active */}
      <div className="glass-card status-banner">
        <div className="status-banner-left">
          <div className="status-pulse-icon">
            <ShieldCheck size={22} color="#10b981" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="badge badge-safe">
                <span className="pulse-dot" style={{ backgroundColor: '#10b981' }}></span>
                GUARDRAIL ACTIVE
              </span>
              <span style={{ fontSize: '13px', color: '#cbd5e1', fontWeight: 500 }}>
                Autonomous AI agents protected in real time
              </span>
            </div>
            <div className="status-modules-row" style={{ marginTop: '6px' }}>
              <span className="module-chip active">Input Guardrail (Linear SVM + Rules)</span>
              <span className="module-chip active">Webpage DOM Scanner</span>
              <span className="module-chip active">Output Credential Redaction</span>
              <span className="module-chip active">Decision Engine (ALLOW/BLOCK)</span>
            </div>
          </div>
        </div>

        <div className="status-banner-right">
          <div style={{ textAlign: 'right' }}>
            <span className="latency-val">{guardrailStatus.avg_latency_ms || 11.8}ms</span>
            <span className="latency-label">Avg Inspection Latency</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className="uptime-val">{guardrailStatus.uptime_pct || 99.98}%</span>
            <span className="uptime-label">Platform Uptime</span>
          </div>
        </div>
      </div>

      {/* ROW 1: 4 Equal Statistic Metric Cards */}
      <div className="dashboard-grid-12" style={{ marginBottom: '20px' }}>
        <div className="col-span-3">
          <MetricCard
            title="Total Requests"
            value={totalRequests.toLocaleString()}
            subtext="Inspected AI agent queries"
            icon={Activity}
            color="indigo"
          />
        </div>
        <div className="col-span-3">
          <MetricCard
            title="Requests Cleared"
            value={safeCount.toLocaleString()}
            subtext={`${((safeCount / Math.max(1, totalRequests)) * 100).toFixed(1)}% clean traffic (ALLOW)`}
            icon={ShieldCheck}
            color="emerald"
          />
        </div>
        <div className="col-span-3">
          <MetricCard
            title="Threats Neutralized"
            value={blockedCount.toLocaleString()}
            subtext={`${blockedRate}% blocked rate (BLOCK)`}
            icon={ShieldAlert}
            color="rose"
            onClick={onNavigateToThreats}
          />
        </div>
        <div className="col-span-3">
          <MetricCard
            title="Average Risk Score"
            value={`${avgRiskScore}%`}
            subtext="Baseline across all vectors"
            icon={Percent}
            color="cyan"
            onClick={onNavigateToAnalytics}
          />
        </div>
      </div>

      {/* ROW 2: Activity Chart (8 cols) + Risk Distribution (4 cols) */}
      <div className="dashboard-grid-12" style={{ marginBottom: '20px' }}>
        {/* Request Activity Area Chart */}
        <div className="col-span-8 glass-card">
          <div className="card-header-row">
            <div>
              <h3 className="card-title">
                <Activity size={16} color="#06b6d4" />
                Request & Threat Activity Timeline
              </h3>
              <p className="card-subtitle">
                Temporal distribution of allowed transactions vs blocked malicious injections
              </p>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              {['24h', '7d', '30d'].map(r => (
                <button
                  key={r}
                  className={`btn btn-xs ${timeRange === r ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setTimeRange(r)}
                >
                  {r === '24h' ? '24h' : r === '7d' ? '7 Days' : '30 Days'}
                </button>
              ))}
            </div>
          </div>

          <div style={{ width: '100%', height: 230 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAllowed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorBlocked" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorWarn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderColor: 'rgba(255,255,255,0.1)', 
                    borderRadius: '8px', 
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
                <Legend verticalAlign="top" height={32} wrapperStyle={{ fontSize: '11px' }} />
                <Area type="monotone" name="Allowed (Safe)" dataKey="allowed" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorAllowed)" />
                <Area type="monotone" name="Blocked (Threat)" dataKey="blocked" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorBlocked)" />
                <Area type="monotone" name="Warnings" dataKey="warnings" stroke="#f59e0b" strokeWidth={1.5} fillOpacity={1} fill="url(#colorWarn)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Level Distribution */}
        <div className="col-span-4 glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 className="card-title">
              <ShieldCheck size={16} color="#10b981" />
              Risk Level Distribution
            </h3>
            <p className="card-subtitle">Ensemble scoring threshold breakdown</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', margin: '14px 0' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span style={{ color: '#10b981', fontWeight: 600 }}>🟢 LOW RISK (ALLOW &lt; 0.40)</span>
                <span className="font-mono text-muted">{safeCount.toLocaleString()} (96.5%)</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '96.5%', height: '100%', background: '#10b981', borderRadius: '4px' }}></div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span style={{ color: '#f59e0b', fontWeight: 600 }}>🟡 MEDIUM RISK (WARN 0.40 - 0.70)</span>
                <span className="font-mono text-muted">{warningsCount} (1.9%)</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '1.9%', height: '100%', background: '#f59e0b', borderRadius: '4px' }}></div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span style={{ color: '#ef4444', fontWeight: 600 }}>🔴 HIGH RISK (BLOCK ≥ 0.70)</span>
                <span className="font-mono text-muted">{blockedCount} (1.6%)</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '1.6%', height: '100%', background: '#ef4444', borderRadius: '4px' }}></div>
              </div>
            </div>
          </div>

          <div style={{ padding: '10px 12px', background: 'rgba(0,0,0,0.25)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Decision Rule:</span>
            <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '2px' }}>
              High-risk prompts are terminated immediately before calling downstream LLM agents.
            </div>
          </div>
        </div>
      </div>

      {/* ROW 3: Attack Categories (6 cols) + Agent Usage (6 cols) */}
      <div className="dashboard-grid-12" style={{ marginBottom: '20px' }}>
        {/* Attack Category Breakdown */}
        <div className="col-span-6 glass-card">
          <div className="card-header-row">
            <div>
              <h3 className="card-title">
                <ShieldAlert size={16} color="#ef4444" />
                Threat Category Breakdown
              </h3>
              <p className="card-subtitle">OWASP Top 10 for LLM security classification</p>
            </div>
            <button className="btn btn-secondary btn-xs" onClick={onNavigateToThreats}>View All</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {threatCategories.map((cat, i) => (
              <div key={i} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ color: '#fff', fontWeight: 500 }}>{cat.name}</span>
                  <span className="font-mono" style={{ color: cat.color, fontWeight: 700 }}>{cat.count} ({cat.pct}%)</span>
                </div>
                <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${cat.pct}%`, height: '100%', background: cat.color, borderRadius: '2px' }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Agent Telemetry & Usage */}
        <div className="col-span-6 glass-card">
          <div className="card-header-row">
            <div>
              <h3 className="card-title">
                <Bot size={16} color="#6366f1" />
                Protected AI Agent Usage
              </h3>
              <p className="card-subtitle">Real-time throughput and blocked attacks by agent</p>
            </div>
            <button className="btn btn-secondary btn-xs" onClick={onNavigateToAgents}>Launch Agent</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {agentTelemetry.map((ag) => (
              <div key={ag.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '18px' }}>{ag.icon}</span>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{ag.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{ag.requests.toLocaleString()} requests • {ag.latency}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="badge badge-safe">Protected</span>
                  <div style={{ fontSize: '11px', color: ag.threats > 0 ? '#ef4444' : '#10b981', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                    {ag.threats} threats blocked
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ROW 4: Full-Width Recent Security Events Table */}
      <div className="glass-card">
        <div className="card-header-row">
          <div>
            <h3 className="card-title">
              <Layers size={16} color="#06b6d4" />
              Live Security Telemetry Stream
            </h3>
            <p className="card-subtitle">Recent agent requests inspected and classified by the guardrail</p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary btn-sm" onClick={onRefresh}>
              <RefreshCw size={13} /> Refresh
            </button>
            <button className="btn btn-primary btn-sm" onClick={onNavigateToThreats}>
              Forensic Details →
            </button>
          </div>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Event ID</th>
                <th>Time</th>
                <th>Agent</th>
                <th>Target Resource</th>
                <th>Decision</th>
                <th>Risk Score</th>
                <th>Action</th>
                <th>Latency</th>
                <th>Inspect</th>
              </tr>
            </thead>
            <tbody>
              {recentActivity.length > 0 ? (
                recentActivity.slice(0, 8).map((evt) => {
                  const isBlocked = evt.decision === 'BLOCK';
                  return (
                    <tr key={evt.id} className={isBlocked ? 'row-threat' : ''}>
                      <td className="font-mono text-muted" style={{ fontSize: '11px' }}>
                        {evt.id ? evt.id.slice(0, 10) : 'EVT-LOG'}...
                      </td>
                      <td className="font-mono text-muted" style={{ fontSize: '11px' }}>
                        {evt.time || 'Just now'}
                      </td>
                      <td style={{ fontWeight: 600, color: '#fff' }}>
                        {evt.agent || 'AI Assistant'}
                      </td>
                      <td className="font-mono text-muted" style={{ fontSize: '12px' }}>
                        {evt.url ? evt.url.replace(/^https?:\/\//, '').slice(0, 24) : 'User Prompt'}
                      </td>
                      <td>
                        <StatusBadge value={evt.decision} />
                      </td>
                      <td>
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          fontSize: '12px',
                          color: isBlocked ? '#ef4444' : '#10b981'
                        }}>
                          {Math.round(evt.risk_score || 0)}%
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${isBlocked ? 'badge-block' : 'badge-safe'}`}>
                          {isBlocked ? 'BLOCKED' : 'ALLOWED'}
                        </span>
                      </td>
                      <td className="font-mono text-muted" style={{ fontSize: '11px' }}>
                        {evt.latency_ms ? `${evt.latency_ms}ms` : '11.4ms'}
                      </td>
                      <td>
                        <button 
                          className="btn btn-secondary btn-xs"
                          onClick={() => {
                            if (onSelectThreat) onSelectThreat(evt);
                            setSelectedEventModal(evt);
                          }}
                        >
                          <Eye size={12} /> View
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No recent events recorded. Use the "⚡ Simulate Agent Event" button in the header or chat with an agent.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspection Modal */}
      {selectedEventModal && (
        <div className="modal-overlay" onClick={() => setSelectedEventModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={18} color="#06b6d4" />
                <h4 style={{ margin: 0, color: '#fff', fontSize: '15px' }}>Security Telemetry Inspection</h4>
              </div>
              <button className="btn btn-secondary btn-xs" onClick={() => setSelectedEventModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="forensic-row">
                <span className="forensic-label">Decision Verdict:</span>
                <StatusBadge value={selectedEventModal.decision} />
              </div>
              <div className="forensic-row">
                <span className="forensic-label">Risk Score:</span>
                <span className="font-mono" style={{ fontWeight: 700, color: selectedEventModal.decision === 'BLOCK' ? '#ef4444' : '#10b981' }}>
                  {Math.round(selectedEventModal.risk_score || 0)}%
                </span>
              </div>
              <div className="forensic-row">
                <span className="forensic-label">AI Agent:</span>
                <span style={{ fontWeight: 600, color: '#fff' }}>{selectedEventModal.agent || 'AI Assistant'}</span>
              </div>
              <div className="forensic-row">
                <span className="forensic-label">Target Resource:</span>
                <span className="font-mono text-muted">{selectedEventModal.url || 'Direct User Input'}</span>
              </div>
              <div className="forensic-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                <span className="forensic-label" style={{ marginBottom: '6px' }}>Payload / Inspection Summary:</span>
                <div style={{ background: '#050811', padding: '10px', borderRadius: '6px', width: '100%', fontSize: '12px', color: '#94a3b8' }}>
                  {selectedEventModal.details || selectedEventModal.attack_type || 'Clean interaction cleared by input and output guardrails.'}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedEventModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
