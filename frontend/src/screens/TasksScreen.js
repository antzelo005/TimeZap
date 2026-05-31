import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import AppButton from "../components/AppButton";
import AppInput from "../components/AppInput";
import ScreenContainer from "../components/ScreenContainer";
import { completeTask, createTask, getTasks } from "../api/tasks.api";
import colors from "../theme/colors";
import spacing from "../theme/spacing";

export default function TasksScreen() {
  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState({
    title: "",
    due_date: "",
    due_time: ""
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    try {
      setError("");
      setLoading(true);
      const response = await getTasks();
      setTasks(response.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTask() {
    try {
      setSubmitting(true);
      setError("");
      await createTask({
        title: form.title,
        due_date: form.due_date || null,
        due_time: form.due_time || null,
        is_all_day: false
      });
      setForm({ title: "", due_date: "", due_time: "" });
      await loadTasks();
    } catch (err) {
      Alert.alert("Task error", err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCompleteTask(taskId) {
    try {
      await completeTask(taskId);
      await loadTasks();
    } catch (err) {
      Alert.alert("Task error", err.message);
    }
  }

  return (
    <ScreenContainer>
      <Text style={styles.title}>Tasks</Text>
      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>New Task</Text>
        <AppInput
          label="Title"
          value={form.title}
          onChangeText={(value) => setForm((current) => ({ ...current, title: value }))}
          placeholder="Finish thesis section"
        />
        <AppInput
          label="Due date"
          value={form.due_date}
          onChangeText={(value) => setForm((current) => ({ ...current, due_date: value }))}
          placeholder="2026-06-01"
        />
        <AppInput
          label="Due time"
          value={form.due_time}
          onChangeText={(value) => setForm((current) => ({ ...current, due_time: value }))}
          placeholder="18:00"
        />
        <AppButton title="Add task" onPress={handleCreateTask} loading={submitting} />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? <Text style={styles.muted}>Loading tasks...</Text> : null}

      <View style={styles.list}>
        {tasks.map((task) => (
          <View key={task.task_id} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <View style={styles.itemText}>
                <Text style={styles.itemTitle}>{task.title}</Text>
                <Text style={styles.itemMeta}>
                  {task.due_date || "No due date"} {task.due_time ? `at ${task.due_time}` : ""}
                </Text>
              </View>
              <Text style={styles.status}>{task.status}</Text>
            </View>
            {task.status !== "completed" ? (
              <AppButton
                title="Mark complete"
                variant="secondary"
                onPress={() => handleCompleteTask(task.task_id)}
              />
            ) : null}
          </View>
        ))}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md
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
    color: colors.text
  },
  itemMeta: {
    fontSize: 13,
    color: colors.textMuted
  },
  status: {
    color: colors.primary,
    fontWeight: "600"
  },
  error: {
    color: colors.danger
  },
  muted: {
    color: colors.textMuted
  }
});
