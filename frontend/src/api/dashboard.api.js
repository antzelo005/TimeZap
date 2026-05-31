import { apiClient } from "./client";

export function getDashboardToday() {
  return apiClient.get("/dashboard/today");
}
