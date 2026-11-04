import React, { useState, useEffect } from 'react';
import { SlidersHorizontal, ShieldCheck, ToggleRight, Settings, Info, Save, CheckCircle } from 'lucide-react';
import { fetchConfig, updateConfig } from '../services/api';

export function ConfigurationPage() {
  const [lowThreshold, setLowThreshold] = useState(0.40);
  const [highThreshold, setHighThreshold] = useState(0.70);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const [modules, setModules] = useState([
    { id: 'prompt_injection', name: 'Prompt Injection Detection', desc: 'Inspects user inputs for instruction override and hierarchy manipulation attacks.', active: true },
    { id: 'jailbreak', name: 'Jailbreak & DAN Detection', desc: 'Identifies roleplay-based persona shifts and safety guideline circumvention attempts.', active: true },
    { id: 'system_prompt', name: 'System Prompt Protection', desc: 'Detects prompt reflection and system instruction extraction attacks.', active: true },
    { id: 'data_leakage', name: 'Data Leakage & Exfiltration Detection', desc: 'Identifies unauthorized egress channels, markdown image injection, and PII leaks.', active: true },
    { id: 'output_validation', name: 'Output Validation Layer', desc: 'Validates downstream LLM responses before returning content to user.', active: true }
  ]);

  useEffect(() => {
    const loadConf = async () => {
      const conf = await fetchConfig();
      if (conf?.thresholds) {
        setLowThreshold(conf.thresholds.low || 0.40);
        setHighThreshold(conf.thresholds.high || 0.70);
      }
      if (conf?.modules) {
        setModules(prev => prev.map(m => ({
          ...m,
          active: conf.modules[m.id] !== undefined ? conf.modules[m.id] : m.active
        })));
      }
    };
    loadConf();
  }, []);

  const toggleModule = (id) => {
    setModules(modules.map(m => m.id === id ? { ...m, active: !m.active } : m));
  };

  const handleSave = async () => {
    setLoading(true);
    setSavedSuccess(false);
    try {
      const moduleMap = {};
      modules.forEach(m => { moduleMap[m.id] = m.active; });
      await updateConfig({
        threshold_low: parseFloat(lowThreshold),
        threshold_high: parseFloat(highThreshold),
        modules: moduleMap
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content-page">
      <div className="grid-2">
        {/* Active Protection Modules */}
        <div className="glass-card">
          <div className="card-header-row">
            <h3 className="card-title">
              <ShieldCheck size={18} color="#10b981" />
              Active Protection Modules
            </h3>
            <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>
              {modules.filter(m => m.active).length} / {modules.length} Enabled
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
            {modules.map(mod => (
              <div
                key={mod.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <div style={{ paddingRight: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '2px' }}>
                    {mod.name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {mod.desc}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleModule(mod.id)}
                  style={{
                    background: mod.active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${mod.active ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                    color: mod.active ? '#10b981' : 'var(--text-muted)',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontFamily: 'var(--font-mono)'
                  }}
                >
                  <span style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: mod.active ? '#10b981' : '#64748b'
                  }} />
                  {mod.active ? 'ON' : 'OFF'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Decision Engine Risk Thresholds & Sliders */}
        <div>
          <div className="glass-card" style={{ marginBottom: '24px' }}>
            <div className="card-header-row">
              <h3 className="card-title">
                <SlidersHorizontal size={18} color="#6366f1" />
                Dynamic Decision Risk Thresholds
              </h3>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                app.core.config
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '16px' }}>
              {/* Low Threshold Slider */}
              <div style={{
                padding: '14px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.05)',
                border: '1px solid rgba(16, 185, 129, 0.2)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#10b981' }}>🟢 LOW RISK → ALLOW</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#10b981', fontWeight: 700 }}>
                    0.00 – {parseFloat(lowThreshold).toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.60"
                  step="0.05"
                  value={lowThreshold}
                  onChange={(e) => setLowThreshold(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: '#10b981', cursor: 'pointer' }}
                />
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                  Requests below this score operate transparently in background with sub-15ms latency.
                </p>
              </div>

              {/* Medium / High Threshold Slider */}
              <div style={{
                padding: '14px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.05)',
                border: '1px solid rgba(239, 68, 68, 0.2)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#ef4444' }}>🔴 HIGH RISK → BLOCK</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#ef4444', fontWeight: 700 }}>
                    {parseFloat(highThreshold).toFixed(2)} – 1.00
                  </span>
                </div>
                <input
                  type="range"
                  min="0.50"
                  max="0.90"
                  step="0.05"
                  value={highThreshold}
                  onChange={(e) => setHighThreshold(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: '#ef4444', cursor: 'pointer' }}
                />
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                  Requests exceeding this score are blocked immediately and trigger a Security Alert.
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px' }}>
                {savedSuccess && (
                  <span style={{ color: '#10b981', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                    <CheckCircle size={14} /> Saved to Database!
                  </span>
                )}
                <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
                  <Save size={14} /> {loading ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#94a3b8' }}>
              <Info size={16} color="#6366f1" />
              <span>Threshold modifications take effect immediately across all connected agent endpoints without requiring server restarts.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
