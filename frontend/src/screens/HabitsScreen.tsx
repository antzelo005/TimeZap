import React, { useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import AppButton from "../components/AppButton";
import AppInput from "../components/AppInput";
import ScreenContainer from "../components/ScreenContainer";
import { createHabit, getHabitStreak, getHabits, logHabit } from "../api/habits.api";
import type { CreateHabitPayload, Habit } from "../types/habit";
import { getErrorMessage } from "../types/api";
import { formatLocalDate } from "../utils/date";
import { useAppTheme } from "../theme/useAppTheme";
import { useTranslation } from "../i18n";

export default function HabitsScreen() {
  const { colors, spacing } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors, spacing), [colors, spacing]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [streaks, setStreaks] = useState<Record<string, number>>({});
  const [form, setForm] = useState<{ title: string; start_date: string }>({
    title: "",
    start_date: ""
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    void loadHabits();
  }, []);

  async function loadHabits(): Promise<void> {
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

  async function handleCreateHabit(): Promise<void> {
    try {
      setSubmitting(true);
      const payload: CreateHabitPayload = {
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
      };

      await createHabit(payload);
      setForm({ title: "", start_date: "" });
      await loadHabits();
    } catch (err: unknown) {
      Alert.alert(t("habits.errorTitle"), getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogHabit(habitId: string): Promise<void> {
    try {
      const today = formatLocalDate(new Date());
      await logHabit(habitId, { date: today });
      await loadHabits();
    } catch (err: unknown) {
      Alert.alert(t("habits.errorTitle"), getErrorMessage(err));
    }
  }

  return (
    <ScreenContainer>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{t("habits.title")}</Text>
        <View style={styles.headerPill}>
          <Text style={styles.headerPillText}>{t("habits.streaks")}</Text>
        </View>
      </View>
      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>{t("habits.newHabit")}</Text>
        <AppInput
          label={t("habits.titleLabel")}
          value={form.title}
          onChangeText={(value) => setForm((current) => ({ ...current, title: value }))}
          placeholder={t("habits.titleLabel")}
        />
        <AppInput
          label={t("habits.startDate")}
          value={form.start_date}
          onChangeText={(value) => setForm((current) => ({ ...current, start_date: value }))}
          placeholder="2026-06-01"
        />
        <AppButton title={t("habits.addHabit")} onPress={() => void handleCreateHabit()} loading={submitting} />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? <Text style={styles.muted}>{t("habits.loading")}</Text> : null}

      <View style={styles.list}>
        {habits.map((habit) => (
          <View key={habit.habit_id} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemTitle}>{habit.title}</Text>
              <Text style={styles.streakChip}>
                {t("habits.streakDays", { count: streaks[habit.habit_id] || 0 })}
              </Text>
            </View>
            <Text style={styles.itemMeta}>
              {t("habits.startDate")}: {habit.start_date}
            </Text>
            <AppButton
              title={t("habits.logToday")}
              variant="accent"
              onPress={() => void handleLogHabit(habit.habit_id)}
            />
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
      gap: spacing.sm
    },
    itemHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: spacing.sm
    },
    itemTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.textPrimary
    },
    streakChip: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.primaryBlueDark,
      backgroundColor: colors.zapYellowSoft,
      borderRadius: 999,
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      overflow: "hidden"
    },
    itemMeta: {
      fontSize: 13,
      color: colors.textSecondary
    },
    error: {
      color: colors.danger
    },
    muted: {
      color: colors.textSecondary
    }
  });
}
