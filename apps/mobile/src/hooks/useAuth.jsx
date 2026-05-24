import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, getStoredUser, getToken, setStoredUser, setToken } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(getStoredUser());
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const data = await api.login(username, password);
    setToken(data.access_token);
    setStoredUser(data.user);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    setToken(null);
    setStoredUser(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(getToken() && user),
      login,
      logout,
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
