import { Platform } from "react-native";
import { getToken } from "../storage/tokenStorage";

const WEB_API_BASE_URL = "http://localhost:3000/api";
const ANDROID_EMULATOR_API_BASE_URL = "http://10.0.2.2:3000/api";

// Change these values here if you want to test against a different backend host.
export const API_BASE_URL =
  Platform.OS === "android" ? ANDROID_EMULATOR_API_BASE_URL : WEB_API_BASE_URL;

async function request(path, options = {}) {
  const token = await getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch (error) {
    data = null;
  }

  if (!response.ok) {
    const message = data?.message || "Request failed";
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const apiClient = {
  get: (path) => request(path),
  post: (path, body) =>
    request(path, {
      method: "POST",
      body: JSON.stringify(body)
    }),
  patch: (path, body) =>
    request(path, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined
    }),
  put: (path, body) =>
    request(path, {
      method: "PUT",
      body: JSON.stringify(body)
    })
};
