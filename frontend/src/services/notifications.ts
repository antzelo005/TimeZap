import AsyncStorage from "@react-native-async-storage/async-storage";
import { getPermissionsAsync, requestPermissionsAsync } from "expo-notifications/build/NotificationPermissions";
import { setNotificationHandler } from "expo-notifications/build/NotificationsHandler";
import { SchedulableTriggerInputTypes } from "expo-notifications/build/Notifications.types";
import { cancelScheduledNotificationAsync } from "expo-notifications/build/cancelScheduledNotificationAsync";
import { scheduleNotificationAsync } from "expo-notifications/build/scheduleNotificationAsync";
import { Platform } from "react-native";
import type {
  LocalReminderRecord,
  NotificationActionResult,
  NotificationAvailability,
  NotificationPermissionResult,
  ReminderRelatedType,
  ScheduleReminderResult
} from "../types/notification";

const REMINDER_STORAGE_KEY = "timezap.localReminders.v1";

type ReminderStorage = Record<string, LocalReminderRecord>;

if (Platform.OS !== "web") {
  setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false
    })
  });
}

function getReminderKey(relatedType: ReminderRelatedType, relatedId: string): string {
  return `${relatedType}:${relatedId}`;
}

async function readReminderStorage(): Promise<ReminderStorage> {
  const raw = await AsyncStorage.getItem(REMINDER_STORAGE_KEY).catch(() => null);

  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as ReminderStorage;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function writeReminderStorage(storage: ReminderStorage): Promise<void> {
  await AsyncStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(storage));
}

function isNativeNotificationsAvailable(): boolean {
  return (
    typeof scheduleNotificationAsync === "function" &&
    typeof cancelScheduledNotificationAsync === "function"
  );
}

export function checkNotificationAvailability(): NotificationAvailability {
  if (Platform.OS === "web") {
    return { available: false, reason: "web_unsupported" };
  }

  if (!isNativeNotificationsAvailable()) {
    return { available: false, reason: "native_unavailable" };
  }

  return { available: true, reason: "available" };
}

export async function requestNotificationPermission(): Promise<NotificationPermissionResult> {
  const availability = checkNotificationAvailability();

  if (!availability.available) {
    return { granted: false, status: availability.reason };
  }

  const existing = await getPermissionsAsync().catch(() => null);
  if (!existing) {
    return { granted: false, status: "native_unavailable" };
  }

  if (existing.granted) {
    return { granted: true, status: existing.status };
  }

  const requested = await requestPermissionsAsync().catch(() => null);
  if (!requested) {
    return { granted: false, status: "native_unavailable" };
  }

  return { granted: requested.granted, status: requested.status };
}

export async function getLocalReminder(
  relatedType: ReminderRelatedType,
  relatedId: string
): Promise<LocalReminderRecord | null> {
  const storage = await readReminderStorage();
  return storage[getReminderKey(relatedType, relatedId)] ?? null;
}

export async function getLocalRemindersByType(
  relatedType: ReminderRelatedType
): Promise<Record<string, LocalReminderRecord>> {
  const storage = await readReminderStorage();

  return Object.fromEntries(
    Object.values(storage)
      .filter((reminder) => reminder.related_type === relatedType)
      .map((reminder) => [reminder.related_id, reminder])
  );
}

export async function cancelLocalNotification(
  relatedType: ReminderRelatedType,
  relatedId: string
): Promise<NotificationActionResult> {
  const storage = await readReminderStorage();
  const key = getReminderKey(relatedType, relatedId);
  const existing = storage[key];

  if (existing && checkNotificationAvailability().available) {
    try {
      await cancelScheduledNotificationAsync(existing.notification_id);
    } catch {
      // Local storage cleanup should still continue if the native notification
      // module is unavailable in Expo Go or the scheduled notification is gone.
    }
  }

  delete storage[key];
  try {
    await writeReminderStorage(storage);
  } catch {
    return { ok: false, reason: "storage_unavailable" };
  }

  return { ok: true };
}

export async function cancelLocalNotifications(
  reminders: Array<{ related_type: ReminderRelatedType; related_id: string }>
): Promise<NotificationActionResult> {
  const results = await Promise.all(
    reminders.map((reminder) =>
      cancelLocalNotification(reminder.related_type, reminder.related_id)
    )
  );

  return results.every((result) => result.ok)
    ? { ok: true }
    : { ok: false, reason: "storage_unavailable" };
}

export async function cancelAllLocalReminders(): Promise<NotificationActionResult> {
  const storage = await readReminderStorage();
  const reminders = Object.values(storage);

  if (checkNotificationAvailability().available) {
    await Promise.all(
      reminders.map(async (reminder) =>
        cancelScheduledNotificationAsync(reminder.notification_id).catch(() => undefined)
      )
    );
  }

  try {
    await writeReminderStorage({});
  } catch {
    return { ok: false, reason: "storage_unavailable" };
  }

  return { ok: true };
}

export async function scheduleTaskReminder({
  taskId,
  title,
  body,
  scheduledFor,
  reminderDate,
  reminderTime
}: {
  taskId: string;
  title: string;
  body: string;
  scheduledFor: Date;
  reminderDate: string;
  reminderTime: string;
}): Promise<ScheduleReminderResult> {
  if (!checkNotificationAvailability().available) {
    return { ok: false, reason: "unsupported" };
  }

  if (Number.isNaN(scheduledFor.getTime())) {
    return { ok: false, reason: "invalid_date" };
  }

  if (scheduledFor.getTime() <= Date.now()) {
    await cancelLocalNotification("task", taskId);
    return { ok: false, reason: "past_date" };
  }

  const permission = await requestNotificationPermission();
  if (!permission.granted) {
    return { ok: false, reason: "permission_denied" };
  }

  await cancelLocalNotification("task", taskId);

  let notificationId: string;
  try {
    notificationId = await scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: "default",
        data: {
          related_type: "task",
          related_id: taskId
        }
      },
      trigger: {
        type: SchedulableTriggerInputTypes.DATE,
        date: scheduledFor
      }
    });
  } catch {
    return { ok: false, reason: "unsupported" };
  }

  const reminder: LocalReminderRecord = {
    related_type: "task",
    related_id: taskId,
    notification_id: notificationId,
    scheduled_for: scheduledFor.toISOString(),
    reminder_date: reminderDate,
    reminder_time: reminderTime,
    repeat: "once",
    updated_at: new Date().toISOString()
  };
  const storage = await readReminderStorage();
  storage[getReminderKey("task", taskId)] = reminder;
  try {
    await writeReminderStorage(storage);
  } catch {
    await cancelScheduledNotificationAsync(notificationId).catch(() => undefined);
    return { ok: false, reason: "storage_unavailable" };
  }

  return { ok: true, id: notificationId, reminder };
}

export async function scheduleHabitReminder({
  habitId,
  title,
  body,
  reminderTime,
  hour,
  minute
}: {
  habitId: string;
  title: string;
  body: string;
  reminderTime: string;
  hour: number;
  minute: number;
}): Promise<ScheduleReminderResult> {
  if (!checkNotificationAvailability().available) {
    return { ok: false, reason: "unsupported" };
  }

  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    return { ok: false, reason: "invalid_date" };
  }

  const permission = await requestNotificationPermission();
  if (!permission.granted) {
    return { ok: false, reason: "permission_denied" };
  }

  await cancelLocalNotification("habit", habitId);

  let notificationId: string;
  try {
    notificationId = await scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: "default",
        data: {
          related_type: "habit",
          related_id: habitId
        }
      },
      trigger: {
        type: SchedulableTriggerInputTypes.DAILY,
        hour,
        minute
      }
    });
  } catch {
    return { ok: false, reason: "unsupported" };
  }

  const reminder: LocalReminderRecord = {
    related_type: "habit",
    related_id: habitId,
    notification_id: notificationId,
    scheduled_for: null,
    reminder_date: null,
    reminder_time: reminderTime,
    repeat: "daily",
    updated_at: new Date().toISOString()
  };
  const storage = await readReminderStorage();
  storage[getReminderKey("habit", habitId)] = reminder;
  try {
    await writeReminderStorage(storage);
  } catch {
    await cancelScheduledNotificationAsync(notificationId).catch(() => undefined);
    return { ok: false, reason: "storage_unavailable" };
  }

  return { ok: true, id: notificationId, reminder };
}
