import React, { createContext, useContext, useEffect, useState } from "react";
import { clearToken, getToken, setToken } from "../storage/tokenStorage";
import { getCurrentUser, login as loginRequest, register as registerRequest } from "../api/auth.api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setTokenState] = useState(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  useEffect(() => {
    bootstrapAuth();
  }, []);

  async function bootstrapAuth() {
    try {
      const storedToken = await getToken();

      if (!storedToken) {
        setIsBootstrapping(false);
        return;
      }

      setTokenState(storedToken);
      const response = await getCurrentUser();
      setUser(response.user);
    } catch (error) {
      await clearToken();
      setTokenState(null);
      setUser(null);
    } finally {
      setIsBootstrapping(false);
    }
  }

  async function login(credentials) {
    setIsAuthLoading(true);
    try {
      const response = await loginRequest(credentials);
      await setToken(response.token);
      setTokenState(response.token);
      setUser(response.user);
      return response;
    } finally {
      setIsAuthLoading(false);
    }
  }

  async function register(payload) {
    setIsAuthLoading(true);
    try {
      const response = await registerRequest(payload);
      await setToken(response.token);
      setTokenState(response.token);
      setUser(response.user);
      return response;
    } finally {
      setIsAuthLoading(false);
    }
  }

  async function logout() {
    await clearToken();
    setTokenState(null);
    setUser(null);
  }

  const value = {
    user,
    token,
    isAuthenticated: Boolean(token && user),
    isBootstrapping,
    isAuthLoading,
    login,
    logout,
    register
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
