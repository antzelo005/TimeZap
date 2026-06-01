import React, { useEffect, useMemo, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { getCalendarDay } from "../api/calendar.api";
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
import ScreenContainer from "../components/ScreenContainer";
import { useTranslation } from "../i18n";
import { useAppTheme } from "../theme/useAppTheme";
import { getErrorMessage } from "../types/api";
import type { CreateHabitPayload, Habit, HabitRecurrenceType, HabitStatus } from "../types/habit";
import { formatLocalDate } from "../utils/date";

type HabitFilter = "all" | "active" | "logged" | "not_logged" | "archived";

interface HabitFormState {
  title: string;
  description: string;
  start_date: string;
  emoji: string;
  color: string;
  recurrence_type: HabitRecurrenceType;
  interval_value: string;
  target_count: string;
  week_start: "monday" | "sunday";
  selected_weekdays: number[];
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
    emoji: "",
    color: "",
    recurrence_type: "daily",
    interval_value: "1",
    target_count: "1",
    week_start: "monday",
    selected_weekdays: []
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
    emoji: habit.emoji ?? "",
    color: habit.color ?? "",
    recurrence_type: rule?.recurrence_type ?? "daily",
    interval_value: String(rule?.interval_value ?? 1),
    target_count: String(rule?.target_count ?? 1),
    week_start: rule?.week_start ?? "monday",
    selected_weekdays:
      rule?.days
        .map((day) => day.day_of_week)
        .filter((day): day is number => typeof day === "number") ?? []
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

function sortHabits(habits: Habit[]): Habit[] {
  return [...habits].sort((first, second) => {
    if (first.status !== second.status) {
      return first.status === "active" ? -1 : 1;
    }

    return first.created_at < second.created_at ? 1 : -1;
  });
}

export default function HabitsScreen() {
  const { colors, spacing } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors, spacing), [colors, spacing]);
  const today = useMemo(() => formatLocalDate(new Date()), []);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [streaks, setStreaks] = useState<Record<string, number>>({});
  const [loggedToday, setLoggedToday] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState<HabitFormState>(() => getDefaultForm());
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<HabitFilter>("active");
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [actionHabitId, setActionHabitId] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [formError, setFormError] = useState<string>("");

  useEffect(() => {
    void loadHabits();
  }, []);

  const sortedHabits = useMemo(() => sortHabits(habits), [habits]);
  const activeHabits = sortedHabits.filter((habit) => habit.status === "active");
  const archivedHabits = sortedHabits.filter((habit) => habit.status === "archived");
  const loggedHabits = activeHabits.filter((habit) => loggedToday[habit.habit_id]);
  const notLoggedHabits = activeHabits.filter((habit) => !loggedToday[habit.habit_id]);
  const visibleHabits = useMemo(() => {
    if (activeFilter === "all") {
      return sortedHabits;
    }

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
  }, [activeFilter, activeHabits, archivedHabits, loggedHabits, notLoggedHabits, sortedHabits]);

  const filterOptions: Array<{ key: HabitFilter; label: string }> = [
    { key: "all", label: t("habits.filterAll") },
    { key: "active", label: t("habits.filterActive") },
    { key: "logged", label: t("habits.filterLoggedToday") },
    { key: "not_logged", label: t("habits.filterNotLoggedToday") },
    { key: "archived", label: t("habits.filterArchived") }
  ];

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
      const [habitResponse, todayResponse] = await Promise.all([getHabits(), getCalendarDay(today)]);
      const items = habitResponse.items || [];
      setHabits(items);
      setLoggedToday(
        Object.fromEntries(todayResponse.habits.map((habit) => [habit.habit_id, habit.completed]))
      );

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

  function resetForm(): void {
    setForm(getDefaultForm());
    setEditingHabitId(null);
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

      if (editingHabitId) {
        await updateHabit(editingHabitId, payload);
      } else {
        await createHabit(payload);
      }

      resetForm();
      await loadHabits();
    } catch (err: unknown) {
      Alert.alert(t("habits.errorTitle"), getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  function handleEditHabit(habit: Habit): void {
    setEditingHabitId(habit.habit_id);
    setForm(habitToForm(habit));
    setFormError("");
  }

  async function runHabitAction(habitId: string, action: () => Promise<unknown>): Promise<void> {
    try {
      setActionHabitId(habitId);
      setError("");
      await action();
      await loadHabits();
    } catch (err: unknown) {
      Alert.alert(t("habits.errorTitle"), getErrorMessage(err));
    } finally {
      setActionHabitId(null);
    }
  }

  async function handleLogHabit(habitId: string): Promise<void> {
    if (loggedToday[habitId]) {
      return;
    }

    await runHabitAction(habitId, () => logHabit(habitId, { date: today }));
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
    await runHabitAction(habit.habit_id, () => updateHabit(habit.habit_id, payload));
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
      resetForm();
    }

    await runHabitAction(habit.habit_id, () => deleteHabit(habit.habit_id));
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
    if (activeFilter === "active") {
      return t("habits.noActiveHabits");
    }

    if (activeFilter === "logged") {
      return t("habits.noLoggedToday");
    }

    if (activeFilter === "not_logged") {
      return t("habits.noNotLoggedToday");
    }

    if (activeFilter === "archived") {
      return t("habits.noArchivedHabits");
    }

    return t("habits.noHabits");
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
    const isLoggedToday = Boolean(loggedToday[habit.habit_id]);
    const isBusy = actionHabitId === habit.habit_id;

    return (
      <View
        key={habit.habit_id}
        style={[styles.itemCard, isArchived ? styles.itemCardArchived : null]}
      >
        <View style={styles.itemHeader}>
          <View style={styles.itemText}>
            <View style={styles.titleRow}>
              {habit.color ? <View style={[styles.colorDot, { backgroundColor: habit.color }]} /> : null}
              <Text style={[styles.itemTitle, isArchived ? styles.itemTitleMuted : null]}>
                {habit.emoji ? `${habit.emoji} ${habit.title}` : habit.title}
              </Text>
            </View>
            {habit.description ? <Text style={styles.itemDescription}>{habit.description}</Text> : null}
            <Text style={styles.itemMeta}>
              {getRecurrenceLabel(habit)} • {t("habits.startDate")}: {habit.start_date}
            </Text>
          </View>
          <View style={styles.cardChips}>
            <Text style={styles.streakChip}>
              {t("habits.streakDays", { count: streaks[habit.habit_id] || 0 })}
            </Text>
            <Text style={[styles.statusChip, isLoggedToday ? styles.statusLogged : styles.statusPending]}>
              {isArchived
                ? t("habits.archived")
                : isLoggedToday
                  ? t("habits.loggedToday")
                  : t("habits.notLoggedToday")}
            </Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          {!isArchived ? (
            <Pressable
              disabled={isBusy || isLoggedToday}
              onPress={() => void handleLogHabit(habit.habit_id)}
              style={({ pressed }) => [
                styles.actionButton,
                isLoggedToday ? styles.actionSecondary : styles.actionAccent,
                isBusy || isLoggedToday ? styles.actionDisabled : null,
                pressed ? styles.actionPressed : null
              ]}
            >
              <Text style={isLoggedToday ? styles.actionSecondaryText : styles.actionAccentText}>
                {isLoggedToday ? t("habits.loggedToday") : t("habits.logToday")}
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            disabled={isBusy}
            onPress={() => handleEditHabit(habit)}
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

  return (
    <ScreenContainer>
      <View style={styles.headerRow}>
        <View>
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

      <View style={styles.formCard}>
        <View style={styles.formHeader}>
          <Text style={styles.sectionTitle}>
            {editingHabitId ? t("habits.editHabitTitle") : t("habits.newHabit")}
          </Text>
          {editingHabitId ? (
            <Pressable onPress={resetForm} style={styles.clearEditButton}>
              <Text style={styles.clearEditButtonText}>{t("common.cancel")}</Text>
            </Pressable>
          ) : null}
        </View>

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

        <View style={styles.formRow}>
          <View style={styles.formColumn}>
            <AppInput
              label={t("habits.startDate")}
              value={form.start_date}
              onChangeText={(value) => setForm((current) => ({ ...current, start_date: value }))}
              placeholder={today}
            />
          </View>
          <View style={styles.formColumn}>
            <AppInput
              label={t("habits.emojiLabel")}
              value={form.emoji}
              onChangeText={(value) => setForm((current) => ({ ...current, emoji: value }))}
              placeholder="⚡"
            />
          </View>
          <View style={styles.formColumn}>
            <AppInput
              label={t("habits.colorLabel")}
              value={form.color}
              onChangeText={(value) => setForm((current) => ({ ...current, color: value }))}
              placeholder="#2563EB"
            />
          </View>
        </View>

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
          {form.recurrence_type === "daily" ? (
            <Text style={styles.settingHint}>{t("habits.dailySupportedNote")}</Text>
          ) : (
            <Text style={styles.settingHint}>{t("habits.advancedRecurrenceNote")}</Text>
          )}
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

        <AppButton
          title={editingHabitId ? t("habits.saveChanges") : t("habits.addHabit")}
          onPress={() => void handleSubmitHabit()}
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
          <View style={styles.emptyCard}>
            <Text style={styles.muted}>{getEmptyMessage()}</Text>
          </View>
        ) : (
          visibleHabits.map(renderHabit)
        )}
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
    formRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.md
    },
    formColumn: {
      flex: 1,
      minWidth: 190
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
      minHeight: 36,
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
    emptyCard: {
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: spacing.md
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
