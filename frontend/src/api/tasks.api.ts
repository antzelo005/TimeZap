import type {
  CreateTaskPayload,
  TaskDeleteResponse,
  TaskListResponse,
  TaskResponse,
  UpdateTaskPayload
} from "../types/task";
import { apiClient } from "./client";

interface GetTasksParams {
  status?: "pending" | "completed" | "cancelled";
  date?: string;
  from?: string;
  to?: string;
}

function buildQuery(params?: GetTasksParams): string {
  if (!params) {
    return "";
  }

  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      searchParams.set(key, value);
    }
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export function getTasks(params?: GetTasksParams): Promise<TaskListResponse> {
  return apiClient.get<TaskListResponse>(`/tasks${buildQuery(params)}`);
}

export function createTask(payload: CreateTaskPayload): Promise<TaskResponse> {
  return apiClient.post<TaskResponse>("/tasks", payload);
}

export function updateTask(taskId: string, payload: UpdateTaskPayload): Promise<TaskResponse> {
  return apiClient.put<TaskResponse>(`/tasks/${taskId}`, payload);
}

export function completeTask(taskId: string): Promise<TaskResponse> {
  return apiClient.patch<TaskResponse>(`/tasks/${taskId}/complete`, {});
}

export function cancelTask(taskId: string): Promise<TaskResponse> {
  return apiClient.patch<TaskResponse>(`/tasks/${taskId}/cancel`, {});
}

export function deleteTask(taskId: string): Promise<TaskDeleteResponse> {
  return apiClient.delete<TaskDeleteResponse>(`/tasks/${taskId}`);
}
