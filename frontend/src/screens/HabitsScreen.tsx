import React, { useEffect, useMemo, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { getCalendarDay } from "../api/calendar.api";
import { getNotifications } from "../api/notifications.api";
import {
  createHabit,
  deleteHabit,
  getHabitStreak,
  getHabits,
  logHabit,
  updateHabit
} from "../api/habits.api";
import AppButton from "../components/AppButton";
import AppInput from "../components/AppInput";
import DateField from "../components/DateField";
import EmptyState from "../components/EmptyState";
import FloatingActionButton from "../components/FloatingActionButton";
import FormModal from "../components/FormModal";
import IconColorPicker, { IconBadge } from "../components/IconColorPicker";
import ScreenContainer from "../components/ScreenContainer";
import TimeField from "../components/TimeField";
import { useTranslation } from "../i18n";
import { useAppTheme } from "../theme/useAppTheme";
import { getErrorMessage } from "../types/api";
import type { CreateHabitPayload, Habit, HabitRecurrenceType, HabitStatus } from "../types/habit";
import type { MainTabParamList } from "../types/navigation";
import type { NotificationItem } from "../types/notification";
import { formatLocalDate } from "../utils/date";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { notifyDashboardChanged, notifyNotificationsChanged } from "../services/appEvents";
import {
  checkNotificationAvailability,
  syncNotificationSchedules
} from "../services/notifications";
import { formatTimeRangeForDisplay, normalizeTimeForInput, timeToMinutes } from "../utils/time";

type HabitFilter = "active" | "logged" | "not_logged" | "archived";

interface HabitFormState {
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  has_end_date: boolean;
  start_time: string;
  end_time: string;
  emoji: string;
  color: string;
  recurrence_type: HabitRecurrenceType;
  interval_value: string;
  target_count: string;
  week_start: "monday" | "sunday";
  selected_weekdays: number[];
  reminder_enabled: boolean;
  reminder_time: string;
}

type ConfirmableGlobal = typeof globalThis & {
  confirm?: (message: string) => boolean;
};

const WEEKDAY_VALUES = [1, 2, 3, 4, 5, 6, 0];

function getDefaultForm(): HabitFormState {
  return {
    title: "",
    description: "",
    start_date: formatLocalDate(new Date()),
    end_date: "",
    has_end_date: false,
    start_time: "09:00",
    end_time: "10:00",
    emoji: "zap",
    color: "#2563EB",
    recurrence_type: "daily",
    interval_value: "1",
    target_count: "1",
    week_start: "monday",
    selected_weekdays: [],
    reminder_enabled: false,
    reminder_time: "09:00"
  };
}

function cleanOptional(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parsePositiveInteger(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getTargetPeriod(recurrenceType: HabitRecurrenceType): string | null {
  if (recurrenceType === "daily") {
    return "day";
  }

  if (recurrenceType === "x_times_per_week") {
    return "week";
  }

  if (recurrenceType === "x_times_per_month") {
    return "month";
  }

  return "custom";
}

function habitToForm(habit: Habit): HabitFormState {
  const rule = habit.rule;

  return {
    title: habit.title,
    description: habit.description ?? "",
    start_date: habit.start_date,
    end_date: habit.end_date ?? "",
    has_end_date: Boolean(habit.end_date),
    start_time: normalizeTimeForInput(habit.start_time),
    end_time: normalizeTimeForInput(habit.end_time),
    emoji: habit.emoji ?? "zap",
    color: habit.color ?? "#2563EB",
    recurrence_type: rule?.recurrence_type ?? "daily",
    interval_value: String(rule?.interval_value ?? 1),
    target_count: String(rule?.target_count ?? 1),
    week_start: rule?.week_start ?? "monday",
    selected_weekdays:
      rule?.days
        .map((day) => day.day_of_week)
        .filter((day): day is number => typeof day === "number") ?? [],
    reminder_enabled: Boolean(habit.reminder_enabled),
    reminder_time: normalizeTimeForInput(habit.reminder_time) || "09:00"
  };
}

function formToPayload(form: HabitFormState, status: HabitStatus = "active"): CreateHabitPayload {
  const recurrenceType = form.recurrence_type;
  const intervalValue = recurrenceType === "every_n_days" ? parsePositiveInteger(form.interval_value, 1) : 1;
  const targetCount =
    recurrenceType === "x_times_per_week" || recurrenceType === "x_times_per_month"
      ? parsePositiveInteger(form.target_count, 1)
      : 1;

  return {
    title: form.title.trim(),
    description: cleanOptional(form.description),
    start_date: form.start_date,
    end_date: form.has_end_date ? cleanOptional(form.end_date) : null,
    start_time: cleanOptional(form.start_time),
    end_time: cleanOptional(form.end_time),
    reminder_enabled: form.reminder_enabled,
    reminder_time: form.reminder_enabled ? cleanOptional(form.reminder_time) : null,
    status,
    emoji: cleanOptional(form.emoji),
    color: cleanOptional(form.color),
    rule: {
      recurrence_type: recurrenceType,
      interval_value: intervalValue,
      target_count: targetCount,
      target_period: getTargetPeriod(recurrenceType),
      week_start: form.week_start,
      days:
        recurrenceType === "specific_weekdays"
          ? form.selected_weekdays.map((day) => ({
              day_of_week: day,
              day_of_month: null
            }))
          : []
    }
  };
}

function sortHabits(habits: Habit[], logged: Record<string, boolean>): Habit[] {
  return [...habits].sort((first, second) => {
    if (first.status !== second.status) {
      return first.status === "active" ? -1 : 1;
    }

    const firstLogged = Boolean(logged[first.habit_id]);
    const secondLogged = Boolean(logged[second.habit_id]);
    if (firstLogged !== secondLogged) {
      return firstLogged ? 1 : -1;
    }

    return first.created_at < second.created_at ? 1 : -1;
  });
}

function parseReminderTime(value: string): { hour: number; minute: number } | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());

  if (!match) {
    return null;
  }

  return {
    hour: Number(match[1]),
    minute: Number(match[2])
  };
}

function mergeReminderIntoForm(form: HabitFormState, reminder?: NotificationItem): HabitFormState {
  if (!reminder) {
    return form;
  }

  return {
    ...form,
    reminder_enabled: true
  };
}

function getNotificationScheduledTime(notification: NotificationItem): number {
  return new Date(notification.scheduled_for).getTime();
}

function formatNotificationDateTime(value: string): string {
  const normalized = value.replace("T", " ");
  return normalized.length >= 16 ? normalized.slice(0, 16) : normalized;
}

function isDateOnOrAfter(value: string, minimum: string): boolean {
  return value.localeCompare(minimum) >= 0;
}

function isHabitActiveOnDate(habit: Habit, date: string): boolean {
  return habit.start_date <= date && (!habit.end_date || habit.end_date >= date);
}

export default function HabitsScreen() {
  const { colors, spacing } = useAppTheme();
  const { t } = useTranslation();
  const { settings } = useSettings();
  const { user } = useAuth();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList, "Habits">>();
  const route = useRoute<RouteProp<MainTabParamList, "Habits">>();
  const styles = useMemo(() => createStyles(colors, spacing), [colors, spacing]);
  const today = useMemo(() => formatLocalDate(new Date()), []);
  const selectedDate = route.params?.selectedDate;
  const viewDate = selectedDate ?? today;
  const [habits, setHabits] = useState<Habit[]>([]);
  const [streaks, setStreaks] = useState<Record<string, number>>({});
  const [loggedByDate, setLoggedByDate] = useState<Record<string, boolean>>({});
  const [habitReminders, setHabitReminders] = useState<Record<string, NotificationItem>>({});
  const [form, setForm] = useState<HabitFormState>(() => getDefaultForm());
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<HabitFilter>("active");
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [actionHabitId, setActionHabitId] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [formError, setFormError] = useState<string>("");
  const [reminderMessage, setReminderMessage] = useState<string>("");

  useEffect(() => {
    void loadHabits();
  }, [viewDate]);

  const sortedHabits = useMemo(() => sortHabits(habits, loggedByDate), [habits, loggedByDate]);
  const activeHabits = sortedHabits.filter(
    (habit) => habit.status === "active" && (!selectedDate || isHabitActiveOnDate(habit, selectedDate))
  );
  const archivedHabits = sortedHabits.filter((habit) => habit.status === "archived");
  const loggedHabits = activeHabits.filter((habit) => loggedByDate[habit.habit_id]);
  const notLoggedHabits = activeHabits.filter((habit) => !loggedByDate[habit.habit_id]);
  const visibleHabits = useMemo(() => {
    if (activeFilter === "active") {
      return activeHabits;
    }

    if (activeFilter === "logged") {
      return loggedHabits;
    }

    if (activeFilter === "not_logged") {
      return notLoggedHabits;
    }

    return archivedHabits;
  }, [activeFilter, activeHabits, archivedHabits, loggedHabits, notLoggedHabits]);
  const notificationAvailability = useMemo(() => checkNotificationAvailability(), []);

  function mapHabitNotifications(items: NotificationItem[]): Record<string, NotificationItem> {
    const reminders: Record<string, NotificationItem> = {};
    const now = Date.now();

    for (const notification of items) {
      const scheduledAt = getNotificationScheduledTime(notification);

      if (
        notification.related_type === "habit" &&
        notification.related_id &&
        notification.status === "scheduled" &&
        !Number.isNaN(scheduledAt) &&
        scheduledAt > now &&
        (!reminders[notification.related_id] ||
          scheduledAt < getNotificationScheduledTime(reminders[notification.related_id]))
      ) {
        reminders[notification.related_id] = notification;
      }
    }

    return reminders;
  }

  const recurrenceOptions: Array<{ key: HabitRecurrenceType; label: string }> = [
    { key: "daily", label: t("habits.recurrenceDaily") },
    { key: "specific_weekdays", label: t("habits.recurrenceSpecificWeekdays") },
    { key: "every_n_days", label: t("habits.recurrenceEveryNDays") },
    { key: "x_times_per_week", label: t("habits.recurrenceXTimesPerWeek") },
    { key: "x_times_per_month", label: t("habits.recurrenceXTimesPerMonth") }
  ];

  async function loadHabits(): Promise<void> {
    try {
      setError("");
      setLoading(true);
      const [habitResponse, dayResponse, notificationResponse] = await Promise.all([
        getHabits(),
        getCalendarDay(viewDate),
        getNotifications({ status: "scheduled" })
      ]);
      const items = habitResponse.items || [];
      setHabits(items);
      setHabitReminders(mapHabitNotifications(notificationResponse.items || []));
      setLoggedByDate(Object.fromEntries(dayResponse.habits.map((habit) => [habit.habit_id, habit.completed])));

      const streakEntries = await Promise.all(
        items.map(async (habit) => {
          try {
            const streak = await getHabitStreak(habit.habit_id);
            return [habit.habit_id, streak.current_streak] as const;
          } catch {
            return [habit.habit_id, 0] as const;
          }
        })
      );

      setStreaks(Object.fromEntries(streakEntries));
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function closeForm(): void {
    setFormOpen(false);
    setForm(getDefaultForm());
    setEditingHabitId(null);
    setFormError("");
    setReminderMessage("");
  }

  function openNewHabit(): void {
    setForm({ ...getDefaultForm(), start_date: viewDate });
    setEditingHabitId(null);
    setFormError("");
    setReminderMessage("");
    setFormOpen(true);
  }

  function openHabitForm(habit: Habit): void {
    setEditingHabitId(habit.habit_id);
    setForm(mergeReminderIntoForm(habitToForm(habit), habitReminders[habit.habit_id]));
    setFormError("");
    setReminderMessage("");
    setFormOpen(true);
  }

  async function syncHabitNotifications(): Promise<void> {
    const notificationResponse = await getNotifications({ status: "scheduled" });
    setHabitReminders(mapHabitNotifications(notificationResponse.items || []));

    if (user) {
      await syncNotificationSchedules(user.user_id, notificationResponse.items || [], settings.notifications_enabled);
    }

    notifyNotificationsChanged();
  }

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      void getNotifications({ status: "scheduled" })
        .then((notificationResponse) => setHabitReminders(mapHabitNotifications(notificationResponse.items || [])))
        .catch(() => undefined);
    }, 30000);

    return () => clearInterval(intervalId);
  }, [user]);

  async function confirmAction(title: string, message: string, confirmLabel: string): Promise<boolean> {
    if (Platform.OS === "web") {
      const confirm = (globalThis as ConfirmableGlobal).confirm;
      if (typeof confirm === "function") {
        return confirm(`${title}\n\n${message}`);
      }
    }

    return new Promise((resolve) => {
      Alert.alert(title, message, [
        { text: t("common.cancel"), style: "cancel", onPress: () => resolve(false) },
        { text: confirmLabel, style: "destructive", onPress: () => resolve(true) }
      ]);
    });
  }

  async function handleSubmitHabit(): Promise<void> {
    const title = form.title.trim();
    const startDate = form.start_date.trim() || today;

    if (!title) {
      setFormError(t("habits.titleRequired"));
      return;
    }

    try {
      setSubmitting(true);
      setFormError("");
      setError("");
      const status = editingHabitId
        ? habits.find((habit) => habit.habit_id === editingHabitId)?.status ?? "active"
        : "active";
      const payload = formToPayload({ ...form, title, start_date: startDate }, status);

      if (form.has_end_date && !payload.end_date) {
        setFormError(t("habits.endDateRequired"));
        return;
      }

      if (payload.end_date && !isDateOnOrAfter(payload.end_date, payload.start_date)) {
        setFormError(t("habits.endDateAfterStart"));
        return;
      }

      if (!payload.start_time || !payload.end_time) {
        setFormError(t("habits.timeRequired"));
        return;
      }

      if (payload.reminder_enabled && !parseReminderTime(form.reminder_time)) {
        setFormError(t("notifications.invalidDateTime"));
        return;
      }

      const startMinutes = timeToMinutes(payload.start_time);
      const endMinutes = timeToMinutes(payload.end_time);

      if (startMinutes !== null && endMinutes !== null && endMinutes <= startMinutes) {
        setFormError(t("habits.finishAfterStart"));
        return;
      }

      editingHabitId ? await updateHabit(editingHabitId, payload) : await createHabit(payload);
      await loadHabits();
      await syncHabitNotifications();
      notifyDashboardChanged();
      closeForm();
    } catch (err: unknown) {
      Alert.alert(t("habits.errorTitle"), getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function runHabitAction(habitId: string, action: () => Promise<unknown>): Promise<void> {
    try {
      setActionHabitId(habitId);
      setError("");
      await action();
      await loadHabits();
      await syncHabitNotifications();
      notifyDashboardChanged();
    } catch (err: unknown) {
      Alert.alert(t("habits.errorTitle"), getErrorMessage(err));
    } finally {
      setActionHabitId(null);
    }
  }

  async function handleLogHabit(habitId: string): Promise<void> {
    if (loggedByDate[habitId]) {
      return;
    }

    await runHabitAction(habitId, async () => {
      await logHabit(habitId, { date: viewDate });
    });
  }

  async function handleArchiveHabit(habit: Habit): Promise<void> {
    const confirmed = await confirmAction(
      t("habits.archiveConfirmTitle"),
      t("habits.archiveConfirmMessage", { title: habit.title }),
      t("habits.archiveHabit")
    );

    if (!confirmed) {
      return;
    }

    const payload = formToPayload(habitToForm(habit), "archived");
    await runHabitAction(habit.habit_id, async () => {
      await updateHabit(habit.habit_id, payload);
    });
  }

  async function handleRestoreHabit(habit: Habit): Promise<void> {
    const payload = formToPayload(habitToForm(habit), "active");
    await runHabitAction(habit.habit_id, () => updateHabit(habit.habit_id, payload));
  }

  async function handleDeleteHabit(habit: Habit): Promise<void> {
    const confirmed = await confirmAction(
      t("habits.deleteConfirmTitle"),
      t("habits.deleteConfirmMessage", { title: habit.title }),
      t("common.delete")
    );

    if (!confirmed) {
      return;
    }

    if (editingHabitId === habit.habit_id) {
      closeForm();
    }

    await runHabitAction(habit.habit_id, async () => {
      await deleteHabit(habit.habit_id);
    });
  }

  function toggleHabitReminder(): void {
    setReminderMessage("");
    setForm((current) => ({
      ...current,
      reminder_enabled: !current.reminder_enabled,
      reminder_time: current.reminder_time || "09:00"
    }));
  }

  function toggleWeekday(day: number): void {
    setForm((current) => ({
      ...current,
      selected_weekdays: current.selected_weekdays.includes(day)
        ? current.selected_weekdays.filter((value) => value !== day)
        : [...current.selected_weekdays, day]
    }));
  }

  function getRecurrenceLabel(habit: Habit): string {
    const rule = habit.rule;
    if (!rule || rule.recurrence_type === "daily") {
      return t("habits.recurrenceDaily");
    }

    if (rule.recurrence_type === "specific_weekdays") {
      return t("habits.recurrenceSpecificWeekdays");
    }

    if (rule.recurrence_type === "every_n_days") {
      return t("habits.everyNDaysLabel", { count: rule.interval_value });
    }

    if (rule.recurrence_type === "x_times_per_week") {
      return t("habits.xTimesPerWeekLabel", { count: rule.target_count });
    }

    return t("habits.xTimesPerMonthLabel", { count: rule.target_count });
  }

  function getEmptyMessage(): string {
    if (activeFilter === "logged") {
      return t("habits.noLoggedToday");
    }

    if (activeFilter === "not_logged") {
      return t("habits.noNotLoggedToday");
    }

    if (activeFilter === "archived") {
      return t("habits.noArchivedHabits");
    }

    return t("habits.noActiveHabits");
  }

  function getWeekdayLabel(day: number): string {
    switch (day) {
      case 0:
        return t("habits.weekday.0");
      case 1:
        return t("habits.weekday.1");
      case 2:
        return t("habits.weekday.2");
      case 3:
        return t("habits.weekday.3");
      case 4:
        return t("habits.weekday.4");
      case 5:
        return t("habits.weekday.5");
      default:
        return t("habits.weekday.6");
    }
  }

  function renderHabit(habit: Habit) {
    const isArchived = habit.status === "archived";
    const isLogged = Boolean(loggedByDate[habit.habit_id]);
    const isBusy = actionHabitId === habit.habit_id;
    const habitTimeRange = formatTimeRangeForDisplay(habit.start_time, habit.end_time, settings.time_format);
    const dateRange =
      habit.end_date && habit.end_date !== habit.start_date
        ? `${habit.start_date} -> ${habit.end_date}`
        : habit.start_date;

    return (
      <View key={habit.habit_id} style={[styles.itemCard, isArchived ? styles.itemCardArchived : null]}>
        <View style={styles.itemHeader}>
          <IconBadge iconId={habit.emoji} color={habit.color} />
          <View style={styles.itemText}>
            <Text style={[styles.itemTitle, isArchived ? styles.itemTitleMuted : null]}>{habit.title}</Text>
            {habit.description ? <Text style={styles.itemDescription}>{habit.description}</Text> : null}
            {habitReminders[habit.habit_id] ? (
              <Text style={styles.reminderMeta}>
                {t("notifications.nextReminderAt", {
                  value: formatNotificationDateTime(habitReminders[habit.habit_id].scheduled_for)
                })}
              </Text>
            ) : null}
            <Text style={styles.itemMeta}>
              {getRecurrenceLabel(habit)} / {dateRange}
              {habitTimeRange ? ` / ${habitTimeRange}` : ""}
            </Text>
          </View>
          <View style={styles.cardChips}>
            <Text style={styles.streakChip}>{t("habits.streakDays", { count: streaks[habit.habit_id] || 0 })}</Text>
            <Text style={[styles.statusChip, isLogged ? styles.statusLogged : styles.statusPending]}>
              {isArchived ? t("habits.archived") : isLogged ? t("habits.loggedToday") : t("habits.notLoggedToday")}
            </Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          {!isArchived ? (
            <Pressable
              disabled={isBusy || isLogged}
              onPress={() => void handleLogHabit(habit.habit_id)}
              style={({ pressed }) => [
                styles.actionButton,
                styles.actionAccent,
                isBusy || isLogged ? styles.actionDisabled : null,
                pressed ? styles.actionPressed : null
              ]}
            >
              <Text style={styles.actionAccentText}>{isLogged ? t("habits.loggedToday") : t("habits.logForDate")}</Text>
            </Pressable>
          ) : null}
          <Pressable
            disabled={isBusy}
            onPress={() => openHabitForm(habit)}
            style={({ pressed }) => [
              styles.actionButton,
              styles.actionSecondary,
              isBusy ? styles.actionDisabled : null,
              pressed ? styles.actionPressed : null
            ]}
          >
            <Text style={styles.actionSecondaryText}>{t("habits.editHabit")}</Text>
          </Pressable>
          {isArchived ? (
            <Pressable
              disabled={isBusy}
              onPress={() => void handleRestoreHabit(habit)}
              style={({ pressed }) => [
                styles.actionButton,
                styles.actionSecondary,
                isBusy ? styles.actionDisabled : null,
                pressed ? styles.actionPressed : null
              ]}
            >
              <Text style={styles.actionSecondaryText}>{t("habits.restoreHabit")}</Text>
            </Pressable>
          ) : (
            <Pressable
              disabled={isBusy}
              onPress={() => void handleArchiveHabit(habit)}
              style={({ pressed }) => [
                styles.actionButton,
                styles.actionDanger,
                isBusy ? styles.actionDisabled : null,
                pressed ? styles.actionPressed : null
              ]}
            >
              <Text style={styles.actionDangerText}>{t("habits.archiveHabit")}</Text>
            </Pressable>
          )}
          <Pressable
            disabled={isBusy}
            onPress={() => void handleDeleteHabit(habit)}
            style={({ pressed }) => [
              styles.actionButton,
              styles.actionDanger,
              isBusy ? styles.actionDisabled : null,
              pressed ? styles.actionPressed : null
            ]}
          >
            <Text style={styles.actionDangerText}>{t("common.delete")}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  function renderFormModal() {
    return (
      <FormModal
        visible={formOpen}
        title={editingHabitId ? t("habits.editHabitTitle") : t("habits.newHabit")}
        subtitle={t("habits.formSubtitle")}
        closeLabel={t("common.close")}
        onClose={closeForm}
      >
                <AppInput
                  label={t("habits.titleLabel")}
                  value={form.title}
                  onChangeText={(value) => setForm((current) => ({ ...current, title: value }))}
                  placeholder={t("habits.titlePlaceholder")}
                  error={formError}
                />
                <AppInput
                  label={t("habits.descriptionLabel")}
                  value={form.description}
                  onChangeText={(value) => setForm((current) => ({ ...current, description: value }))}
                  placeholder={t("habits.descriptionPlaceholder")}
                  multiline
                  style={styles.multilineInput}
                />

                <DateField
                  label={t("habits.startDate")}
                  value={form.start_date}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      start_date: value || today,
                      end_date:
                        current.has_end_date && value && (!current.end_date || current.end_date < value)
                          ? value
                          : current.end_date
                    }))
                  }
                  placeholder={today}
                  clearLabel={t("common.clear")}
                  todayLabel={t("common.today")}
                  doneLabel={t("common.done")}
                  previousLabel={t("calendar.previous")}
                  nextLabel={t("calendar.next")}
                />

                <Pressable
                  onPress={() =>
                    setForm((current) => {
                      const enabling = !current.has_end_date;
                      return {
                        ...current,
                        has_end_date: enabling,
                        end_date: enabling ? current.end_date || current.start_date : ""
                      };
                    })
                  }
                  style={styles.toggleRow}
                >
                  <View style={[styles.checkbox, form.has_end_date ? styles.checkboxActive : null]}>
                    {form.has_end_date ? <Text style={styles.checkboxMark}>{"\u2713"}</Text> : null}
                  </View>
                  <Text style={styles.toggleLabel}>{t("habits.hasEndDate")}</Text>
                </Pressable>

                {form.has_end_date ? (
                  <DateField
                    label={t("habits.endDate")}
                    value={form.end_date}
                    onChange={(value) => setForm((current) => ({ ...current, end_date: value }))}
                    placeholder={form.start_date || today}
                    clearLabel={t("common.clear")}
                    todayLabel={t("common.today")}
                    doneLabel={t("common.done")}
                    previousLabel={t("calendar.previous")}
                    nextLabel={t("calendar.next")}
                  />
                ) : null}

                <View style={styles.formRow}>
                  <View style={styles.formColumn}>
                    <TimeField
                      label={t("habits.startTime")}
                      value={form.start_time}
                      onChange={(value) => setForm((current) => ({ ...current, start_time: value }))}
                      placeholder="09:00"
                      clearLabel={t("common.clear")}
                      doneLabel={t("common.done")}
                    />
                  </View>
                  <View style={styles.formColumn}>
                    <TimeField
                      label={t("habits.finishTime")}
                      value={form.end_time}
                      onChange={(value) => setForm((current) => ({ ...current, end_time: value }))}
                      placeholder="10:00"
                      clearLabel={t("common.clear")}
                      doneLabel={t("common.done")}
                    />
                  </View>
                </View>

                {formError ? <Text style={styles.error}>{formError}</Text> : null}

                <IconColorPicker
                  icon={form.emoji}
                  color={form.color}
                  iconLabel={t("habits.iconLabel")}
                  colorLabel={t("habits.colorLabel")}
                  onIconChange={(value) => setForm((current) => ({ ...current, emoji: value }))}
                  onColorChange={(value) => setForm((current) => ({ ...current, color: value }))}
                />

                <View style={styles.settingBlock}>
                  <Text style={styles.settingLabel}>{t("habits.recurrenceType")}</Text>
                  <View style={styles.optionRow}>
                    {recurrenceOptions.map((option) => {
                      const isActive = form.recurrence_type === option.key;
                      return (
                        <Pressable
                          key={option.key}
                          onPress={() =>
                            setForm((current) => ({
                              ...current,
                              recurrence_type: option.key,
                              interval_value: option.key === "every_n_days" ? current.interval_value : "1",
                              target_count:
                                option.key === "x_times_per_week" || option.key === "x_times_per_month"
                                  ? current.target_count
                                  : "1"
                            }))
                          }
                          style={[styles.optionChip, isActive ? styles.optionChipActive : null]}
                        >
                          <Text style={[styles.optionChipText, isActive ? styles.optionChipTextActive : null]}>
                            {option.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  {form.recurrence_type === "x_times_per_week" || form.recurrence_type === "x_times_per_month" ? (
                    <Text style={styles.settingWarning}>{t("habits.weeklyMonthlyStreakNote")}</Text>
                  ) : form.recurrence_type !== "daily" ? (
                    <Text style={styles.settingHint}>{t("habits.advancedRecurrenceNote")}</Text>
                  ) : null}
                </View>

                {form.recurrence_type === "specific_weekdays" ? (
                  <View style={styles.settingBlock}>
                    <Text style={styles.settingLabel}>{t("habits.weekdays")}</Text>
                    <View style={styles.optionRow}>
                      {WEEKDAY_VALUES.map((day) => {
                        const isActive = form.selected_weekdays.includes(day);
                        return (
                          <Pressable
                            key={day}
                            onPress={() => toggleWeekday(day)}
                            style={[styles.dayChip, isActive ? styles.dayChipActive : null]}
                          >
                            <Text style={[styles.dayChipText, isActive ? styles.dayChipTextActive : null]}>
                              {getWeekdayLabel(day)}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ) : null}

                {form.recurrence_type === "every_n_days" ? (
                  <AppInput
                    label={t("habits.intervalDays")}
                    value={form.interval_value}
                    onChangeText={(value) => setForm((current) => ({ ...current, interval_value: value }))}
                    keyboardType="number-pad"
                    placeholder="2"
                  />
                ) : null}

                {form.recurrence_type === "x_times_per_week" || form.recurrence_type === "x_times_per_month" ? (
                  <AppInput
                    label={t("habits.targetCount")}
                    value={form.target_count}
                    onChangeText={(value) => setForm((current) => ({ ...current, target_count: value }))}
                    keyboardType="number-pad"
                    placeholder="3"
                  />
                ) : null}

                <View style={styles.reminderBox}>
                  <Pressable onPress={toggleHabitReminder} style={styles.toggleRow}>
                    <View style={[styles.checkbox, form.reminder_enabled ? styles.checkboxActive : null]}>
                      {form.reminder_enabled ? <Text style={styles.checkboxMark}>{"\u2713"}</Text> : null}
                    </View>
                    <Text style={styles.toggleLabel}>{t("notifications.enableDailyReminder")}</Text>
                  </Pressable>

                  {form.reminder_enabled ? (
                    <>
                      <TimeField
                        label={t("notifications.reminderTime")}
                        value={form.reminder_time}
                        onChange={(value) => setForm((current) => ({ ...current, reminder_time: value }))}
                        placeholder="09:00"
                        clearLabel={t("common.clear")}
                        doneLabel={t("common.done")}
                      />
                      <Text style={styles.reminderHint}>
                        {settings.notifications_enabled
                          ? notificationAvailability.available
                            ? form.recurrence_type === "daily"
                              ? t("notifications.habitReminderHint")
                              : t("notifications.dailyHabitsOnly")
                            : t("notifications.webUnsupported")
                          : t("notifications.disabledInSettings")}
                      </Text>
                    </>
                  ) : null}

                  {reminderMessage ? <Text style={styles.reminderStatus}>{reminderMessage}</Text> : null}
                </View>

                <AppButton
                  title={editingHabitId ? t("habits.saveChanges") : t("habits.addHabit")}
                  onPress={() => void handleSubmitHabit()}
                  loading={submitting}
                />
      </FormModal>
    );
  }

  return (
    <View style={styles.root}>
      <ScreenContainer>
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>{t("habits.title")}</Text>
            <Text style={styles.subtitle}>
              {t("habits.summary", {
                total: habits.length,
                active: activeHabits.length,
                logged: loggedHabits.length,
                archived: archivedHabits.length
              })}
            </Text>
          </View>
          <View style={styles.headerPill}>
            <Text style={styles.headerPillText}>{t("habits.streaks")}</Text>
          </View>
        </View>

        <View style={styles.selectedDateRow}>
          <View style={styles.selectedDateField}>
            <DateField
              label={t("tasks.date")}
              value={selectedDate ?? ""}
              onChange={(value) => navigation.setParams({ selectedDate: value || undefined })}
              placeholder={t("tasks.dateFilterAll")}
              clearLabel={t("common.clear")}
              todayLabel={t("common.today")}
              doneLabel={t("common.done")}
              previousLabel={t("calendar.previous")}
              nextLabel={t("calendar.next")}
            />
          </View>
          <View style={styles.dateButtonRow}>
            <Pressable onPress={() => navigation.setParams({ selectedDate: today })} style={styles.clearDateButton}>
              <Text style={styles.clearDateText}>{t("common.today")}</Text>
            </Pressable>
            <Pressable onPress={() => navigation.setParams({ selectedDate: undefined })} style={styles.clearDateButton}>
              <Text style={styles.clearDateText}>{t("tasks.allDates")}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.filterRow}>
          {[
            { key: "active" as const, label: t("habits.filterActive"), value: activeHabits.length },
            { key: "not_logged" as const, label: t("habits.filterNotLoggedToday"), value: notLoggedHabits.length },
            { key: "logged" as const, label: t("habits.filterLoggedToday"), value: loggedHabits.length },
            { key: "archived" as const, label: t("habits.filterArchived"), value: archivedHabits.length }
          ].map((option) => {
            const isActive = activeFilter === option.key;
            return (
              <Pressable
                key={option.key}
                onPress={() => setActiveFilter(option.key)}
                style={[styles.filterChip, isActive ? styles.filterChipActive : null]}
              >
                <Text style={[styles.filterChipText, isActive ? styles.filterChipTextActive : null]}>
                  {option.label} {option.value}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.error}>{error}</Text>
            <AppButton title={t("common.retry")} variant="secondary" onPress={() => void loadHabits()} />
          </View>
        ) : null}
        {loading ? <Text style={styles.muted}>{t("habits.loading")}</Text> : null}

        <View style={styles.list}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("habits.habitsSection")}</Text>
            <Text style={styles.sectionCount}>{visibleHabits.length}</Text>
          </View>
          {visibleHabits.length === 0 ? (
            <EmptyState
              accent="yellow"
              title={getEmptyMessage()}
              message={activeFilter === "not_logged" ? t("habits.noHabitsToLog") : t("habits.createFirstHabit")}
              actionLabel={activeFilter === "active" ? t("habits.addHabit") : undefined}
              onAction={activeFilter === "active" ? openNewHabit : undefined}
            />
          ) : (
            visibleHabits.map(renderHabit)
          )}
        </View>
      </ScreenContainer>

      <FloatingActionButton label={t("habits.newHabit")} onPress={openNewHabit} />
      {renderFormModal()}
    </View>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>["colors"],
  spacing: ReturnType<typeof useAppTheme>["spacing"]
) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.appBackground
    },
    title: {
      fontSize: 28,
      fontWeight: "700",
      color: colors.textPrimary
    },
    subtitle: {
      marginTop: spacing.xs,
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: spacing.md
    },
    headerCopy: {
      flex: 1
    },
    headerPill: {
      borderRadius: 999,
      backgroundColor: colors.zapYellowSoft,
      borderWidth: 1,
      borderColor: colors.zapYellow,
      paddingHorizontal: spacing.sm,
      paddingVertical: 6
    },
    headerPillText: {
      fontSize: 12,
      color: colors.primaryBlueDark,
      fontWeight: "700"
    },
    selectedDateRow: {
      flexDirection: Platform.OS === "android" ? "column" : "row",
      alignItems: Platform.OS === "android" ? "stretch" : "center",
      justifyContent: "space-between",
      gap: spacing.sm,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: spacing.sm
    },
    selectedDateField: {
      flex: 1,
      minWidth: Platform.OS === "android" ? 0 : 220
    },
    selectedDateText: {
      flex: 1,
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: "700"
    },
    clearDateButton: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.primaryBlueSoft,
      backgroundColor: colors.primaryBlueUltraSoft,
      paddingHorizontal: spacing.sm,
      paddingVertical: 7
    },
    dateButtonRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: Platform.OS === "android" ? "flex-start" : "flex-end",
      gap: spacing.xs
    },
    clearDateText: {
      color: colors.primaryBlueDark,
      fontSize: 12,
      fontWeight: "800"
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.textPrimary
    },
    filterRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm
    },
    filterChip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.md,
      paddingVertical: 10
    },
    filterChipActive: {
      backgroundColor: colors.primaryBlueUltraSoft,
      borderColor: colors.primaryBlue
    },
    filterChipText: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: "700"
    },
    filterChipTextActive: {
      color: colors.primaryBlueDark
    },
    list: {
      gap: spacing.md
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md
    },
    sectionCount: {
      minWidth: 28,
      textAlign: "center",
      overflow: "hidden",
      borderRadius: 999,
      backgroundColor: colors.surfaceMuted,
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: "800",
      paddingHorizontal: spacing.sm,
      paddingVertical: 5
    },
    itemCard: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.md
    },
    itemCardArchived: {
      opacity: 0.72
    },
    itemHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.md
    },
    itemText: {
      flex: 1,
      gap: spacing.xs
    },
    itemTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.textPrimary
    },
    itemTitleMuted: {
      color: colors.textSecondary
    },
    itemDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20
    },
    itemMeta: {
      fontSize: 13,
      color: colors.textSecondary
    },
    reminderMeta: {
      fontSize: 13,
      color: colors.primaryBlueDark,
      fontWeight: "700"
    },
    cardChips: {
      alignItems: "flex-end",
      gap: spacing.xs
    },
    streakChip: {
      fontSize: 12,
      fontWeight: "800",
      color: colors.primaryBlueDark,
      backgroundColor: colors.zapYellowSoft,
      borderRadius: 999,
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      overflow: "hidden"
    },
    statusChip: {
      fontSize: 12,
      fontWeight: "800",
      borderRadius: 999,
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      overflow: "hidden"
    },
    statusLogged: {
      color: colors.primaryBlueDark,
      backgroundColor: colors.primaryBlueUltraSoft
    },
    statusPending: {
      color: colors.textSecondary,
      backgroundColor: colors.surfaceMuted
    },
    actionsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm
    },
    actionButton: {
      minHeight: 38,
      borderRadius: 8,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.md,
      paddingVertical: 8
    },
    actionAccent: {
      backgroundColor: colors.zapYellowSoft,
      borderColor: colors.zapYellow
    },
    actionSecondary: {
      backgroundColor: colors.surface,
      borderColor: colors.border
    },
    actionDanger: {
      backgroundColor: colors.dangerSoft,
      borderColor: colors.danger
    },
    actionAccentText: {
      color: colors.primaryBlueDark,
      fontSize: 13,
      fontWeight: "800"
    },
    actionSecondaryText: {
      color: colors.primaryBlueDark,
      fontSize: 13,
      fontWeight: "800"
    },
    actionDangerText: {
      color: colors.danger,
      fontSize: 13,
      fontWeight: "800"
    },
    actionDisabled: {
      opacity: 0.55
    },
    actionPressed: {
      transform: [{ translateY: 1 }]
    },
    modalRoot: {
      flex: 1,
      justifyContent: Platform.OS === "web" ? "center" : "flex-end",
      backgroundColor: Platform.OS === "web" ? "rgba(15, 23, 42, 0.45)" : colors.appBackground
    },
    modalKeyboard: {
      width: "100%",
      maxWidth: Platform.OS === "web" ? 680 : undefined,
      alignSelf: "center",
      flex: Platform.OS === "web" ? 0 : 1
    },
    modalPanel: {
      flex: Platform.OS === "web" ? 0 : 1,
      maxHeight: Platform.OS === "web" ? "92%" : "100%",
      backgroundColor: colors.surface,
      borderRadius: Platform.OS === "web" ? 8 : 0,
      padding: spacing.lg,
      gap: spacing.md
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: spacing.md
    },
    modalTitleWrap: {
      flex: 1,
      gap: spacing.xs
    },
    modalTitle: {
      color: colors.textPrimary,
      fontSize: 22,
      fontWeight: "800"
    },
    modalSubtitle: {
      color: colors.textSecondary,
      fontSize: 13,
      lineHeight: 18
    },
    formContent: {
      gap: spacing.md,
      paddingBottom: spacing.xl
    },
    formRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.md
    },
    formColumn: {
      flex: 1,
      minWidth: 220
    },
    multilineInput: {
      minHeight: 86,
      paddingTop: spacing.md,
      textAlignVertical: "top"
    },
    settingBlock: {
      gap: spacing.sm
    },
    settingLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: "700"
    },
    settingHint: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 19
    },
    settingWarning: {
      fontSize: 13,
      color: colors.warning,
      backgroundColor: colors.warningSoft,
      borderRadius: 8,
      padding: spacing.sm,
      lineHeight: 19,
      overflow: "hidden"
    },
    toggleRow: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      minHeight: 44
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center"
    },
    checkboxActive: {
      backgroundColor: colors.primaryBlue,
      borderColor: colors.primaryBlue
    },
    checkboxMark: {
      color: colors.textOnPrimary,
      fontSize: 13,
      fontWeight: "800"
    },
    toggleLabel: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: "600"
    },
    reminderBox: {
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
      padding: spacing.md,
      gap: spacing.md
    },
    reminderHint: {
      color: colors.textSecondary,
      fontSize: 13,
      lineHeight: 19
    },
    reminderStatus: {
      color: colors.primaryBlueDark,
      fontSize: 13,
      fontWeight: "700"
    },
    optionRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm
    },
    optionChip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.md,
      paddingVertical: 10
    },
    optionChipActive: {
      backgroundColor: colors.primaryBlueUltraSoft,
      borderColor: colors.primaryBlue
    },
    optionChipText: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: "700"
    },
    optionChipTextActive: {
      color: colors.primaryBlueDark
    },
    dayChip: {
      width: 42,
      height: 38,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center"
    },
    dayChipActive: {
      backgroundColor: colors.zapYellowSoft,
      borderColor: colors.zapYellow
    },
    dayChipText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: "800"
    },
    dayChipTextActive: {
      color: colors.primaryBlueDark
    },
    errorCard: {
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.danger,
      backgroundColor: colors.dangerSoft,
      padding: spacing.md,
      gap: spacing.md
    },
    error: {
      color: colors.danger
    },
    muted: {
      color: colors.textSecondary
    }
  });
}
