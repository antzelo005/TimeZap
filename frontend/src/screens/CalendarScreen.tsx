import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import AppButton from "../components/AppButton";
import ScreenContainer from "../components/ScreenContainer";
import { getCalendarDay, getCalendarMonth } from "../api/calendar.api";
import { useTranslation } from "../i18n";
import { useSettings } from "../context/SettingsContext";
import { useAppTheme } from "../theme/useAppTheme";
import type {
  CalendarDayResponse,
  CalendarHabitItem,
  CalendarMonthResponse,
  CalendarTaskItem
} from "../types/calendar";
import { getErrorMessage } from "../types/api";
import { createLocalDate, formatLocalDate, getLocalMonthStart } from "../utils/date";

interface DayCellData {
  isoDate: string;
  dayNumber: number;
}

function getMonthGrid(
  year: number,
  monthIndex: number,
  weekStartsOn: "monday" | "sunday"
): Array<DayCellData | null> {
  const firstDay = createLocalDate(year, monthIndex, 1);
  const daysInMonth = createLocalDate(year, monthIndex + 1, 0).getDate();
  const weekOffset = weekStartsOn === "monday" ? 1 : 0;
  const startOffset = (firstDay.getDay() - weekOffset + 7) % 7;
  const cells: Array<DayCellData | null> = [];

  for (let index = 0; index < startOffset; index += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = createLocalDate(year, monthIndex, day);
    cells.push({
      isoDate: formatLocalDate(date),
      dayNumber: day
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

function getWeekdayLabels(
  locale: string,
  weekStartsOn: "monday" | "sunday"
): string[] {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const sundayReference = createLocalDate(2026, 0, 4);

  return Array.from({ length: 7 }, (_, index) => {
    const dayOffset = weekStartsOn === "monday" ? index + 1 : index;
    return formatter.format(createLocalDate(2026, 0, sundayReference.getDate() + dayOffset));
  });
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

function clampSelectedDate(targetMonth: Date, selectedDate: string): string {
  const selectedDay = Number(selectedDate.split("-")[2] || "1");
  const daysInTargetMonth = createLocalDate(
    targetMonth.getFullYear(),
    targetMonth.getMonth() + 1,
    0
  ).getDate();
  const day = Math.min(selectedDay, daysInTargetMonth);

  return formatLocalDate(
    createLocalDate(targetMonth.getFullYear(), targetMonth.getMonth(), day)
  );
}

function DaySection<T>({
  title,
  items,
  emptyMessage,
  renderItem,
  colors,
  spacing
}: {
  title: string;
  items: T[];
  emptyMessage: string;
  renderItem: (item: T) => React.ReactNode;
  colors: ReturnType<typeof useAppTheme>["colors"];
  spacing: ReturnType<typeof useAppTheme>["spacing"];
}) {
  const styles = useMemo(() => createStyles(colors, spacing), [colors, spacing]);

  return (
    <View style={styles.detailSection}>
      <Text style={styles.detailHeading}>{title}</Text>
      {items.length === 0 ? <Text style={styles.emptyText}>{emptyMessage}</Text> : items.map(renderItem)}
    </View>
  );
}

export default function CalendarScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const { colors, spacing } = useAppTheme();
  const { t, language } = useTranslation();
  const { settings } = useSettings();
  const styles = useMemo(() => createStyles(colors, spacing), [colors, spacing]);
  const today = useMemo(() => new Date(), []);
  const todayIso = useMemo(() => formatLocalDate(today), [today]);
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => getLocalMonthStart(today));
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const [monthData, setMonthData] = useState<CalendarMonthResponse | null>(null);
  const [dayData, setDayData] = useState<CalendarDayResponse | null>(null);
  const [monthLoading, setMonthLoading] = useState<boolean>(true);
  const [dayLoading, setDayLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const locale = useMemo(() => resolveLocale(language), [language]);
  const year = visibleMonth.getFullYear();
  const monthIndex = visibleMonth.getMonth();
  const monthNumber = monthIndex + 1;
  const monthLabel = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(visibleMonth),
    [locale, visibleMonth]
  );
  const weekdayLabels = useMemo(
    () => getWeekdayLabels(locale, settings.week_starts_on),
    [locale, settings.week_starts_on]
  );
  const dayCells = useMemo(
    () => getMonthGrid(year, monthIndex, settings.week_starts_on),
    [year, monthIndex, settings.week_starts_on]
  );

  useEffect(() => {
    void loadMonth(year, monthNumber);
  }, [year, monthNumber]);

  useEffect(() => {
    void loadDay(selectedDate);
  }, [selectedDate]);

  async function loadMonth(targetYear: number, targetMonth: number): Promise<void> {
    try {
      setError("");
      setMonthLoading(true);
      const response = await getCalendarMonth(targetYear, targetMonth);
      setMonthData(response);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setMonthLoading(false);
    }
  }

  async function loadDay(date: string): Promise<void> {
    try {
      setError("");
      setDayLoading(true);
      const response = await getCalendarDay(date);
      setDayData(response);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setDayLoading(false);
    }
  }

  function changeMonth(offset: number): void {
    setVisibleMonth((current) => {
      const targetMonth = createLocalDate(current.getFullYear(), current.getMonth() + offset, 1);
      setSelectedDate(clampSelectedDate(targetMonth, selectedDate));
      return getLocalMonthStart(targetMonth);
    });
  }

  function getMonthEntry(isoDate: string) {
    return monthData?.dates[isoDate] ?? null;
  }

  return (
    <ScreenContainer>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{t("calendar.title")}</Text>
        <View style={styles.headerPill}>
          <Text style={styles.headerPillText}>{t("calendar.badge")}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={[styles.monthHeader, isWide ? styles.monthHeaderWide : null]}>
          <AppButton title={t("calendar.previous")} variant="secondary" onPress={() => changeMonth(-1)} />
          <View style={styles.monthTitleWrap}>
            <Text style={styles.heading}>{monthLabel}</Text>
            <Text style={styles.body}>{t("calendar.monthSubtitle")}</Text>
          </View>
          <AppButton title={t("calendar.next")} variant="secondary" onPress={() => changeMonth(1)} />
        </View>

        <View style={styles.weekdayRow}>
          {weekdayLabels.map((label) => (
            <Text key={label} style={styles.weekdayLabel}>
              {label}
            </Text>
          ))}
        </View>

        {monthLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.primaryBlue} />
            <Text style={styles.loadingText}>{t("calendar.loadingMonth")}</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {dayCells.map((cell, index) => {
              if (!cell) {
                return <View key={`empty-${index}`} style={[styles.dayCell, styles.dayCellEmpty]} />;
              }

              const monthEntry = getMonthEntry(cell.isoDate);
              const hasTasks = Boolean(monthEntry && monthEntry.tasks.length > 0);
              const hasHabits = Boolean(monthEntry && monthEntry.habit_logs_completed > 0);
              const isSelected = cell.isoDate === selectedDate;
              const isToday = cell.isoDate === todayIso;

              return (
                <Pressable
                  key={cell.isoDate}
                  onPress={() => setSelectedDate(cell.isoDate)}
                  style={[
                    styles.dayCell,
                    isSelected ? styles.dayCellSelected : null,
                    isToday ? styles.dayCellToday : null
                  ]}
                >
                  <Text
                    style={[
                      styles.dayNumber,
                      isSelected ? styles.dayNumberSelected : null,
                      isToday && !isSelected ? styles.dayNumberToday : null
                    ]}
                  >
                    {cell.dayNumber}
                  </Text>
                  <View style={styles.indicatorRow}>
                    {hasTasks ? <View style={[styles.indicatorDot, styles.taskDot]} /> : null}
                    {hasHabits ? <View style={[styles.indicatorDot, styles.habitDot]} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={[styles.detailCard, isWide ? styles.detailCardWide : null]}>
        <View style={styles.detailHeader}>
          <Text style={styles.detailTitle}>{t("calendar.dayDetails")}</Text>
          <Text style={styles.detailDate}>{selectedDate}</Text>
        </View>

        {dayLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.primaryBlue} />
            <Text style={styles.loadingText}>{t("calendar.loadingDay")}</Text>
          </View>
        ) : (
          <View style={[styles.detailContent, isWide ? styles.detailContentWide : null]}>
            <DaySection<CalendarTaskItem>
              title={t("calendar.tasksSection")}
              items={dayData?.tasks ?? []}
              emptyMessage={t("calendar.noTasksForDay")}
              colors={colors}
              spacing={spacing}
              renderItem={(task) => (
                <View key={task.task_id} style={styles.listItem}>
                  <Text style={styles.listItemTitle}>{task.title}</Text>
                  <Text style={styles.listItemMeta}>
                    {task.status === "completed" ? t("common.completed") : t("common.pending")}
                    {task.due_time ? ` \u2022 ${task.due_time}` : ""}
                  </Text>
                </View>
              )}
            />

            <DaySection<CalendarHabitItem>
              title={t("calendar.habitsSection")}
              items={dayData?.habits ?? []}
              emptyMessage={t("calendar.noHabitsForDay")}
              colors={colors}
              spacing={spacing}
              renderItem={(habit) => (
                <View key={habit.habit_id} style={styles.listItem}>
                  <Text style={styles.listItemTitle}>{habit.title}</Text>
                  <Text style={styles.listItemMeta}>
                    {habit.completed ? t("common.completed") : t("common.pending")}
                    {habit.log
                      ? ` \u2022 ${habit.log.completed_count}/${habit.log.target_count_snapshot}`
                      : ""}
                  </Text>
                </View>
              )}
            />
          </View>
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
    card: {
      backgroundColor: colors.surface,
      borderRadius: 22,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.md
    },
    monthHeader: {
      flexDirection: "column",
      alignItems: "stretch",
      gap: spacing.md
    },
    monthHeaderWide: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between"
    },
    monthTitleWrap: {
      flex: 1,
      alignItems: "center",
      gap: spacing.xs
    },
    heading: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.textPrimary,
      textTransform: "capitalize"
    },
    body: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.textSecondary,
      textAlign: "center"
    },
    weekdayRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: spacing.xs
    },
    weekdayLabel: {
      flex: 1,
      textAlign: "center",
      fontSize: 12,
      fontWeight: "700",
      color: colors.textSecondary,
      textTransform: "capitalize"
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs
    },
    dayCell: {
      width: "13.3%",
      minWidth: 42,
      aspectRatio: 1,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: spacing.xs,
      justifyContent: "space-between"
    },
    dayCellEmpty: {
      backgroundColor: "transparent",
      borderColor: "transparent"
    },
    dayCellSelected: {
      backgroundColor: colors.primaryBlue,
      borderColor: colors.primaryBlue
    },
    dayCellToday: {
      borderColor: colors.zapYellowDark
    },
    dayNumber: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.textPrimary
    },
    dayNumberSelected: {
      color: colors.textOnPrimary
    },
    dayNumberToday: {
      color: colors.primaryBlueDark
    },
    indicatorRow: {
      flexDirection: "row",
      gap: 4
    },
    indicatorDot: {
      width: 7,
      height: 7,
      borderRadius: 999
    },
    taskDot: {
      backgroundColor: colors.primaryBlue
    },
    habitDot: {
      backgroundColor: colors.zapYellow
    },
    detailCard: {
      backgroundColor: colors.surface,
      borderRadius: 22,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.md
    },
    detailCardWide: {
      gap: spacing.lg
    },
    detailHeader: {
      gap: spacing.xs
    },
    detailTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.textPrimary
    },
    detailDate: {
      fontSize: 14,
      color: colors.textSecondary
    },
    detailContent: {
      gap: spacing.lg
    },
    detailContentWide: {
      flexDirection: "row",
      alignItems: "flex-start"
    },
    detailSection: {
      flex: 1,
      gap: spacing.sm
    },
    detailHeading: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.textPrimary
    },
    listItem: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: 16,
      padding: spacing.md,
      gap: spacing.xs
    },
    listItemTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.textPrimary
    },
    listItemMeta: {
      fontSize: 13,
      color: colors.textSecondary
    },
    emptyText: {
      fontSize: 14,
      color: colors.textSecondary
    },
    loadingWrap: {
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      paddingVertical: spacing.lg
    },
    loadingText: {
      color: colors.textSecondary,
      fontSize: 14
    },
    errorCard: {
      backgroundColor: colors.dangerSoft,
      borderWidth: 1,
      borderColor: colors.danger,
      borderRadius: 16,
      padding: spacing.md
    },
    errorText: {
      color: colors.danger,
      fontSize: 14
    }
  });
}
