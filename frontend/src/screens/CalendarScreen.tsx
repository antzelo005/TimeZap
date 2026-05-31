import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import AppButton from "../components/AppButton";
import ScreenContainer from "../components/ScreenContainer";
import { getCalendarDay, getCalendarMonth } from "../api/calendar.api";
import colors from "../theme/colors";
import spacing from "../theme/spacing";
import { createLocalDate, formatLocalDate, getLocalMonthStart } from "../utils/date";
import type {
  CalendarDayResponse,
  CalendarHabitItem,
  CalendarMonthResponse,
  CalendarTaskItem
} from "../types/calendar";
import { getErrorMessage } from "../types/api";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

interface DayCellData {
  isoDate: string;
  dayNumber: number;
  isCurrentMonth: boolean;
}

function getMonthGrid(year: number, monthIndex: number): Array<DayCellData | null> {
  const firstDay = createLocalDate(year, monthIndex, 1);
  const daysInMonth = createLocalDate(year, monthIndex + 1, 0).getDate();
  const startOffset = (firstDay.getDay() + 6) % 7;
  const cells: Array<DayCellData | null> = [];

  for (let index = 0; index < startOffset; index += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = createLocalDate(year, monthIndex, day);
    cells.push({
      isoDate: formatLocalDate(date),
      dayNumber: day,
      isCurrentMonth: true
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

function DaySection<T>({
  title,
  items,
  emptyMessage,
  renderItem
}: {
  title: string;
  items: T[];
  emptyMessage: string;
  renderItem: (item: T) => React.ReactNode;
}) {
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
  const today = useMemo(() => new Date(), []);
  const todayIso = useMemo(() => formatLocalDate(today), [today]);
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => getLocalMonthStart(today));
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const [monthData, setMonthData] = useState<CalendarMonthResponse | null>(null);
  const [dayData, setDayData] = useState<CalendarDayResponse | null>(null);
  const [monthLoading, setMonthLoading] = useState<boolean>(true);
  const [dayLoading, setDayLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const year = visibleMonth.getFullYear();
  const monthIndex = visibleMonth.getMonth();
  const monthNumber = monthIndex + 1;
  const monthLabel = `${MONTH_LABELS[monthIndex]} ${year}`;
  const dayCells = useMemo(() => getMonthGrid(year, monthIndex), [year, monthIndex]);

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
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  function selectDate(isoDate: string): void {
    setSelectedDate(isoDate);
  }

  function getMonthEntry(isoDate: string) {
    return monthData?.dates[isoDate] ?? null;
  }

  return (
    <ScreenContainer>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Calendar</Text>
        <View style={styles.headerPill}>
          <Text style={styles.headerPillText}>Internal</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.monthHeader}>
          <AppButton title="Previous" variant="secondary" onPress={() => changeMonth(-1)} />
          <View style={styles.monthTitleWrap}>
            <Text style={styles.heading}>{monthLabel}</Text>
            <Text style={styles.body}>Select a date to inspect tasks and habits.</Text>
          </View>
          <AppButton title="Next" variant="secondary" onPress={() => changeMonth(1)} />
        </View>

        <View style={styles.weekdayRow}>
          {WEEKDAY_LABELS.map((label) => (
            <Text key={label} style={styles.weekdayLabel}>
              {label}
            </Text>
          ))}
        </View>

        {monthLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.primaryBlue} />
            <Text style={styles.loadingText}>Loading month...</Text>
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
                  onPress={() => selectDate(cell.isoDate)}
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
          <Text style={styles.detailTitle}>Day Details</Text>
          <Text style={styles.detailDate}>{selectedDate}</Text>
        </View>

        {dayLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.primaryBlue} />
            <Text style={styles.loadingText}>Loading day...</Text>
          </View>
        ) : (
          <View style={[styles.detailContent, isWide ? styles.detailContentWide : null]}>
            <DaySection<CalendarTaskItem>
              title="Tasks"
              items={dayData?.tasks ?? []}
              emptyMessage="No tasks for this day"
              renderItem={(task) => (
                <View key={task.task_id} style={styles.listItem}>
                  <Text style={styles.listItemTitle}>{task.title}</Text>
                  <Text style={styles.listItemMeta}>
                    {task.status}
                    {task.due_time ? ` • ${task.due_time}` : ""}
                  </Text>
                </View>
              )}
            />

            <DaySection<CalendarHabitItem>
              title="Habits"
              items={dayData?.habits ?? []}
              emptyMessage="No habits for this day"
              renderItem={(habit) => (
                <View key={habit.habit_id} style={styles.listItem}>
                  <Text style={styles.listItemTitle}>{habit.title}</Text>
                  <Text style={styles.listItemMeta}>
                    {habit.completed ? "Completed" : "Pending"}
                    {habit.log ? ` • ${habit.log.completed_count}/${habit.log.target_count_snapshot}` : ""}
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

const styles = StyleSheet.create({
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  monthTitleWrap: {
    flex: 1,
    alignItems: "center",
    gap: spacing.xs
  },
  heading: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary
  },
  body: {
    fontSize: 15,
    lineHeight: 24,
    color: colors.textSecondary
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
    color: colors.textSecondary
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
