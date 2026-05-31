import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import AppButton from "../components/AppButton";
import AppInput from "../components/AppInput";
import ScreenContainer from "../components/ScreenContainer";
import { createHabit, getHabitStreak, getHabits, logHabit } from "../api/habits.api";
import colors from "../theme/colors";
import spacing from "../theme/spacing";

export default function HabitsScreen() {
  const [habits, setHabits] = useState([]);
  const [streaks, setStreaks] = useState({});
  const [form, setForm] = useState({
    title: "",
    start_date: ""
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadHabits();
  }, []);

  async function loadHabits() {
    try {
      setError("");
      setLoading(true);
      const response = await getHabits();
      const items = response.items || [];
      setHabits(items);

      const streakEntries = await Promise.all(
        items.map(async (habit) => {
          try {
            const streak = await getHabitStreak(habit.habit_id);
            return [habit.habit_id, streak.current_streak];
          } catch (err) {
            return [habit.habit_id, 0];
          }
        })
      );

      setStreaks(Object.fromEntries(streakEntries));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateHabit() {
    try {
      setSubmitting(true);
      await createHabit({
        title: form.title,
        start_date: form.start_date,
        rule: {
          recurrence_type: "daily",
          interval_value: 1,
          target_count: 1,
          target_period: null,
          week_start: "monday",
          days: []
        }
      });
      setForm({ title: "", start_date: "" });
      await loadHabits();
    } catch (err) {
      Alert.alert("Habit error", err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogHabit(habitId) {
    try {
      const today = new Date().toISOString().slice(0, 10);
      await logHabit(habitId, { date: today });
      await loadHabits();
    } catch (err) {
      Alert.alert("Habit error", err.message);
    }
  }

  return (
    <ScreenContainer>
      <Text style={styles.title}>Habits</Text>
      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>New Habit</Text>
        <AppInput
          label="Title"
          value={form.title}
          onChangeText={(value) => setForm((current) => ({ ...current, title: value }))}
          placeholder="Read for 20 minutes"
        />
        <AppInput
          label="Start date"
          value={form.start_date}
          onChangeText={(value) => setForm((current) => ({ ...current, start_date: value }))}
          placeholder="2026-06-01"
        />
        <AppButton title="Add habit" onPress={handleCreateHabit} loading={submitting} />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? <Text style={styles.muted}>Loading habits...</Text> : null}

      <View style={styles.list}>
        {habits.map((habit) => (
          <View key={habit.habit_id} style={styles.itemCard}>
            <Text style={styles.itemTitle}>{habit.title}</Text>
            <Text style={styles.itemMeta}>Start date: {habit.start_date}</Text>
            <Text style={styles.itemMeta}>Current streak: {streaks[habit.habit_id] || 0}</Text>
            <AppButton
              title="Log today"
              variant="secondary"
              onPress={() => handleLogHabit(habit.habit_id)}
            />
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
    gap: spacing.sm
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
  error: {
    color: colors.danger
  },
  muted: {
    color: colors.textMuted
  }
});
