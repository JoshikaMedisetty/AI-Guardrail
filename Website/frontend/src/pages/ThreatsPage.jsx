import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  Lock, 
  ExternalLink, 
  RefreshCw, 
  X, 
  Eye, 
  Bot, 
  Globe, 
  CheckCircle2, 
  Info,
  ShieldX
} from 'lucide-react';
import { StatusBadge } from '../components/Common/StatusBadge';
import { fetchThreats, fetchAgents } from '../services/api';

export function ThreatsPage({ initialSelectedThreat, onClearInitialThreat }) {
  const [threats, setThreats] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedThreat, setSelectedThreat] = useState(initialSelectedThreat || null);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [agentFilter, setAgentFilter] = useState('all');

  const loadThreats = async () => {
    setLoading(true);
    try {
      const [tData, aData] = await Promise.all([
        fetchThreats({ severity: severityFilter, agent_id: agentFilter }),
        fetchAgents()
      ]);
      setThreats(tData || []);
      setAgents(aData || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadThreats();
  }, [severityFilter, agentFilter]);

  useEffect(() => {
    if (initialSelectedThreat) {
      setSelectedThreat(initialSelectedThreat);
    }
  }, [initialSelectedThreat]);

  const handleCloseModal = () => {
    setSelectedThreat(null);
    if (onClearInitialThreat) onClearInitialThreat();
  };

  return (
    <div className="content-page">
      {/* Page Action Header */}
      <div className="page-action-row">
        <div>
          <h3 className="section-title">Security Threat Interceptions</h3>
          <p className="section-subtitle">
            All detected attacks, indirect prompt injections, hidden instructions, and exfiltration attempts blocked by Guardrail.
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={loadThreats} disabled={loading}>
          <RefreshCw size={13} className={loading ? "spin" : ""} /> Refresh Threats
        </button>
      </div>

      {/* Filter Bar */}
      <div className="glass-card filter-card">
        <div className="filters-form">
          <div className="filter-select-wrap">
            <label className="filter-label">Severity:</label>
            <select 
              className="filter-select"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
            >
              <option value="all">All Severities</option>
              <option value="CRITICAL">Critical Severity</option>
              <option value="HIGH">High Severity</option>
              <option value="MEDIUM">Medium Severity</option>
            </select>
          </div>

          <div className="filter-select-wrap">
            <label className="filter-label">Target Agent:</label>
            <select 
              className="filter-select"
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
            >
              <option value="all">All Protected Agents</option>
              {agents.map(ag => (
                <option key={ag.id} value={ag.id}>{ag.name}</option>
              ))}
            </select>
          </div>

          <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
            Showing {threats.length} recorded threat incidents
          </span>
        </div>
      </div>

      {/* Threats Table */}
      <div className="glass-card">
        <div className="card-header-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={17} color="#ef4444" />
            <span style={{ fontWeight: 600, color: '#fff', fontSize: '14px' }}>
              Detected Threats Table
            </span>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Click any row to open in-depth forensics
          </span>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Severity</th>
                <th>Attack Type</th>
                <th>Affected Agent</th>
                <th>Target Website / Source</th>
                <th>Detection Time</th>
                <th>Status</th>
                <th>Action Taken</th>
                <th>Risk Score</th>
                <th>Forensics</th>
              </tr>
            </thead>
            <tbody>
              {threats.length > 0 ? (
                threats.map((threat) => (
                  <tr 
                    key={threat.id} 
                    onClick={() => setSelectedThreat(threat)}
                    style={{ cursor: 'pointer' }}
                    className="threat-row-hover"
                  >
                    <td>
                      <StatusBadge value={threat.severity} />
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: '#fff', fontSize: '13px' }}>
                        {threat.attack_type || threat.threat}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Bot size={13} color="#818cf8" />
                        <span style={{ color: '#f8fafc', fontSize: '12px' }}>{threat.agent}</span>
                      </div>
                    </td>
                    <td>
                      <span 
                        className="font-mono text-muted" 
                        style={{ 
                          fontSize: '12px', 
                          maxWidth: '180px', 
                          display: 'inline-block', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          whiteSpace: 'nowrap' 
                        }}
                        title={threat.website_url}
                      >
                        {threat.website_url?.replace(/^https?:\/\//, '') || 'Agent Interface'}
                      </span>
                    </td>
                    <td className="font-mono text-muted" style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
                      {threat.time}
                    </td>
                    <td>
                      <span className="threat-status-tag">
                        {threat.status}
                      </span>
                    </td>
                    <td>
                      <span className="threat-action-pill blocked">
                        <Lock size={11} /> {threat.action_taken || 'BLOCKED'}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#ef4444'
                      }}>
                        {threat.risk_score}%
                      </span>
                    </td>
                    <td>
                      <button 
                        className="btn btn-secondary btn-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedThreat(threat);
                        }}
                      >
                        <Eye size={12} /> Details
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No threats found matching selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Forensic Threat Detail Modal */}
      {selectedThreat && (
        <div className="modal-backdrop" onClick={handleCloseModal}>
          <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(239, 68, 68, 0.18)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <ShieldAlert size={22} color="#ef4444" />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>
                    {selectedThreat.attack_type || selectedThreat.threat}
                  </h3>
                  <span className="font-mono text-muted" style={{ fontSize: '11px' }}>
                    Incident ID: {selectedThreat.id} • Detected {selectedThreat.time}
                  </span>
                </div>
              </div>
              <button className="modal-close-btn" onClick={handleCloseModal}>
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body">
              {/* Top Quick Attributes Bar */}
              <div className="threat-detail-badges-row">
                <div className="threat-badge-item">
                  <span className="lbl">Severity:</span>
                  <StatusBadge value={selectedThreat.severity} />
                </div>

                <div className="threat-badge-item">
                  <span className="lbl">Risk Level:</span>
                  <span style={{ color: '#ef4444', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    {selectedThreat.risk_score}% High Risk
                  </span>
                </div>

                <div className="threat-badge-item">
                  <span className="lbl">Action Taken:</span>
                  <span className="threat-action-pill blocked">
                    <Lock size={12} /> {selectedThreat.action_taken || 'BLOCKED (Execution Halted)'}
                  </span>
                </div>

                <div className="threat-badge-item">
                  <span className="lbl">Confidence:</span>
                  <span style={{ color: '#38bdf8', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                    {selectedThreat.confidence || 95}%
                  </span>
                </div>
              </div>

              {/* Grid of Agent & Target Website */}
              <div className="grid-2" style={{ marginBottom: '16px' }}>
                <div className="glass-card" style={{ padding: '14px', background: 'rgba(255, 255, 255, 0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <Bot size={15} color="#818cf8" />
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Affected Target Agent</span>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>
                    {selectedThreat.agent}
                  </div>
                  <span className="font-mono text-muted" style={{ fontSize: '11px' }}>
                    id: {selectedThreat.agent_id}
                  </span>
                </div>

                <div className="glass-card" style={{ padding: '14px', background: 'rgba(255, 255, 255, 0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <Globe size={15} color="#06b6d4" />
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Target Website / Resource</span>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#38bdf8', wordBreak: 'break-all' }}>
                    {selectedThreat.website_url || 'Direct Agent Prompt Pipeline'}
                  </div>
                </div>
              </div>

              {/* Malicious Detected Content Preview */}
              <div className="detail-field-group">
                <span className="field-label" style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldX size={14} /> Malicious Detected Content & Attack Payload
                </span>
                <pre className="code-block-modal" style={{ background: '#0b0f19', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                  <code>{selectedThreat.detected_input || 'No raw payload available.'}</code>
                </pre>
              </div>

              {/* Rationale: What was detected & why blocked */}
              <div className="detail-field-group">
                <span className="field-label">Threat Analysis & Detection Rationale</span>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <p style={{ fontSize: '13px', color: '#f8fafc', marginBottom: '8px', lineHeight: 1.5 }}>
                    <strong>What was detected:</strong> {selectedThreat.what_detected || 'Malicious instruction override or data exfiltration pattern targeting autonomous agent reasoning.'}
                  </p>
                  <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.5 }}>
                    <strong>Why blocked:</strong> {selectedThreat.why_blocked || 'The request was dropped under fail-safe policy to prevent unauthorized instruction override, credential theft, or agent hijacking.'}
                  </p>
                </div>
              </div>

              {/* Indicators List */}
              {selectedThreat.indicators && selectedThreat.indicators.length > 0 && (
                <div className="detail-field-group">
                  <span className="field-label">Detected Attack Indicators</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {selectedThreat.indicators.map((ind, i) => (
                      <div key={i} className="indicator-chip-row">
                        <span className="indicator-tag">{ind.indicator_type || 'Threat Pattern'}</span>
                        <code className="indicator-match">{ind.matched_text || 'Signature match'}</code>
                        {ind.confidence && (
                          <span className="indicator-conf">{(ind.confidence * 100).toFixed(0)}% conf</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {selectedThreat.recommendations && selectedThreat.recommendations.length > 0 && (
                <div className="detail-field-group" style={{ marginBottom: 0 }}>
                  <span className="field-label">Recommended Mitigations</span>
                  <ul className="recommendations-list">
                    {selectedThreat.recommendations.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="modal-footer">
              <span style={{ fontSize: '12px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={13} /> Guardrail Enforcement Complete: Attack Intercepted & Isolated
              </span>
              <button className="btn btn-secondary btn-sm" onClick={handleCloseModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
