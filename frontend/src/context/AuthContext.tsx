import React, { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { clearToken, getToken, setToken } from "../storage/tokenStorage";
import {
  getCurrentUser,
  login as loginRequest,
  register as registerRequest
} from "../api/auth.api";
import type { AuthCredentials, AuthResponse, User } from "../types/auth";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  isAuthLoading: boolean;
  login: (credentials: AuthCredentials) => Promise<AuthResponse>;
  register: (payload: AuthCredentials) => Promise<AuthResponse>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState<boolean>(true);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false);

  useEffect(() => {
    void bootstrapAuth();
  }, []);

  async function bootstrapAuth(): Promise<void> {
    try {
      const storedToken = await getToken();

      if (!storedToken) {
        setIsBootstrapping(false);
        return;
      }

      setTokenState(storedToken);
      const response = await getCurrentUser();
      setUser(response.user);
    } catch {
      await clearToken();
      setTokenState(null);
      setUser(null);
    } finally {
      setIsBootstrapping(false);
    }
  }

  async function login(credentials: AuthCredentials): Promise<AuthResponse> {
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

  async function register(payload: AuthCredentials): Promise<AuthResponse> {
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

  async function logout(): Promise<void> {
    await clearToken();
    setTokenState(null);
    setUser(null);
  }

  const value: AuthContextValue = {
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

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
