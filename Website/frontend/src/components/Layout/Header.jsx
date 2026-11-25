import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Activity, 
  Zap, 
  RefreshCw, 
  ChevronDown, 
  AlertTriangle, 
  CheckCircle,
  Globe,
  Radio,
  Bell,
  User,
  LogOut
} from 'lucide-react';
import { simulateDemoEvent, fetchThreats } from '../../services/api';

export function Header({ 
  title, 
  subtitle, 
  onRefresh, 
  refreshing, 
  onEventSimulated, 
  user, 
  onLogout,
  onNavigateToThreats,
  onNavigateToProfile
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [recentAlerts, setRecentAlerts] = useState([]);

  useEffect(() => {
    const loadNotifs = async () => {
      try {
        const threats = await fetchThreats({ limit: 5 });
        setRecentAlerts(Array.isArray(threats) ? threats.slice(0, 4) : []);
      } catch {}
    };
    loadNotifs();
  }, [refreshing]);

  const handleSimulate = async (type) => {
    setMenuOpen(false);
    setSimulating(true);
    try {
      const res = await simulateDemoEvent(type);
      if (onEventSimulated) onEventSimulated(res);
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <header className="top-header">
      <div className="header-title">
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>

      <div className="header-actions">
        {/* Guardrail Mode Pill */}
        <div className="header-status-badge">
          <div className="pulse-dot" style={{ backgroundColor: '#10b981' }}></div>
          <span style={{ color: '#10b981', fontWeight: 600 }}>GUARDRAIL ACTIVE</span>
          <span style={{ color: 'var(--text-muted)' }}>•</span>
          <span style={{ color: '#94a3b8', fontSize: '12px' }}>All connected agents protected</span>
        </div>

        {/* Simulate Agent Activity Button */}
        <div style={{ position: 'relative' }}>
          <button 
            className="btn btn-simulate"
            onClick={() => {
              setMenuOpen(!menuOpen);
              setNotifOpen(false);
              setUserMenuOpen(false);
            }}
            disabled={simulating}
            title="Simulate external website and API events from connected agents"
          >
            <Zap size={14} color="#f59e0b" />
            <span>{simulating ? 'Simulating Event...' : '⚡ Simulate Agent Event'}</span>
            <ChevronDown size={14} />
          </button>

          {menuOpen && (
            <div className="simulate-dropdown-menu">
              <div className="dropdown-header">TRIGGER AGENT TELEMETRY</div>
              <div 
                className="dropdown-item" 
                onClick={() => handleSimulate('safe_web_scrape')}
              >
                <Globe size={14} color="#10b981" />
                <div>
                  <div className="item-title">Safe Webpage Scrape</div>
                  <div className="item-sub">Agent visits travel.com (Clean ALLOW)</div>
                </div>
              </div>

              <div 
                className="dropdown-item" 
                onClick={() => handleSimulate('malicious_dom_injection')}
              >
                <AlertTriangle size={14} color="#ef4444" />
                <div>
                  <div className="item-title">Hidden DOM Injection</div>
                  <div className="item-sub">Untrusted blog with instruction override (BLOCK)</div>
                </div>
              </div>

              <div 
                className="dropdown-item" 
                onClick={() => handleSimulate('exfiltration_attempt')}
              >
                <AlertTriangle size={14} color="#ef4444" />
                <div>
                  <div className="item-title">Data Exfiltration Payload</div>
                  <div className="item-sub">Tool output with credential leak attempt (BLOCK)</div>
                </div>
              </div>

              <div 
                className="dropdown-item" 
                onClick={() => handleSimulate('safe_api_call')}
              >
                <CheckCircle size={14} color="#10b981" />
                <div>
                  <div className="item-title">Safe 3rd-Party API Call</div>
                  <div className="item-sub">Agent queries api.github.com (Clean ALLOW)</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Notifications Dropdown */}
        <div style={{ position: 'relative' }}>
          <button 
            className="btn btn-secondary btn-icon"
            onClick={() => {
              setNotifOpen(!notifOpen);
              setMenuOpen(false);
              setUserMenuOpen(false);
            }}
            title="Recent Security Alerts"
          >
            <Bell size={15} />
            {recentAlerts.length > 0 && <span className="notif-badge">{recentAlerts.length}</span>}
          </button>

          {notifOpen && (
            <div className="simulate-dropdown-menu notif-dropdown" style={{ right: 0, width: '320px' }}>
              <div className="dropdown-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>SECURITY NOTIFICATIONS</span>
                <span style={{ fontSize: '11px', color: '#f87171' }}>{recentAlerts.length} Unresolved</span>
              </div>
              {recentAlerts.map(alert => (
                <div 
                  key={alert.id}
                  className="dropdown-item"
                  onClick={() => {
                    setNotifOpen(false);
                    if (onNavigateToThreats) onNavigateToThreats(alert);
                  }}
                >
                  <AlertTriangle size={15} color={alert.severity === 'HIGH' ? '#ef4444' : '#f59e0b'} />
                  <div style={{ flex: 1 }}>
                    <div className="item-title" style={{ fontSize: '12px' }}>
                      {alert.severity === 'HIGH' ? '🚨 High-risk threat blocked' : '🟡 Medium-risk warning'}
                    </div>
                    <div className="item-sub" style={{ fontSize: '11px' }}>
                      {alert.agent || 'AI Agent'} • {alert.website_url || 'external source'}
                    </div>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{alert.time || 'Recent'}</span>
                  </div>
                </div>
              ))}
              <div 
                className="dropdown-footer-btn"
                onClick={() => {
                  setNotifOpen(false);
                  if (onNavigateToThreats) onNavigateToThreats();
                }}
              >
                View All Security Alerts →
              </div>
            </div>
          )}
        </div>

        {/* Manual Refresh Button */}
        <button 
          className="btn btn-secondary btn-icon"
          onClick={onRefresh}
          title="Refresh real-time dashboard data"
        >
          <RefreshCw size={15} className={refreshing ? 'spin' : ''} />
        </button>

        {/* User Profile Menu */}
        <div style={{ position: 'relative' }}>
          <div 
            className="user-profile-button"
            onClick={() => {
              setUserMenuOpen(!userMenuOpen);
              setMenuOpen(false);
              setNotifOpen(false);
            }}
          >
            <div className="user-avatar-circle">
              <User size={15} />
            </div>
            <span className="user-header-name">{user?.name || 'Security Lead'}</span>
            <ChevronDown size={12} />
          </div>

          {userMenuOpen && (
            <div className="simulate-dropdown-menu user-dropdown" style={{ right: 0, width: '200px' }}>
              <div className="user-dropdown-header">
                <div style={{ fontWeight: 600, color: '#fff', fontSize: '13px' }}>{user?.name || 'Admin'}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{user?.email || 'security@guardrail.ai'}</div>
              </div>
              <div 
                className="dropdown-item"
                onClick={() => {
                  setUserMenuOpen(false);
                  if (onNavigateToProfile) onNavigateToProfile();
                }}
              >
                <User size={14} /> Profile Settings
              </div>
              <div 
                className="dropdown-item logout"
                onClick={() => {
                  setUserMenuOpen(false);
                  if (onLogout) onLogout();
                }}
                style={{ color: '#f87171' }}
              >
                <LogOut size={14} /> Sign Out
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
