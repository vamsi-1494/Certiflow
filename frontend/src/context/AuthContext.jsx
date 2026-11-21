import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('certiflow_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('certiflow_token'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Quick Demo Login for Hackathon Personas
  const demoLogin = async (personaKey) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/demo-login', { persona: personaKey });
      const { token: receivedToken, user: receivedUser } = res.data.data;

      setToken(receivedToken);
      setUser(receivedUser);
      localStorage.setItem('certiflow_token', receivedToken);
      localStorage.setItem('certiflow_user', JSON.stringify(receivedUser));
      return receivedUser;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Login failed';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Standard Login with Email and Password
  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/login', { email, password });
      const { token: receivedToken, user: receivedUser } = res.data.data;

      setToken(receivedToken);
      setUser(receivedUser);
      localStorage.setItem('certiflow_token', receivedToken);
      localStorage.setItem('certiflow_user', JSON.stringify(receivedUser));
      return receivedUser;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Invalid credentials';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.warn('Logout network error (proceeding to local logout):', err);
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('certiflow_token');
      localStorage.removeItem('certiflow_user');
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, error, login, demoLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
