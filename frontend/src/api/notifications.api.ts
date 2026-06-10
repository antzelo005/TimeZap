import type {
  NotificationReadAllResponse,
  NotificationResponse,
  NotificationStatus,
  NotificationUnreadCountResponse,
  NotificationsResponse
} from "../types/notification";
import { apiClient } from "./client";

interface GetNotificationsParams {
  unread?: boolean;
  status?: NotificationStatus;
}

function buildQuery(params?: GetNotificationsParams): string {
  if (!params) {
    return "";
  }

  const searchParams = new URLSearchParams();
  if (params.unread !== undefined) {
    searchParams.set("unread", String(params.unread));
  }

  if (params.status) {
    searchParams.set("status", params.status);
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export function getNotifications(params?: GetNotificationsParams): Promise<NotificationsResponse> {
  return apiClient.get<NotificationsResponse>(`/notifications${buildQuery(params)}`);
}

export function getNotificationUnreadCount(): Promise<NotificationUnreadCountResponse> {
  return apiClient.get<NotificationUnreadCountResponse>("/notifications/unread-count");
}

export function markNotificationRead(id: string): Promise<NotificationResponse> {
  return apiClient.patch<NotificationResponse>(`/notifications/${id}/read`, {});
}

export function markAllNotificationsRead(): Promise<NotificationReadAllResponse> {
  return apiClient.patch<NotificationReadAllResponse>("/notifications/read-all", {});
}

export function cancelNotification(id: string): Promise<NotificationResponse> {
  return apiClient.patch<NotificationResponse>(`/notifications/${id}/cancel`, {});
}
