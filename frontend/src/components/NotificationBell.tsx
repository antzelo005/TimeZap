import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppButton from "./AppButton";
import { useSettings } from "../context/SettingsContext";
import { useTranslation } from "../i18n";
import { getAllLocalReminders } from "../services/notifications";
import { useAppTheme } from "../theme/useAppTheme";
import type { LocalReminderRecord } from "../types/notification";

const NOTIFICATION_READS_KEY = "timezap.notificationReads.v1";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  meta: string;
  read: boolean;
}

async function readNotificationIds(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(NOTIFICATION_READS_KEY).catch(() => null);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

async function writeNotificationIds(ids: string[]): Promise<void> {
  await AsyncStorage.setItem(NOTIFICATION_READS_KEY, JSON.stringify(Array.from(new Set(ids))));
}

function getReminderId(reminder: LocalReminderRecord): string {
  return `${reminder.related_type}:${reminder.related_id}:${reminder.kind ?? "standard"}:${reminder.updated_at}`;
}

type ReminderKindLabelKey =
  | "notifications.centerStandardReminder"
  | "notifications.centerOverdue30"
  | "notifications.centerOverdue15"
  | "notifications.centerOverdue5";

function getReminderKindLabel(
  reminder: LocalReminderRecord,
  t: (key: ReminderKindLabelKey, params?: Record<string, string | number>) => string
): string {
  switch (reminder.kind) {
    case "overdue_30":
      return t("notifications.centerOverdue30");
    case "overdue_15":
      return t("notifications.centerOverdue15");
    case "overdue_5":
      return t("notifications.centerOverdue5");
    default:
      return t("notifications.centerStandardReminder");
  }
}

export default function NotificationBell() {
  const { colors, spacing } = useAppTheme();
  const { settings } = useSettings();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors, spacing), [colors, spacing]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [reminders, setReminders] = useState<LocalReminderRecord[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);

  const loadNotifications = useCallback(async () => {
    const [nextReminders, nextReadIds] = await Promise.all([
      getAllLocalReminders(),
      readNotificationIds()
    ]);
    setReminders(nextReminders);
    setReadIds(nextReadIds);
    return { nextReminders, nextReadIds };
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadNotifications();
    }, [loadNotifications])
  );

  const items = useMemo<NotificationItem[]>(
    () =>
      reminders.map((reminder) => {
        const id = getReminderId(reminder);
        const fallbackTitle =
          reminder.related_type === "task"
            ? t("notifications.taskNotificationTitle")
            : t("notifications.habitNotificationTitle");
        const fallbackMessage =
          reminder.related_type === "task"
            ? t("notifications.centerTaskFallback")
            : t("notifications.centerHabitFallback");
        const deliveryTime = reminder.reminder_date
          ? `${reminder.reminder_date} ${reminder.reminder_time}`
          : reminder.reminder_time;
        const scheduledTime = reminder.scheduled_date
          ? `${reminder.scheduled_date} ${reminder.scheduled_time ?? ""}`.trim()
          : reminder.scheduled_time ?? "";
        const metaParts = [getReminderKindLabel(reminder, t), deliveryTime];
        if (scheduledTime) {
          metaParts.push(t("notifications.centerScheduledFor", { value: scheduledTime }));
        }

        return {
          id,
          title: reminder.title ?? fallbackTitle,
          message: reminder.body ?? fallbackMessage,
          meta: metaParts.join(" / "),
          read: readIds.includes(id)
        };
      }),
    [readIds, reminders, t]
  );
  const hasUnread = items.some((item) => !item.read);

  async function openCenter(): Promise<void> {
    const { nextReminders, nextReadIds: currentReadIds } = await loadNotifications();
    const ids = nextReminders.map(getReminderId);
    const nextReadIds = Array.from(new Set([...currentReadIds, ...ids]));
    setReadIds(nextReadIds);
    await writeNotificationIds(nextReadIds).catch(() => undefined);
    setIsOpen(true);
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("notifications.centerTitle")}
        hitSlop={10}
        onPress={() => void openCenter()}
        style={({ pressed }) => [styles.bellButton, pressed ? styles.pressed : null]}
      >
        <Text style={styles.bellIcon}>{"\u25CF"}</Text>
        {hasUnread ? <View style={styles.unreadDot} /> : null}
      </Pressable>

      <Modal visible={isOpen} animationType="slide" transparent={Platform.OS === "web"}>
        <SafeAreaView style={styles.modalRoot}>
          <View style={styles.panel}>
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>{t("notifications.centerTitle")}</Text>
                <Text style={styles.subtitle}>
                  {settings.notifications_enabled
                    ? t("notifications.centerSubtitle")
                    : t("notifications.centerDisabled")}
                </Text>
              </View>
              <AppButton title={t("common.close")} variant="secondary" onPress={() => setIsOpen(false)} />
            </View>

            <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
              {items.length === 0 ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyTitle}>{t("notifications.centerEmptyTitle")}</Text>
                  <Text style={styles.emptyText}>{t("notifications.centerEmptyMessage")}</Text>
                </View>
              ) : (
                items.map((item) => (
                  <View key={item.id} style={[styles.item, item.read ? styles.itemRead : null]}>
                    <View style={styles.itemHeader}>
                      <Text style={styles.itemTitle}>{item.title}</Text>
                      {!item.read ? <View style={styles.itemUnreadDot} /> : null}
                    </View>
                    <Text style={styles.itemMessage}>{item.message}</Text>
                    <Text style={styles.itemMeta}>{item.meta}</Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>["colors"],
  spacing: ReturnType<typeof useAppTheme>["spacing"]
) {
  return StyleSheet.create({
    bellButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: spacing.sm
    },
    pressed: {
      transform: [{ translateY: 1 }]
    },
    bellIcon: {
      color: colors.primaryBlueDark,
      fontSize: 18,
      fontWeight: "900"
    },
    unreadDot: {
      position: "absolute",
      top: 9,
      right: 9,
      width: 9,
      height: 9,
      borderRadius: 999,
      backgroundColor: colors.danger,
      borderWidth: 1,
      borderColor: colors.surface
    },
    modalRoot: {
      flex: 1,
      justifyContent: Platform.OS === "web" ? "center" : "flex-end",
      backgroundColor: Platform.OS === "web" ? "rgba(15, 23, 42, 0.45)" : colors.appBackground
    },
    panel: {
      width: "100%",
      maxWidth: Platform.OS === "web" ? 560 : undefined,
      alignSelf: "center",
      maxHeight: Platform.OS === "web" ? "88%" : "100%",
      backgroundColor: colors.surface,
      borderRadius: Platform.OS === "web" ? 8 : 0,
      padding: spacing.lg,
      gap: spacing.md
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: spacing.md
    },
    title: {
      color: colors.textPrimary,
      fontSize: 20,
      fontWeight: "800"
    },
    subtitle: {
      marginTop: spacing.xs,
      color: colors.textSecondary,
      fontSize: 13,
      lineHeight: 18
    },
    list: {
      gap: spacing.sm,
      paddingBottom: spacing.xl
    },
    item: {
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
      padding: spacing.md,
      gap: spacing.xs
    },
    itemRead: {
      opacity: 0.78
    },
    itemHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm
    },
    itemTitle: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: 15,
      fontWeight: "800"
    },
    itemUnreadDot: {
      width: 8,
      height: 8,
      borderRadius: 999,
      backgroundColor: colors.danger
    },
    itemMessage: {
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 20
    },
    itemMeta: {
      color: colors.primaryBlueDark,
      fontSize: 12,
      fontWeight: "800"
    },
    empty: {
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
      padding: spacing.lg,
      gap: spacing.xs
    },
    emptyTitle: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: "800"
    },
    emptyText: {
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 20
    }
  });
}
