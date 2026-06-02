export type ReminderRelatedType = "task" | "habit";

export type ReminderRepeatMode = "once" | "daily";

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
  notification_id: string;
  scheduled_for: string | null;
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
  reminder?: LocalReminderRecord;
}
