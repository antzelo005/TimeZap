import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import AppButton from "../components/AppButton";
import DateField from "../components/DateField";
import ScreenContainer from "../components/ScreenContainer";
import TimeZapIcon, { type TimeZapIconName } from "../components/icons/TimeZapIcon";
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
import type { MainTabParamList } from "../types/navigation";
import { getErrorMessage } from "../types/api";
import { createLocalDate, formatLocalDate, getLocalMonthStart } from "../utils/date";
import { formatTimeRangeForDisplay } from "../utils/time";

interface DayCellData {
  isoDate: string;
  dayNumber: number;
}

function getMonthGrid(year: number, monthIndex: number, weekStartsOn: "monday" | "sunday"): Array<DayCellData | null> {
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

function getWeekdayLabels(locale: string, weekStartsOn: "monday" | "sunday"): string[] {
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
  const daysInTargetMonth = createLocalDate(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).getDate();
  const day = Math.min(selectedDay, daysInTargetMonth);

  return formatLocalDate(createLocalDate(targetMonth.getFullYear(), targetMonth.getMonth(), day));
}

function parseRouteDate(value?: string): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsed = createLocalDate(year, month - 1, day);
  return formatLocalDate(parsed) === value ? parsed : null;
}

function DaySection<T>({
  title,
  items,
  emptyMessage,
  emptyIcon,
  renderItem,
  onPress,
  colors,
  spacing
}: {
  title: string;
  items: T[];
  emptyMessage: string;
  emptyIcon: TimeZapIconName;
  renderItem: (item: T) => React.ReactNode;
  onPress: () => void;
  colors: ReturnType<typeof useAppTheme>["colors"];
  spacing: ReturnType<typeof useAppTheme>["spacing"];
}) {
  const styles = useMemo(() => createStyles(colors, spacing), [colors, spacing]);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.detailSection, pressed ? styles.detailSectionPressed : null]}
    >
      <View style={styles.detailSectionHeader}>
        <Text style={styles.detailHeading}>{title}</Text>
        <Text style={styles.detailArrow}>{">"}</Text>
      </View>
      {items.length === 0 ? (
        <View style={styles.emptyRow}>
          <View style={styles.emptyIconWrap}>
            <TimeZapIcon name={emptyIcon} size={22} color={colors.primaryBlueDark} secondaryColor={colors.primaryBlue} />
          </View>
          <Text style={styles.emptyText}>{emptyMessage}</Text>
        </View>
      ) : (
        items.map(renderItem)
      )}
    </Pressable>
  );
}

export default function CalendarScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const scrollRef = useRef<ScrollView | null>(null);
  const { colors, spacing } = useAppTheme();
  const { t, language } = useTranslation();
  const { settings } = useSettings();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList, "Calendar">>();
  const route = useRoute<RouteProp<MainTabParamList, "Calendar">>();
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
  const weekdayLabels = useMemo(() => getWeekdayLabels(locale, settings.week_starts_on), [locale, settings.week_starts_on]);
  const dayCells = useMemo(() => getMonthGrid(year, monthIndex, settings.week_starts_on), [year, monthIndex, settings.week_starts_on]);
  const calendarWeeks = useMemo(() => {
    const weeks: Array<Array<DayCellData | null>> = [];

    for (let index = 0; index < dayCells.length; index += 7) {
      weeks.push(dayCells.slice(index, index + 7));
    }

    return weeks;
  }, [dayCells]);

  useFocusEffect(
    React.useCallback(() => {
      const routeDate = parseRouteDate(route.params?.selectedDate);
      if (routeDate) {
        const isoDate = formatLocalDate(routeDate);
        setSelectedDate(isoDate);
        setVisibleMonth(getLocalMonthStart(routeDate));
        setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 80);
      }
    }, [route.params?.selectedDate])
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

  function selectDate(date: string): void {
    const parsedDate = parseRouteDate(date);
    if (parsedDate) {
      setVisibleMonth(getLocalMonthStart(parsedDate));
    }
    setSelectedDate(date);
    setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 80);
  }

  function getMonthEntry(isoDate: string) {
    return monthData?.dates[isoDate] ?? null;
  }

  function isPeriodHabit(habit: CalendarHabitItem): boolean {
    return habit.recurrence_type === "x_times_per_week" || habit.recurrence_type === "x_times_per_month";
  }

  function getPeriodProgressLabel(habit: CalendarHabitItem): string {
    const current = habit.period_progress ?? 0;
    const target = habit.target_count ?? 1;

    if (habit.recurrence_type === "x_times_per_month") {
      return habit.completed_for_period
        ? t("habits.completedThisMonth")
        : t("habits.progressThisMonth", { current, target });
    }

    return habit.completed_for_period
      ? t("habits.completedThisWeek")
      : t("habits.progressThisWeek", { current, target });
  }

  return (
    <ScreenContainer scrollRef={scrollRef}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{t("calendar.title")}</Text>
        <View style={styles.headerPill}>
          <Text style={styles.headerPillText}>{t("calendar.badge")}</Text>
        </View>
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={[styles.detailCard, isWide ? styles.detailCardWide : null]}>
        <View style={styles.detailHeader}>
          <Text style={styles.detailTitle}>{t("calendar.dayDetails")}</Text>
          <View style={styles.detailDateField}>
            <DateField
              label={t("calendar.jumpToDate")}
              value={selectedDate}
              onChange={selectDate}
              placeholder={todayIso}
              clearLabel={t("common.clear")}
              todayLabel={t("common.today")}
              doneLabel={t("common.done")}
              previousLabel={t("calendar.previous")}
              nextLabel={t("calendar.next")}
              showClearButton={false}
            />
          </View>
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
              emptyIcon="emptyTasks"
              colors={colors}
              spacing={spacing}
              onPress={() => navigation.navigate("Tasks", { selectedDate })}
              renderItem={(task) => {
                const dateRange =
                  task.due_date && task.end_date && task.end_date !== task.due_date
                    ? `${task.due_date} -> ${task.end_date}`
                    : "";
                const timeRange = formatTimeRangeForDisplay(task.start_time || task.due_time, task.end_time, settings.time_format);

                return (
                  <View key={task.task_id} style={styles.listItem}>
                    <Text style={styles.listItemTitle}>{task.title}</Text>
                    <Text style={styles.listItemMeta}>
                      {task.status === "completed" ? t("common.completed") : t("common.pending")}
                      {dateRange ? ` / ${dateRange}` : ""}
                      {timeRange ? ` / ${timeRange}` : ""}
                    </Text>
                  </View>
                );
              }}
            />

            <DaySection<CalendarHabitItem>
              title={t("calendar.habitsSection")}
              items={dayData?.habits ?? []}
              emptyMessage={t("calendar.noHabitsForDay")}
              emptyIcon="emptyHabits"
              colors={colors}
              spacing={spacing}
              onPress={() => navigation.navigate("Habits", { selectedDate })}
              renderItem={(habit) => {
                const dateRange =
                  habit.end_date && habit.end_date !== habit.start_date
                    ? `${habit.start_date} -> ${habit.end_date}`
                    : "";
                const timeRange = formatTimeRangeForDisplay(habit.start_time, habit.end_time, settings.time_format);
                const statusLabel = isPeriodHabit(habit)
                  ? getPeriodProgressLabel(habit)
                  : habit.completed
                    ? t("common.completed")
                    : t("common.pending");

                return (
                  <View key={habit.habit_id} style={styles.listItem}>
                    <Text style={styles.listItemTitle}>{habit.title}</Text>
                    <Text style={styles.listItemMeta}>
                      {statusLabel}
                      {habit.log && !isPeriodHabit(habit) ? ` / ${habit.log.completed_count}/${habit.log.target_count_snapshot}` : ""}
                      {dateRange ? ` / ${dateRange}` : ""}
                      {timeRange ? ` / ${timeRange}` : ""}
                    </Text>
                  </View>
                );
              }}
            />
          </View>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.monthHeader}>
          <View style={styles.monthNavRow}>
            <AppButton
              title={t("calendar.previous")}
              variant="secondary"
              onPress={() => changeMonth(-1)}
              style={styles.monthNavButton}
            />
            <AppButton
              title={t("calendar.next")}
              variant="secondary"
              onPress={() => changeMonth(1)}
              style={styles.monthNavButton}
            />
          </View>
          <View style={styles.monthTitleWrap}>
            <Text style={styles.heading}>{monthLabel}</Text>
            <Text style={styles.body}>{t("calendar.monthSubtitle")}</Text>
          </View>
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
            {calendarWeeks.map((week, weekIndex) => (
              <View key={`week-${weekIndex}`} style={styles.weekRow}>
                {week.map((cell, dayIndex) => {
                  if (!cell) {
                    return <View key={`empty-${weekIndex}-${dayIndex}`} style={[styles.dayCell, styles.dayCellEmpty]} />;
                  }

                  const monthEntry = getMonthEntry(cell.isoDate);
                  const hasTasks = Boolean(monthEntry && monthEntry.tasks.length > 0);
                  const hasHabits = Boolean(monthEntry && monthEntry.habit_logs_completed > 0);
                  const isSelected = cell.isoDate === selectedDate;
                  const isToday = cell.isoDate === todayIso;

                  return (
                    <Pressable
                      key={cell.isoDate}
                      onPress={() => selectDate(cell.isoDate)}
                      style={[styles.dayCell, isSelected ? styles.dayCellSelected : null, isToday ? styles.dayCellToday : null]}
                    >
                      <Text style={[styles.dayNumber, isSelected ? styles.dayNumberSelected : null, isToday && !isSelected ? styles.dayNumberToday : null]}>
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
            ))}
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
      borderRadius: 8,
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
    monthNavRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm
    },
    monthNavButton: {
      flex: 1,
      minWidth: 0,
      borderRadius: 8
    },
    monthTitleWrap: {
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
      gap: spacing.xs
    },
    weekRow: {
      flexDirection: "row",
      gap: spacing.xs
    },
    dayCell: {
      flex: 1,
      minWidth: 0,
      aspectRatio: 1,
      borderRadius: 8,
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
      width: 8,
      height: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.surface
    },
    taskDot: {
      backgroundColor: colors.primaryBlue
    },
    habitDot: {
      backgroundColor: colors.zapYellow
    },
    detailCard: {
      backgroundColor: colors.surface,
      borderRadius: 8,
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
    detailDateField: {
      maxWidth: 360
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
      gap: spacing.sm,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
      padding: spacing.md
    },
    detailSectionPressed: {
      borderColor: colors.primaryBlueSoft
    },
    detailSectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm
    },
    detailHeading: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.textPrimary
    },
    detailArrow: {
      color: colors.primaryBlueDark,
      fontSize: 16,
      fontWeight: "900"
    },
    listItem: {
      backgroundColor: colors.surface,
      borderRadius: 8,
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
    emptyRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: spacing.md
    },
    emptyIconWrap: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primaryBlueUltraSoft,
      borderWidth: 1,
      borderColor: colors.primaryBlueSoft
    },
    emptyText: {
      flex: 1,
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
      borderRadius: 8,
      padding: spacing.md
    },
    errorText: {
      color: colors.danger,
      fontSize: 14
    }
  });
}
