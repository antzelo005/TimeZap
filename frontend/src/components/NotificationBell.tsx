import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "../api/notifications.api";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { useTranslation } from "../i18n";
import { notifyNotificationsChanged, subscribeNotificationsChanged } from "../services/appEvents";
import { syncNotificationSchedules } from "../services/notifications";
import { useAppTheme } from "../theme/useAppTheme";
import { getErrorMessage } from "../types/api";
import type { NotificationItem, NotificationKind } from "../types/notification";
import AppButton from "./AppButton";
import TimeZapIcon from "./icons/TimeZapIcon";

interface NotificationCenterItem {
  id: string;
  title: string;
  message: string;
  meta: string;
  read: boolean;
  status: string;
}

type ReminderKindLabelKey =
  | "notifications.centerStandardReminder"
  | "notifications.centerOverdue30"
  | "notifications.centerOverdue15"
  | "notifications.centerOverdue5"
  | "notifications.centerSystem";

function getKindLabel(
  kind: NotificationKind,
  t: (key: ReminderKindLabelKey, params?: Record<string, string | number>) => string
): string {
  switch (kind) {
    case "overdue_30":
      return t("notifications.centerOverdue30");
    case "overdue_15":
      return t("notifications.centerOverdue15");
    case "overdue_5":
      return t("notifications.centerOverdue5");
    case "system":
      return t("notifications.centerSystem");
    default:
      return t("notifications.centerStandardReminder");
  }
}

function formatScheduledFor(value: string): string {
  const normalized = value.replace("T", " ");
  return normalized.length >= 16 ? normalized.slice(0, 16) : normalized;
}

function getScheduledTime(notification: NotificationItem): number {
  return new Date(notification.scheduled_for).getTime();
}

function isDueUnread(notification: NotificationItem): boolean {
  const scheduledAt = getScheduledTime(notification);

  return (
    notification.status === "scheduled" &&
    !notification.read_at &&
    !Number.isNaN(scheduledAt) &&
    scheduledAt <= Date.now()
  );
}

function isHistoryNotification(notification: NotificationItem): boolean {
  const scheduledAt = getScheduledTime(notification);

  return (
    notification.status === "cancelled" ||
    Boolean(notification.read_at) ||
    (!Number.isNaN(scheduledAt) && scheduledAt <= Date.now())
  );
}

function sortByScheduledAsc(first: NotificationItem, second: NotificationItem): number {
  return getScheduledTime(first) - getScheduledTime(second);
}

function sortByScheduledDesc(first: NotificationItem, second: NotificationItem): number {
  return getScheduledTime(second) - getScheduledTime(first);
}

export default function NotificationBell() {
  const { colors, spacing } = useAppTheme();
  const { user } = useAuth();
  const { settings } = useSettings();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors, spacing), [colors, spacing]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [error, setError] = useState<string>("");
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => Platform.OS === "android",
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Platform.OS === "android" &&
          Math.abs(gestureState.dy) > 12 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onPanResponderRelease: (_, gestureState) => {
          if (Platform.OS !== "android") {
            return;
          }

          if (gestureState.dy < -35 || gestureState.vy < -0.45) {
            setIsExpanded(true);
          }

          if (gestureState.dy > 45 || gestureState.vy > 0.45) {
            setIsExpanded(false);
            setIsOpen(false);
          }
        }
      }),
    []
  );

  const loadNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      return [];
    }

    try {
      setError("");
      const response = await getNotifications();
      setNotifications(response.items || []);
      return response.items || [];
    } catch (err: unknown) {
      setError(getErrorMessage(err));
      return [];
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void loadNotifications();
    }, [loadNotifications])
  );

  useEffect(() => subscribeNotificationsChanged(() => void loadNotifications()), [loadNotifications]);

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      void loadNotifications();
    }, 30000);

    return () => clearInterval(intervalId);
  }, [loadNotifications, user]);

  const dueUnreadNotifications = useMemo(
    () => notifications.filter(isDueUnread).sort(sortByScheduledAsc),
    [notifications]
  );
  const historyNotifications = useMemo(
    () => notifications.filter(isHistoryNotification).sort(sortByScheduledDesc),
    [notifications]
  );
  const visibleNotifications = showHistory ? historyNotifications : dueUnreadNotifications;

  const items = useMemo<NotificationCenterItem[]>(
    () =>
      visibleNotifications.map((notification) => {
        const typeLabel =
          notification.related_type === "task"
            ? t("notifications.taskNotificationTitle")
            : notification.related_type === "habit"
              ? t("notifications.habitNotificationTitle")
              : t("notifications.centerSystem");
        const metaParts = [
          typeLabel,
          getKindLabel(notification.kind, t),
          formatScheduledFor(notification.scheduled_for)
        ];

        if (notification.status === "cancelled") {
          metaParts.push(t("notifications.centerCancelled"));
        }

        return {
          id: notification.notification_id,
          title: notification.title,
          message: notification.body,
          meta: metaParts.join(" / "),
          read: Boolean(notification.read_at) || notification.status === "cancelled",
          status: notification.status
        };
      }),
    [visibleNotifications, t]
  );
  const hasUnread = dueUnreadNotifications.length > 0;

  async function openCenter(): Promise<void> {
    setShowHistory(false);
    setIsExpanded(false);

    if (!user) {
      setIsOpen(true);
      return;
    }

    await loadNotifications();
    setIsOpen(true);
  }

  function closeCenter(): void {
    setIsOpen(false);
    setIsExpanded(false);
  }

  async function markVisibleAsRead(): Promise<void> {
    if (!user || dueUnreadNotifications.length === 0) {
      return;
    }

    try {
      await markAllNotificationsRead();
      const nextNotifications = await loadNotifications();
      await syncNotificationSchedules(user.user_id, nextNotifications, settings.notifications_enabled);
      notifyNotificationsChanged();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
  }

  async function markOneAsRead(id: string): Promise<void> {
    if (!user) {
      return;
    }

    try {
      await markNotificationRead(id);
      const nextNotifications = await loadNotifications();
      await syncNotificationSchedules(user.user_id, nextNotifications, settings.notifications_enabled);
      notifyNotificationsChanged();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
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
        <TimeZapIcon name="notification" size={20} color={colors.primaryBlueDark} secondaryColor={colors.primaryBlueDark} />
        {hasUnread ? <View style={styles.unreadDot} /> : null}
      </Pressable>

      <Modal visible={isOpen} animationType="slide" transparent>
        <Pressable style={styles.modalRoot} onPress={closeCenter}>
          <SafeAreaView pointerEvents="box-none" style={styles.safeArea}>
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={[styles.panel, Platform.OS === "android" && isExpanded ? styles.panelExpanded : null]}
          >
            {Platform.OS === "android" ? (
              <View style={styles.dragHandleArea} {...panResponder.panHandlers}>
                <View style={styles.dragHandle} />
              </View>
            ) : null}

            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <Text style={styles.title}>{t("notifications.centerTitle")}</Text>
                <Text style={styles.subtitle}>
                  {settings.notifications_enabled
                    ? t("notifications.centerSubtitle")
                    : t("notifications.centerDisabled")}
                </Text>
              </View>
              <View style={styles.headerActions}>
                <AppButton
                  title={showHistory ? t("notifications.unread") : t("notifications.history")}
                  variant="secondary"
                  onPress={() => setShowHistory((current) => !current)}
                />
                {!showHistory && dueUnreadNotifications.length > 0 ? (
                  <AppButton
                    title={t("notifications.markAllRead")}
                    variant="secondary"
                    onPress={() => void markVisibleAsRead()}
                  />
                ) : null}
              </View>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <ScrollView style={styles.listScroll} contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
              {items.length === 0 ? (
                <View style={styles.empty}>
                  <View style={styles.emptyIconWrap}>
                    <TimeZapIcon name="notification" size={28} color={colors.primaryBlueDark} secondaryColor={colors.primaryBlue} />
                  </View>
                  <Text style={styles.emptyTitle}>{t("notifications.centerEmptyTitle")}</Text>
                  <Text style={styles.emptyText}>{t("notifications.centerEmptyMessage")}</Text>
                </View>
              ) : (
                items.map((item) => (
                  <Pressable
                    key={item.id}
                    accessibilityRole={item.read ? undefined : "button"}
                    accessibilityLabel={item.read ? undefined : t("notifications.markRead")}
                    disabled={item.read}
                    onPress={() => void markOneAsRead(item.id)}
                    style={({ pressed }) => [
                      styles.item,
                      item.read ? styles.itemRead : null,
                      item.status === "cancelled" ? styles.itemCancelled : null,
                      pressed ? styles.pressed : null
                    ]}
                  >
                    <View style={styles.itemHeader}>
                      <Text style={styles.itemTitle}>{item.title}</Text>
                      <View style={styles.itemControls}>
                        {!item.read ? <View style={styles.itemUnreadDot} /> : null}
                      </View>
                    </View>
                    <Text style={styles.itemMessage}>{item.message}</Text>
                    <Text style={styles.itemMeta}>{item.meta}</Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </Pressable>
          </SafeAreaView>
        </Pressable>
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
      backgroundColor: Platform.OS === "web" ? "rgba(15, 23, 42, 0.45)" : "rgba(2, 6, 23, 0.42)"
    },
    safeArea: {
      flex: 1,
      justifyContent: Platform.OS === "web" ? "center" : "flex-end"
    },
    panel: {
      width: "100%",
      maxWidth: Platform.OS === "web" ? 560 : undefined,
      alignSelf: "center",
      maxHeight: Platform.OS === "web" ? "88%" : Platform.OS === "android" ? "72%" : "100%",
      backgroundColor: colors.surface,
      borderRadius: Platform.OS === "web" ? 8 : 0,
      borderTopLeftRadius: Platform.OS === "android" ? 18 : Platform.OS === "web" ? 8 : 0,
      borderTopRightRadius: Platform.OS === "android" ? 18 : Platform.OS === "web" ? 8 : 0,
      padding: spacing.lg,
      gap: spacing.md
    },
    panelExpanded: {
      flex: 1,
      maxHeight: "100%",
      borderRadius: 0,
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0
    },
    dragHandleArea: {
      alignItems: "center",
      justifyContent: "center",
      minHeight: 24,
      marginTop: -spacing.sm
    },
    dragHandle: {
      width: 44,
      height: 5,
      borderRadius: 999,
      backgroundColor: colors.border
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: spacing.md
    },
    headerCopy: {
      flex: 1
    },
    headerActions: {
      gap: spacing.sm,
      alignItems: "flex-end"
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
    error: {
      color: colors.danger,
      fontSize: 13,
      fontWeight: "700"
    },
    listScroll: {
      flexShrink: 1
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
    itemCancelled: {
      opacity: 0.58
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
    itemControls: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: spacing.sm
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
    emptyIconWrap: {
      width: 48,
      height: 48,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primaryBlueUltraSoft,
      borderWidth: 1,
      borderColor: colors.primaryBlueSoft,
      marginBottom: spacing.xs
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
