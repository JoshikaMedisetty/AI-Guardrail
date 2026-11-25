import React, { useState, useEffect } from 'react';
import { 
  History, 
  Search, 
  Download, 
  FileText, 
  ShieldCheck, 
  ShieldAlert, 
  RefreshCw, 
  X, 
  Eye, 
  Filter,
  CheckCircle,
  Clock,
  Layers
} from 'lucide-react';
import { StatusBadge } from '../components/Common/StatusBadge';
import { fetchHistory, fetchAgents } from '../services/api';

export function HistoryPage() {
  const [historyItems, setHistoryItems] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Filters
  const [decisionFilter, setDecisionFilter] = useState('ALL');
  const [agentFilter, setAgentFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadHistory = async () => {
    setLoading(true);
    try {
      const [histData, agData] = await Promise.all([
        fetchHistory({
          decision: decisionFilter,
          agent_id: agentFilter,
          search: searchQuery
        }),
        fetchAgents()
      ]);
      setHistoryItems(histData?.items || []);
      setAgents(agData || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [decisionFilter, agentFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadHistory();
  };

  const handleExportCSV = () => {
    if (!historyItems.length) return;
    const headers = ['ID', 'Time', 'Agent', 'Website', 'Decision', 'Risk Score', 'Action Taken', 'Latency (ms)'];
    const rows = historyItems.map(item => [
      item.id,
      item.time,
      `"${item.agent_name}"`,
      `"${item.website_url || 'Direct'}"`,
      item.decision,
      `${item.risk_score}%`,
      item.action_taken,
      item.processing_time_ms
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `guardrail_audit_log_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    if (!historyItems.length) return;
    const jsonStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(historyItems, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', jsonStr);
    link.setAttribute('download', `guardrail_audit_log_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="content-page">
      {/* Header with Export Actions */}
      <div className="page-action-row">
        <div>
          <h3 className="section-title">Complete Guardrail Audit History</h3>
          <p className="section-subtitle">
            Comprehensive immutable audit log of all intercepted, allowed, warned, and blocked agent transactions.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleExportCSV} title="Export to CSV">
            <Download size={13} /> Export CSV
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleExportJSON} title="Export to JSON">
            <FileText size={13} /> Export JSON
          </button>
          <button className="btn btn-secondary btn-sm" onClick={loadHistory} disabled={loading}>
            <RefreshCw size={13} className={loading ? "spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-card filter-card">
        <form onSubmit={handleSearchSubmit} className="filters-form">
          <div className="filter-item-search">
            <Search size={15} color="var(--text-muted)" />
            <input 
              type="text" 
              className="filter-search-input"
              placeholder="Search request ID, prompt, or website..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                type="button" 
                className="clear-search-btn"
                onClick={() => { setSearchQuery(''); loadHistory(); }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="filter-select-wrap">
            <label className="filter-label">Decision:</label>
            <select 
              className="filter-select"
              value={decisionFilter}
              onChange={(e) => setDecisionFilter(e.target.value)}
            >
              <option value="ALL">All Decisions (Allowed + Blocked)</option>
              <option value="ALLOW">Cleared (ALLOW)</option>
              <option value="BLOCK">Neutralized (BLOCK)</option>
              <option value="WARN">Suspicious (WARN)</option>
            </select>
          </div>

          <div className="filter-select-wrap">
            <label className="filter-label">Agent:</label>
            <select 
              className="filter-select"
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
            >
              <option value="all">All Agents</option>
              {agents.map(ag => (
                <option key={ag.id} value={ag.id}>{ag.name}</option>
              ))}
            </select>
          </div>

          <button type="submit" className="btn btn-secondary btn-sm">
            Search Audit Log
          </button>
        </form>
      </div>

      {/* Audit Log Table */}
      <div className="glass-card">
        <div className="card-header-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={17} color="#a855f7" />
            <span style={{ fontWeight: 600, color: '#fff', fontSize: '14px' }}>
              Historical Event Stream ({historyItems.length})
            </span>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Full immutable ledger of agent security checks
          </span>
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
                <th>Enforcement</th>
                <th>Latency</th>
                <th>Inspect</th>
              </tr>
            </thead>
            <tbody>
              {historyItems.length > 0 ? (
                historyItems.map((item) => {
                  const isBlocked = item.decision === 'BLOCK';
                  return (
                    <tr key={item.id} className={isBlocked ? 'row-threat' : ''}>
                      <td className="font-mono text-muted" style={{ fontSize: '11px' }}>
                        {item.id.length > 14 ? `${item.id.slice(0, 14)}...` : item.id}
                      </td>
                      <td className="font-mono text-muted" style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
                        {item.time}
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: '#f8fafc', fontSize: '13px' }}>
                          {item.agent_name}
                        </span>
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
                          title={item.website_url || 'Direct agent invocation'}
                        >
                          {item.website_url ? item.website_url.replace(/^https?:\/\//, '') : 'Direct Input'}
                        </span>
                      </td>
                      <td>
                        <StatusBadge value={item.decision} />
                      </td>
                      <td>
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: isBlocked ? '#ef4444' : '#10b981'
                        }}>
                          {item.risk_score}%
                        </span>
                      </td>
                      <td>
                        <span className={`threat-action-pill ${isBlocked ? 'blocked' : 'allowed'}`}>
                          {item.action_taken || (isBlocked ? 'BLOCKED' : 'ALLOWED')}
                        </span>
                      </td>
                      <td className="font-mono text-muted" style={{ fontSize: '11px' }}>
                        {item.processing_time_ms ? `${item.processing_time_ms.toFixed(1)}ms` : '10ms'}
                      </td>
                      <td>
                        <button 
                          className="btn btn-secondary btn-xs"
                          onClick={() => setSelectedEvent(item)}
                        >
                          <Eye size={12} /> View
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No audit records match your query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Raw Event JSON Inspector Modal */}
      {selectedEvent && (
        <div className="modal-backdrop" onClick={() => setSelectedEvent(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText size={18} color="#a855f7" />
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>
                    Audit Event Inspection
                  </h3>
                  <span className="font-mono text-muted" style={{ fontSize: '11px' }}>
                    {selectedEvent.id} • {selectedEvent.time}
                  </span>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedEvent(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="detail-field-group">
                <span className="field-label">Inspection Verdict</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <StatusBadge value={selectedEvent.decision} />
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Risk Score: {selectedEvent.risk_score}% • Latency: {selectedEvent.processing_time_ms}ms
                  </span>
                </div>
              </div>

              <div className="detail-field-group">
                <span className="field-label">Explanation / Summary</span>
                <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.5 }}>
                  {selectedEvent.explanation || 'Request evaluated through ensemble risk pipeline.'}
                </p>
              </div>

              <div className="detail-field-group">
                <span className="field-label">Raw Request / Content Text</span>
                <pre className="code-block-modal">
                  {selectedEvent.request_text || 'No payload recorded.'}
                </pre>
              </div>

              <div className="detail-field-group">
                <span className="field-label">Complete Telemetry JSON Payload</span>
                <pre className="code-block-modal" style={{ maxHeight: '180px' }}>
                  {JSON.stringify(selectedEvent, null, 2)}
                </pre>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedEvent(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
