import React, { useEffect, useMemo, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import AppButton from "../components/AppButton";
import AppInput from "../components/AppInput";
import ScreenContainer from "../components/ScreenContainer";
import {
  cancelTask,
  completeTask,
  createTask,
  deleteTask,
  getTasks,
  updateTask
} from "../api/tasks.api";
import type { CreateTaskPayload, Task } from "../types/task";
import { getErrorMessage } from "../types/api";
import { useAppTheme } from "../theme/useAppTheme";
import { useTranslation } from "../i18n";

type TaskFilter = "all" | "pending" | "completed" | "overdue";
type TaskStatus = Task["status"];

interface TaskFormState {
  title: string;
  description: string;
  due_date: string;
  due_time: string;
  is_all_day: boolean;
  emoji: string;
  color: string;
}

interface TaskSection {
  key: TaskStatus | "overdue";
  title: string;
  emptyMessage: string;
  items: Task[];
}

type ConfirmableGlobal = typeof globalThis & {
  confirm?: (message: string) => boolean;
};

function getEmptyForm(): TaskFormState {
  return {
    title: "",
    description: "",
    due_date: "",
    due_time: "",
    is_all_day: false,
    emoji: "",
    color: ""
  };
}

function normalizeTimeForInput(value: string | null): string {
  if (!value) {
    return "";
  }

  return value.split(":").slice(0, 2).join(":");
}

function taskToForm(task: Task): TaskFormState {
  return {
    title: task.title,
    description: task.description ?? "",
    due_date: task.due_date ?? "",
    due_time: normalizeTimeForInput(task.due_time),
    is_all_day: task.is_all_day,
    emoji: task.emoji ?? "",
    color: task.color ?? ""
  };
}

function cleanOptional(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function formToPayload(form: TaskFormState): CreateTaskPayload {
  return {
    title: form.title.trim(),
    description: cleanOptional(form.description),
    due_date: cleanOptional(form.due_date),
    due_time: form.is_all_day ? null : cleanOptional(form.due_time),
    is_all_day: form.is_all_day,
    emoji: cleanOptional(form.emoji),
    color: cleanOptional(form.color)
  };
}

function getStatusOrder(status: TaskStatus): number {
  if (status === "pending") {
    return 0;
  }

  if (status === "completed") {
    return 1;
  }

  return 2;
}

function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((first, second) => {
    const statusDifference = getStatusOrder(first.status) - getStatusOrder(second.status);
    if (statusDifference !== 0) {
      return statusDifference;
    }

    if (first.is_overdue !== second.is_overdue) {
      return first.is_overdue ? -1 : 1;
    }

    const firstDate = first.due_date ?? "9999-12-31";
    const secondDate = second.due_date ?? "9999-12-31";
    if (firstDate !== secondDate) {
      return firstDate.localeCompare(secondDate);
    }

    const firstTime = first.due_time ?? "99:99:99";
    const secondTime = second.due_time ?? "99:99:99";
    return firstTime.localeCompare(secondTime);
  });
}

export default function TasksScreen() {
  const { colors, spacing } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors, spacing), [colors, spacing]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [form, setForm] = useState<TaskFormState>(() => getEmptyForm());
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<TaskFilter>("all");
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [actionTaskId, setActionTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [formError, setFormError] = useState<string>("");

  useEffect(() => {
    void loadTasks();
  }, []);

  const sortedTasks = useMemo(() => sortTasks(tasks), [tasks]);
  const filterOptions: Array<{ key: TaskFilter; label: string }> = [
    { key: "all", label: t("tasks.filterAll") },
    { key: "pending", label: t("tasks.filterPending") },
    { key: "completed", label: t("tasks.filterCompleted") },
    { key: "overdue", label: t("tasks.filterOverdue") }
  ];

  const visibleSections = useMemo<TaskSection[]>(() => {
    const pending = sortedTasks.filter((task) => task.status === "pending");
    const completed = sortedTasks.filter((task) => task.status === "completed");
    const cancelled = sortedTasks.filter((task) => task.status === "cancelled");
    const overdue = pending.filter((task) => task.is_overdue);

    if (activeFilter === "pending") {
      return [
        {
          key: "pending",
          title: t("tasks.pendingSection"),
          emptyMessage: t("tasks.noPendingTasks"),
          items: pending
        }
      ];
    }

    if (activeFilter === "completed") {
      return [
        {
          key: "completed",
          title: t("tasks.completedSection"),
          emptyMessage: t("tasks.noCompletedTasks"),
          items: completed
        }
      ];
    }

    if (activeFilter === "overdue") {
      return [
        {
          key: "overdue",
          title: t("tasks.overdueSection"),
          emptyMessage: t("tasks.noOverdueTasks"),
          items: overdue
        }
      ];
    }

    return [
      {
        key: "pending",
        title: t("tasks.pendingSection"),
        emptyMessage: t("tasks.noPendingTasks"),
        items: pending
      },
      {
        key: "completed",
        title: t("tasks.completedSection"),
        emptyMessage: t("tasks.noCompletedTasks"),
        items: completed
      },
      {
        key: "cancelled",
        title: t("tasks.cancelledSection"),
        emptyMessage: t("tasks.noCancelledTasks"),
        items: cancelled
      }
    ];
  }, [activeFilter, sortedTasks, t]);

  const taskCounts = useMemo(
    () => ({
      total: tasks.length,
      pending: tasks.filter((task) => task.status === "pending").length,
      completed: tasks.filter((task) => task.status === "completed").length,
      overdue: tasks.filter((task) => task.status === "pending" && task.is_overdue).length
    }),
    [tasks]
  );

  async function loadTasks(): Promise<void> {
    try {
      setError("");
      setLoading(true);
      const response = await getTasks();
      setTasks(response.items || []);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function resetForm(): void {
    setForm(getEmptyForm());
    setEditingTaskId(null);
    setFormError("");
  }

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

    try {
      setSubmitting(true);
      setError("");
      setFormError("");

      if (editingTaskId) {
        await updateTask(editingTaskId, payload);
      } else {
        await createTask(payload);
      }

      resetForm();
      await loadTasks();
    } catch (err: unknown) {
      Alert.alert(t("tasks.errorTitle"), getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  function handleEditTask(task: Task): void {
    setEditingTaskId(task.task_id);
    setForm(taskToForm(task));
    setFormError("");
  }

  async function runTaskAction(taskId: string, action: () => Promise<unknown>): Promise<void> {
    try {
      setActionTaskId(taskId);
      setError("");
      await action();
      await loadTasks();
    } catch (err: unknown) {
      Alert.alert(t("tasks.errorTitle"), getErrorMessage(err));
    } finally {
      setActionTaskId(null);
    }
  }

  async function handleCompleteTask(taskId: string): Promise<void> {
    await runTaskAction(taskId, () => completeTask(taskId));
  }

  async function handleCancelTask(taskId: string): Promise<void> {
    await runTaskAction(taskId, () => cancelTask(taskId));
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
      resetForm();
    }

    await runTaskAction(task.task_id, () => deleteTask(task.task_id));
  }

  function getDueLabel(task: Task): string {
    const dateLabel = task.due_date ?? t("tasks.noDueDate");
    const timeLabel = task.is_all_day
      ? t("tasks.allDay")
      : task.due_time
        ? normalizeTimeForInput(task.due_time)
        : "";

    return timeLabel ? `${dateLabel} • ${timeLabel}` : dateLabel;
  }

  function getStatusLabel(task: Task): string {
    if (task.status === "completed") {
      return t("common.completed");
    }

    if (task.status === "cancelled") {
      return t("common.cancelled");
    }

    if (task.is_overdue) {
      return t("tasks.overdue");
    }

    return t("common.pending");
  }

  function renderTask(task: Task) {
    const isCompleted = task.status === "completed";
    const isCancelled = task.status === "cancelled";
    const isPending = task.status === "pending";
    const isBusy = actionTaskId === task.task_id;

    return (
      <View
        key={task.task_id}
        style={[
          styles.itemCard,
          task.is_overdue ? styles.itemCardOverdue : null,
          isCompleted ? styles.itemCardCompleted : null,
          isCancelled ? styles.itemCardCancelled : null
        ]}
      >
        <View style={styles.itemHeader}>
          <View style={styles.itemText}>
            <View style={styles.titleRow}>
              {task.color ? <View style={[styles.colorDot, { backgroundColor: task.color }]} /> : null}
              <Text style={[styles.itemTitle, isCompleted || isCancelled ? styles.itemTitleMuted : null]}>
                {task.emoji ? `${task.emoji} ${task.title}` : task.title}
              </Text>
            </View>
            {task.description ? <Text style={styles.itemDescription}>{task.description}</Text> : null}
            <Text style={styles.itemMeta}>{getDueLabel(task)}</Text>
          </View>
          <Text
            style={[
              styles.statusChip,
              isCompleted
                ? styles.statusDone
                : isCancelled
                  ? styles.statusCancelled
                  : task.is_overdue
                    ? styles.statusOverdue
                    : styles.statusPending
            ]}
          >
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
              onPress={() => void handleCancelTask(task.task_id)}
              style={({ pressed }) => [
                styles.actionButton,
                styles.actionSecondary,
                isBusy ? styles.actionDisabled : null,
                pressed ? styles.actionPressed : null
              ]}
            >
              <Text style={styles.actionSecondaryText}>{t("tasks.cancelTask")}</Text>
            </Pressable>
          ) : null}
          <Pressable
            disabled={isBusy}
            onPress={() => handleEditTask(task)}
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

  return (
    <ScreenContainer>
      <View style={styles.headerRow}>
        <View>
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

      <View style={styles.formCard}>
        <View style={styles.formHeader}>
          <Text style={styles.sectionTitle}>
            {editingTaskId ? t("tasks.editTaskTitle") : t("tasks.newTask")}
          </Text>
          {editingTaskId ? (
            <Pressable onPress={resetForm} style={styles.clearEditButton}>
              <Text style={styles.clearEditButtonText}>{t("common.cancel")}</Text>
            </Pressable>
          ) : null}
        </View>

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
        <View style={styles.formRow}>
          <View style={styles.formColumn}>
            <AppInput
              label={t("tasks.dueDate")}
              value={form.due_date}
              onChangeText={(value) => setForm((current) => ({ ...current, due_date: value }))}
              placeholder="2026-06-01"
            />
          </View>
          <View style={styles.formColumn}>
            <AppInput
              label={t("tasks.dueTime")}
              value={form.due_time}
              onChangeText={(value) => setForm((current) => ({ ...current, due_time: value }))}
              placeholder="18:00"
              editable={!form.is_all_day}
            />
          </View>
        </View>

        <Pressable
          onPress={() =>
            setForm((current) => ({
              ...current,
              is_all_day: !current.is_all_day,
              due_time: !current.is_all_day ? "" : current.due_time
            }))
          }
          style={styles.toggleRow}
        >
          <View style={[styles.checkbox, form.is_all_day ? styles.checkboxActive : null]}>
            {form.is_all_day ? <Text style={styles.checkboxMark}>✓</Text> : null}
          </View>
          <Text style={styles.toggleLabel}>{t("tasks.allDay")}</Text>
        </Pressable>

        <View style={styles.formRow}>
          <View style={styles.formColumn}>
            <AppInput
              label={t("tasks.emojiLabel")}
              value={form.emoji}
              onChangeText={(value) => setForm((current) => ({ ...current, emoji: value }))}
              placeholder="⚡"
            />
          </View>
          <View style={styles.formColumn}>
            <AppInput
              label={t("tasks.colorLabel")}
              value={form.color}
              onChangeText={(value) => setForm((current) => ({ ...current, color: value }))}
              placeholder="#2563EB"
            />
          </View>
        </View>

        <AppButton
          title={editingTaskId ? t("tasks.saveChanges") : t("tasks.addTask")}
          onPress={() => void handleSubmitTask()}
          loading={submitting}
        />
      </View>

      <View style={styles.filterRow}>
        {filterOptions.map((option) => {
          const isActive = activeFilter === option.key;
          return (
            <Pressable
              key={option.key}
              onPress={() => setActiveFilter(option.key)}
              style={[styles.filterChip, isActive ? styles.filterChipActive : null]}
            >
              <Text style={[styles.filterChipText, isActive ? styles.filterChipTextActive : null]}>
                {option.label}
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
        {visibleSections.map((section) => (
          <View key={section.key} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionCount}>{section.items.length}</Text>
            </View>
            {section.items.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.muted}>{section.emptyMessage}</Text>
                {activeFilter !== "all" ? (
                  <Text style={styles.emptyHint}>{t("tasks.noTasksForSelectedFilter")}</Text>
                ) : null}
              </View>
            ) : (
              section.items.map(renderTask)
            )}
          </View>
        ))}
      </View>
    </ScreenContainer>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>["colors"],
  spacing: ReturnType<typeof useAppTheme>["spacing"]
) {
  return StyleSheet.create({
    title: {
      fontSize: 28,
      fontWeight: "700",
      color: colors.textPrimary
    },
    subtitle: {
      marginTop: spacing.xs,
      fontSize: 14,
      color: colors.textSecondary
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: spacing.md
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
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.textPrimary
    },
    formCard: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.md,
      shadowColor: colors.textPrimary,
      shadowOpacity: 0.04,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 1
    },
    formHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: spacing.md
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
    clearEditButton: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
      paddingHorizontal: spacing.md,
      paddingVertical: 8
    },
    clearEditButtonText: {
      color: colors.textSecondary,
      fontWeight: "700",
      fontSize: 13
    },
    toggleRow: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm
    },
    checkbox: {
      width: 22,
      height: 22,
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
      gap: spacing.lg
    },
    section: {
      gap: spacing.sm
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
      opacity: 0.86
    },
    itemCardCancelled: {
      opacity: 0.72
    },
    itemHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: spacing.md
    },
    itemText: {
      flex: 1,
      gap: spacing.xs
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm
    },
    colorDot: {
      width: 10,
      height: 10,
      borderRadius: 999
    },
    itemTitle: {
      flex: 1,
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
    statusCancelled: {
      color: colors.textMuted,
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
      minHeight: 36,
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
    emptyCard: {
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: spacing.md,
      gap: spacing.xs
    },
    emptyHint: {
      color: colors.textMuted,
      fontSize: 13
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
