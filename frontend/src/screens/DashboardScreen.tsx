import React, { useCallback, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AppButton from "../components/AppButton";
import ScreenContainer from "../components/ScreenContainer";
import { getCalendarDay } from "../api/calendar.api";
import { getDashboardToday } from "../api/dashboard.api";
import { getHabits } from "../api/habits.api";
import { getTasks } from "../api/tasks.api";
import { useSettings } from "../context/SettingsContext";
import { useTranslation } from "../i18n";
import { useAppTheme } from "../theme/useAppTheme";
import { getErrorMessage } from "../types/api";
import type { CalendarDayResponse } from "../types/calendar";
import type { DashboardHabitItem, DashboardTaskItem, DashboardTodayResponse } from "../types/dashboard";
import type { Habit } from "../types/habit";
import type { Task } from "../types/task";
import { createLocalDate, formatLocalDate } from "../utils/date";

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

interface MetricCardProps {
  label: string;
  value: string | number;
  helper: string;
  accent?: "blue" | "yellow" | "danger";
}

interface SummaryStatProps {
  label: string;
  value: number;
  accent?: "blue" | "yellow" | "danger" | "neutral";
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

function getTaskTimeLabel(task: Task | DashboardTaskItem): string {
  if ("is_all_day" in task && task.is_all_day) {
    return "";
  }

  if (!task.due_time) {
    return "";
  }

  return task.due_time.split(":").slice(0, 2).join(":");
}

function getNextUpcomingTask(tasks: Task[], today: string): Task | null {
  const upcoming = tasks
    .filter((task) => task.status === "pending" && task.due_date && task.due_date >= today)
    .sort((first, second) => {
      const dateCompare = (first.due_date ?? "").localeCompare(second.due_date ?? "");
      if (dateCompare !== 0) {
        return dateCompare;
      }

      return (first.due_time ?? "99:99:99").localeCompare(second.due_time ?? "99:99:99");
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
  const { settings } = useSettings();
  const { colors, spacing } = useAppTheme();
  const { t, language } = useTranslation();
  const styles = useMemo(() => createStyles(colors, spacing), [colors, spacing]);
  const locale = useMemo(() => resolveLocale(language), [language]);
  const [data, setData] = useState<DashboardViewData | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const today = useMemo(() => formatLocalDate(new Date()), []);

  const loadDashboard = useCallback(
    async (isRefresh = false): Promise<void> => {
      try {
        setError("");
        if (isRefresh) {
          setRefreshing(true);
        } else {
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

        const week = weekResponses.map((day, index) =>
          calculateDayProgress(day, weekFormatter.format(weekDates[index]))
        );

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
        setRefreshing(false);
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

  const dashboard = data?.today ?? null;
  const todayTasks = dashboard?.tasks.items ?? [];
  const todayHabits = dashboard?.habits.items ?? [];
  const pendingToday = todayTasks.filter((task) => task.status === "pending");
  const completedToday = todayTasks.filter((task) => task.status === "completed");
  const overdueTasks = data?.tasks.filter((task) => task.is_overdue && task.status === "pending") ?? [];
  const nextTask = data ? getNextUpcomingTask(data.tasks, today) : null;
  const activeHabits = data?.habits.filter((habit) => habit.status === "active") ?? [];
  const archivedHabits = data?.habits.filter((habit) => habit.status === "archived") ?? [];
  const loggedToday = todayHabits.filter((habit) => habit.completed_today);
  const notLoggedToday = todayHabits.filter((habit) => !habit.completed_today);
  const nextHabit = notLoggedToday[0] ?? null;
  const weeklyTotal = data?.week.reduce((total, item) => total + item.total, 0) ?? 0;
  const weeklyCompleted = data?.week.reduce((total, item) => total + item.completed, 0) ?? 0;
  const weeklyPercent = weeklyTotal > 0 ? Math.round((weeklyCompleted / weeklyTotal) * 100) : 0;

  function renderMetricCard({ label, value, helper, accent = "blue" }: MetricCardProps) {
    return (
      <View style={styles.metricCard}>
        <View style={styles.metricHeader}>
          <Text style={styles.metricLabel}>{label}</Text>
          <View
            style={[
              styles.metricAccent,
              accent === "yellow" ? styles.metricAccentYellow : null,
              accent === "danger" ? styles.metricAccentDanger : null
            ]}
          >
            <Text
              style={[
                styles.metricAccentText,
                accent === "danger" ? styles.metricAccentTextDanger : null
              ]}
            >
              {accent === "yellow" ? "⚡" : accent === "danger" ? "!" : "✓"}
            </Text>
          </View>
        </View>
        <Text
          style={[
            styles.metricValue,
            accent === "yellow" ? styles.metricValueYellow : null,
            accent === "danger" ? styles.metricValueDanger : null
          ]}
        >
          {value}
        </Text>
        <Text style={styles.metricHelper}>{helper}</Text>
      </View>
    );
  }

  function renderSummaryStat({ label, value, accent = "neutral" }: SummaryStatProps) {
    return (
      <View style={styles.summaryStat}>
        <Text
          style={[
            styles.summaryValue,
            accent === "blue" ? styles.summaryValueBlue : null,
            accent === "yellow" ? styles.summaryValueYellow : null,
            accent === "danger" ? styles.summaryValueDanger : null
          ]}
        >
          {value}
        </Text>
        <Text style={styles.summaryLabel}>{label}</Text>
      </View>
    );
  }

  function renderTaskItem(task: Task | DashboardTaskItem, fallbackDate?: string) {
    const time = getTaskTimeLabel(task);
    const dueDate = task.due_date ?? fallbackDate ?? t("tasks.noDueDate");

    return (
      <View key={task.task_id} style={styles.compactItem}>
        <Text style={styles.compactItemTitle}>{task.title}</Text>
        <Text style={styles.compactItemMeta}>{time ? `${dueDate} / ${time}` : dueDate}</Text>
      </View>
    );
  }

  function renderHabitItem(habit: DashboardHabitItem) {
    return (
      <View key={habit.habit_id} style={styles.compactItem}>
        <Text style={styles.compactItemTitle}>{habit.title}</Text>
        <Text style={styles.compactItemMeta}>
          {habit.completed_today ? t("dashboard.completedToday") : t("habits.notLoggedToday")}
        </Text>
      </View>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.headerRow}>
        <View style={styles.zapBadge}>
          <Text style={styles.zapText}>⚡</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{t("dashboard.title")}</Text>
          <Text style={styles.subtitle}>{t("dashboard.subtitle")}</Text>
        </View>
      </View>

      <View style={styles.refreshRow}>
        <Text style={styles.dateText}>{dashboard?.date ?? today}</Text>
        <AppButton
          title={refreshing ? t("common.loading") : t("common.refresh")}
          variant="secondary"
          onPress={() => void loadDashboard(true)}
          loading={refreshing}
          style={styles.refreshButton}
        />
      </View>

      {error ? (
        <View style={styles.messageCard}>
          <Text style={styles.errorText}>{error}</Text>
          <AppButton title={t("common.retry")} onPress={() => void loadDashboard()} variant="secondary" />
        </View>
      ) : null}

      {loading && !data ? <Text style={styles.muted}>{t("common.loading")}</Text> : null}

      {dashboard && data ? (
        <>
          <View style={[styles.metricGrid, isWide ? styles.metricGridWide : null]}>
            <View style={[styles.metricGridItem, isWide ? styles.metricGridItemWide : null]}>
              {renderMetricCard({
                label: t("dashboard.tasksToday"),
                value: `${dashboard.tasks.completed}/${dashboard.tasks.total}`,
                helper: t("dashboard.tasksTodayHelper", { count: pendingToday.length })
              })}
            </View>
            <View style={[styles.metricGridItem, isWide ? styles.metricGridItemWide : null]}>
              {renderMetricCard({
                label: t("dashboard.habitsToday"),
                value: `${dashboard.habits.completed}/${dashboard.habits.total}`,
                helper: t("dashboard.habitsTodayHelper", { count: notLoggedToday.length }),
                accent: "yellow"
              })}
            </View>
            <View style={[styles.metricGridItem, isWide ? styles.metricGridItemWide : null]}>
              {renderMetricCard({
                label: t("dashboard.currentStreak"),
                value: dashboard.current_streak,
                helper: t("dashboard.bestActiveRun"),
                accent: "yellow"
              })}
            </View>
          </View>

          <View style={[styles.overviewGrid, isWide ? styles.overviewGridWide : null]}>
            <View style={styles.panel}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t("dashboard.taskSummary")}</Text>
                {overdueTasks.length > 0 ? (
                  <Text style={styles.dangerPill}>
                    {t("dashboard.overdueCount", { count: overdueTasks.length })}
                  </Text>
                ) : null}
              </View>
              <View style={styles.summaryStatsRow}>
                {renderSummaryStat({ label: t("dashboard.pendingToday"), value: pendingToday.length, accent: "blue" })}
                {renderSummaryStat({
                  label: t("dashboard.completedTodayTasks"),
                  value: completedToday.length,
                  accent: "blue"
                })}
                {renderSummaryStat({ label: t("dashboard.overdueTasks"), value: overdueTasks.length, accent: "danger" })}
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
            </View>

            <View style={styles.panel}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t("dashboard.habitSummary")}</Text>
                <Text style={styles.zapPill}>{t("dashboard.streakLabel", { count: dashboard.current_streak })}</Text>
              </View>
              <View style={styles.summaryStatsRow}>
                {renderSummaryStat({ label: t("dashboard.activeHabits"), value: activeHabits.length, accent: "yellow" })}
                {renderSummaryStat({ label: t("dashboard.loggedToday"), value: loggedToday.length, accent: "yellow" })}
                {renderSummaryStat({
                  label: t("dashboard.notLoggedToday"),
                  value: notLoggedToday.length,
                  accent: "neutral"
                })}
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
              {archivedHabits.length > 0 ? (
                <Text style={styles.muted}>{t("dashboard.archivedHabitsCount", { count: archivedHabits.length })}</Text>
              ) : null}
            </View>
          </View>

          <View style={styles.panel}>
            <View style={styles.sectionHeader}>
              <View>
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
                <View key={item.date} style={styles.weekRow}>
                  <Text style={styles.weekLabel}>{item.label}</Text>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${item.percent}%` }]} />
                  </View>
                  <Text style={styles.weekValue}>
                    {item.completed}/{item.total}
                  </Text>
                </View>
              ))}
            </View>
          </View>
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
      alignItems: "center",
      gap: spacing.sm
    },
    headerText: {
      flex: 1,
      gap: spacing.xs
    },
    title: {
      fontSize: 30,
      fontWeight: "700",
      color: colors.textPrimary
    },
    zapBadge: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.zapYellowSoft,
      borderWidth: 1,
      borderColor: colors.zapYellow
    },
    zapText: {
      color: colors.primaryBlueDark,
      fontSize: 15,
      fontWeight: "800"
    },
    subtitle: {
      fontSize: 15,
      color: colors.textSecondary
    },
    refreshRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md
    },
    dateText: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.textSecondary
    },
    refreshButton: {
      minWidth: 140
    },
    metricGrid: {
      gap: spacing.md
    },
    metricGridWide: {
      flexDirection: "row",
      alignItems: "stretch"
    },
    metricGridItem: {
      width: "100%"
    },
    metricGridItemWide: {
      flex: 1
    },
    metricCard: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.xs
    },
    metricHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: spacing.md
    },
    metricAccent: {
      backgroundColor: colors.primaryBlueUltraSoft,
      borderWidth: 1,
      borderColor: colors.primaryBlueSoft,
      borderRadius: 999,
      minWidth: 28,
      height: 28,
      alignItems: "center",
      justifyContent: "center"
    },
    metricAccentYellow: {
      backgroundColor: colors.zapYellowSoft,
      borderColor: colors.zapYellow
    },
    metricAccentDanger: {
      backgroundColor: colors.dangerSoft,
      borderColor: colors.danger
    },
    metricAccentText: {
      color: colors.primaryBlueDark,
      fontWeight: "800"
    },
    metricAccentTextDanger: {
      color: colors.danger
    },
    metricValue: {
      fontSize: 30,
      fontWeight: "800",
      color: colors.primaryBlueDark
    },
    metricValueYellow: {
      color: colors.primaryBlueDark
    },
    metricValueDanger: {
      color: colors.danger
    },
    metricLabel: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.textPrimary
    },
    metricHelper: {
      fontSize: 13,
      color: colors.textSecondary
    },
    overviewGrid: {
      gap: spacing.md
    },
    overviewGridWide: {
      flexDirection: "row",
      alignItems: "flex-start"
    },
    panel: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.md
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: spacing.md
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
    summaryStat: {
      flex: 1,
      minWidth: 100,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
      padding: spacing.sm,
      gap: 4
    },
    summaryValue: {
      fontSize: 22,
      fontWeight: "800",
      color: colors.textPrimary
    },
    summaryValueBlue: {
      color: colors.primaryBlueDark
    },
    summaryValueYellow: {
      color: colors.primaryBlueDark
    },
    summaryValueDanger: {
      color: colors.danger
    },
    summaryLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.textSecondary
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
    zapPill: {
      borderRadius: 999,
      overflow: "hidden",
      backgroundColor: colors.zapYellowSoft,
      color: colors.primaryBlueDark,
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
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm
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
