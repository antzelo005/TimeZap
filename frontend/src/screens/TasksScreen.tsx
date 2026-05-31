import React, { useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import AppButton from "../components/AppButton";
import AppInput from "../components/AppInput";
import ScreenContainer from "../components/ScreenContainer";
import { completeTask, createTask, getTasks } from "../api/tasks.api";
import type { CreateTaskPayload, Task } from "../types/task";
import { getErrorMessage } from "../types/api";
import { useAppTheme } from "../theme/useAppTheme";
import { useTranslation } from "../i18n";

export default function TasksScreen() {
  const { colors, spacing } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors, spacing), [colors, spacing]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [form, setForm] = useState<CreateTaskPayload>({
    title: "",
    due_date: null,
    due_time: null,
    is_all_day: false
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    void loadTasks();
  }, []);

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

  async function handleCreateTask(): Promise<void> {
    try {
      setSubmitting(true);
      setError("");
      await createTask(form);
      setForm({ title: "", due_date: null, due_time: null, is_all_day: false });
      await loadTasks();
    } catch (err: unknown) {
      Alert.alert(t("tasks.errorTitle"), getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCompleteTask(taskId: string): Promise<void> {
    try {
      await completeTask(taskId);
      await loadTasks();
    } catch (err: unknown) {
      Alert.alert(t("tasks.errorTitle"), getErrorMessage(err));
    }
  }

  return (
    <ScreenContainer>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{t("tasks.title")}</Text>
        <View style={styles.headerPill}>
          <Text style={styles.headerPillText}>{t("tasks.focus")}</Text>
        </View>
      </View>
      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>{t("tasks.newTask")}</Text>
        <AppInput
          label={t("tasks.titleLabel")}
          value={form.title}
          onChangeText={(value) => setForm((current) => ({ ...current, title: value }))}
          placeholder={t("tasks.titleLabel")}
        />
        <AppInput
          label={t("tasks.dueDate")}
          value={form.due_date ?? ""}
          onChangeText={(value) =>
            setForm((current) => ({ ...current, due_date: value ? value : null }))
          }
          placeholder="2026-06-01"
        />
        <AppInput
          label={t("tasks.dueTime")}
          value={form.due_time ?? ""}
          onChangeText={(value) =>
            setForm((current) => ({ ...current, due_time: value ? value : null }))
          }
          placeholder="18:00"
        />
        <AppButton title={t("tasks.addTask")} onPress={() => void handleCreateTask()} loading={submitting} />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? <Text style={styles.muted}>{t("tasks.loading")}</Text> : null}

      <View style={styles.list}>
        {tasks.map((task) => (
          <View key={task.task_id} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <View style={styles.itemText}>
                <Text style={styles.itemTitle}>{task.title}</Text>
                <Text style={styles.itemMeta}>
                  {task.due_date || t("tasks.noDueDate")} {task.due_time ? `at ${task.due_time}` : ""}
                </Text>
              </View>
              <Text
                style={[
                  styles.statusChip,
                  task.status === "completed" ? styles.statusDone : styles.statusPending
                ]}
              >
                {task.status === "completed" ? t("common.completed") : t("common.pending")}
              </Text>
            </View>
            {task.status !== "completed" ? (
              <AppButton
                title={t("tasks.markComplete")}
                variant="secondary"
                onPress={() => void handleCompleteTask(task.task_id)}
              />
            ) : null}
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
      borderRadius: 22,
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
    list: {
      gap: spacing.md
    },
    itemCard: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.md
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
    itemTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.textPrimary
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
    error: {
      color: colors.danger
    },
    muted: {
      color: colors.textSecondary
    }
  });
}
