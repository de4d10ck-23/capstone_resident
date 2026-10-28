import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('resident_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('resident_token'));
  const [loading, setLoading] = useState(true);

  let rawApiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api').trim();
  if (!rawApiUrl.includes('localhost') && !rawApiUrl.includes('127.0.0.1')) {
    rawApiUrl = rawApiUrl.replace(/^http:\/\//i, 'https://');
  }
  const cleanApiUrl = rawApiUrl.replace(/\/$/, '');
  const API_URL = cleanApiUrl.endsWith('/api') ? cleanApiUrl : `${cleanApiUrl}/api`;

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const res = await fetch(`${API_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          // Only explicitly log out if the backend rejects the token with 401/403
          if (res.status === 401 || res.status === 403) {
            logout();
            setLoading(false);
            return;
          }

          const data = await res.json();
          if (data.success && data.user.role === 'resident') {
            setUser(data.user);
            localStorage.setItem('resident_user', JSON.stringify(data.user));
          }
        } catch (error) {
          // Network hiccup, offline mode, or mobile waking up: KEEP LOGGED IN
          console.warn("Auth check network error, keeping cached session active:", error);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, [token]);

  const login = async (username, password) => {
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      
      if (data.success) {
        if (data.user.role !== 'resident') {
          return { success: false, message: 'Access denied. Only residents can log in here.' };
        }
        localStorage.setItem('resident_token', data.token);
        localStorage.setItem('resident_user', JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        return { success: true };
      } else {
        return { success: false, message: data.detail || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Network error. Could not connect to server.' };
    }
  };

  const register = async (userData) => {
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      const data = await res.json();
      
      if (data.success) {
        return { success: true };
      } else {
        return { success: false, message: Array.isArray(data.detail) ? data.detail.map(item => item.msg).join('. ') : data.detail || 'Registration failed' };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'Network error. Could not connect to server.' };
    }
  };

  const updateProfile = async (profile) => {
    const res = await fetch(`${API_URL}/auth/me`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(profile),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      const message = Array.isArray(data.detail)
        ? data.detail.map(item => item.msg).join('. ')
        : data.detail;
      throw new Error(message || 'Could not save your profile. Please try again.');
    }
    localStorage.setItem('resident_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('resident_token');
    localStorage.removeItem('resident_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateProfile, API_URL }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
