export type ReminderRelatedType = "task" | "habit";

export type ReminderRepeatMode = "once" | "daily";

export type ReminderKind = "standard" | "overdue_30" | "overdue_15" | "overdue_5";

export type NotificationAvailabilityReason = "available" | "web_unsupported" | "native_unavailable";

export interface NotificationAvailability {
  available: boolean;
  reason: NotificationAvailabilityReason;
}

export interface NotificationPermissionResult {
  granted: boolean;
  status: string;
}

export interface LocalReminderRecord {
  related_type: ReminderRelatedType;
  related_id: string;
  kind?: ReminderKind;
  notification_id: string | null;
  title?: string;
  body?: string;
  scheduled_for: string | null;
  scheduled_date?: string | null;
  scheduled_time?: string | null;
  grace_deadline?: string | null;
  reminder_date: string | null;
  reminder_time: string;
  repeat: ReminderRepeatMode;
  updated_at: string;
}

export type NotificationFailureReason =
  | "unsupported"
  | "permission_denied"
  | "past_date"
  | "invalid_date"
  | "storage_unavailable";

export interface NotificationActionResult {
  ok: boolean;
  reason?: NotificationFailureReason;
}

export interface ScheduleReminderResult extends NotificationActionResult {
  id?: string;
  ids?: string[];
  reminder?: LocalReminderRecord;
  reminders?: LocalReminderRecord[];
}
