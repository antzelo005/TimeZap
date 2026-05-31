import type { CreateTaskPayload, TaskListResponse, TaskResponse } from "../types/task";
import { apiClient } from "./client";

export function getTasks(): Promise<TaskListResponse> {
  return apiClient.get<TaskListResponse>("/tasks");
}

export function createTask(payload: CreateTaskPayload): Promise<TaskResponse> {
  return apiClient.post<TaskResponse>("/tasks", payload);
}

export function completeTask(taskId: string): Promise<TaskResponse> {
  return apiClient.patch<TaskResponse>(`/tasks/${taskId}/complete`);
}
