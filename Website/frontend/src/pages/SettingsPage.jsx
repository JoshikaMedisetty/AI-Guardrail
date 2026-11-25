import React, { useState, useEffect } from 'react';
import { 
  Settings2, 
  ShieldCheck, 
  ShieldAlert, 
  Globe, 
  Database, 
  Terminal, 
  Bell, 
  Save, 
  Check, 
  Key, 
  Copy, 
  RefreshCw,
  Sliders,
  Radio,
  Lock,
  Eye
} from 'lucide-react';
import { fetchConfig, updateConfig } from '../services/api';

export function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  // Protection Toggles
  const [webpageScan, setWebpageScan] = useState(true);
  const [apiScan, setApiScan] = useState(true);
  const [toolScan, setToolScan] = useState(true);
  const [promptInjection, setPromptInjection] = useState(true);
  const [dataLeakage, setDataLeakage] = useState(true);
  const [outputValidation, setOutputValidation] = useState(true);

  // Enforcement Mode
  const [actionMode, setActionMode] = useState('BLOCK'); // 'BLOCK' or 'WARN'

  // Thresholds
  const [thresholdLow, setThresholdLow] = useState(0.40);
  const [thresholdHigh, setThresholdHigh] = useState(0.70);

  // API Key & Webhook
  const [masterApiKey, setMasterApiKey] = useState('ag_live_sec_master_984120_prod');
  const [webhookUrl, setWebhookUrl] = useState('https://hooks.slack.com/services/SEC/ALERTS/guardrail');
  const [copiedKey, setCopiedKey] = useState(false);
  const [testAlertSent, setTestAlertSent] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const cfg = await fetchConfig();
        if (cfg) {
          if (cfg.modules) {
            setWebpageScan(cfg.modules.webpage_scan ?? true);
            setApiScan(cfg.modules.api_scan ?? true);
            setToolScan(cfg.modules.tool_scan ?? true);
            setPromptInjection(cfg.modules.prompt_injection ?? true);
            setDataLeakage(cfg.modules.data_leakage ?? true);
            setOutputValidation(cfg.modules.output_validation ?? true);
          }
          if (cfg.action_mode) setActionMode(cfg.action_mode);
          if (cfg.thresholds) {
            if (cfg.thresholds.low !== undefined) setThresholdLow(cfg.thresholds.low);
            if (cfg.thresholds.high !== undefined) setThresholdHigh(cfg.thresholds.high);
          }
          if (cfg.api_key) setMasterApiKey(cfg.api_key);
          if (cfg.webhook_url) setWebhookUrl(cfg.webhook_url);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateConfig({
        threshold_low: thresholdLow,
        threshold_high: thresholdHigh,
        action_mode: actionMode,
        api_key: masterApiKey,
        webhook_url: webhookUrl,
        modules: {
          webpage_scan: webpageScan,
          api_scan: apiScan,
          tool_scan: toolScan,
          prompt_injection: promptInjection,
          data_leakage: dataLeakage,
          output_validation: outputValidation
        }
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(masterApiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleTestWebhook = () => {
    setTestAlertSent(true);
    setTimeout(() => setTestAlertSent(false), 3000);
  };

  return (
    <div className="content-page">
      {/* Header */}
      <div className="page-action-row">
        <div>
          <h3 className="section-title">Guardrail Security Policies & Settings</h3>
          <p className="section-subtitle">
            Configure active scanning engines, enforcement modes (Automatic Block vs Warning), risk thresholds, and webhooks.
          </p>
        </div>

        <button 
          className="btn btn-primary"
          onClick={handleSave}
          disabled={loading}
        >
          {saved ? (
            <><Check size={14} color="#fff" /> Settings Saved!</>
          ) : (
            <><Save size={14} /> Save Configuration</>
          )}
        </button>
      </div>

      <form onSubmit={handleSave}>
        {/* Section 1: Protection Features */}
        <div className="glass-card" style={{ marginBottom: '24px' }}>
          <div className="card-header-row">
            <div>
              <h3 className="card-title">
                <ShieldCheck size={17} color="#10b981" />
                Active Protection & Scanning Modules
              </h3>
              <p className="card-subtitle">
                Enable or disable security scanning across different external agent data vectors
              </p>
            </div>
          </div>

          <div className="settings-toggles-list">
            {/* Webpage / HTML / DOM Scanning */}
            <div className="toggle-item-card">
              <div className="toggle-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <Globe size={16} color="#06b6d4" />
                  <span className="toggle-title">Webpage / HTML / DOM Scanning</span>
                  <span className="badge-pill">Core Feature</span>
                </div>
                <p className="toggle-desc">
                  Scans content fetched from external websites and web scrapers before feeding to LLM. Detects hidden CSS comments, zero-font text, and indirect prompt injections.
                </p>
              </div>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={webpageScan}
                  onChange={(e) => setWebpageScan(e.target.checked)}
                />
                <span className="slider round"></span>
              </label>
            </div>

            {/* API-Response Scanning */}
            <div className="toggle-item-card">
              <div className="toggle-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <Database size={16} color="#6366f1" />
                  <span className="toggle-title">3rd-Party API-Response Scanning</span>
                </div>
                <p className="toggle-desc">
                  Inspects JSON, XML, and REST payloads returned by external web services called by agents to prevent indirect injection vectors.
                </p>
              </div>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={apiScan}
                  onChange={(e) => setApiScan(e.target.checked)}
                />
                <span className="slider round"></span>
              </label>
            </div>

            {/* Tool-Output Scanning */}
            <div className="toggle-item-card">
              <div className="toggle-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <Terminal size={16} color="#f59e0b" />
                  <span className="toggle-title">Tool & Subprocess Output Scanning</span>
                </div>
                <p className="toggle-desc">
                  Inspects the stdout, stderr, and return objects of tools, shell scripts, or SQL queries executed by autonomous agents.
                </p>
              </div>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={toolScan}
                  onChange={(e) => setToolScan(e.target.checked)}
                />
                <span className="slider round"></span>
              </label>
            </div>

            {/* Prompt Injection Detection */}
            <div className="toggle-item-card">
              <div className="toggle-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <ShieldAlert size={16} color="#ef4444" />
                  <span className="toggle-title">Prompt Injection Detection (Input Guardrail)</span>
                </div>
                <p className="toggle-desc">
                  Inspects incoming user queries and conversation context for jailbreaks, system prompt extraction, and instruction overrides.
                </p>
              </div>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={promptInjection}
                  onChange={(e) => setPromptInjection(e.target.checked)}
                />
                <span className="slider round"></span>
              </label>
            </div>

            {/* Data Exfiltration & PII Guard */}
            <div className="toggle-item-card">
              <div className="toggle-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <Lock size={16} color="#a855f7" />
                  <span className="toggle-title">Data Exfiltration & Credential Leakage Guard</span>
                </div>
                <p className="toggle-desc">
                  Detects outbound transmission attempts of environment keys, API tokens, passwords, and sensitive customer data.
                </p>
              </div>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={dataLeakage}
                  onChange={(e) => setDataLeakage(e.target.checked)}
                />
                <span className="slider round"></span>
              </label>
            </div>
          </div>
        </div>

        {/* Section 2: Enforcement Action Mode */}
        <div className="glass-card" style={{ marginBottom: '24px' }}>
          <div className="card-header-row">
            <div>
              <h3 className="card-title">
                <Lock size={17} color="#f59e0b" />
                Enforcement Action Mode
              </h3>
              <p className="card-subtitle">
                Choose how the Guardrail reacts upon detecting malicious or high-risk content
              </p>
            </div>
          </div>

          <div className="action-modes-grid">
            {/* Automatic Block */}
            <div 
              className={`action-mode-card ${actionMode === 'BLOCK' ? 'selected' : ''}`}
              onClick={() => setActionMode('BLOCK')}
            >
              <div className="mode-radio-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input 
                    type="radio" 
                    name="action_mode" 
                    checked={actionMode === 'BLOCK'}
                    onChange={() => setActionMode('BLOCK')}
                  />
                  <strong style={{ color: '#fff', fontSize: '15px' }}>Automatic Block (Recommended)</strong>
                </div>
                <span className="threat-action-pill blocked">STRICT ENFORCEMENT</span>
              </div>
              <p className="mode-desc">
                Immediately drops and halts the malicious execution. The threat is isolated, a security incident alert is created on the dashboard, and a safe sanitized fallback is returned to the agent.
              </p>
            </div>

            {/* Warning Only */}
            <div 
              className={`action-mode-card ${actionMode === 'WARN' ? 'selected' : ''}`}
              onClick={() => setActionMode('WARN')}
            >
              <div className="mode-radio-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input 
                    type="radio" 
                    name="action_mode" 
                    checked={actionMode === 'WARN'}
                    onChange={() => setActionMode('WARN')}
                  />
                  <strong style={{ color: '#fff', fontSize: '15px' }}>Warning Only (Audit Mode)</strong>
                </div>
                <span className="threat-action-pill allowed" style={{ color: '#f59e0b', background: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.3)' }}>
                  MONITORING ONLY
                </span>
              </div>
              <p className="mode-desc">
                Logs the incident and alerts the security dashboard, but allows the request to pass through to the agent with a warning metadata tag. Useful during staging and evaluation.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Risk Decision Thresholds */}
        <div className="glass-card" style={{ marginBottom: '24px' }}>
          <div className="card-header-row">
            <div>
              <h3 className="card-title">
                <Sliders size={17} color="#6366f1" />
                Risk & Decision Engine Thresholds
              </h3>
              <p className="card-subtitle">
                Fine-tune sensitivity boundaries for transparent ALLOW and immediate BLOCK decisions
              </p>
            </div>
          </div>

          <div className="thresholds-container">
            {/* Low Threshold */}
            <div className="threshold-row">
              <div className="threshold-header">
                <div>
                  <span className="threshold-name" style={{ color: '#10b981' }}>Low Risk Threshold (ALLOW Boundary)</span>
                  <p className="threshold-info">Requests with aggregate risk below this value are transparently allowed.</p>
                </div>
                <span className="threshold-val font-mono">{thresholdLow.toFixed(2)}</span>
              </div>
              <input 
                type="range" 
                min="0.10" 
                max="0.50" 
                step="0.05"
                value={thresholdLow}
                onChange={(e) => setThresholdLow(parseFloat(e.target.value))}
                className="range-slider"
              />
            </div>

            {/* High Threshold */}
            <div className="threshold-row">
              <div className="threshold-header">
                <div>
                  <span className="threshold-name" style={{ color: '#ef4444' }}>High Risk Threshold (BLOCK Boundary)</span>
                  <p className="threshold-info">Requests with aggregate risk equal to or above this value trigger threat neutralization.</p>
                </div>
                <span className="threshold-val font-mono">{thresholdHigh.toFixed(2)}</span>
              </div>
              <input 
                type="range" 
                min="0.50" 
                max="0.95" 
                step="0.05"
                value={thresholdHigh}
                onChange={(e) => setThresholdHigh(parseFloat(e.target.value))}
                className="range-slider"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Webhooks & Notifications */}
        <div className="glass-card" style={{ marginBottom: '24px' }}>
          <div className="card-header-row">
            <div>
              <h3 className="card-title">
                <Bell size={17} color="#ec4899" />
                Security Alert Webhooks
              </h3>
              <p className="card-subtitle">
                Receive instant notifications in Slack, Discord, or PagerDuty upon threat detection
              </p>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Alert Webhook URL</label>
            <div className="copy-input-row">
              <input 
                type="url" 
                className="form-input font-mono"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
              />
              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                onClick={handleTestWebhook}
              >
                {testAlertSent ? <Check size={13} color="#10b981" /> : <Bell size={13} />}
                {testAlertSent ? 'Notification Sent!' : 'Test Webhook'}
              </button>
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
          >
            {saved ? (
              <><Check size={14} color="#fff" /> Configuration Saved!</>
            ) : (
              <><Save size={14} /> Save Configuration</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
