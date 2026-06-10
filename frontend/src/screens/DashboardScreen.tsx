import React, { useCallback, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import AppButton from "../components/AppButton";
import SectionCard from "../components/SectionCard";
import ScreenContainer from "../components/ScreenContainer";
import StatCard from "../components/StatCard";
import { getCalendarDay } from "../api/calendar.api";
import { getDashboardToday } from "../api/dashboard.api";
import { getHabits } from "../api/habits.api";
import { getTasks } from "../api/tasks.api";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { useTranslation } from "../i18n";
import { subscribeDashboardChanged } from "../services/appEvents";
import { useAppTheme } from "../theme/useAppTheme";
import { getErrorMessage } from "../types/api";
import type { CalendarDayResponse } from "../types/calendar";
import type { DashboardHabitItem, DashboardTaskItem, DashboardTodayResponse } from "../types/dashboard";
import type { Habit } from "../types/habit";
import type { MainTabParamList } from "../types/navigation";
import type { Task } from "../types/task";
import { createLocalDate, formatLocalDate } from "../utils/date";
import { formatTimeRangeForDisplay } from "../utils/time";

interface WeeklyProgressItem {
  date: string;
  label: string;
  completed: number;
  total: number;
  percent: number;
}

interface DashboardViewData {
  today: DashboardTodayResponse;
  tasks: Task[];
  habits: Habit[];
  week: WeeklyProgressItem[];
}

function resolveLocale(language: string): string {
  if (language === "el") {
    return "el-GR";
  }

  if (language === "ro") {
    return "ro-RO";
  }

  return "en-US";
}

function getWeekDates(today: Date, weekStartsOn: "monday" | "sunday"): Date[] {
  const weekOffset = weekStartsOn === "monday" ? 1 : 0;
  const startOffset = (today.getDay() - weekOffset + 7) % 7;
  const weekStart = createLocalDate(today.getFullYear(), today.getMonth(), today.getDate() - startOffset);

  return Array.from({ length: 7 }, (_, index) =>
    createLocalDate(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + index)
  );
}

function getTaskTimeLabel(task: Task | DashboardTaskItem, timeFormat: "12h" | "24h"): string {
  if ("is_all_day" in task && task.is_all_day) {
    return "";
  }

  return formatTimeRangeForDisplay(task.start_time || task.due_time, task.end_time, timeFormat);
}

function getNextUpcomingTask(tasks: Task[], today: string): Task | null {
  const upcoming = tasks
    .filter((task) => task.status === "pending" && task.due_date && (task.end_date || task.due_date) >= today)
    .sort((first, second) => {
      const firstActiveDate = first.due_date && first.due_date <= today ? today : first.due_date ?? "";
      const secondActiveDate = second.due_date && second.due_date <= today ? today : second.due_date ?? "";
      const dateCompare = firstActiveDate.localeCompare(secondActiveDate);
      if (dateCompare !== 0) {
        return dateCompare;
      }

      return (first.start_time ?? first.due_time ?? "99:99:99").localeCompare(second.start_time ?? second.due_time ?? "99:99:99");
    });

  return upcoming[0] ?? null;
}

function calculateDayProgress(day: CalendarDayResponse, label: string): WeeklyProgressItem {
  const completedTasks = day.tasks.filter((task) => task.status === "completed").length;
  const completedHabits = day.habits.filter((habit) => habit.completed).length;
  const completed = completedTasks + completedHabits;
  const total = day.tasks.length + day.habits.length;

  return {
    date: day.date,
    label,
    completed,
    total,
    percent: total > 0 ? Math.round((completed / total) * 100) : 0
  };
}

export default function DashboardScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const hasLoadedOnce = useRef<boolean>(false);
  const { user } = useAuth();
  const { settings } = useSettings();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList, "Dashboard">>();
  const { colors, spacing } = useAppTheme();
  const { t, language } = useTranslation();
  const styles = useMemo(() => createStyles(colors, spacing), [colors, spacing]);
  const locale = useMemo(() => resolveLocale(language), [language]);
  const [data, setData] = useState<DashboardViewData | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const today = useMemo(() => formatLocalDate(new Date()), []);

  const loadDashboard = useCallback(
    async (silent = false): Promise<void> => {
      try {
        setError("");
        if (!silent) {
          setLoading(true);
        }

        const weekDates = getWeekDates(new Date(), settings.week_starts_on);
        const weekFormatter = new Intl.DateTimeFormat(locale, { weekday: "short" });
        const [todayResponse, tasksResponse, habitsResponse, ...weekResponses] = await Promise.all([
          getDashboardToday(),
          getTasks(),
          getHabits(),
          ...weekDates.map((date) => getCalendarDay(formatLocalDate(date)))
        ]);

        const week = weekResponses.map((day, index) => calculateDayProgress(day, weekFormatter.format(weekDates[index])));

        setData({
          today: todayResponse,
          tasks: tasksResponse.items ?? [],
          habits: habitsResponse.items ?? [],
          week
        });
      } catch (err: unknown) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [locale, settings.week_starts_on]
  );

  useFocusEffect(
    useCallback(() => {
      void loadDashboard(hasLoadedOnce.current);
      hasLoadedOnce.current = true;
    }, [loadDashboard])
  );

  React.useEffect(() => subscribeDashboardChanged(() => void loadDashboard(true)), [loadDashboard]);

  const dashboard = data?.today ?? null;
  const todayTasks = dashboard?.tasks.items ?? [];
  const todayHabits = dashboard?.habits.items ?? [];
  const pendingToday = todayTasks.filter((task) => task.status === "pending");
  const completedToday = todayTasks.filter((task) => task.status === "completed");
  const overdueTasks = data?.tasks.filter((task) => task.is_overdue && task.status === "pending") ?? [];
  const nextTask = data ? getNextUpcomingTask(data.tasks, today) : null;
  const activeHabits = data?.habits.filter((habit) => habit.status === "active") ?? [];
  const loggedToday = todayHabits.filter((habit) => habit.completed_today);
  const notLoggedToday = todayHabits.filter((habit) => !habit.completed_today);
  const nextHabit = notLoggedToday[0] ?? null;
  const weeklyTotal = data?.week.reduce((total, item) => total + item.total, 0) ?? 0;
  const weeklyCompleted = data?.week.reduce((total, item) => total + item.completed, 0) ?? 0;
  const weeklyPercent = weeklyTotal > 0 ? Math.round((weeklyCompleted / weeklyTotal) * 100) : 0;
  const displayName = "display_name" in (user ?? {}) ? String((user as { display_name?: string }).display_name ?? "") : "";

  function renderTaskItem(task: Task | DashboardTaskItem, fallbackDate?: string) {
    const time = getTaskTimeLabel(task, settings.time_format);
    const dueDate =
      task.due_date && task.end_date && task.end_date !== task.due_date
        ? `${task.due_date} -> ${task.end_date}`
        : task.due_date ?? fallbackDate ?? t("tasks.noDueDate");

    return (
      <Pressable
        key={task.task_id}
        onPress={() => navigation.navigate("Tasks", task.due_date ? { selectedDate: task.due_date } : undefined)}
        style={({ pressed }) => [styles.compactItem, pressed ? styles.compactItemPressed : null]}
      >
        <Text style={styles.compactItemTitle}>{task.title}</Text>
        <Text style={styles.compactItemMeta}>{time ? `${dueDate} / ${time}` : dueDate}</Text>
      </Pressable>
    );
  }

  function renderHabitItem(habit: DashboardHabitItem) {
    const statusLabel = habit.completed_today ? t("dashboard.completedToday") : t("habits.notLoggedToday");
    const timeRange = formatTimeRangeForDisplay(habit.start_time, habit.end_time, settings.time_format);

    return (
      <Pressable
        key={habit.habit_id}
        onPress={() => navigation.navigate("Habits", { selectedDate: dashboard?.date ?? today })}
        style={({ pressed }) => [styles.compactItem, pressed ? styles.compactItemPressed : null]}
      >
        <Text style={styles.compactItemTitle}>{habit.title}</Text>
        <Text style={styles.compactItemMeta}>{timeRange ? `${statusLabel} / ${timeRange}` : statusLabel}</Text>
      </Pressable>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.greeting}>
            {displayName ? t("dashboard.welcomeName", { name: displayName }) : t("dashboard.welcomeBack")}
          </Text>
          <Text style={styles.title}>{t("dashboard.title")}</Text>
          <Text style={styles.subtitle}>{t("dashboard.subtitle")}</Text>
        </View>
      </View>

      <Text style={styles.dateText}>{dashboard?.date ?? today}</Text>

      {error ? (
        <View style={styles.messageCard}>
          <Text style={styles.errorText}>{error}</Text>
          <AppButton title={t("common.retry")} onPress={() => void loadDashboard()} variant="secondary" />
        </View>
      ) : null}

      {loading && !data ? <Text style={styles.muted}>{t("common.loading")}</Text> : null}

      {dashboard && data ? (
        <>
          <View style={[styles.overviewGrid, isWide ? styles.overviewGridWide : null]}>
            <SectionCard onPress={() => navigation.navigate("Tasks")}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t("dashboard.taskSummary")}</Text>
                {overdueTasks.length > 0 ? (
                  <Text style={styles.dangerPill}>{t("dashboard.overdueCount", { count: overdueTasks.length })}</Text>
                ) : null}
              </View>
              <View style={styles.summaryStatsRow}>
                <StatCard label={t("dashboard.pendingToday")} value={pendingToday.length} accent="blue" />
                <StatCard label={t("dashboard.completedTodayTasks")} value={completedToday.length} accent="blue" />
                <StatCard label={t("dashboard.overdueTasks")} value={overdueTasks.length} accent="danger" />
                <StatCard label={t("dashboard.totalToday")} value={dashboard.tasks.total} />
              </View>
              <View style={styles.subsection}>
                <Text style={styles.subsectionTitle}>{t("dashboard.nextUpcomingTask")}</Text>
                {nextTask ? renderTaskItem(nextTask) : <Text style={styles.muted}>{t("dashboard.noUpcomingItems")}</Text>}
              </View>
              <View style={styles.subsection}>
                <Text style={styles.subsectionTitle}>{t("dashboard.todayTaskList")}</Text>
                {todayTasks.length === 0 ? (
                  <Text style={styles.muted}>{t("dashboard.noTasksToday")}</Text>
                ) : (
                  todayTasks.slice(0, 4).map((task) => renderTaskItem(task, dashboard.date))
                )}
              </View>
            </SectionCard>

            <SectionCard onPress={() => navigation.navigate("Habits")}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t("dashboard.habitSummary")}</Text>
              </View>
              <View style={styles.summaryStatsRow}>
                <StatCard label={t("dashboard.activeHabits")} value={activeHabits.length} accent="yellow" />
                <StatCard label={t("dashboard.loggedToday")} value={loggedToday.length} accent="yellow" />
                <StatCard label={t("dashboard.notLoggedToday")} value={notLoggedToday.length} />
                <StatCard label={t("dashboard.totalToday")} value={dashboard.habits.total} />
              </View>
              <View style={styles.subsection}>
                <Text style={styles.subsectionTitle}>{t("dashboard.nextHabitToLog")}</Text>
                {nextHabit ? renderHabitItem(nextHabit) : <Text style={styles.muted}>{t("dashboard.noUpcomingItems")}</Text>}
              </View>
              <View style={styles.subsection}>
                <Text style={styles.subsectionTitle}>{t("dashboard.todayHabitList")}</Text>
                {todayHabits.length === 0 ? (
                  <Text style={styles.muted}>{t("dashboard.noHabitsToday")}</Text>
                ) : (
                  todayHabits.slice(0, 4).map(renderHabitItem)
                )}
              </View>
            </SectionCard>
          </View>

          <SectionCard>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderCopy}>
                <Text style={styles.sectionTitle}>{t("dashboard.weeklyProgress")}</Text>
                <Text style={styles.muted}>
                  {weeklyTotal > 0
                    ? t("dashboard.weeklyProgressSummary", {
                        completed: weeklyCompleted,
                        total: weeklyTotal,
                        percent: weeklyPercent
                      })
                    : t("dashboard.noWeeklyActivity")}
                </Text>
              </View>
              <Text style={styles.percentPill}>{weeklyPercent}%</Text>
            </View>
            <View style={styles.weekRows}>
              {data.week.map((item) => (
                <Pressable
                  key={item.date}
                  onPress={() => navigation.navigate("Calendar", { selectedDate: item.date })}
                  style={({ pressed }) => [styles.weekRow, pressed ? styles.weekRowPressed : null]}
                >
                  <Text style={styles.weekLabel}>{item.label}</Text>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${item.percent}%` }]} />
                  </View>
                  <Text style={styles.weekValue}>
                    {item.completed}/{item.total}
                  </Text>
                </Pressable>
              ))}
            </View>
          </SectionCard>
        </>
      ) : null}
    </ScreenContainer>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>["colors"],
  spacing: ReturnType<typeof useAppTheme>["spacing"]
) {
  return StyleSheet.create({
    headerRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.md
    },
    headerText: {
      flex: 1,
      gap: spacing.xs
    },
    greeting: {
      fontSize: 13,
      fontWeight: "800",
      color: colors.primaryBlueDark
    },
    title: {
      fontSize: 30,
      fontWeight: "700",
      color: colors.textPrimary
    },
    subtitle: {
      fontSize: 15,
      color: colors.textSecondary,
      lineHeight: 21
    },
    dateText: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.textSecondary
    },
    overviewGrid: {
      gap: spacing.md
    },
    overviewGridWide: {
      flexDirection: "row",
      alignItems: "stretch"
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: spacing.md
    },
    sectionHeaderCopy: {
      flex: 1,
      gap: spacing.xs
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.textPrimary
    },
    summaryStatsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm
    },
    subsection: {
      gap: spacing.sm
    },
    subsectionTitle: {
      fontSize: 14,
      fontWeight: "800",
      color: colors.textPrimary
    },
    compactItem: {
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
      padding: spacing.sm,
      gap: 4
    },
    compactItemPressed: {
      borderColor: colors.primaryBlueSoft
    },
    compactItemTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.textPrimary
    },
    compactItemMeta: {
      fontSize: 12,
      color: colors.textSecondary
    },
    dangerPill: {
      borderRadius: 999,
      overflow: "hidden",
      backgroundColor: colors.dangerSoft,
      color: colors.danger,
      fontSize: 12,
      fontWeight: "800",
      paddingHorizontal: spacing.sm,
      paddingVertical: 6
    },
    percentPill: {
      borderRadius: 999,
      overflow: "hidden",
      backgroundColor: colors.primaryBlueUltraSoft,
      color: colors.primaryBlueDark,
      fontSize: 13,
      fontWeight: "800",
      paddingHorizontal: spacing.sm,
      paddingVertical: 6
    },
    weekRows: {
      gap: spacing.sm
    },
    weekRow: {
      minHeight: 42,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm
    },
    weekRowPressed: {
      opacity: 0.78
    },
    weekLabel: {
      width: 42,
      fontSize: 12,
      fontWeight: "800",
      color: colors.textSecondary,
      textTransform: "capitalize"
    },
    progressTrack: {
      flex: 1,
      height: 10,
      borderRadius: 999,
      overflow: "hidden",
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.border
    },
    progressFill: {
      height: "100%",
      borderRadius: 999,
      backgroundColor: colors.primaryBlue
    },
    weekValue: {
      width: 46,
      textAlign: "right",
      fontSize: 12,
      fontWeight: "800",
      color: colors.textSecondary
    },
    messageCard: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.md
    },
    muted: {
      color: colors.textSecondary,
      fontSize: 14
    },
    errorText: {
      color: colors.danger,
      fontSize: 14
    }
  });
}
