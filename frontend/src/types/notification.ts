export type RelatedType = "task" | "habit" | "system";

export type NotificationKind =
  | "standard_reminder"
  | "overdue_30"
  | "overdue_15"
  | "overdue_5"
  | "system";

export type NotificationStatus = "scheduled" | "cancelled";

export interface NotificationItem {
  notification_id: string;
  user_id: string;
  related_type: RelatedType;
  related_id: string | null;
  kind: NotificationKind;
  title: string;
  body: string;
  scheduled_for: string;
  occurrence_date: string | null;
  status: NotificationStatus;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationsResponse {
  items: NotificationItem[];
}

export interface NotificationResponse {
  message: string;
  notification: NotificationItem;
}

export interface NotificationReadAllResponse {
  message: string;
  updated_count: number;
}

export interface NotificationUnreadCountResponse {
  unread_count: number;
}

export interface NativeNotificationActionResult {
  ok: boolean;
  ids?: string[];
  reason?: string;
}
