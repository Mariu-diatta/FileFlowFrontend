import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { auth as authApi } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    const token = localStorage.getItem("ff_access_token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await authApi.me();
      setUser(data);
    } catch {
      localStorage.removeItem("ff_access_token");
      localStorage.removeItem("ff_refresh_token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  const login = async (email, password) => {
    const { data } = await authApi.login(email, password);
    localStorage.setItem("ff_access_token", data.access);
    localStorage.setItem("ff_refresh_token", data.refresh);
    await refreshMe();
  };

  const register = async (email, username, password) => {
    await authApi.register(email, username, password);
    await login(email, password);
  };

  const logout = () => {
    localStorage.removeItem("ff_access_token");
    localStorage.removeItem("ff_refresh_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans AuthProvider");
  return ctx;
}
