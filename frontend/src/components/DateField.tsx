import React, { useMemo, useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppButton from "./AppButton";
import { useSettings } from "../context/SettingsContext";
import { useTranslation } from "../i18n";
import { useAppTheme } from "../theme/useAppTheme";
import { createLocalDate, formatLocalDate, getLocalMonthStart } from "../utils/date";

interface DateFieldProps {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  clearLabel: string;
  todayLabel: string;
  doneLabel: string;
  previousLabel: string;
  nextLabel: string;
  showClearButton?: boolean;
}

interface DayCellData {
  isoDate: string;
  dayNumber: number;
}

function parseLocalDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsed = createLocalDate(year, month - 1, day);
  return formatLocalDate(parsed) === value ? parsed : null;
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

export default function DateField({
  label,
  value,
  placeholder,
  onChange,
  clearLabel,
  todayLabel,
  doneLabel,
  previousLabel,
  nextLabel,
  showClearButton = true
}: DateFieldProps) {
  const { colors, spacing } = useAppTheme();
  const { settings } = useSettings();
  const { language } = useTranslation();
  const styles = useMemo(() => createStyles(colors, spacing), [colors, spacing]);
  const locale = useMemo(() => resolveLocale(language), [language]);
  const selectedDate = useMemo(() => parseLocalDate(value), [value]);
  const todayIso = formatLocalDate(new Date());
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => getLocalMonthStart(selectedDate ?? new Date()));
  const monthLabel = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(visibleMonth),
    [locale, visibleMonth]
  );
  const weekdayLabels = useMemo(
    () => getWeekdayLabels(locale, settings.week_starts_on),
    [locale, settings.week_starts_on]
  );
  const dayCells = useMemo(
    () => getMonthGrid(visibleMonth.getFullYear(), visibleMonth.getMonth(), settings.week_starts_on),
    [visibleMonth, settings.week_starts_on]
  );
  const calendarWeeks = useMemo(() => {
    const weeks: Array<Array<DayCellData | null>> = [];
    for (let index = 0; index < dayCells.length; index += 7) {
      weeks.push(dayCells.slice(index, index + 7));
    }
    return weeks;
  }, [dayCells]);

  function openPicker(): void {
    setVisibleMonth(getLocalMonthStart(selectedDate ?? new Date()));
    setIsOpen(true);
  }

  function changeMonth(offset: number): void {
    setVisibleMonth((current) => getLocalMonthStart(createLocalDate(current.getFullYear(), current.getMonth() + offset, 1)));
  }

  function selectDate(isoDate: string): void {
    onChange(isoDate);
    setIsOpen(false);
  }

  function selectToday(): void {
    const today = new Date();
    setVisibleMonth(getLocalMonthStart(today));
    selectDate(formatLocalDate(today));
  }

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={openPicker}
        style={({ pressed }) => [styles.field, pressed ? styles.fieldPressed : null]}
      >
        <Text style={[styles.value, value ? null : styles.placeholder]}>{value || placeholder}</Text>
        <Text style={styles.fieldIcon}>{"\u25BE"}</Text>
      </Pressable>

      <Modal visible={isOpen} animationType="fade" transparent>
        <SafeAreaView style={styles.modalRoot}>
          <View style={styles.modalPanel}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleWrap}>
                <Text style={styles.modalTitle}>{label}</Text>
                <Text style={styles.selectedDateText}>{value || placeholder}</Text>
              </View>
              <AppButton title={doneLabel} variant="secondary" onPress={() => setIsOpen(false)} />
            </View>

            <View style={styles.monthHeader}>
              <AppButton title={previousLabel} variant="secondary" onPress={() => changeMonth(-1)} />
              <Text style={styles.monthTitle}>{monthLabel}</Text>
              <AppButton title={nextLabel} variant="secondary" onPress={() => changeMonth(1)} />
            </View>

            <View style={styles.weekdayRow}>
              {weekdayLabels.map((weekday) => (
                <Text key={weekday} style={styles.weekdayLabel}>
                  {weekday}
                </Text>
              ))}
            </View>

            <View style={styles.grid}>
              {calendarWeeks.map((week, weekIndex) => (
                <View key={`week-${weekIndex}`} style={styles.weekRow}>
                  {week.map((cell, dayIndex) => {
                    if (!cell) {
                      return <View key={`empty-${weekIndex}-${dayIndex}`} style={[styles.dayCell, styles.dayCellEmpty]} />;
                    }

                    const isSelected = cell.isoDate === value;
                    const isToday = cell.isoDate === todayIso;

                    return (
                      <Pressable
                        key={cell.isoDate}
                        accessibilityRole="button"
                        onPress={() => selectDate(cell.isoDate)}
                        style={[
                          styles.dayCell,
                          isSelected ? styles.dayCellSelected : null,
                          isToday && !isSelected ? styles.dayCellToday : null
                        ]}
                      >
                        <Text style={[styles.dayNumber, isSelected ? styles.dayNumberSelected : null]}>
                          {cell.dayNumber}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>

            <View style={styles.actionRow}>
              <AppButton title={todayLabel} variant="secondary" onPress={selectToday} />
              {showClearButton ? (
                <AppButton
                  title={clearLabel}
                  variant="secondary"
                  onPress={() => {
                    onChange("");
                    setIsOpen(false);
                  }}
                />
              ) : null}
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>["colors"],
  spacing: ReturnType<typeof useAppTheme>["spacing"]
) {
  return StyleSheet.create({
    wrapper: {
      gap: spacing.xs
    },
    label: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: "700"
    },
    field: {
      minHeight: Platform.OS === "android" ? 56 : 52,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
      borderRadius: 8,
      paddingHorizontal: spacing.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm
    },
    fieldPressed: {
      borderColor: colors.primaryBlueSoft
    },
    value: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: "600"
    },
    placeholder: {
      color: colors.textMuted,
      fontWeight: "500"
    },
    fieldIcon: {
      color: colors.textSecondary,
      fontSize: 14,
      fontWeight: "800"
    },
    modalRoot: {
      flex: 1,
      justifyContent: Platform.OS === "web" ? "center" : "flex-end",
      backgroundColor: "rgba(15, 23, 42, 0.45)"
    },
    modalPanel: {
      width: "100%",
      maxWidth: Platform.OS === "web" ? 440 : undefined,
      alignSelf: "center",
      backgroundColor: colors.surface,
      borderRadius: Platform.OS === "web" ? 8 : 0,
      padding: spacing.lg,
      gap: spacing.md
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: spacing.md
    },
    modalTitleWrap: {
      flex: 1,
      gap: spacing.xs
    },
    modalTitle: {
      color: colors.textPrimary,
      fontSize: 18,
      fontWeight: "800"
    },
    selectedDateText: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: "700"
    },
    monthHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm
    },
    monthTitle: {
      flex: 1,
      textAlign: "center",
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: "800",
      textTransform: "capitalize"
    },
    weekdayRow: {
      flexDirection: "row",
      gap: spacing.xs
    },
    weekdayLabel: {
      flex: 1,
      textAlign: "center",
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: "700",
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
      backgroundColor: colors.surfaceMuted,
      alignItems: "center",
      justifyContent: "center"
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
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: "800"
    },
    dayNumberSelected: {
      color: colors.textOnPrimary
    },
    actionRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "flex-end",
      gap: spacing.sm
    }
  });
}
