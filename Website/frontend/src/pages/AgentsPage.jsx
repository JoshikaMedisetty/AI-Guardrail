import React, { useState, useEffect } from 'react';
import { Bot, ShieldCheck, Code, CheckCircle, Copy, ExternalLink, Network, RefreshCw } from 'lucide-react';
import { StatusBadge } from '../components/Common/StatusBadge';
import { fetchAgents } from '../services/api';

export function AgentsPage() {
  const [agents, setAgents] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState('python');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadAgents = async () => {
    setLoading(true);
    const data = await fetchAgents();
    if (data && data.length > 0) {
      setAgents(data);
    } else {
      setAgents([
        { id: 'travel-agent', name: 'Travel Booking Agent', icon: '✈️', status: 'Protected', requests: 1245, threats: 18, avg_latency: '13.4ms', description: 'Automates flight reservations, hotel search, and booking management.' },
        { id: 'shopping-agent', name: 'Shopping Agent', icon: '🛒', status: 'Protected', requests: 856, threats: 9, avg_latency: '11.8ms', description: 'Assists with product discovery, cart operations, and price comparison.' },
        { id: 'banking-agent', name: 'Banking Agent', icon: '🏦', status: 'Protected', requests: 3120, threats: 94, avg_latency: '15.2ms', description: 'Handles balance inquiries, transactional workflows, and fund transfers.' },
        { id: 'coding-agent', name: 'Coding Agent', icon: '💻', status: 'Protected', requests: 2431, threats: 42, avg_latency: '14.6ms', description: 'Generates code snippets, reviews pull requests, and debugs software.' },
        { id: 'research-agent', name: 'Research Agent', icon: '📚', status: 'Protected', requests: 1834, threats: 12, avg_latency: '12.9ms', description: 'Performs document summarization, literature synthesis, and factual QA.' }
      ]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAgents();
  }, []);

  const codeSnippets = {
    python: `from ai_guardrail_sdk import GuardrailClient

# 1. Initialize Universal Guardrail SDK
guardrail = GuardrailClient("http://localhost:8000/api/v1")

# 2. Transparently protect any agent with decorator
@guardrail.protect_agent("travel-agent")
def travel_agent_executor(user_prompt: str):
    # If safe: executes downstream LLM reasoning
    return llm.invoke(user_prompt)

# Usage
result = travel_agent_executor(user_input)`,
    
    javascript: `// Universal Guardrail Node.js / Browser Middleware
async function checkAgentSecurity(agentId, prompt) {
  const res = await fetch("http://localhost:8000/api/v1/guardrail/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agent_id: agentId, request: prompt })
  });
  
  const result = await res.json();
  if (result.decision === "BLOCK") {
    throw new SecurityException(\`Attack Blocked: \${result.attack_type}\`);
  }
  return result;
}`,

    curl: `curl -X POST http://localhost:8000/api/v1/guardrail/check \\
  -H "Content-Type: application/json" \\
  -d '{
    "agent_id": "travel-agent",
    "request": "Book a flight from Hyderabad to Delhi"
  }'`
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(codeSnippets[selectedLanguage]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="content-page">
      {/* Introduction Banner */}
      <div className="glass-card" style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Network size={20} color="#6366f1" />
              Agent-Independent Integration Hub
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, maxWidth: '800px' }}>
              The Guardrail architecture is completely decoupled from agent-specific implementations. Any downstream LLM agent connects through a unified REST API or Python SDK wrapper without custom modification.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              padding: '8px 14px',
              borderRadius: '10px',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              color: '#a5b4fc'
            }}>
              {agents.length} Agents Connected
            </div>
            <button className="btn btn-secondary btn-sm" onClick={loadAgents}>
              <RefreshCw size={12} className={loading ? "spin" : ""} />
            </button>
          </div>
        </div>
      </div>

      {/* Agents Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        {agents.map(agent => (
          <div key={agent.id} className="glass-card agent-card">
            <div>
              <div className="agent-card-header">
                <div className="agent-icon">{agent.icon || "🤖"}</div>
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>{agent.name}</h4>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{agent.id}</span>
                </div>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px', minHeight: '36px' }}>
                {agent.description || "Connected LLM agent"}
              </p>
            </div>

            <div>
              <div className="agent-stat-row">
                <span className="agent-stat-label">Guardrail Status</span>
                <StatusBadge value={agent.status} />
              </div>
              <div className="agent-stat-row">
                <span className="agent-stat-label">Requests Inspected</span>
                <span className="agent-stat-value">{agent.requests?.toLocaleString() || 0}</span>
              </div>
              <div className="agent-stat-row">
                <span className="agent-stat-label">Threats Blocked</span>
                <span className="agent-stat-value" style={{ color: agent.threats > 0 ? '#ef4444' : '#10b981' }}>
                  {agent.threats || 0}
                </span>
              </div>
              <div className="agent-stat-row">
                <span className="agent-stat-label">Avg Inspection Latency</span>
                <span className="agent-stat-value" style={{ color: '#06b6d4' }}>{agent.avg_latency || '12.0ms'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Code Integration Example */}
      <div className="glass-card">
        <div className="card-header-row">
          <h3 className="card-title">
            <Code size={18} color="#06b6d4" />
            Universal Agent Integration SDK Snippet
          </h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['python', 'javascript', 'curl'].map(lang => (
              <button
                key={lang}
                className={`btn btn-sm ${selectedLanguage === lang ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedLanguage(lang)}
                style={{ textTransform: 'capitalize' }}
              >
                {lang}
              </button>
            ))}
            <button className="btn btn-secondary btn-sm" onClick={handleCopy}>
              <Copy size={12} />
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        <pre className="code-block" style={{ marginTop: '12px' }}>
          <code>{codeSnippets[selectedLanguage]}</code>
        </pre>
      </div>
    </div>
  );
}
