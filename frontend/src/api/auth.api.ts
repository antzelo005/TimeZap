import type { AuthCredentials, AuthResponse, MeResponse } from "../types/auth";
import { apiClient } from "./client";

export function register(payload: AuthCredentials): Promise<AuthResponse> {
  return apiClient.post<AuthResponse>("/auth/register", payload);
}

export function login(payload: AuthCredentials): Promise<AuthResponse> {
  return apiClient.post<AuthResponse>("/auth/login", payload);
}

export function getCurrentUser(): Promise<MeResponse> {
  return apiClient.get<MeResponse>("/auth/me");
}
