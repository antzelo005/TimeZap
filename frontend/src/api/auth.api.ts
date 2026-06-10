import type {
  AuthCredentials,
  AuthResponse,
  MeResponse,
  PasswordChangePayload,
  PasswordChangeResponse,
  ProfileUpdatePayload,
  ProfileUpdateResponse
} from "../types/auth";
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

export function updateProfile(payload: ProfileUpdatePayload): Promise<ProfileUpdateResponse> {
  return apiClient.put<ProfileUpdateResponse>("/auth/profile", payload);
}

export function changePassword(payload: PasswordChangePayload): Promise<PasswordChangeResponse> {
  return apiClient.put<PasswordChangeResponse>("/auth/password", payload);
}
