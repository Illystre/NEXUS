import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => sessionStorage.getItem('nexus_token'));
  const [user,  setUser]  = useState(() => sessionStorage.getItem('nexus_user'));
  const [role,  setRole]  = useState(() => sessionStorage.getItem('nexus_role') || 'viewer');

  useEffect(() => {
    if (token) axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    else delete axios.defaults.headers.common['Authorization'];
  }, [token]);

  // SSO: if Hub opened this page with ?sso=<token>, auto-login
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ssoToken = params.get('sso');
    if (ssoToken && !sessionStorage.getItem('nexus_token')) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${ssoToken}`;
      // Decode the JWT payload to get user info
      try {
        const payload = JSON.parse(atob(ssoToken.split('.')[1]));
        const ssoUser = payload.username || 'admin';
        const ssoRole = payload.role || 'viewer';
        setToken(ssoToken); setUser(ssoUser); setRole(ssoRole);
        sessionStorage.setItem('nexus_token', ssoToken);
        sessionStorage.setItem('nexus_user', ssoUser);
        sessionStorage.setItem('nexus_role', ssoRole);
      } catch {
        setToken(ssoToken); setUser('admin'); setRole('viewer');
        sessionStorage.setItem('nexus_token', ssoToken);
        sessionStorage.setItem('nexus_user', 'admin');
        sessionStorage.setItem('nexus_role', 'viewer');
      }
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const login = async (username, password) => {
    const res = await axios.post('/api/login', { username, password });
    const { token: t, role: r } = res.data;
    setToken(t); setUser(username); setRole(r || 'viewer');
    sessionStorage.setItem('nexus_token', t);
    sessionStorage.setItem('nexus_user', username);
    sessionStorage.setItem('nexus_role', r || 'viewer');
    axios.defaults.headers.common['Authorization'] = `Bearer ${t}`;
  };

  const logout = () => {
    setToken(null); setUser(null); setRole('viewer');
    sessionStorage.removeItem('nexus_token');
    sessionStorage.removeItem('nexus_user');
    sessionStorage.removeItem('nexus_role');
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ token, user, role, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
