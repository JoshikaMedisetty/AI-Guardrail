import React, { useState } from 'react';
import { 
  User, 
  Mail, 
  Lock, 
  Key, 
  ShieldCheck, 
  ShieldAlert, 
  Save, 
  CheckCircle,
  AlertCircle,
  Clock,
  LogOut
} from 'lucide-react';
import { updateProfile, changePassword } from '../services/api';
import { useAuth } from '../context/AuthContext';

export function ProfilePage({ user: userProp, onLogout, onProfileUpdated }) {
  const auth = useAuth();
  const user = userProp || auth?.user;
  const [name, setName] = useState(user?.name || user?.full_name || 'Chief Security Officer');
  const [email, setEmail] = useState(user?.email || 'security@guardrail.ai');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState(null);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileMsg(null);
    setProfileLoading(true);
    try {
      const res = await updateProfile({ name, email });
      if (res.success) {
        setProfileMsg({ type: 'success', text: 'Profile changes saved successfully.' });
        if (auth?.refreshUser) auth.refreshUser();
        if (onProfileUpdated) onProfileUpdated(res.data);
      } else {
        setProfileMsg({ type: 'error', text: res.error?.message || 'Failed to update profile.' });
      }
    } catch {
      setProfileMsg({ type: 'error', text: 'Error updating profile. Please check server.' });
    } finally {
      setProfileLoading(false);
    }
  };


  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwMsg(null);
    if (newPassword !== confirmPassword) {
      setPwMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (newPassword.length < 6) {
      setPwMsg({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }

    setPwLoading(true);
    try {
      const res = await changePassword({ current_password: currentPassword, new_password: newPassword });
      if (res.success) {
        setPwMsg({ type: 'success', text: 'Password changed successfully.' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPwMsg({ type: 'error', text: res.error?.message || 'Failed to change password.' });
      }
    } catch {
      setPwMsg({ type: 'error', text: 'Error communicating with server.' });
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="content-page">
      {/* Profile Header Card */}
      <div className="glass-card profile-hero" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="profile-avatar-box">
              <User size={32} color="#06b6d4" />
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', margin: 0 }}>
                {user?.name || name}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{user?.email || email}</span>
                <span className="badge-pill" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  🛡️ Security Administrator
                </span>
              </div>
            </div>
          </div>

          <button className="btn btn-secondary" onClick={onLogout} style={{ borderColor: 'rgba(239, 68, 68, 0.3)', color: '#f87171' }}>
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </div>

      <div className="grid-2">
        {/* Profile Information Form */}
        <div className="glass-card">
          <div className="card-header" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={18} color="#6366f1" />
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', margin: 0 }}>Administrator Details</h3>
            </div>
          </div>

          {profileMsg && (
            <div className={`auth-alert ${profileMsg.type}`} style={{ marginBottom: '16px' }}>
              {profileMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              <span>{profileMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleProfileSubmit}>
            <div className="form-group">
              <label>Full Name</label>
              <div className="input-with-icon">
                <User size={16} className="input-icon" />
                <input
                  type="text"
                  required
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Assigned Role</label>
              <div className="input-with-icon">
                <ShieldCheck size={16} className="input-icon" />
                <input
                  type="text"
                  disabled
                  value="Enterprise Security Administrator"
                  style={{ opacity: 0.6, cursor: 'not-allowed' }}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={profileLoading} style={{ marginTop: '10px' }}>
              {profileLoading ? 'Saving Changes...' : <><Save size={15} /> Save Changes</>}
            </button>
          </form>
        </div>

        {/* Change Password Form */}
        <div className="glass-card">
          <div className="card-header" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={18} color="#f59e0b" />
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', margin: 0 }}>Security & Password</h3>
            </div>
          </div>

          {pwMsg && (
            <div className={`auth-alert ${pwMsg.type}`} style={{ marginBottom: '16px' }}>
              {pwMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              <span>{pwMsg.text}</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit}>
            <div className="form-group">
              <label>Current Password</label>
              <div className="input-with-icon">
                <Lock size={16} className="input-icon" />
                <input
                  type="password"
                  required
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label>New Password</label>
              <div className="input-with-icon">
                <Key size={16} className="input-icon" />
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Confirm New Password</label>
              <div className="input-with-icon">
                <Key size={16} className="input-icon" />
                <input
                  type="password"
                  required
                  placeholder="Re-type new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-secondary" disabled={pwLoading} style={{ marginTop: '10px' }}>
              {pwLoading ? 'Updating Password...' : <><Lock size={15} /> Update Password</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
