import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { getNotifications } from "../api/notifications.api";
import type { NativeNotificationActionResult, NotificationItem } from "../types/notification";

const NATIVE_NOTIFICATION_KEY_PREFIX = "timezap.nativeNotificationIds.v1";
const ANDROID_CHANNEL_ID = "timezap-reminders";

type NativeNotificationIdMap = Record<string, string>;
type ExpoNotificationsModule = {
  AndroidImportance?: {
    DEFAULT?: unknown;
  };
  SchedulableTriggerInputTypes?: {
    DATE?: unknown;
  };
  setNotificationHandler?: (handler: {
    handleNotification: () => Promise<{
      shouldShowBanner: boolean;
      shouldShowList: boolean;
      shouldPlaySound: boolean;
      shouldSetBadge: boolean;
    }>;
  }) => void;
  getPermissionsAsync?: () => Promise<{ granted: boolean; status: string }>;
  requestPermissionsAsync?: () => Promise<{ granted: boolean; status: string }>;
  setNotificationChannelAsync?: (
    channelId: string,
    channel: { name: string; importance: unknown }
  ) => Promise<unknown>;
  scheduleNotificationAsync?: (request: {
    content: {
      title: string;
      body: string;
      sound: "default";
      data: Record<string, unknown>;
    };
    trigger: {
      type: unknown;
      date: Date;
    };
  }) => Promise<string>;
  cancelScheduledNotificationAsync?: (identifier: string) => Promise<void>;
};

declare const require: (moduleName: string) => unknown;

export interface NotificationAvailability {
  available: boolean;
  reason: "available" | "web_unsupported" | "native_unavailable";
}

let cachedExpoNotifications: ExpoNotificationsModule | null | undefined;
let didConfigureNotificationHandler = false;

function isAndroidExpoGo(): boolean {
  return Platform.OS === "android" && Constants.appOwnership === "expo";
}

function getExpoNotifications(): ExpoNotificationsModule | null {
  if (Platform.OS === "web" || isAndroidExpoGo()) {
    return null;
  }

  if (cachedExpoNotifications !== undefined) {
    return cachedExpoNotifications;
  }

  try {
    cachedExpoNotifications = require("expo-notifications") as ExpoNotificationsModule;
  } catch {
    cachedExpoNotifications = null;
  }

  return cachedExpoNotifications;
}

function configureNotificationHandler(): void {
  if (didConfigureNotificationHandler) {
    return;
  }

  const notifications = getExpoNotifications();
  if (!notifications?.setNotificationHandler) {
    return;
  }

  notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false
    })
  });

  didConfigureNotificationHandler = true;
}

function getNativeNotificationStorageKey(userId: string): string {
  return `${NATIVE_NOTIFICATION_KEY_PREFIX}:${userId}`;
}

async function readNativeNotificationIds(userId: string): Promise<NativeNotificationIdMap> {
  const raw = await AsyncStorage.getItem(getNativeNotificationStorageKey(userId)).catch(() => null);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    const ids: NativeNotificationIdMap = {};
    for (const [backendId, nativeId] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof backendId === "string" && typeof nativeId === "string") {
        ids[backendId] = nativeId;
      }
    }

    return ids;
  } catch {
    return {};
  }
}

async function writeNativeNotificationIds(userId: string, ids: NativeNotificationIdMap): Promise<void> {
  await AsyncStorage.setItem(getNativeNotificationStorageKey(userId), JSON.stringify(ids));
}

function getScheduledDate(notification: NotificationItem): Date | null {
  const date = new Date(notification.scheduled_for);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isFutureScheduledNotification(notification: NotificationItem): boolean {
  const scheduledDate = getScheduledDate(notification);

  return (
    notification.status === "scheduled" &&
    Boolean(scheduledDate) &&
    scheduledDate!.getTime() > Date.now()
  );
}

export function checkNotificationAvailability(): NotificationAvailability {
  if (Platform.OS === "web") {
    return { available: false, reason: "web_unsupported" };
  }

  if (isAndroidExpoGo()) {
    return { available: false, reason: "native_unavailable" };
  }

  const notifications = getExpoNotifications();
  if (
    typeof notifications?.scheduleNotificationAsync !== "function" ||
    typeof notifications.cancelScheduledNotificationAsync !== "function"
  ) {
    return { available: false, reason: "native_unavailable" };
  }

  return { available: true, reason: "available" };
}

async function requestNotificationPermission(): Promise<NativeNotificationActionResult> {
  const availability = checkNotificationAvailability();

  if (!availability.available) {
    return { ok: false, reason: availability.reason };
  }

  const notifications = getExpoNotifications();
  if (!notifications?.getPermissionsAsync || !notifications.requestPermissionsAsync) {
    return { ok: false, reason: "native_unavailable" };
  }

  const existing = await notifications.getPermissionsAsync().catch(() => null);
  if (!existing) {
    return { ok: false, reason: "native_unavailable" };
  }

  if (existing.granted) {
    return { ok: true };
  }

  const requested = await notifications.requestPermissionsAsync().catch(() => null);
  if (!requested) {
    return { ok: false, reason: "native_unavailable" };
  }

  return requested.granted ? { ok: true } : { ok: false, reason: "permission_denied" };
}

async function ensureAndroidNotificationChannel(): Promise<void> {
  const notifications = getExpoNotifications();
  if (Platform.OS !== "android" || typeof notifications?.setNotificationChannelAsync !== "function") {
    return;
  }

  await notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: "TimeZap reminders",
    importance: notifications.AndroidImportance?.DEFAULT ?? "default"
  }).catch(() => undefined);
}

async function cancelNativeIds(nativeIds: string[]): Promise<void> {
  if (!checkNotificationAvailability().available) {
    return;
  }

  const notifications = getExpoNotifications();
  if (!notifications?.cancelScheduledNotificationAsync) {
    return;
  }

  await Promise.all(
    nativeIds.map((nativeId) =>
      notifications.cancelScheduledNotificationAsync!(nativeId).catch(() => undefined)
    )
  );
}

export async function cancelAllNativeNotifications(userId: string): Promise<NativeNotificationActionResult> {
  const storedIds = await readNativeNotificationIds(userId);
  await cancelNativeIds(Object.values(storedIds));
  await writeNativeNotificationIds(userId, {});
  return { ok: true };
}

export async function syncNotificationSchedules(
  userId: string,
  notifications?: NotificationItem[],
  deviceNotificationsEnabled = true
): Promise<NativeNotificationActionResult> {
  if (!userId) {
    return { ok: false, reason: "missing_user" };
  }

  const backendNotifications = notifications ?? (await getNotifications({ status: "scheduled" })).items;
  const futureNotifications = backendNotifications.filter(isFutureScheduledNotification);
  const futureBackendIds = new Set(futureNotifications.map((notification) => notification.notification_id));
  const storedIds = await readNativeNotificationIds(userId);
  const nextStoredIds: NativeNotificationIdMap = { ...storedIds };
  const staleNativeIds: string[] = [];

  for (const [backendId, nativeId] of Object.entries(storedIds)) {
    if (!futureBackendIds.has(backendId)) {
      staleNativeIds.push(nativeId);
      delete nextStoredIds[backendId];
    }
  }

  if (!deviceNotificationsEnabled) {
    await cancelNativeIds([...staleNativeIds, ...Object.values(nextStoredIds)]);
    await writeNativeNotificationIds(userId, {});
    return { ok: true, ids: [] };
  }

  const availability = checkNotificationAvailability();
  if (!availability.available) {
    await writeNativeNotificationIds(userId, nextStoredIds);
    return Platform.OS === "web"
      ? { ok: true, ids: Object.values(nextStoredIds) }
      : { ok: false, reason: availability.reason };
  }

  await cancelNativeIds(staleNativeIds);

  const permission = await requestNotificationPermission();
  if (!permission.ok) {
    await writeNativeNotificationIds(userId, nextStoredIds);
    return permission;
  }

  configureNotificationHandler();
  await ensureAndroidNotificationChannel();

  const expoNotifications = getExpoNotifications();
  if (!expoNotifications?.scheduleNotificationAsync) {
    await writeNativeNotificationIds(userId, nextStoredIds);
    return { ok: false, reason: "native_unavailable" };
  }

  const scheduledIds: string[] = [];
  let failedReason: string | undefined;

  for (const notification of futureNotifications) {
    if (nextStoredIds[notification.notification_id]) {
      scheduledIds.push(nextStoredIds[notification.notification_id]);
      continue;
    }

    const scheduledDate = getScheduledDate(notification);
    if (!scheduledDate) {
      continue;
    }

    try {
      const nativeId = await expoNotifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          sound: "default",
          data: {
            backend_notification_id: notification.notification_id,
            related_type: notification.related_type,
            related_id: notification.related_id,
            kind: notification.kind
          }
        },
        trigger: {
          type: expoNotifications.SchedulableTriggerInputTypes?.DATE ?? "date",
          date: scheduledDate
        }
      });

      nextStoredIds[notification.notification_id] = nativeId;
      scheduledIds.push(nativeId);
    } catch {
      failedReason = "native_schedule_failed";
    }
  }

  await writeNativeNotificationIds(userId, nextStoredIds);

  return failedReason
    ? { ok: false, reason: failedReason, ids: scheduledIds }
    : { ok: true, ids: scheduledIds };
}
