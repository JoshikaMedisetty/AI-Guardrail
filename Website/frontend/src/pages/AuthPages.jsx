import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  Shield, 
  Lock, 
  Mail, 
  User, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle,
  Eye,
  EyeOff,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function LoginPage({ onLoginSuccess, onSwitchToRegister }) {
  const [email, setEmail] = useState('security@guardrail.ai');
  const [password, setPassword] = useState('Admin@12345');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await auth.login(email, password);
      if (res.success) {
        if (onLoginSuccess) {
          onLoginSuccess(res.user);
        } else {
          const destination = location.state?.from?.pathname || '/agents';
          navigate(destination, { replace: true });
        }
      } else {
        setError(res.error || 'Invalid email or password');
      }
    } catch (err) {
      setError('Unable to connect to security server. Please ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = () => {
    setEmail('security@guardrail.ai');
    setPassword('Admin@12345');
    setError(null);
  };

  return (
    <div className="auth-container">
      <div className="auth-card glass-card">
        <div className="auth-header">
          <div className="auth-logo-shield">
            <Shield size={32} color="#06b6d4" />
          </div>
          <h2>AI GUARDRAIL</h2>
          <span className="auth-subtitle">Universal Agent Security Platform</span>
          <p className="auth-desc">Sign in to manage protected agents and monitor real-time security events.</p>
        </div>

        {error && (
          <div className="auth-alert error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Email Address</label>
            <div className="input-with-icon">
              <Mail size={16} className="input-icon" />
              <input
                type="email"
                required
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="input-with-icon">
              <Lock size={16} className="input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-block auth-btn" disabled={loading}>
            {loading ? 'Authenticating...' : (
              <>Sign In to Security Center <ArrowRight size={16} /></>
            )}
          </button>
        </form>

        <div className="auth-demo-box">
          <div className="demo-badge">
            <Sparkles size={12} /> Demo Credentials Ready
          </div>
          <p>Click below to prefill evaluation credentials for demonstration:</p>
          <button type="button" className="btn btn-secondary btn-sm btn-block" onClick={handleDemoFill}>
            Prefill: security@guardrail.ai / Admin@12345
          </button>
        </div>

        <div className="auth-footer">
          <span>Need an account? </span>
          {onSwitchToRegister ? (
            <button type="button" className="link-button" onClick={onSwitchToRegister}>
              Register Security Administrator
            </button>
          ) : (
            <Link to="/register" className="link-button">
              Register Security Administrator
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export function RegisterPage({ onRegisterSuccess, onSwitchToLogin }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const auth = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await auth.register(name, email, password, confirmPassword);
      if (res.success) {
        if (onRegisterSuccess) {
          onRegisterSuccess(res.user);
        } else {
          navigate('/agents', { replace: true });
        }
      } else {
        setError(res.error || 'Registration failed');
      }
    } catch {
      setError('Unable to connect to security server. Please check backend.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card glass-card">
        <div className="auth-header">
          <div className="auth-logo-shield">
            <Shield size={32} color="#06b6d4" />
          </div>
          <h2>Create Account</h2>
          <span className="auth-subtitle">AI GUARDRAIL SECURITY PLATFORM</span>
          <p className="auth-desc">Register a new administrator console to protect autonomous AI agents.</p>
        </div>

        {error && (
          <div className="auth-alert error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Administrator Name</label>
            <div className="input-with-icon">
              <User size={16} className="input-icon" />
              <input
                type="text"
                required
                placeholder="Alex Morgan"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <div className="input-with-icon">
              <Mail size={16} className="input-icon" />
              <input
                type="email"
                required
                placeholder="admin@enterprise.ai"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="input-with-icon">
              <Lock size={16} className="input-icon" />
              <input
                type="password"
                required
                placeholder="Create strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <div className="input-with-icon">
              <Lock size={16} className="input-icon" />
              <input
                type="password"
                required
                placeholder="Repeat password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-block auth-btn" disabled={loading}>
            {loading ? 'Creating Account...' : (
              <>Register Security Administrator <ArrowRight size={16} /></>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <span>Already have an account? </span>
          {onSwitchToLogin ? (
            <button type="button" className="link-button" onClick={onSwitchToLogin}>
              Sign In
            </button>
          ) : (
            <Link to="/login" className="link-button">
              Sign In
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

