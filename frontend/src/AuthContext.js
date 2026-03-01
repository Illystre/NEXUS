import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => sessionStorage.getItem('dm_token'));
  const [user, setUser] = useState(() => sessionStorage.getItem('dm_user'));

  // Set axios header whenever token changes
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  const login = async (username, password) => {
    const res = await axios.post('/api/login', { username, password });
    const { token: newToken } = res.data;
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(username);
    sessionStorage.setItem('dm_token', newToken);
    sessionStorage.setItem('dm_user', username);
    return newToken;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
    sessionStorage.removeItem('dm_token');
    sessionStorage.removeItem('dm_user');
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isAuth: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
export function setupAxios(token) {
  if (token) axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}
