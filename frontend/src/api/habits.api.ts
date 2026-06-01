import type {
  CreateHabitPayload,
  HabitDeleteResponse,
  HabitListResponse,
  HabitLogResponse,
  HabitResponse,
  HabitStreakResponse,
  UpdateHabitPayload
} from "../types/habit";
import { apiClient } from "./client";

export function getHabits(): Promise<HabitListResponse> {
  return apiClient.get<HabitListResponse>("/habits");
}

export function createHabit(payload: CreateHabitPayload): Promise<HabitResponse> {
  return apiClient.post<HabitResponse>("/habits", payload);
}

export function updateHabit(habitId: string, payload: UpdateHabitPayload): Promise<HabitResponse> {
  return apiClient.put<HabitResponse>(`/habits/${habitId}`, payload);
}

export function deleteHabit(habitId: string): Promise<HabitDeleteResponse> {
  return apiClient.delete<HabitDeleteResponse>(`/habits/${habitId}`);
}

export function logHabit(habitId: string, payload: { date: string }): Promise<HabitLogResponse> {
  return apiClient.post<HabitLogResponse>(`/habits/${habitId}/log`, payload);
}

export function getHabitStreak(habitId: string): Promise<HabitStreakResponse> {
  return apiClient.get<HabitStreakResponse>(`/habits/${habitId}/streak`);
}
