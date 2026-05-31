import type {
  SettingsResponse,
  UpdateSettingsPayload,
  UpdateSettingsResponse
} from "../types/settings";
import { apiClient } from "./client";

export function getSettings(): Promise<SettingsResponse> {
  return apiClient.get<SettingsResponse>("/settings");
}

export function updateSettings(payload: UpdateSettingsPayload): Promise<UpdateSettingsResponse> {
  return apiClient.put<UpdateSettingsResponse>("/settings", payload);
}
