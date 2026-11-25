import React, { useState, useEffect } from 'react';
import { AlertOctagon, ShieldAlert, CheckCircle2, RefreshCw, Cpu, ShieldCheck } from 'lucide-react';
import { StatusBadge } from '../components/Common/StatusBadge';
import { fetchAlerts } from '../services/api';

export function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [selectedAlertIndex, setSelectedAlertIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadAlerts = async () => {
    setLoading(true);
    const data = await fetchAlerts(50);
    if (data && data.length > 0) {
      setAlerts(data);
    } else {
      setAlerts([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 10000);
    return () => clearInterval(interval);
  }, []);

  const currentAlert = alerts[selectedAlertIndex] || alerts[0];

  return (
    <div className="content-page">
      <div className="grid-2" style={{ gridTemplateColumns: alerts.length > 0 ? '340px 1fr' : '1fr' }}>
        
        {/* Left List of Alerts */}
        {alerts.length > 0 ? (
          <div>
            <div className="glass-card" style={{ padding: '18px' }}>
              <div className="card-header-row" style={{ marginBottom: '12px' }}>
                <h3 className="card-title" style={{ fontSize: '14px' }}>
                  <AlertOctagon size={16} color="#ef4444" />
                  Live Security Alerts ({alerts.length})
                </h3>
                <button className="btn btn-secondary btn-sm" onClick={loadAlerts} title="Refresh alerts">
                  <RefreshCw size={12} className={loading ? "spin" : ""} />
                </button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '600px', overflowY: 'auto' }}>
                {alerts.map((alert, idx) => (
                  <div
                    key={alert.id}
                    onClick={() => setSelectedAlertIndex(idx)}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      background: selectedAlertIndex === idx ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                      border: `1px solid ${selectedAlertIndex === idx ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255, 255, 255, 0.05)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#fff' }}>{alert.threat}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{alert.time}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{alert.agent}</span>
                      <StatusBadge value={alert.severity} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <ShieldCheck size={48} color="#10b981" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
              No Security Threats Recorded Yet
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto 20px' }}>
              The universal guardrail is actively inspecting all connected agent traffic. When a prompt injection attack is detected and blocked, incident forensics will automatically appear here.
            </p>
            <button className="btn btn-secondary btn-sm" onClick={loadAlerts}>
              <RefreshCw size={12} className={loading ? "spin" : ""} /> Check for Alerts
            </button>
          </div>
        )}

        {/* Right: Detailed Threat Forensics */}
        {currentAlert && (
          <div>
            <div className="alert-card-detailed">
              <div className="alert-header">
                <div className="alert-title-area">
                  <div className="alert-icon-wrap">
                    <ShieldAlert size={26} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                      🚨 SECURITY THREAT DETECTED
                    </h3>
                    <p style={{ fontSize: '12px', color: '#fca5a5' }}>
                      Incident ID: {currentAlert.id} • Guardrail Interception Layer
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <StatusBadge value={currentAlert.status || "BLOCKED"} />
                </div>
              </div>

              {/* Meta Grid */}
              <div className="alert-meta-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
                <div className="alert-meta-item">
                  <span>Target Agent</span>
                  <strong>{currentAlert.agent_id || currentAlert.agent}</strong>
                </div>
                <div className="alert-meta-item">
                  <span>Attack Type</span>
                  <strong style={{ color: '#f87171' }}>{currentAlert.threat || "PROMPT_INJECTION"}</strong>
                </div>
                <div className="alert-meta-item">
                  <span>Severity</span>
                  <strong style={{ color: '#ef4444' }}>🔴 {currentAlert.severity}</strong>
                </div>
                <div className="alert-meta-item">
                  <span>Risk Score</span>
                  <strong style={{ fontFamily: 'var(--font-mono)', color: '#ef4444' }}>{currentAlert.risk_score}%</strong>
                </div>
                <div className="alert-meta-item">
                  <span>Model</span>
                  <strong style={{ color: '#6366f1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Cpu size={13} /> {currentAlert.model_name || "Linear SVM"}
                  </strong>
                </div>
                <div className="alert-meta-item">
                  <span>Model Result</span>
                  <strong style={{ color: '#f59e0b', fontFamily: 'var(--font-mono)' }}>
                    {currentAlert.model_prediction || "PROMPT_INJECTION"}
                  </strong>
                </div>
              </div>

              {/* Intercepted Input */}
              <div className="section-box" style={{ borderLeftColor: '#ef4444' }}>
                <h4>Intercepted Agent Input</h4>
                <div className="code-block" style={{ color: '#fca5a5', marginTop: '6px' }}>
                  "{currentAlert.detected_input}"
                </div>
              </div>

              {/* What Was Detected */}
              <div className="section-box" style={{ borderLeftColor: '#f59e0b' }}>
                <h4>What was detected?</h4>
                <p>{currentAlert.what_detected}</p>
              </div>

              {/* Why Was It Blocked */}
              <div className="section-box" style={{ borderLeftColor: '#6366f1' }}>
                <h4>Security Explanation</h4>
                <p>{currentAlert.why_blocked}</p>
              </div>

              {/* Recommended Measures */}
              <div className="section-box" style={{ borderLeftColor: '#10b981', marginBottom: 0 }}>
                <h4 style={{ color: '#34d399' }}>Recommended Defensive Measures</h4>
                <ul className="recommendations-list" style={{ marginTop: '10px' }}>
                  {currentAlert.recommendations?.map((rec, i) => (
                    <li key={i}>
                      <CheckCircle2 size={15} color="#10b981" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
