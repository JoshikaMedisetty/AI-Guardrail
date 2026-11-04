import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Shield } from 'lucide-react';

export function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary, #090d16)',
        color: '#fff'
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: 'rgba(6, 182, 212, 0.15)',
          border: '1px solid rgba(6, 182, 212, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '20px',
          animation: 'pulse 2s infinite ease-in-out'
        }}>
          <Shield size={28} color="#06b6d4" />
        </div>
        <div style={{ fontSize: '15px', fontWeight: 600, color: '#e2e8f0' }}>
          Verifying Security Session...
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary, #94a3b8)', marginTop: '6px' }}>
          Universal AI Guardrail Security Gateway
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
