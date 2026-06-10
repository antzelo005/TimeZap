import React, { useEffect, useMemo, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import AppButton from "../components/AppButton";
import AppInput from "../components/AppInput";
import DateField from "../components/DateField";
import EmptyState from "../components/EmptyState";
import FloatingActionButton from "../components/FloatingActionButton";
import FormModal from "../components/FormModal";
import IconColorPicker, { IconBadge } from "../components/IconColorPicker";
import ScreenContainer from "../components/ScreenContainer";
import TimeField from "../components/TimeField";
import { getNotifications } from "../api/notifications.api";
import { completeTask, createTask, deleteTask, getTasks, updateTask } from "../api/tasks.api";
import type { CreateTaskPayload, Task } from "../types/task";
import type { MainTabParamList } from "../types/navigation";
import { getErrorMessage } from "../types/api";
import { useAuth } from "../context/AuthContext";
import { useAppTheme } from "../theme/useAppTheme";
import { useTranslation } from "../i18n";
import { useSettings } from "../context/SettingsContext";
import { notifyDashboardChanged, notifyNotificationsChanged } from "../services/appEvents";
import {
  checkNotificationAvailability,
  syncNotificationSchedules
} from "../services/notifications";
import type { NotificationItem } from "../types/notification";
import { createLocalDate, formatLocalDate } from "../utils/date";
import { formatTimeRangeForDisplay, normalizeTimeForInput, timeToMinutes } from "../utils/time";

type TaskFilter = "pending" | "overdue" | "completed";
type TaskFormMode = "create" | "edit" | "move";

const TASK_GRACE_PERIOD_MINUTES = 60;

interface TaskFormState {
  title: string;
  description: string;
  due_date: string;
  end_date: string;
  is_multi_day: boolean;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  emoji: string;
  color: string;
  reminder_enabled: boolean;
  reminder_date: string;
  reminder_time: string;
}

type ConfirmableGlobal = typeof globalThis & {
  confirm?: (message: string) => boolean;
};

function getEmptyForm(): TaskFormState {
  return {
    title: "",
    description: "",
    due_date: formatLocalDate(new Date()),
    end_date: "",
    is_multi_day: false,
    start_time: "09:00",
    end_time: "10:00",
    is_all_day: false,
    emoji: "zap",
    color: "#2563EB",
    reminder_enabled: false,
    reminder_date: "",
    reminder_time: "09:00"
  };
}

function taskToForm(task: Task): TaskFormState {
  return {
    title: task.title,
    description: task.description ?? "",
    due_date: task.due_date ?? "",
    end_date: task.end_date ?? "",
    is_multi_day: Boolean(task.end_date && task.end_date !== task.due_date),
    start_time: normalizeTimeForInput(task.start_time || task.due_time),
    end_time: normalizeTimeForInput(task.end_time),
    is_all_day: task.is_all_day,
    emoji: task.emoji ?? "zap",
    color: task.color ?? "#2563EB",
    reminder_enabled: Boolean(task.reminder_enabled),
    reminder_date: "",
    reminder_time: "09:00"
  };
}

function cleanOptional(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function formToPayload(form: TaskFormState): CreateTaskPayload {
  const startTime = form.is_all_day || !form.due_date ? null : cleanOptional(form.start_time);
  const endTime = form.is_all_day || !form.due_date ? null : cleanOptional(form.end_time);
  const dueDate = cleanOptional(form.due_date);
  const endDate = form.is_multi_day && dueDate ? cleanOptional(form.end_date) : null;

  return {
    title: form.title.trim(),
    description: cleanOptional(form.description),
    due_date: dueDate,
    end_date: endDate,
    due_time: startTime,
    start_time: startTime,
    end_time: endTime,
    is_all_day: form.is_all_day,
    reminder_enabled: form.reminder_enabled,
    emoji: cleanOptional(form.emoji),
    color: cleanOptional(form.color)
  };
}

function isValidDateInput(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;
}

function isDateOnOrAfter(value: string, minimum: string): boolean {
  return value.localeCompare(minimum) >= 0;
}

function isTaskActiveOnDate(task: Task, date: string): boolean {
  if (!task.due_date) {
    return false;
  }

  const endDate = task.end_date || task.due_date;
  return task.due_date <= date && endDate >= date;
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

function buildReminderDateTime(dateValue: string, timeValue: string): Date | null {
  if (!isValidDateInput(dateValue)) {
    return null;
  }

  const time = parseReminderTime(timeValue);
  if (!time) {
    return null;
  }

  const [year, month, day] = dateValue.split("-").map(Number);
  return new Date(year, month - 1, day, time.hour, time.minute, 0, 0);
}

function getNotificationScheduledTime(notification: NotificationItem): number {
  return new Date(notification.scheduled_for).getTime();
}

function formatNotificationDateTime(value: string): string {
  const normalized = value.replace("T", " ");
  return normalized.length >= 16 ? normalized.slice(0, 16) : normalized;
}

function mergeReminderIntoForm(form: TaskFormState, reminder?: NotificationItem): TaskFormState {
  if (!reminder) {
    return form;
  }

  return {
    ...form,
    reminder_enabled: true,
    reminder_date: reminder.occurrence_date ?? "",
    reminder_time: reminder.scheduled_for.slice(11, 16) || "09:00"
  };
}

function getStatusOrder(task: Task): number {
  if (task.status === "pending") {
    return isTaskOverdueLocal(task) ? -1 : 0;
  }

  if (task.status === "completed") {
    return 1;
  }

  return 2;
}

function isTaskOverdueLocal(task: Task, now = new Date()): boolean {
  if (task.status !== "pending" || !task.due_date) {
    return false;
  }

  const overdueDate = task.end_date || task.due_date;
  const [year, month, day] = overdueDate.split("-").map(Number);
  const startTime = task.end_date ? task.end_time : task.end_time || task.start_time || task.due_time;

  if (task.is_all_day || !startTime) {
    const tomorrowStart = createLocalDate(year, month - 1, day + 1);
    return now.getTime() >= tomorrowStart.getTime();
  }

  const [hour, minute] = normalizeTimeForInput(startTime).split(":").map(Number);
  const dueAt = new Date(year, month - 1, day, hour, minute, 0, 0);
  const graceDeadline = new Date(dueAt.getTime() + TASK_GRACE_PERIOD_MINUTES * 60 * 1000);
  return now.getTime() >= graceDeadline.getTime();
}

function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((first, second) => {
    const statusDifference = getStatusOrder(first) - getStatusOrder(second);
    if (statusDifference !== 0) {
      return statusDifference;
    }

    const firstDate = first.due_date ?? "9999-12-31";
    const secondDate = second.due_date ?? "9999-12-31";
    if (firstDate !== secondDate) {
      return firstDate.localeCompare(secondDate);
    }

    const firstTime = first.start_time ?? first.due_time ?? "99:99:99";
    const secondTime = second.start_time ?? second.due_time ?? "99:99:99";
    return firstTime.localeCompare(secondTime);
  });
}

export default function TasksScreen() {
  const { colors, spacing } = useAppTheme();
  const { t } = useTranslation();
  const { settings } = useSettings();
  const { user } = useAuth();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList, "Tasks">>();
  const route = useRoute<RouteProp<MainTabParamList, "Tasks">>();
  const styles = useMemo(() => createStyles(colors, spacing), [colors, spacing]);
  const selectedDate = route.params?.selectedDate;
  const today = useMemo(() => formatLocalDate(new Date()), []);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskReminders, setTaskReminders] = useState<Record<string, NotificationItem>>({});
  const [form, setForm] = useState<TaskFormState>(() => getEmptyForm());
  const [formMode, setFormMode] = useState<TaskFormMode>("create");
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<TaskFilter>("pending");
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [actionTaskId, setActionTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [formError, setFormError] = useState<string>("");
  const [reminderMessage, setReminderMessage] = useState<string>("");

  useEffect(() => {
    void loadTasks();
  }, []);

  const sortedTasks = useMemo(() => sortTasks(tasks), [tasks]);
  const dateFilteredTasks = useMemo(
    () => (selectedDate ? sortedTasks.filter((task) => isTaskActiveOnDate(task, selectedDate)) : sortedTasks),
    [selectedDate, sortedTasks]
  );
  const pendingTasks = dateFilteredTasks.filter((task) => task.status === "pending");
  const overdueTasks = pendingTasks.filter((task) => isTaskOverdueLocal(task));
  const completedTasks = dateFilteredTasks.filter((task) => task.status === "completed");
  const visibleTasks =
    activeFilter === "completed" ? completedTasks : activeFilter === "overdue" ? overdueTasks : pendingTasks;
  const taskCounts = useMemo(
    () => ({
      total: tasks.filter((task) => task.status !== "cancelled").length,
      pending: tasks.filter((task) => task.status === "pending").length,
      completed: tasks.filter((task) => task.status === "completed").length,
      overdue: tasks.filter((task) => isTaskOverdueLocal(task)).length
    }),
    [tasks]
  );
  const notificationAvailability = useMemo(() => checkNotificationAvailability(), []);

  function mapTaskNotifications(items: NotificationItem[]): Record<string, NotificationItem> {
    const reminders: Record<string, NotificationItem> = {};
    const now = Date.now();

    for (const notification of items) {
      const scheduledAt = getNotificationScheduledTime(notification);

      if (
        notification.related_type === "task" &&
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

  async function loadTasks(): Promise<void> {
    try {
      setError("");
      setLoading(true);
      const [response, notificationResponse] = await Promise.all([
        getTasks(),
        getNotifications({ status: "scheduled" })
      ]);
      setTasks(response.items || []);
      setTaskReminders(mapTaskNotifications(notificationResponse.items || []));
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function closeForm(): void {
    setFormOpen(false);
    setForm(getEmptyForm());
    setEditingTaskId(null);
    setFormError("");
    setReminderMessage("");
    setFormMode("create");
  }

  function openNewTask(): void {
    setForm({
      ...getEmptyForm(),
      due_date: selectedDate ?? today
    });
    setEditingTaskId(null);
    setFormMode("create");
    setFormError("");
    setReminderMessage("");
    setFormOpen(true);
  }

  function openTaskForm(task: Task, mode: TaskFormMode = "edit"): void {
    setEditingTaskId(task.task_id);
    setForm(mergeReminderIntoForm(taskToForm(task), taskReminders[task.task_id]));
    setFormMode(mode);
    setFormError("");
    setReminderMessage("");
    setFormOpen(true);
  }

  async function syncTaskNotifications(): Promise<void> {
    const notificationResponse = await getNotifications({ status: "scheduled" });
    setTaskReminders(mapTaskNotifications(notificationResponse.items || []));

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
        .then((notificationResponse) => setTaskReminders(mapTaskNotifications(notificationResponse.items || [])))
        .catch(() => undefined);
    }, 30000);

    return () => clearInterval(intervalId);
  }, [settings.notifications_enabled, user]);

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

  async function handleSubmitTask(): Promise<void> {
    const payload = formToPayload(form);

    if (!payload.title) {
      setFormError(t("tasks.titleRequired"));
      return;
    }

    if (payload.due_date && !form.is_all_day && (!payload.start_time || !payload.end_time)) {
      setFormError(t("tasks.timeRequired"));
      return;
    }

    if (form.is_multi_day && payload.due_date && !payload.end_date) {
      setFormError(t("tasks.endDateRequired"));
      return;
    }

    if (payload.due_date && payload.end_date && !isDateOnOrAfter(payload.end_date, payload.due_date)) {
      setFormError(t("tasks.endDateAfterStart"));
      return;
    }

    if (payload.start_time && payload.end_time) {
      const startMinutes = timeToMinutes(payload.start_time);
      const endMinutes = timeToMinutes(payload.end_time);
      const sameDayRange = !payload.end_date || payload.end_date === payload.due_date;

      if (sameDayRange && startMinutes !== null && endMinutes !== null && endMinutes <= startMinutes) {
        setFormError(t("tasks.finishAfterStart"));
        return;
      }
    }

    try {
      setSubmitting(true);
      setError("");
      setFormError("");

      editingTaskId ? await updateTask(editingTaskId, payload) : await createTask(payload);
      await loadTasks();
      await syncTaskNotifications();
      notifyDashboardChanged();
      closeForm();
    } catch (err: unknown) {
      Alert.alert(t("tasks.errorTitle"), getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  function toggleTaskReminder(): void {
    setReminderMessage("");
    setForm((current) => {
      const enabling = !current.reminder_enabled;

      return {
        ...current,
        reminder_enabled: enabling,
        reminder_date: enabling ? current.reminder_date || current.due_date || "" : current.reminder_date,
        reminder_time: enabling
          ? normalizeTimeForInput(current.start_time) || current.reminder_time || "09:00"
          : current.reminder_time
      };
    });
  }

  async function runTaskAction(taskId: string, action: () => Promise<unknown>): Promise<void> {
    try {
      setActionTaskId(taskId);
      setError("");
      await action();
      await loadTasks();
      await syncTaskNotifications();
      notifyDashboardChanged();
    } catch (err: unknown) {
      Alert.alert(t("tasks.errorTitle"), getErrorMessage(err));
    } finally {
      setActionTaskId(null);
    }
  }

  async function handleCompleteTask(taskId: string): Promise<void> {
    await runTaskAction(taskId, async () => {
      try {
        await completeTask(taskId);
      } catch (err: unknown) {
        const message = getErrorMessage(err);
        if (!message.toLowerCase().includes("unexpected token")) {
          throw err;
        }
      }
    });
  }

  async function handleDeleteTask(task: Task): Promise<void> {
    const confirmed = await confirmAction(
      t("tasks.deleteConfirmTitle"),
      t("tasks.deleteConfirmMessage", { title: task.title }),
      t("common.delete")
    );

    if (!confirmed) {
      return;
    }

    if (editingTaskId === task.task_id) {
      closeForm();
    }

    await runTaskAction(task.task_id, async () => {
      await deleteTask(task.task_id);
    });
  }

  function getDueLabel(task: Task): string {
    const dateLabel =
      task.due_date && task.end_date && task.end_date !== task.due_date
        ? `${task.due_date} -> ${task.end_date}`
        : task.due_date ?? t("tasks.noDueDate");
    const timeLabel = task.is_all_day
      ? t("tasks.allDay")
      : formatTimeRangeForDisplay(task.start_time || task.due_time, task.end_time, settings.time_format);

    return timeLabel ? `${dateLabel} / ${timeLabel}` : dateLabel;
  }

  function getStatusLabel(task: Task): string {
    if (task.status === "completed") {
      return t("common.completed");
    }

    if (isTaskOverdueLocal(task)) {
      return t("tasks.overdue");
    }

    return t("common.pending");
  }

  function renderTask(task: Task) {
    const isCompleted = task.status === "completed";
    const isPending = task.status === "pending";
    const isBusy = actionTaskId === task.task_id;
    const isOverdue = isTaskOverdueLocal(task);

    return (
      <View
        key={task.task_id}
        style={[styles.itemCard, isOverdue ? styles.itemCardOverdue : null, isCompleted ? styles.itemCardCompleted : null]}
      >
        <View style={styles.itemHeader}>
          <IconBadge iconId={task.emoji} color={task.color} />
          <View style={styles.itemText}>
            <Text style={[styles.itemTitle, isCompleted ? styles.itemTitleMuted : null]}>{task.title}</Text>
            {task.description ? <Text style={styles.itemDescription}>{task.description}</Text> : null}
            <Text style={styles.itemMeta}>{getDueLabel(task)}</Text>
            {taskReminders[task.task_id] ? (
              <Text style={styles.reminderMeta}>
                {t("notifications.nextReminderAt", {
                  value: formatNotificationDateTime(taskReminders[task.task_id].scheduled_for)
                })}
              </Text>
            ) : null}
          </View>
          <Text style={[styles.statusChip, isCompleted ? styles.statusDone : isOverdue ? styles.statusOverdue : styles.statusPending]}>
            {getStatusLabel(task)}
          </Text>
        </View>

        <View style={styles.actionsRow}>
          {isPending ? (
            <Pressable
              disabled={isBusy}
              onPress={() => void handleCompleteTask(task.task_id)}
              style={({ pressed }) => [
                styles.actionButton,
                styles.actionPrimary,
                isBusy ? styles.actionDisabled : null,
                pressed ? styles.actionPressed : null
              ]}
            >
              <Text style={styles.actionPrimaryText}>{t("tasks.markComplete")}</Text>
            </Pressable>
          ) : null}
          {isPending ? (
            <Pressable
              disabled={isBusy}
              onPress={() => openTaskForm(task, "move")}
              style={({ pressed }) => [
                styles.actionButton,
                styles.actionSecondary,
                isBusy ? styles.actionDisabled : null,
                pressed ? styles.actionPressed : null
              ]}
            >
              <Text style={styles.actionSecondaryText}>{t("tasks.moveTask")}</Text>
            </Pressable>
          ) : null}
          <Pressable
            disabled={isBusy}
            onPress={() => openTaskForm(task, "edit")}
            style={({ pressed }) => [
              styles.actionButton,
              styles.actionSecondary,
              isBusy ? styles.actionDisabled : null,
              pressed ? styles.actionPressed : null
            ]}
          >
            <Text style={styles.actionSecondaryText}>{t("tasks.editTask")}</Text>
          </Pressable>
          <Pressable
            disabled={isBusy}
            onPress={() => void handleDeleteTask(task)}
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
    const modalTitle =
      formMode === "move" ? t("tasks.moveTaskTitle") : editingTaskId ? t("tasks.editTaskTitle") : t("tasks.newTask");
    const isMoveMode = formMode === "move";

    return (
      <FormModal
        visible={formOpen}
        title={modalTitle}
        subtitle={t("tasks.formSubtitle")}
        closeLabel={t("common.close")}
        onClose={closeForm}
      >
        {!isMoveMode ? (
          <>
                <AppInput
                  label={t("tasks.titleLabel")}
                  value={form.title}
                  onChangeText={(value) => setForm((current) => ({ ...current, title: value }))}
                  placeholder={t("tasks.titlePlaceholder")}
                  error={formError}
                />
                <AppInput
                  label={t("tasks.descriptionLabel")}
                  value={form.description}
                  onChangeText={(value) => setForm((current) => ({ ...current, description: value }))}
                  placeholder={t("tasks.descriptionPlaceholder")}
                  multiline
                  style={styles.multilineInput}
                />
          </>
        ) : null}
                <View style={styles.formRow}>
                  <View style={styles.formColumn}>
                    <DateField
                      label={form.is_multi_day ? t("tasks.startDate") : t("tasks.date")}
                      value={form.due_date}
                      onChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          due_date: value,
                          end_date:
                            current.is_multi_day && value && (!current.end_date || current.end_date < value)
                              ? value
                              : current.end_date
                        }))
                      }
                      placeholder={t("tasks.noDate")}
                      clearLabel={t("common.clear")}
                      todayLabel={t("common.today")}
                      doneLabel={t("common.done")}
                      previousLabel={t("calendar.previous")}
                      nextLabel={t("calendar.next")}
                      showClearButton={!isMoveMode}
                    />
                  </View>
                  {form.is_multi_day ? (
                    <View style={styles.formColumn}>
                      <DateField
                        label={t("tasks.endDate")}
                        value={form.end_date}
                        onChange={(value) => setForm((current) => ({ ...current, end_date: value }))}
                        placeholder={form.due_date || t("tasks.noDate")}
                        clearLabel={t("common.clear")}
                        todayLabel={t("common.today")}
                        doneLabel={t("common.done")}
                        previousLabel={t("calendar.previous")}
                        nextLabel={t("calendar.next")}
                      />
                    </View>
                  ) : null}
                </View>

                <Pressable
                  onPress={() =>
                    setForm((current) => {
                      const enabling = !current.is_multi_day;
                      return {
                        ...current,
                        is_multi_day: enabling,
                        end_date: enabling ? current.end_date || current.due_date : ""
                      };
                    })
                  }
                  style={styles.toggleRow}
                >
                  <View style={[styles.checkbox, form.is_multi_day ? styles.checkboxActive : null]}>
                    {form.is_multi_day ? <Text style={styles.checkboxMark}>{"\u2713"}</Text> : null}
                  </View>
                  <Text style={styles.toggleLabel}>{t("tasks.multipleDays")}</Text>
                </Pressable>

                {!form.is_all_day && form.due_date ? (
                  <View style={styles.formRow}>
                    <View style={styles.formColumn}>
                      <TimeField
                        label={t("tasks.startTime")}
                        value={form.start_time}
                        onChange={(value) => setForm((current) => ({ ...current, start_time: value }))}
                        placeholder="09:00"
                        clearLabel={t("common.clear")}
                        doneLabel={t("common.done")}
                      />
                    </View>
                    <View style={styles.formColumn}>
                      <TimeField
                        label={t("tasks.finishTime")}
                        value={form.end_time}
                        onChange={(value) => setForm((current) => ({ ...current, end_time: value }))}
                        placeholder="10:00"
                        clearLabel={t("common.clear")}
                        doneLabel={t("common.done")}
                      />
                    </View>
                  </View>
                ) : null}

                <Pressable
                  onPress={() =>
                    setForm((current) => ({
                      ...current,
                      is_all_day: !current.is_all_day,
                      start_time: !current.is_all_day ? "" : current.start_time || "09:00",
                      end_time: !current.is_all_day ? "" : current.end_time || "10:00"
                    }))
                  }
                  style={styles.toggleRow}
                >
                  <View style={[styles.checkbox, form.is_all_day ? styles.checkboxActive : null]}>
                    {form.is_all_day ? <Text style={styles.checkboxMark}>{"\u2713"}</Text> : null}
                  </View>
                  <Text style={styles.toggleLabel}>{t("tasks.allDay")}</Text>
                </Pressable>

                {formError ? <Text style={styles.error}>{formError}</Text> : null}

        {!isMoveMode ? (
          <>
                <View style={styles.reminderBox}>
                  <Pressable onPress={toggleTaskReminder} style={styles.toggleRow}>
                    <View style={[styles.checkbox, form.reminder_enabled ? styles.checkboxActive : null]}>
                      {form.reminder_enabled ? <Text style={styles.checkboxMark}>{"\u2713"}</Text> : null}
                    </View>
                    <Text style={styles.toggleLabel}>{t("notifications.enableReminder")}</Text>
                  </Pressable>

                  {form.reminder_enabled ? (
                    <Text style={styles.reminderHint}>
                      {settings.notifications_enabled
                        ? notificationAvailability.available
                          ? t("notifications.taskReminderHint")
                          : t("notifications.webUnsupported")
                        : t("notifications.disabledInSettings")}
                    </Text>
                  ) : null}

                  {reminderMessage ? <Text style={styles.reminderStatus}>{reminderMessage}</Text> : null}
                </View>

                <IconColorPicker
                  icon={form.emoji}
                  color={form.color}
                  iconLabel={t("tasks.iconLabel")}
                  colorLabel={t("tasks.colorLabel")}
                  onIconChange={(value) => setForm((current) => ({ ...current, emoji: value }))}
                  onColorChange={(value) => setForm((current) => ({ ...current, color: value }))}
                />
          </>
        ) : null}

                <AppButton
                  title={formMode === "move" ? t("tasks.moveTask") : editingTaskId ? t("tasks.saveChanges") : t("tasks.addTask")}
                  onPress={() => void handleSubmitTask()}
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
            <Text style={styles.title}>{t("tasks.title")}</Text>
            <Text style={styles.subtitle}>
              {t("tasks.summary", {
                total: taskCounts.total,
                pending: taskCounts.pending,
                completed: taskCounts.completed,
                overdue: taskCounts.overdue
              })}
            </Text>
          </View>
          <View style={styles.headerPill}>
            <Text style={styles.headerPillText}>{t("tasks.focus")}</Text>
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
            { key: "pending" as const, label: t("tasks.filterPending"), value: pendingTasks.length },
            { key: "overdue" as const, label: t("tasks.filterOverdue"), value: overdueTasks.length },
            { key: "completed" as const, label: t("tasks.completedHistory"), value: completedTasks.length }
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
            <AppButton title={t("common.retry")} variant="secondary" onPress={() => void loadTasks()} />
          </View>
        ) : null}
        {loading ? <Text style={styles.muted}>{t("tasks.loading")}</Text> : null}

        <View style={styles.list}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {activeFilter === "completed"
                ? t("tasks.completedSection")
                : activeFilter === "overdue"
                  ? t("tasks.overdueSection")
                  : t("tasks.pendingSection")}
            </Text>
            <Text style={styles.sectionCount}>{visibleTasks.length}</Text>
          </View>
          {visibleTasks.length === 0 ? (
            <EmptyState
              title={
                activeFilter === "completed"
                  ? t("tasks.noCompletedTasks")
                  : activeFilter === "overdue"
                    ? t("tasks.noOverdueTasks")
                    : t("tasks.noPendingTasks")
              }
              message={activeFilter === "pending" ? t("tasks.createFirstTask") : t("tasks.noTasksForSelectedFilter")}
              actionLabel={activeFilter === "pending" ? t("tasks.addTask") : undefined}
              onAction={activeFilter === "pending" ? openNewTask : undefined}
            />
          ) : (
            visibleTasks.map(renderTask)
          )}
        </View>
      </ScreenContainer>

      <FloatingActionButton label={t("tasks.newTask")} onPress={openNewTask} />
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
      backgroundColor: colors.primaryBlueUltraSoft,
      borderWidth: 1,
      borderColor: colors.primaryBlueSoft,
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
    itemCardOverdue: {
      borderColor: colors.danger,
      backgroundColor: colors.dangerSoft
    },
    itemCardCompleted: {
      opacity: 0.82
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
    statusChip: {
      alignSelf: "flex-start",
      fontWeight: "700",
      fontSize: 12,
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      borderRadius: 999,
      overflow: "hidden"
    },
    statusDone: {
      color: colors.primaryBlueDark,
      backgroundColor: colors.primaryBlueUltraSoft
    },
    statusPending: {
      color: colors.textSecondary,
      backgroundColor: colors.surfaceMuted
    },
    statusOverdue: {
      color: colors.danger,
      backgroundColor: colors.surface
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
    actionPrimary: {
      backgroundColor: colors.primaryBlue,
      borderColor: colors.primaryBlue
    },
    actionSecondary: {
      backgroundColor: colors.surface,
      borderColor: colors.border
    },
    actionDanger: {
      backgroundColor: colors.dangerSoft,
      borderColor: colors.danger
    },
    actionPrimaryText: {
      color: colors.textOnPrimary,
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
