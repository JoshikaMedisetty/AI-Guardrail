import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bot, 
  ShieldCheck, 
  ArrowRight, 
  Sparkles, 
  Search, 
  Filter, 
  Zap, 
  Lock, 
  Activity, 
  PlusCircle, 
  RefreshCw 
} from 'lucide-react';
import { fetchAgents } from '../services/api';
import { StatusBadge } from '../components/Common/StatusBadge';

export function AgentSelectionPage() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const navigate = useNavigate();

  const loadAgents = async () => {
    setLoading(true);
    try {
      const data = await fetchAgents();
      setAgents(data || []);
    } catch (e) {
      console.error('Failed to load agents', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgents();
  }, []);

  const categories = ['ALL', 'General', 'Development', 'Travel', 'Finance', 'Research', 'Banking', 'E-Commerce'];

  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          agent.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          agent.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || 
                            (agent.category && agent.category.toLowerCase() === selectedCategory.toLowerCase());
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="content-page">
      {/* Header Banner */}
      <div className="page-header-banner glass-card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px' }}>
          <div>
            <div className="section-badge" style={{ marginBottom: '10px' }}>
              <ShieldCheck size={14} color="#10b981" />
              <span>ACTIVE GUARDRAIL PROTECTION</span>
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>
              Choose Your AI Agent
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary, #94a3b8)', maxWidth: '750px', lineHeight: 1.5 }}>
              Select a specialized autonomous AI agent. Every prompt and generated response is continuously inspected by the 
              <strong> Input & Output Guardrail</strong> to neutralize prompt injections and sensitive data leaks in real time.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary btn-sm" onClick={loadAgents} title="Refresh Agents">
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/connect')}>
              <PlusCircle size={15} /> Connect New Agent
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="input-with-icon" style={{ flex: '1', minWidth: '240px' }}>
            <Search size={16} className="input-icon" />
            <input 
              type="text" 
              placeholder="Search agent by name, topic, or capability..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '38px', height: '40px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                className={`btn btn-sm ${selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedCategory(cat)}
                style={{ height: '40px', fontSize: '12px' }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Agents Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
          <RefreshCw size={32} className="spin" style={{ marginBottom: '14px', color: '#06b6d4' }} />
          <div>Loading Protected AI Agents...</div>
        </div>
      ) : filteredAgents.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '50px 20px' }}>
          <Bot size={40} color="#94a3b8" style={{ marginBottom: '12px' }} />
          <h4 style={{ color: '#fff', marginBottom: '6px' }}>No Agents Found</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            No agent matched your search query. Try searching for a different keyword or reset filters.
          </p>
          <button className="btn btn-secondary btn-sm" style={{ marginTop: '14px' }} onClick={() => { setSearchQuery(''); setSelectedCategory('ALL'); }}>
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="agent-selection-grid">
          {filteredAgents.map(agent => (
            <div key={agent.id} className="agent-select-card glass-card">
              <div className="agent-card-top">
                <div className="agent-select-icon">
                  {agent.icon || '🤖'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 className="agent-select-title">{agent.name}</h3>
                    <span className="category-pill">{agent.category || 'General AI'}</span>
                  </div>
                  <span className="agent-select-id">{agent.id}</span>
                </div>
              </div>

              <p className="agent-select-desc">
                {agent.description || 'General-purpose intelligent assistant powered by multi-vector guardrail defense.'}
              </p>

              <div className="agent-security-status-box">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="pulse-dot" style={{ backgroundColor: '#10b981' }}></div>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#10b981' }}>
                    Universal Guardrail Active
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                  {agent.avg_latency || '12.0ms'} latency
                </span>
              </div>

              <div className="agent-mini-stats">
                <div>
                  <span className="mini-stat-label">Inspected</span>
                  <span className="mini-stat-value">{agent.requests?.toLocaleString() || 0}</span>
                </div>
                <div>
                  <span className="mini-stat-label">Threats Blocked</span>
                  <span className="mini-stat-value" style={{ color: agent.threats > 0 ? '#ef4444' : '#10b981' }}>
                    {agent.threats || 0}
                  </span>
                </div>
                <div>
                  <span className="mini-stat-label">Protection</span>
                  <span className="mini-stat-value" style={{ color: '#06b6d4' }}>Automatic</span>
                </div>
              </div>

              <button 
                className="btn btn-primary btn-block agent-launch-btn"
                onClick={() => navigate(`/chat/${agent.id}`)}
              >
                <span>Launch Agent</span>
                <ArrowRight size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
