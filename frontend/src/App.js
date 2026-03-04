import React from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { LanguageProvider } from './components/LanguageContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

function Inner() {
  const { token } = useAuth();
  return token ? <Dashboard /> : <Login />;
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <Inner />
      </AuthProvider>
    </LanguageProvider>
  );
}
