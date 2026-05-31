import { apiClient } from "./client";

export function getTasks() {
  return apiClient.get("/tasks");
}

export function createTask(payload) {
  return apiClient.post("/tasks", payload);
}

export function completeTask(taskId) {
  return apiClient.patch(`/tasks/${taskId}/complete`);
}
