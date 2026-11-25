import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  getAuthToken, 
  getCachedUser, 
  setAuthSession, 
  clearAuthSession, 
  loginUser, 
  registerUser, 
  fetchUserProfile 
} from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getAuthToken());
  const [user, setUser] = useState(() => getCachedUser());
  const [loading, setLoading] = useState(true);

  // Initialize and verify session on load
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = getAuthToken();
      if (savedToken) {
        try {
          const res = await fetchUserProfile();
          if (res.success && res.data) {
            setUser(res.data);
            setAuthSession(savedToken, res.data);
          }
        } catch (err) {
          console.warn('Session verification failed, using cached session or clearing', err);
          // If token invalid, clear
          if (err.message && err.message.includes('401')) {
            clearAuthSession();
            setToken(null);
            setUser(null);
          }
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await loginUser(email, password);
      if (res.success && res.data?.token) {
        setToken(res.data.token);
        setUser(res.data.user);
        setAuthSession(res.data.token, res.data.user);
        return { success: true, user: res.data.user };
      }
      return { success: false, error: res.error?.message || 'Login failed' };
    } catch (err) {
      return { success: false, error: err.message || 'Authentication error' };
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password, confirmPassword) => {
    setLoading(true);
    try {
      const res = await registerUser(name, email, password, confirmPassword);
      if (res.success && res.data?.token) {
        setToken(res.data.token);
        setUser(res.data.user);
        setAuthSession(res.data.token, res.data.user);
        return { success: true, user: res.data.user };
      }
      return { success: false, error: res.error?.message || 'Registration failed' };
    } catch (err) {
      return { success: false, error: err.message || 'Registration error' };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearAuthSession();
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const res = await fetchUserProfile();
      if (res.success && res.data) {
        setUser(res.data);
        if (token) setAuthSession(token, res.data);
      }
    } catch (e) {
      console.error('Failed to refresh user profile', e);
    }
  };

  const value = {
    user,
    token,
    isAuthenticated: Boolean(token && user),
    loading,
    login,
    register,
    logout,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
