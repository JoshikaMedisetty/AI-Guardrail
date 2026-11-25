import React, { useState } from 'react';
import { 
  Bot, 
  ShieldCheck, 
  ShieldAlert, 
  Key, 
  Activity, 
  Clock, 
  Plus, 
  Power, 
  ExternalLink, 
  Copy, 
  Check, 
  RefreshCw,
  X,
  Lock,
  Layers
} from 'lucide-react';
import { StatusBadge } from '../components/Common/StatusBadge';
import { registerAgent, disconnectAgent } from '../services/api';

export function MyAgentsPage({ agents, onRefresh, onNavigateToConnect }) {
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [newAgentId, setNewAgentId] = useState('');
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentDesc, setNewAgentDesc] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);
  const [registering, setRegistering] = useState(false);

  const handleCopyKey = (keyText) => {
    navigator.clipboard.writeText(keyText);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleDisconnect = async (agentId) => {
    if (window.confirm(`Disconnect and revoke guardrail protection for "${agentId}"?`)) {
      await disconnectAgent(agentId);
      if (onRefresh) onRefresh();
      if (selectedAgent?.id === agentId) {
        setSelectedAgent(null);
      }
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!newAgentId.trim() || !newAgentName.trim()) return;
    setRegistering(true);
    try {
      const slug = newAgentId.trim().toLowerCase().replace(/\s+/g, '-');
      await registerAgent({
        id: slug,
        name: newAgentName.trim(),
        description: newAgentDesc.trim(),
        icon: '🤖'
      });
      setShowRegisterModal(false);
      setNewAgentId('');
      setNewAgentName('');
      setNewAgentDesc('');
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(`Registration error: ${err.message}`);
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="content-page">
      {/* Top Action Bar */}
      <div className="page-action-row">
        <div>
          <h3 className="section-title">Protected AI Agents Directory</h3>
          <p className="section-subtitle">
            Manage connected AI agents, monitor protection status, and inspect per-agent telemetry.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={onRefresh}
          >
            <RefreshCw size={13} /> Refresh
          </button>
          <button 
            className="btn btn-primary btn-sm"
            onClick={() => setShowRegisterModal(true)}
          >
            <Plus size={14} /> Register New Agent
          </button>
        </div>
      </div>

      {/* Agents Grid */}
      <div className="agents-grid">
        {agents && agents.length > 0 ? (
          agents.map((agent) => {
            const isDisconnected = agent.status === 'Disconnected';
            return (
              <div key={agent.id} className={`glass-card agent-card ${isDisconnected ? 'disconnected' : ''}`}>
                <div className="agent-card-header">
                  <div className="agent-icon-avatar">
                    <span style={{ fontSize: '20px' }}>{agent.icon || '🤖'}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 className="agent-card-name">{agent.name}</h4>
                    <span className="agent-slug-id font-mono">id: {agent.id}</span>
                  </div>
                  <div className="agent-status-tag">
                    <div className={`status-dot ${isDisconnected ? 'red' : 'green'}`}></div>
                    <span>{agent.status || 'Protected'}</span>
                  </div>
                </div>

                <p className="agent-card-desc">
                  {agent.description || 'General-purpose autonomous agent with active guardrail protection.'}
                </p>

                {/* 3 Metrics Row */}
                <div className="agent-stats-grid">
                  <div className="agent-stat-item">
                    <span className="stat-num">{agent.requests?.toLocaleString() || 0}</span>
                    <span className="stat-lbl">Total Requests</span>
                  </div>
                  <div className="agent-stat-item">
                    <span className="stat-num threat">{agent.threats || 0}</span>
                    <span className="stat-lbl">Threats Blocked</span>
                  </div>
                  <div className="agent-stat-item">
                    <span className="stat-num">{agent.avg_latency || '12ms'}</span>
                    <span className="stat-lbl">Avg Latency</span>
                  </div>
                </div>

                {/* Footer with Actions */}
                <div className="agent-card-footer">
                  <span className="agent-last-active">
                    <Clock size={12} /> {agent.last_activity || 'Active recently'}
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className="btn btn-secondary btn-xs"
                      onClick={() => setSelectedAgent(agent)}
                    >
                      View Details
                    </button>
                    {!isDisconnected ? (
                      <button 
                        className="btn btn-danger-outline btn-xs"
                        onClick={() => handleDisconnect(agent.id)}
                        title="Disconnect Guardrail Protection"
                      >
                        <Power size={12} /> Disconnect
                      </button>
                    ) : (
                      <button 
                        className="btn btn-primary btn-xs"
                        onClick={onNavigateToConnect}
                      >
                        Reconnect
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="glass-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px 24px' }}>
            <Bot size={40} color="#6366f1" style={{ margin: '0 auto 12px' }} />
            <h3>No AI Agents Connected Yet</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Connect your AI agent using the Python SDK or REST API to begin real-time protection.
            </p>
            <button className="btn btn-primary" onClick={onNavigateToConnect}>
              Connect First Agent
            </button>
          </div>
        )}
      </div>

      {/* Agent Details Modal */}
      {selectedAgent && (
        <div className="modal-backdrop" onClick={() => setSelectedAgent(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="agent-icon-avatar">
                  <span style={{ fontSize: '22px' }}>{selectedAgent.icon || '🤖'}</span>
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>{selectedAgent.name}</h3>
                  <span className="font-mono text-muted" style={{ fontSize: '12px' }}>Slug: {selectedAgent.id}</span>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedAgent(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {/* Status Row */}
              <div className="detail-field-group">
                <span className="field-label">Protection Status</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={16} color="#10b981" />
                  <span style={{ color: '#10b981', fontWeight: 600 }}>Active Guardrail Enforcement</span>
                  <span className="badge-pill">Mode: {selectedAgent.protection_mode || 'AUTOMATIC_BLOCK'}</span>
                </div>
              </div>

              {/* API Token Box */}
              <div className="detail-field-group">
                <span className="field-label">Agent Guardrail API Token</span>
                <div className="copy-input-row">
                  <code className="api-key-text">{selectedAgent.api_key || `ag_live_${selectedAgent.id.replace('-', '_')}`}</code>
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleCopyKey(selectedAgent.api_key || `ag_live_${selectedAgent.id.replace('-', '_')}`)}
                  >
                    {copiedKey ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                    {copiedKey ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="modal-stats-grid">
                <div className="modal-stat-box">
                  <span className="num">{selectedAgent.requests || 0}</span>
                  <span className="lbl">Processed Invocations</span>
                </div>
                <div className="modal-stat-box">
                  <span className="num threat">{selectedAgent.threats || 0}</span>
                  <span className="lbl">Neutralized Threats</span>
                </div>
                <div className="modal-stat-box">
                  <span className="num">{selectedAgent.avg_latency || '11.4ms'}</span>
                  <span className="lbl">Mean Latency</span>
                </div>
              </div>

              {/* Description */}
              <div className="detail-field-group">
                <span className="field-label">Description & Scope</span>
                <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.5 }}>
                  {selectedAgent.description || 'This autonomous agent is integrated with Universal AI Guardrail. All external web browsing, API queries, tool executions, and prompt inputs are inspected automatically before execution.'}
                </p>
              </div>

              {/* Integration Snippet */}
              <div className="detail-field-group">
                <span className="field-label">Python SDK Connection Quickstart</span>
                <pre className="code-block-modal">
{`from ai_guardrail_sdk import GuardrailClient

guardrail = GuardrailClient()

@guardrail.protect_agent("${selectedAgent.id}")
def ${selectedAgent.id.replace(/-/g, '_')}_executor(prompt: str):
    # Safe verified execution
    return llm.invoke(prompt)`}
                </pre>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn btn-danger-outline btn-sm"
                onClick={() => handleDisconnect(selectedAgent.id)}
              >
                <Power size={13} /> Disconnect Agent
              </button>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedAgent(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Register New Agent Modal */}
      {showRegisterModal && (
        <div className="modal-backdrop" onClick={() => setShowRegisterModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#fff' }}>Register New AI Agent</h3>
              <button className="modal-close-btn" onClick={() => setShowRegisterModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRegister}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Agent Unique Slug (ID)</label>
                  <input 
                    type="text" 
                    className="form-input font-mono"
                    placeholder="e.g. data-analyst-agent" 
                    value={newAgentId}
                    onChange={(e) => setNewAgentId(e.target.value)}
                    required
                  />
                  <span className="form-hint">Used in API / SDK calls (e.g. @guardrail.protect_agent("slug"))</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Agent Display Name</label>
                  <input 
                    type="text" 
                    className="form-input"
                    placeholder="e.g. Data Analyst & SQL Bot" 
                    value={newAgentName}
                    onChange={(e) => setNewAgentName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description & Capabilities</label>
                  <textarea 
                    className="form-textarea"
                    rows="3"
                    placeholder="Brief description of the agent's tasks and external APIs/websites it accesses..." 
                    value={newAgentDesc}
                    onChange={(e) => setNewAgentDesc(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowRegisterModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary btn-sm"
                  disabled={registering}
                >
                  {registering ? 'Registering...' : 'Register Agent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
