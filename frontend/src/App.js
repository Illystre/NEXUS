import React, { useEffect } from 'react';
import { AuthProvider, useAuth, setupAxios } from './AuthContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

function Inner() {
  const { isAuth, token } = useAuth();
  useEffect(() => { setupAxios(token); }, [token]);
  return isAuth ? <Dashboard /> : <Login />;
}

export default function App() {
  return (
    <AuthProvider>
      <Inner />
    </AuthProvider>
  );
}
