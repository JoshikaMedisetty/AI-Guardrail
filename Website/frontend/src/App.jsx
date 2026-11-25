import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/Common/ProtectedRoute';
import { Sidebar } from './components/Layout/Sidebar';
import { Header } from './components/Layout/Header';

// Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import { AgentSelectionPage } from './pages/AgentSelectionPage';
import { ChatWorkspacePage } from './pages/ChatWorkspacePage';
import { DashboardPage } from './pages/DashboardPage';
import { MyAgentsPage } from './pages/MyAgentsPage';
import { ConnectAgentPage } from './pages/ConnectAgentPage';
import { WebsiteActivityPage } from './pages/WebsiteActivityPage';
import { ThreatsPage } from './pages/ThreatsPage';
import { HistoryPage } from './pages/HistoryPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProfilePage } from './pages/ProfilePage';

import { fetchHealth, fetchDashboardStats, fetchAgents } from './services/api';
import { ShieldAlert, CheckCircle, X } from 'lucide-react';

/**
 * Standard Security Operations Layout Wrapper
 */
function ConsoleLayout({ currentTab, children, initialSelectedThreat, onClearInitialThreat, onSelectThreat }) {
  const [serverOnline, setServerOnline] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);
  const [agents, setAgents] = useState([]);
  const [toast, setToast] = useState(null);
  
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const loadPlatformData = async () => {
    try {
      const [h, s, a] = await Promise.all([
        fetchHealth(),
        fetchDashboardStats(),
        fetchAgents()
      ]);
      setServerOnline(h.status === 'ok');
      setStats(s);
      setAgents(a || []);
    } catch {
      setServerOnline(false);
    }
  };

  useEffect(() => {
    loadPlatformData();
    const interval = setInterval(loadPlatformData, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await loadPlatformData();
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleEventSimulated = (eventResult) => {
    loadPlatformData();
    const isBlocked = eventResult.decision === 'BLOCK';
    setToast({
      type: isBlocked ? 'danger' : 'success',
      title: isBlocked ? 'Security Threat Intercepted & Blocked!' : 'Clean Agent Event Verified',
      message: isBlocked 
        ? `Neutralized ${eventResult.attack_type || 'Malicious Payload'} from ${eventResult.url || 'external source'}.`
        : `Verified clean traffic from ${eventResult.url || 'external resource'}.`
    });
    setTimeout(() => setToast(null), 5000);
  };

  const getPageMeta = () => {
    switch (currentTab) {
      case 'dashboard':
        return {
          title: 'Executive Security Dashboard',
          subtitle: 'Central operations center for monitoring AI agent traffic and neutralizing threats in real time'
        };
      case 'agents':
        return {
          title: 'Choose Protected AI Agent',
          subtitle: 'Select an autonomous assistant with end-to-end Input & Output Guardrail protection'
        };
      case 'connect':
        return {
          title: 'Connect AI Agent',
          subtitle: 'Developer integration hub: Python SDK, REST API endpoints, API keys, and code guides'
        };
      case 'website_activity':
        return {
          title: 'Website & External Resource Activity',
          subtitle: 'Real-time inspection of external websites, scraped DOM, and 3rd-party APIs accessed by agents'
        };
      case 'threats':
        return {
          title: 'Detected Security Threats & Forensics',
          subtitle: 'Incident response center: detailed threat taxonomy, attack payloads, and mitigation advice'
        };
      case 'history':
        return {
          title: 'Complete Audit Log History',
          subtitle: 'Immutable ledger of all verified, allowed, warned, and blocked agent transactions'
        };
      case 'analytics':
        return {
          title: 'Cybersecurity Analytics & Intelligence',
          subtitle: 'Threat categories, targeted external websites, and attack frequency distributions'
        };
      case 'settings':
        return {
          title: 'Guardrail Policies & Security Settings',
          subtitle: 'Configure active scanning engines, enforcement mode (Automatic Block vs Warning), and risk thresholds'
        };
      case 'profile':
        return {
          title: 'Administrator Profile & Security Keys',
          subtitle: 'Manage your credentials, security preferences, and active guardrail administrator session'
        };
      default:
        return { title: 'Universal AI Guardrail', subtitle: 'Cybersecurity Operations' };
    }
  };

  const { title, subtitle } = getPageMeta();

  return (
    <div className="app-container">
      <Sidebar
        currentTab={currentTab}
        serverOnline={serverOnline}
        threatCount={stats?.blocked_threats_count || 0}
        agentCount={agents.length}
        user={user}
        onLogout={logout}
      />

      <div className="main-layout">
        <Header 
          title={title} 
          subtitle={subtitle}
          onRefresh={handleManualRefresh}
          refreshing={refreshing}
          onEventSimulated={handleEventSimulated}
          user={user}
          onLogout={logout}
          onNavigateToThreats={(alert) => {
            if (alert && onSelectThreat) onSelectThreat(alert);
            navigate('/threats');
          }}
          onNavigateToProfile={() => navigate('/profile')}
        />

        {/* Global Alert Toast */}
        {toast && (
          <div className={`global-toast ${toast.type}`}>
            {toast.type === 'danger' ? <ShieldAlert size={18} color="#ef4444" /> : <CheckCircle size={18} color="#10b981" />}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#fff' }}>{toast.title}</div>
              <div style={{ fontSize: '12px', color: '#cbd5e1' }}>{toast.message}</div>
            </div>
            <button className="toast-close" onClick={() => setToast(null)}>
              <X size={14} />
            </button>
          </div>
        )}

        <main>
          {React.isValidElement(children) 
            ? React.cloneElement(children, {
                stats,
                agents,
                onRefresh: loadPlatformData,
                onEventSimulated: handleEventSimulated,
                initialSelectedThreat,
                onClearInitialThreat,
                onSelectThreat,
                onNavigateToWebsiteActivity: () => navigate('/website-activity'),
                onNavigateToThreats: (threat) => {
                  if (threat && onSelectThreat) onSelectThreat(threat);
                  navigate('/threats');
                },
                onNavigateToAgents: () => navigate('/agents'),
                onNavigateToConnect: () => navigate('/connect')
              })
            : children
          }
        </main>
      </div>
    </div>
  );
}

export function App() {
  const [selectedThreat, setSelectedThreat] = useState(null);

  return (
    <AuthProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected AI Agent Selection & Interactive Chat Workspace */}
        <Route 
          path="/agents" 
          element={
            <ProtectedRoute>
              <ConsoleLayout currentTab="agents">
                <AgentSelectionPage />
              </ConsoleLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/chat/:agentId" 
          element={
            <ProtectedRoute>
              <ConsoleLayout currentTab="agents">
                <ChatWorkspacePage />
              </ConsoleLayout>
            </ProtectedRoute>
          } 
        />

        <Route path="/chat" element={<Navigate to="/agents" replace />} />

        {/* Protected Security Operations Console Pages */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <ConsoleLayout 
                currentTab="dashboard"
                onSelectThreat={(t) => setSelectedThreat(t)}
              >
                <DashboardPage />
              </ConsoleLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/threats" 
          element={
            <ProtectedRoute>
              <ConsoleLayout 
                currentTab="threats"
                initialSelectedThreat={selectedThreat}
                onClearInitialThreat={() => setSelectedThreat(null)}
              >
                <ThreatsPage />
              </ConsoleLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/website-activity" 
          element={
            <ProtectedRoute>
              <ConsoleLayout 
                currentTab="website_activity"
                onSelectThreat={(t) => setSelectedThreat(t)}
              >
                <WebsiteActivityPage />
              </ConsoleLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/history" 
          element={
            <ProtectedRoute>
              <ConsoleLayout currentTab="history">
                <HistoryPage />
              </ConsoleLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/analytics" 
          element={
            <ProtectedRoute>
              <ConsoleLayout currentTab="analytics">
                <AnalyticsPage />
              </ConsoleLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/settings" 
          element={
            <ProtectedRoute>
              <ConsoleLayout currentTab="settings">
                <SettingsPage />
              </ConsoleLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/connect" 
          element={
            <ProtectedRoute>
              <ConsoleLayout currentTab="connect">
                <ConnectAgentPage />
              </ConsoleLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <ConsoleLayout currentTab="profile">
                <ProfilePage />
              </ConsoleLayout>
            </ProtectedRoute>
          } 
        />

        {/* Catch-all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
