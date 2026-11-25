import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Shield, 
  Bot, 
  Lock, 
  ArrowRight, 
  Activity, 
  Cpu, 
  CheckCircle, 
  Layers, 
  Globe, 
  Sparkles, 
  Zap, 
  Eye, 
  Key, 
  FileCode, 
  BarChart3,
  Server
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function LandingPage() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="landing-container">
      {/* Top Navigation */}
      <header className="landing-nav">
        <div className="landing-logo">
          <div className="logo-shield">
            <Shield size={22} color="#06b6d4" />
          </div>
          <div>
            <span className="logo-title">AI GUARDRAIL</span>
            <span className="logo-badge">ENTERPRISE SECURITY</span>
          </div>
        </div>

        <nav className="landing-nav-links">
          <a href="#architecture">Architecture</a>
          <a href="#capabilities">Security Modules</a>
          <a href="#agents">AI Agents</a>
          <a href="#benchmarks">Empirical Benchmarks</a>
        </nav>

        <div className="landing-nav-actions">
          {isAuthenticated ? (
            <>
              <Link to="/agents" className="btn btn-primary btn-sm">
                <Bot size={15} /> Select Agent
              </Link>
              <Link to="/dashboard" className="btn btn-secondary btn-sm">
                Dashboard
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-secondary btn-sm">
                Sign In
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Create Account <ArrowRight size={14} />
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="hero-pill">
          <Sparkles size={14} color="#06b6d4" />
          <span>Universal Security Middleware for Autonomous LLM Agents</span>
        </div>

        <h1 className="hero-title">
          Universal AI Guardrail
          <span className="hero-gradient-text">Securing LLMs in Real Time</span>
        </h1>

        <p className="hero-description">
          An agent-independent security middleware layer protecting Large Language Models against 
          <strong> Prompt Injections</strong>, <strong>Jailbreaks</strong>, <strong>Instruction Overrides</strong>, 
          <strong> System Prompt Extraction</strong>, and <strong>Data Exfiltration</strong> before requests reach downstream agents.
        </p>

        <div className="hero-buttons">
          <button 
            className="btn btn-primary btn-lg" 
            onClick={() => navigate(isAuthenticated ? '/agents' : '/login')}
          >
            <Bot size={18} />
            {isAuthenticated ? 'Select Your AI Agent' : 'Get Started & Launch Agents'}
            <ArrowRight size={18} />
          </button>
          
          <button 
            className="btn btn-secondary btn-lg" 
            onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}
          >
            <Activity size={18} />
            View Security Dashboard
          </button>
        </div>

        {/* Live Metrics Ticker */}
        <div className="hero-stats-grid">
          <div className="hero-stat-card glass-card">
            <div className="hero-stat-value" style={{ color: '#10b981' }}>94.6%</div>
            <div className="hero-stat-label">ML Test Accuracy</div>
          </div>
          <div className="hero-stat-card glass-card">
            <div className="hero-stat-value" style={{ color: '#06b6d4' }}>96.4%</div>
            <div className="hero-stat-label">Security Threat Recall</div>
          </div>
          <div className="hero-stat-card glass-card">
            <div className="hero-stat-value" style={{ color: '#6366f1' }}>0.007ms</div>
            <div className="hero-stat-label">ML Inference Latency</div>
          </div>
          <div className="hero-stat-card glass-card">
            <div className="hero-stat-value" style={{ color: '#f59e0b' }}>100%</div>
            <div className="hero-stat-label">AgentDojo Benchmark Defense</div>
          </div>
        </div>
      </section>

      {/* Architecture Flow Section */}
      <section id="architecture" className="landing-section">
        <div className="section-header-center">
          <div className="section-badge">DUAL-PIPELINE DEFENSE</div>
          <h2 className="section-heading">End-to-End Guardrail Security Pipeline</h2>
          <p className="section-subtext">
            Every user prompt and generated response is subjected to continuous multi-vector inspection.
          </p>
        </div>

        <div className="pipeline-flow-container glass-card">
          <div className="pipeline-step">
            <div className="pipeline-step-num">01</div>
            <div className="pipeline-step-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
              <UserIcon />
            </div>
            <h4>User Prompt</h4>
            <p>Direct interaction, web scraped data, or API input.</p>
          </div>

          <div className="pipeline-arrow">➔</div>

          <div className="pipeline-step">
            <div className="pipeline-step-num">02</div>
            <div className="pipeline-step-icon" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4' }}>
              <Cpu size={22} />
            </div>
            <h4>Input Guardrail</h4>
            <p>Rule Engine + Linear SVM TF-IDF N-gram Classifier.</p>
          </div>

          <div className="pipeline-arrow">➔</div>

          <div className="pipeline-step highlight">
            <div className="pipeline-step-num">03</div>
            <div className="pipeline-step-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
              <Shield size={22} />
            </div>
            <h4>Decision Engine</h4>
            <p>ALLOW (&lt;0.40) or immediate BLOCK (≥0.70).</p>
          </div>

          <div className="pipeline-arrow">➔</div>

          <div className="pipeline-step">
            <div className="pipeline-step-num">04</div>
            <div className="pipeline-step-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
              <Bot size={22} />
            </div>
            <h4>Target AI Agent</h4>
            <p>General, Coding, Travel, Finance, Research Assistants.</p>
          </div>

          <div className="pipeline-arrow">➔</div>

          <div className="pipeline-step">
            <div className="pipeline-step-num">05</div>
            <div className="pipeline-step-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
              <Lock size={22} />
            </div>
            <h4>Output Guardrail</h4>
            <p>Sanitizes API keys, JWTs, PII, and system prompt leakage.</p>
          </div>
        </div>
      </section>

      {/* Selectable AI Agents Showcase */}
      <section id="agents" className="landing-section">
        <div className="section-header-center">
          <div className="section-badge">MULTI-AGENT SUPPORT</div>
          <h2 className="section-heading">Protected AI Agent Ecosystem</h2>
          <p className="section-subtext">
            Choose from pre-configured specialized agents or integrate your custom autonomous workflows.
          </p>
        </div>

        <div className="landing-agents-grid">
          {[
            { id: 'general-assistant', icon: '🤖', name: 'General AI Assistant', desc: 'Everyday conversations, general reasoning, summarization, and query explanations.' },
            { id: 'coding-agent', icon: '💻', name: 'Coding Assistant', desc: 'Programming, algorithm generation, debugging, refactoring, and code review.' },
            { id: 'travel-agent', icon: '✈️', name: 'Travel Assistant', desc: 'Itinerary planning, flight options, hotel discovery, and destination logistics.' },
            { id: 'finance-agent', icon: '📈', name: 'Finance Assistant', desc: 'Financial concepts, personal budgeting, market overviews, and wealth principles.' },
            { id: 'research-agent', icon: '📚', name: 'Research Assistant', desc: 'Scientific synthesis, literature review, factual QA, and document summarization.' },
            { id: 'banking-agent', icon: '🏦', name: 'Banking Agent', desc: 'Transactional workflows, account balance inquiries, and financial operations.' }
          ].map(ag => (
            <div key={ag.id} className="landing-agent-card glass-card">
              <div className="landing-agent-icon">{ag.icon}</div>
              <h3>{ag.name}</h3>
              <p>{ag.desc}</p>
              <div className="landing-agent-footer">
                <span className="agent-status-tag">🟢 Guardrail Protected</span>
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => navigate(isAuthenticated ? `/chat/${ag.id}` : '/login')}
                >
                  Launch ➔
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Security Modules Capabilities */}
      <section id="capabilities" className="landing-section">
        <div className="section-header-center">
          <div className="section-badge">SECURITY TAXONOMY</div>
          <h2 className="section-heading">Multi-Vector Threat Defense</h2>
          <p className="section-subtext">
            Compliant with OWASP Top 10 for LLM Applications (2025 Standard).
          </p>
        </div>

        <div className="landing-features-grid">
          <div className="feature-card glass-card">
            <div className="feature-icon" style={{ color: '#ef4444' }}><Zap size={24} /></div>
            <h3>Prompt Injection Defense</h3>
            <p>Intercepts instruction overrides, semantic prefix attacks, and adversarial delimiters in user inputs.</p>
          </div>

          <div className="feature-card glass-card">
            <div className="feature-icon" style={{ color: '#f59e0b' }}><Lock size={24} /></div>
            <h3>Jailbreak & DAN Neutralizer</h3>
            <p>Detects persona manipulation, developer mode triggers, role reversals, and hypothetical escape vectors.</p>
          </div>

          <div className="feature-card glass-card">
            <div className="feature-icon" style={{ color: '#6366f1' }}><Key size={24} /></div>
            <h3>System Prompt Shield</h3>
            <p>Prevents prompt leakage, verbatim extraction requests, and confidential guardrail bypass attempts.</p>
          </div>

          <div className="feature-card glass-card">
            <div className="feature-icon" style={{ color: '#06b6d4' }}><Globe size={24} /></div>
            <h3>Data Exfiltration Blocker</h3>
            <p>Neutralizes hidden Markdown images, malicious webhooks, and out-of-band data exfiltration channels.</p>
          </div>

          <div className="feature-card glass-card">
            <div className="feature-icon" style={{ color: '#10b981' }}><Eye size={24} /></div>
            <h3>Output Guardrail & PII Redaction</h3>
            <p>Inspects generated LLM output to redact live API keys, JWT secrets, private RSA keys, and credit cards.</p>
          </div>

          <div className="feature-card glass-card">
            <div className="feature-icon" style={{ color: '#a855f7' }}><FileCode size={24} /></div>
            <h3>Universal Agent SDK</h3>
            <p>Python decorator SDK and standard REST endpoints enabling 2-line integration with any agent framework.</p>
          </div>
        </div>
      </section>

      {/* CTA Footer Banner */}
      <section className="landing-cta-banner glass-card">
        <div className="cta-content">
          <h2>Ready to secure your AI Agent ecosystem?</h2>
          <p>Deploy the Universal AI Guardrail across your full stack in minutes.</p>
          <div style={{ display: 'flex', gap: '14px', marginTop: '20px' }}>
            <button 
              className="btn btn-primary btn-lg"
              onClick={() => navigate(isAuthenticated ? '/agents' : '/register')}
            >
              Get Started Now <ArrowRight size={18} />
            </button>
            <button 
              className="btn btn-secondary btn-lg"
              onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}
            >
              Sign In to Console
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-left">
          <Shield size={18} color="#06b6d4" />
          <span>Universal AI Guardrail — Final-Year Capstone Project</span>
        </div>
        <div className="footer-right">
          <span>FastAPI • React • Scikit-Learn • SQLite • Pytest</span>
        </div>
      </footer>
    </div>
  );
}

function UserIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
