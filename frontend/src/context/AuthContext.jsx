import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/authApi';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('snackora_token') || null);
  const [loading, setLoading] = useState(true);

  // Sync / verify current session on startup
  const refreshUser = useCallback(async () => {
    const savedToken = localStorage.getItem('snackora_token');
    if (!savedToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await authApi.getMe();
      if (response.success && response.data?.user) {
        setUser(response.data.user);
        localStorage.setItem('snackora_user', JSON.stringify(response.data.user));
      } else {
        logout();
      }
    } catch (err) {
      console.warn('Session verification failed, logging out:', err.message);
      logout();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email, password) => {
    const res = await authApi.login({ email, password });
    if (res.success && res.data?.token) {
      localStorage.setItem('snackora_token', res.data.token);
      localStorage.setItem('snackora_user', JSON.stringify(res.data.user));
      setToken(res.data.token);
      setUser(res.data.user);
      return res.data;
    }
    throw new Error(res.message || 'Login failed');
  };

  const register = async (data) => {
    const res = await authApi.register(data);
    if (res.success && res.data?.token) {
      localStorage.setItem('snackora_token', res.data.token);
      localStorage.setItem('snackora_user', JSON.stringify(res.data.user));
      setToken(res.data.token);
      setUser(res.data.user);
      return res.data;
    }
    throw new Error(res.message || 'Registration failed');
  };

  const registerB2B = async (data) => {
    const res = await authApi.registerB2B(data);
    if (res.success && res.data?.token) {
      localStorage.setItem('snackora_token', res.data.token);
      localStorage.setItem('snackora_user', JSON.stringify(res.data.user));
      setToken(res.data.token);
      setUser(res.data.user);
      return res.data;
    }
    throw new Error(res.message || 'B2B registration failed');
  };

  const logout = () => {
    try {
      authApi.logout().catch(() => {});
    } finally {
      localStorage.removeItem('snackora_token');
      localStorage.removeItem('snackora_user');
      setToken(null);
      setUser(null);
    }
  };

  // Helper flags
  const role = user?.role || 'GUEST';
  const isB2B = role === 'B2B_WHOLESALER';
  const isApprovedB2B = isB2B && user?.b2bProfile?.verificationStatus === 'APPROVED';
  const isPendingB2B = isB2B && user?.b2bProfile?.verificationStatus === 'PENDING';
  const isAdmin = role === 'ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        role,
        isB2B,
        isApprovedB2B,
        isPendingB2B,
        isAdmin,
        login,
        register,
        registerB2B,
        logout,
        refreshUser
      }}
    >
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
