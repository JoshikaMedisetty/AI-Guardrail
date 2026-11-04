import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  Search, 
  Filter, 
  ExternalLink, 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle, 
  AlertTriangle,
  RefreshCw,
  X,
  FileCode,
  Layers
} from 'lucide-react';
import { StatusBadge } from '../components/Common/StatusBadge';
import { fetchWebsiteActivity, fetchAgents } from '../services/api';

export function WebsiteActivityPage({ onSelectThreat }) {
  const [activities, setActivities] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Filters
  const [filterAgent, setFilterAgent] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDate, setFilterDate] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [actData, agData] = await Promise.all([
        fetchWebsiteActivity({
          agent_id: filterAgent,
          status: filterStatus,
          date_range: filterDate,
          search: searchQuery
        }),
        fetchAgents()
      ]);
      setActivities(actData?.items || []);
      setAgents(agData || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterAgent, filterStatus, filterDate]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  return (
    <div className="content-page">
      {/* Page Header */}
      <div className="page-action-row">
        <div>
          <h3 className="section-title">Website & External Resource Activity</h3>
          <p className="section-subtitle">
            Audit log of external websites, scraped DOM pages, and 3rd-party APIs accessed by connected AI agents.
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={loadData} disabled={loading}>
          <RefreshCw size={13} className={loading ? "spin" : ""} /> Refresh Log
        </button>
      </div>

      {/* Multi-Criteria Filter Bar */}
      <div className="glass-card filter-card">
        <form onSubmit={handleSearchSubmit} className="filters-form">
          
          {/* Search by Domain / Website */}
          <div className="filter-item-search">
            <Search size={15} color="var(--text-muted)" />
            <input 
              type="text" 
              className="filter-search-input"
              placeholder="Search website, domain, or payload..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                type="button" 
                className="clear-search-btn"
                onClick={() => { setSearchQuery(''); loadData(); }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Filter by Agent */}
          <div className="filter-select-wrap">
            <label className="filter-label">Agent:</label>
            <select 
              className="filter-select"
              value={filterAgent}
              onChange={(e) => setFilterAgent(e.target.value)}
            >
              <option value="all">All Protected Agents</option>
              {agents.map(ag => (
                <option key={ag.id} value={ag.id}>{ag.name}</option>
              ))}
            </select>
          </div>

          {/* Filter by Status */}
          <div className="filter-select-wrap">
            <label className="filter-label">Status:</label>
            <select 
              className="filter-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Verdicts</option>
              <option value="ALLOWED">Clean (ALLOWED)</option>
              <option value="BLOCKED">Threat (BLOCKED)</option>
            </select>
          </div>

          {/* Filter by Date */}
          <div className="filter-select-wrap">
            <label className="filter-label">Period:</label>
            <select 
              className="filter-select"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="7days">Last 7 Days</option>
            </select>
          </div>

          <button type="submit" className="btn btn-secondary btn-sm">
            Apply Filters
          </button>
        </form>
      </div>

      {/* Activity Table */}
      <div className="glass-card">
        <div className="card-header-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Globe size={17} color="#06b6d4" />
            <span style={{ fontWeight: 600, color: '#fff', fontSize: '14px' }}>
              External Scans & API Interceptions ({activities.length})
            </span>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Inspected in real-time before ingestion
          </span>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Agent</th>
                <th>Target Website / Domain</th>
                <th>Resource Type</th>
                <th>Scan Status</th>
                <th>Verdict</th>
                <th>Risk</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {activities.length > 0 ? (
                activities.map((item) => {
                  const isBlocked = item.decision === 'BLOCK';
                  return (
                    <tr key={item.id} className={isBlocked ? 'row-threat' : ''}>
                      <td className="font-mono text-muted" style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
                        {item.time}
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: '#f8fafc', fontSize: '13px' }}>
                          {item.agent_name}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span 
                            className="font-mono" 
                            style={{ 
                              color: '#38bdf8', 
                              fontSize: '12px', 
                              maxWidth: '240px', 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis', 
                              whiteSpace: 'nowrap' 
                            }}
                            title={item.website_url}
                          >
                            {item.domain || item.website_url}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="badge-pill" style={{ textTransform: 'uppercase', fontSize: '10px' }}>
                          {item.resource_type?.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {item.scan_status === 'CLEAN' ? (
                            <span style={{ color: '#10b981', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle size={13} /> Clean
                            </span>
                          ) : (
                            <span style={{ color: '#ef4444', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                              <AlertTriangle size={13} /> Threat Found
                            </span>
                          )}
                        </div>
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
                        <button 
                          className="btn btn-secondary btn-xs"
                          onClick={() => setSelectedItem(item)}
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No website activity matches the selected filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Scanned Resource Inspection Modal */}
      {selectedItem && (
        <div className="modal-backdrop" onClick={() => setSelectedItem(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Globe size={20} color="#06b6d4" />
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#fff' }}>
                    Website Scan Inspection
                  </h3>
                  <span className="font-mono text-muted" style={{ fontSize: '11px' }}>
                    ID: {selectedItem.request_id} • {selectedItem.time}
                  </span>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedItem(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {/* Verdict Banner */}
              <div style={{
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '16px',
                background: selectedItem.decision === 'BLOCK' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                border: `1px solid ${selectedItem.decision === 'BLOCK' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {selectedItem.decision === 'BLOCK' ? <ShieldAlert size={20} color="#ef4444" /> : <ShieldCheck size={20} color="#10b981" />}
                  <div>
                    <div style={{ fontWeight: 700, color: selectedItem.decision === 'BLOCK' ? '#ef4444' : '#10b981', fontSize: '14px' }}>
                      {selectedItem.decision === 'BLOCK' ? 'SECURITY THREAT INTERCEPTED' : 'CLEARED AS SAFE'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Enforcement: {selectedItem.action_taken} • Risk: {selectedItem.risk_score}%
                    </div>
                  </div>
                </div>
                <StatusBadge value={selectedItem.severity || (selectedItem.decision === 'BLOCK' ? 'HIGH' : 'LOW')} />
              </div>

              {/* URL */}
              <div className="detail-field-group">
                <span className="field-label">Target External URL / Resource</span>
                <div className="copy-input-row">
                  <code className="api-key-text" style={{ color: '#38bdf8' }}>{selectedItem.website_url}</code>
                  <a 
                    href={selectedItem.website_url} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="btn btn-secondary btn-sm"
                  >
                    <ExternalLink size={13} />
                  </a>
                </div>
              </div>

              {/* Calling Agent */}
              <div className="grid-2" style={{ marginBottom: '14px' }}>
                <div className="detail-field-group" style={{ marginBottom: 0 }}>
                  <span className="field-label">Initiating Agent</span>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>
                    {selectedItem.agent_name} ({selectedItem.agent_id})
                  </div>
                </div>
                <div className="detail-field-group" style={{ marginBottom: 0 }}>
                  <span className="field-label">Resource Type</span>
                  <div style={{ fontSize: '13px', color: '#94a3b8', textTransform: 'capitalize' }}>
                    {selectedItem.resource_type?.replace('_', ' ')}
                  </div>
                </div>
              </div>

              {/* Scanned Content Payload */}
              <div className="detail-field-group">
                <span className="field-label">Scanned Content Snippet</span>
                <pre className="code-block-modal" style={{ maxHeight: '160px' }}>
                  {selectedItem.content_snippet || 'No raw payload available.'}
                </pre>
              </div>

              {selectedItem.attack_type && (
                <div className="detail-field-group">
                  <span className="field-label">Detected Attack Type</span>
                  <span style={{ color: '#ef4444', fontWeight: 600, fontSize: '13px' }}>
                    {selectedItem.attack_type}
                  </span>
                </div>
              )}
            </div>

            <div className="modal-footer">
              {selectedItem.decision === 'BLOCK' && onSelectThreat && (
                <button 
                  className="btn btn-danger-outline btn-sm"
                  onClick={() => {
                    const item = selectedItem;
                    setSelectedItem(null);
                    onSelectThreat(item);
                  }}
                >
                  View Threat Forensics
                </button>
              )}
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedItem(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
