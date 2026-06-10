import React, { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { clearToken, getToken, setToken } from "../storage/tokenStorage";
import {
  changePassword as changePasswordRequest,
  getCurrentUser,
  login as loginRequest,
  register as registerRequest,
  updateProfile as updateProfileRequest
} from "../api/auth.api";
import type {
  AuthCredentials,
  AuthResponse,
  PasswordChangePayload,
  PasswordChangeResponse,
  ProfileUpdatePayload,
  ProfileUpdateResponse,
  User
} from "../types/auth";

const TOKEN_READ_TIMEOUT_MS = 4000;
const CURRENT_USER_TIMEOUT_MS = 8000;
const TOKEN_CLEAR_TIMEOUT_MS = 2000;

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  isAuthLoading: boolean;
  login: (credentials: AuthCredentials) => Promise<AuthResponse>;
  register: (payload: AuthCredentials) => Promise<AuthResponse>;
  updateProfile: (payload: ProfileUpdatePayload) => Promise<ProfileUpdateResponse>;
  changePassword: (payload: PasswordChangePayload) => Promise<PasswordChangeResponse>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error("Startup request timed out"));
    }, timeoutMs);

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timeoutId));
  });
}

async function clearTokenSafely(): Promise<void> {
  try {
    await withTimeout(clearToken(), TOKEN_CLEAR_TIMEOUT_MS);
  } catch {
    // Startup must continue even if browser storage is unavailable.
  }
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
      const storedToken = await withTimeout(getToken(), TOKEN_READ_TIMEOUT_MS);

      if (!storedToken) {
        setIsBootstrapping(false);
        return;
      }

      setTokenState(storedToken);
      const response = await withTimeout(getCurrentUser(), CURRENT_USER_TIMEOUT_MS);
      setUser(response.user);
    } catch {
      await clearTokenSafely();
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

  async function updateProfile(payload: ProfileUpdatePayload): Promise<ProfileUpdateResponse> {
    setIsAuthLoading(true);
    try {
      const response = await updateProfileRequest(payload);
      await setToken(response.token);
      setTokenState(response.token);
      setUser(response.user);
      return response;
    } finally {
      setIsAuthLoading(false);
    }
  }

  async function changePassword(payload: PasswordChangePayload): Promise<PasswordChangeResponse> {
    setIsAuthLoading(true);
    try {
      return await changePasswordRequest(payload);
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
    changePassword,
    login,
    logout,
    register,
    updateProfile
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
