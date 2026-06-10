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
  NotificationFailureReason,
  NotificationPermissionResult,
  ReminderKind,
  ReminderRelatedType,
  ScheduleReminderResult
} from "../types/notification";

const REMINDER_STORAGE_KEY = "timezap.localReminders.v1";
const GRACE_PERIOD_MINUTES = 60;
const STANDARD_REMINDER_LEAD_MINUTES = 30;
const OVERDUE_WARNING_LEAD_MINUTES = [30, 15, 5] as const;

type ReminderStorage = Record<string, LocalReminderRecord>;
type OverdueWarningLeadMinutes = (typeof OVERDUE_WARNING_LEAD_MINUTES)[number];

type OverdueWarningBodies = {
  30: string;
  15: string;
  5: string;
};

interface ReminderScheduleRequestBase {
  kind: ReminderKind;
  title: string;
  body: string;
  reminderDate: string | null;
  reminderTime: string;
  scheduledDate: string | null;
  scheduledTime: string | null;
  graceDeadline: string | null;
}

interface OneTimeReminderScheduleRequest extends ReminderScheduleRequestBase {
  repeat: "once";
  fireAt: Date;
}

interface DailyReminderScheduleRequest extends ReminderScheduleRequestBase {
  repeat: "daily";
  hour: number;
  minute: number;
}

type ReminderScheduleRequest = OneTimeReminderScheduleRequest | DailyReminderScheduleRequest;

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

function getReminderKey(
  relatedType: ReminderRelatedType,
  relatedId: string,
  kind: ReminderKind = "standard"
): string {
  return `${relatedType}:${relatedId}:${kind}`;
}

function isReminderKind(value: unknown): value is ReminderKind {
  return value === "standard" || value === "overdue_30" || value === "overdue_15" || value === "overdue_5";
}

function normalizeReminderRecord(value: unknown): LocalReminderRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const item = value as Partial<LocalReminderRecord>;

  if (item.related_type !== "task" && item.related_type !== "habit") {
    return null;
  }

  if (typeof item.related_id !== "string" || !item.related_id) {
    return null;
  }

  return {
    related_type: item.related_type,
    related_id: item.related_id,
    kind: isReminderKind(item.kind) ? item.kind : "standard",
    notification_id: typeof item.notification_id === "string" ? item.notification_id : null,
    title: typeof item.title === "string" ? item.title : undefined,
    body: typeof item.body === "string" ? item.body : undefined,
    scheduled_for: typeof item.scheduled_for === "string" ? item.scheduled_for : null,
    scheduled_date: typeof item.scheduled_date === "string" ? item.scheduled_date : null,
    scheduled_time: typeof item.scheduled_time === "string" ? item.scheduled_time : null,
    grace_deadline: typeof item.grace_deadline === "string" ? item.grace_deadline : null,
    reminder_date: typeof item.reminder_date === "string" ? item.reminder_date : null,
    reminder_time: typeof item.reminder_time === "string" ? item.reminder_time : "",
    repeat: item.repeat === "daily" ? "daily" : "once",
    updated_at: typeof item.updated_at === "string" ? item.updated_at : new Date().toISOString()
  };
}

async function readReminderStorage(): Promise<ReminderStorage> {
  const raw = await AsyncStorage.getItem(REMINDER_STORAGE_KEY).catch(() => null);

  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    const storage: ReminderStorage = {};
    for (const value of Object.values(parsed as Record<string, unknown>)) {
      const reminder = normalizeReminderRecord(value);
      if (reminder) {
        storage[getReminderKey(reminder.related_type, reminder.related_id, reminder.kind)] = reminder;
      }
    }

    return storage;
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

function isReminderFor(
  reminder: LocalReminderRecord,
  relatedType: ReminderRelatedType,
  relatedId: string
): boolean {
  return reminder.related_type === relatedType && reminder.related_id === relatedId;
}

function getReminderSortValue(reminder: LocalReminderRecord): string {
  if (reminder.scheduled_for) {
    return reminder.scheduled_for;
  }

  if (reminder.reminder_date) {
    return `${reminder.reminder_date}T${reminder.reminder_time}`;
  }

  return reminder.reminder_time || reminder.updated_at;
}

function sortReminders(reminders: LocalReminderRecord[]): LocalReminderRecord[] {
  return [...reminders].sort((first, second) => {
    const valueCompare = getReminderSortValue(first).localeCompare(getReminderSortValue(second));
    if (valueCompare !== 0) {
      return valueCompare;
    }

    return (first.kind ?? "standard").localeCompare(second.kind ?? "standard");
  });
}

function padTimePart(value: number): string {
  return String(value).padStart(2, "0");
}

function formatDatePart(date: Date): string {
  return `${date.getFullYear()}-${padTimePart(date.getMonth() + 1)}-${padTimePart(date.getDate())}`;
}

function formatTimePart(date: Date): string {
  return `${padTimePart(date.getHours())}:${padTimePart(date.getMinutes())}`;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function normalizeDailyTime(hour: number, minute: number, offsetMinutes: number): { hour: number; minute: number; value: string } {
  const total = ((hour * 60 + minute + offsetMinutes) % 1440 + 1440) % 1440;
  const nextHour = Math.floor(total / 60);
  const nextMinute = total % 60;

  return {
    hour: nextHour,
    minute: nextMinute,
    value: `${padTimePart(nextHour)}:${padTimePart(nextMinute)}`
  };
}

function getGraceWarningKind(minutesBeforeDeadline: OverdueWarningLeadMinutes): ReminderKind {
  return `overdue_${minutesBeforeDeadline}` as ReminderKind;
}

function createTaskReminderRequests({
  scheduledFor,
  standardTitle,
  standardBody,
  overdueWarningTitle,
  overdueWarningBodies,
  includeGraceWarnings = true,
  standardLeadMinutes = STANDARD_REMINDER_LEAD_MINUTES
}: {
  scheduledFor: Date;
  standardTitle: string;
  standardBody: string;
  overdueWarningTitle: string;
  overdueWarningBodies: OverdueWarningBodies;
  includeGraceWarnings?: boolean;
  standardLeadMinutes?: number;
}): ReminderScheduleRequest[] {
  const now = Date.now();
  const scheduledDate = formatDatePart(scheduledFor);
  const scheduledTime = formatTimePart(scheduledFor);
  const graceDeadlineDate = addMinutes(scheduledFor, GRACE_PERIOD_MINUTES);
  const graceDeadline = graceDeadlineDate.toISOString();
  const candidates: Array<{ kind: ReminderKind; title: string; body: string; fireAt: Date }> = [
    {
      kind: "standard",
      title: standardTitle,
      body: standardBody,
      fireAt: addMinutes(scheduledFor, -standardLeadMinutes)
    }
  ];

  if (includeGraceWarnings) {
    for (const leadMinutes of OVERDUE_WARNING_LEAD_MINUTES) {
      candidates.push({
        kind: getGraceWarningKind(leadMinutes),
        title: overdueWarningTitle,
        body: overdueWarningBodies[leadMinutes],
        fireAt: addMinutes(graceDeadlineDate, -leadMinutes)
      });
    }
  }

  return candidates
    .filter((candidate) => candidate.fireAt.getTime() > now)
    .map((candidate) => ({
      kind: candidate.kind,
      title: candidate.title,
      body: candidate.body,
      repeat: "once",
      fireAt: candidate.fireAt,
      reminderDate: formatDatePart(candidate.fireAt),
      reminderTime: formatTimePart(candidate.fireAt),
      scheduledDate,
      scheduledTime,
      graceDeadline: includeGraceWarnings ? graceDeadline : null
    }));
}

function createHabitReminderRequests({
  hour,
  minute,
  reminderTime,
  standardTitle,
  standardBody,
  overdueWarningTitle,
  overdueWarningBodies
}: {
  hour: number;
  minute: number;
  reminderTime: string;
  standardTitle: string;
  standardBody: string;
  overdueWarningTitle: string;
  overdueWarningBodies: OverdueWarningBodies;
}): ReminderScheduleRequest[] {
  const scheduledTime = reminderTime;
  const graceDeadline = normalizeDailyTime(hour, minute, GRACE_PERIOD_MINUTES).value;
  const standardTime = normalizeDailyTime(hour, minute, -STANDARD_REMINDER_LEAD_MINUTES);
  const requests: ReminderScheduleRequest[] = [
    {
      kind: "standard",
      title: standardTitle,
      body: standardBody,
      repeat: "daily",
      hour: standardTime.hour,
      minute: standardTime.minute,
      reminderDate: null,
      reminderTime: standardTime.value,
      scheduledDate: null,
      scheduledTime,
      graceDeadline
    }
  ];

  for (const leadMinutes of OVERDUE_WARNING_LEAD_MINUTES) {
    const warningTime = normalizeDailyTime(hour, minute, GRACE_PERIOD_MINUTES - leadMinutes);
    requests.push({
      kind: getGraceWarningKind(leadMinutes),
      title: overdueWarningTitle,
      body: overdueWarningBodies[leadMinutes],
      repeat: "daily",
      hour: warningTime.hour,
      minute: warningTime.minute,
      reminderDate: null,
      reminderTime: warningTime.value,
      scheduledDate: null,
      scheduledTime,
      graceDeadline
    });
  }

  return requests;
}

async function scheduleReminderSet(
  relatedType: ReminderRelatedType,
  relatedId: string,
  requests: ReminderScheduleRequest[],
  deviceNotificationsEnabled: boolean
): Promise<ScheduleReminderResult> {
  await cancelLocalNotification(relatedType, relatedId);

  if (requests.length === 0) {
    return { ok: false, reason: "past_date", ids: [], reminders: [] };
  }

  const availability = checkNotificationAvailability();
  let deviceFailureReason: NotificationFailureReason | undefined;
  let canUseDeviceNotifications = false;

  if (deviceNotificationsEnabled) {
    if (availability.available) {
      const permission = await requestNotificationPermission();
      if (permission.granted) {
        canUseDeviceNotifications = true;
      } else {
        deviceFailureReason = "permission_denied";
      }
    } else {
      deviceFailureReason = "unsupported";
    }
  }

  const updatedAt = new Date().toISOString();
  const scheduledDeviceIds: string[] = [];
  const reminders: LocalReminderRecord[] = [];

  for (const request of requests) {
    let notificationId: string | null = null;

    if (canUseDeviceNotifications) {
      try {
        notificationId = await scheduleNotificationAsync({
          content: {
            title: request.title,
            body: request.body,
            sound: "default",
            data: {
              related_type: relatedType,
              related_id: relatedId,
              reminder_kind: request.kind
            }
          },
          trigger:
            request.repeat === "once"
              ? {
                  type: SchedulableTriggerInputTypes.DATE,
                  date: request.fireAt
                }
              : {
                  type: SchedulableTriggerInputTypes.DAILY,
                  hour: request.hour,
                  minute: request.minute
                }
        });
        scheduledDeviceIds.push(notificationId);
      } catch {
        canUseDeviceNotifications = false;
        deviceFailureReason = "unsupported";
      }
    }

    reminders.push({
      related_type: relatedType,
      related_id: relatedId,
      kind: request.kind,
      notification_id: notificationId,
      title: request.title,
      body: request.body,
      scheduled_for: request.repeat === "once" ? request.fireAt.toISOString() : null,
      scheduled_date: request.scheduledDate,
      scheduled_time: request.scheduledTime,
      grace_deadline: request.graceDeadline,
      reminder_date: request.reminderDate,
      reminder_time: request.reminderTime,
      repeat: request.repeat,
      updated_at: updatedAt
    });
  }

  const storage = await readReminderStorage();
  for (const reminder of reminders) {
    storage[getReminderKey(relatedType, relatedId, reminder.kind)] = reminder;
  }

  try {
    await writeReminderStorage(storage);
  } catch {
    await Promise.all(scheduledDeviceIds.map((id) => cancelScheduledNotificationAsync(id).catch(() => undefined)));
    return { ok: false, reason: "storage_unavailable", ids: [], reminders: [] };
  }

  const firstReminder = sortReminders(reminders)[0];

  return {
    ok: !deviceFailureReason,
    reason: deviceFailureReason,
    id: scheduledDeviceIds[0],
    ids: scheduledDeviceIds,
    reminder: firstReminder,
    reminders
  };
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
  const reminders = sortReminders(Object.values(storage).filter((reminder) => isReminderFor(reminder, relatedType, relatedId)));
  return reminders[0] ?? null;
}

export async function getAllLocalReminders(): Promise<LocalReminderRecord[]> {
  const storage = await readReminderStorage();
  return sortReminders(Object.values(storage));
}

export async function getLocalRemindersByType(
  relatedType: ReminderRelatedType
): Promise<Record<string, LocalReminderRecord>> {
  const storage = await readReminderStorage();
  const reminders = sortReminders(Object.values(storage).filter((reminder) => reminder.related_type === relatedType));
  const byRelatedId: Record<string, LocalReminderRecord> = {};

  for (const reminder of reminders) {
    if (!byRelatedId[reminder.related_id]) {
      byRelatedId[reminder.related_id] = reminder;
    }
  }

  return byRelatedId;
}

export async function cancelLocalNotification(
  relatedType: ReminderRelatedType,
  relatedId: string
): Promise<NotificationActionResult> {
  const storage = await readReminderStorage();
  const existingReminders = Object.values(storage).filter((reminder) => isReminderFor(reminder, relatedType, relatedId));

  if (checkNotificationAvailability().available) {
    await Promise.all(
      existingReminders.map((reminder) =>
        reminder.notification_id
          ? cancelScheduledNotificationAsync(reminder.notification_id).catch(() => undefined)
          : Promise.resolve(undefined)
      )
    );
  }

  for (const key of Object.keys(storage)) {
    if (isReminderFor(storage[key], relatedType, relatedId)) {
      delete storage[key];
    }
  }

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
      reminders.map((reminder) =>
        reminder.notification_id
          ? cancelScheduledNotificationAsync(reminder.notification_id).catch(() => undefined)
          : Promise.resolve(undefined)
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
  overdueWarningTitle,
  overdueWarningBodies,
  includeGraceWarnings = true,
  standardLeadMinutes = STANDARD_REMINDER_LEAD_MINUTES,
  deviceNotificationsEnabled = true
}: {
  taskId: string;
  title: string;
  body: string;
  scheduledFor: Date;
  reminderDate?: string;
  reminderTime?: string;
  overdueWarningTitle: string;
  overdueWarningBodies: OverdueWarningBodies;
  includeGraceWarnings?: boolean;
  standardLeadMinutes?: number;
  deviceNotificationsEnabled?: boolean;
}): Promise<ScheduleReminderResult> {
  if (Number.isNaN(scheduledFor.getTime())) {
    return { ok: false, reason: "invalid_date" };
  }

  const requests = createTaskReminderRequests({
    scheduledFor,
    standardTitle: title,
    standardBody: body,
    overdueWarningTitle,
    overdueWarningBodies,
    includeGraceWarnings,
    standardLeadMinutes
  });

  return scheduleReminderSet("task", taskId, requests, deviceNotificationsEnabled);
}

export async function scheduleHabitReminder({
  habitId,
  title,
  body,
  reminderTime,
  hour,
  minute,
  overdueWarningTitle,
  overdueWarningBodies,
  deviceNotificationsEnabled = true
}: {
  habitId: string;
  title: string;
  body: string;
  reminderTime: string;
  hour: number;
  minute: number;
  overdueWarningTitle: string;
  overdueWarningBodies: OverdueWarningBodies;
  deviceNotificationsEnabled?: boolean;
}): Promise<ScheduleReminderResult> {
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    return { ok: false, reason: "invalid_date" };
  }

  const requests = createHabitReminderRequests({
    hour,
    minute,
    reminderTime,
    standardTitle: title,
    standardBody: body,
    overdueWarningTitle,
    overdueWarningBodies
  });

  return scheduleReminderSet("habit", habitId, requests, deviceNotificationsEnabled);
}
