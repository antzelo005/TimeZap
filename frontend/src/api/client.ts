import { Platform } from "react-native";
import { getToken } from "../storage/tokenStorage";
import type { ApiError, ApiErrorShape } from "../types/api";

const WEB_API_BASE_URL = "http://localhost:3000/api";
const ANDROID_EMULATOR_API_BASE_URL = "http://10.0.2.2:3000/api";

export const API_BASE_URL =
  Platform.OS === "android" ? ANDROID_EMULATOR_API_BASE_URL : WEB_API_BASE_URL;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  const text = await response.text();
  let data: unknown = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const payload = (data as ApiErrorShape | null) ?? null;
    const error = new Error(payload?.message || "Request failed") as ApiError;
    error.status = response.status;
    error.data = payload;
    throw error;
  }

  return data as T;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: "POST",
      body: JSON.stringify(body)
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined
    }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: "PUT",
      body: JSON.stringify(body)
    }),
  delete: <T>(path: string) =>
    request<T>(path, {
      method: "DELETE"
    })
};
