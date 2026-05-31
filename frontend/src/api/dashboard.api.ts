import type { DashboardTodayResponse } from "../types/dashboard";
import { apiClient } from "./client";

export function getDashboardToday(): Promise<DashboardTodayResponse> {
  return apiClient.get<DashboardTodayResponse>("/dashboard/today");
}
