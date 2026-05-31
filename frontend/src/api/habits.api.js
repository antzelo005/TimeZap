import { apiClient } from "./client";

export function getHabits() {
  return apiClient.get("/habits");
}

export function createHabit(payload) {
  return apiClient.post("/habits", payload);
}

export function logHabit(habitId, payload) {
  return apiClient.post(`/habits/${habitId}/log`, payload);
}

export function getHabitStreak(habitId) {
  return apiClient.get(`/habits/${habitId}/streak`);
}
