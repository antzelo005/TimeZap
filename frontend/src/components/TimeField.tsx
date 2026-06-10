import React, { useMemo, useRef, useState } from "react";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppButton from "./AppButton";
import { useSettings } from "../context/SettingsContext";
import { useAppTheme } from "../theme/useAppTheme";

interface TimeFieldProps {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  clearLabel: string;
  doneLabel: string;
  disabled?: boolean;
}

type Period = "AM" | "PM";

interface WheelItem<T extends number | Period> {
  value: T;
  label: string;
}

const TIME_WHEEL_ITEM_HEIGHT = 52;
const TIME_WHEEL_REPEAT_COUNT = 5;
const TIME_WHEEL_CENTER_REPEAT = 2;

function normalizeTime(value: string): { hour: number; minute: number } {
  const match = /^([01]\d|2[0-3]):([0-5]\d)/.exec(value);

  if (!match) {
    return { hour: 9, minute: 0 };
  }

  return {
    hour: Number(match[1]),
    minute: Number(match[2])
  };
}

function toTwelveHour(hour: number): { hour: number; period: Period } {
  return {
    hour: hour % 12 === 0 ? 12 : hour % 12,
    period: hour >= 12 ? "PM" : "AM"
  };
}

function toTwentyFourHour(hour: number, period: Period): number {
  if (period === "AM") {
    return hour === 12 ? 0 : hour;
  }

  return hour === 12 ? 12 : hour + 12;
}

function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function formatDisplayTime(value: string, timeFormat: "12h" | "24h"): string {
  if (!value) {
    return "";
  }

  const parsed = normalizeTime(value);

  if (timeFormat === "24h") {
    return formatTime(parsed.hour, parsed.minute);
  }

  const twelveHour = toTwelveHour(parsed.hour);
  return `${twelveHour.hour}:${String(parsed.minute).padStart(2, "0")} ${twelveHour.period}`;
}

function createWheelItems<T extends number | Period>(items: Array<WheelItem<T>>): Array<WheelItem<T>> {
  return Array.from({ length: TIME_WHEEL_REPEAT_COUNT }, () => items).flat();
}

function getInitialWheelIndex<T extends number | Period>(items: Array<WheelItem<T>>, value: T): number {
  const itemIndex = Math.max(
    0,
    items.findIndex((item) => item.value === value)
  );

  return TIME_WHEEL_CENTER_REPEAT * items.length + itemIndex;
}

function getPeriodWheelIndex(items: Array<WheelItem<Period>>, value: Period): number {
  return Math.max(
    0,
    items.findIndex((item) => item.value === value)
  );
}

function clampIndex(index: number, maxIndex: number): number {
  return Math.max(0, Math.min(maxIndex, index));
}

function getNearestMinute(minute: number): number {
  const rounded = Math.round(minute / 5) * 5;
  return rounded >= 60 ? 55 : rounded;
}

export default function TimeField({
  label,
  value,
  placeholder,
  onChange,
  doneLabel,
  disabled = false
}: TimeFieldProps) {
  const { colors, spacing } = useAppTheme();
  const { settings } = useSettings();
  const timeFormat = settings.time_format ?? "12h";
  const styles = createStyles(colors, spacing);
  const hourScrollRef = useRef<ScrollView | null>(null);
  const minuteScrollRef = useRef<ScrollView | null>(null);
  const periodScrollRef = useRef<ScrollView | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const initial = useMemo(() => normalizeTime(value), [value]);
  const [selectedHour, setSelectedHour] = useState<number>(initial.hour);
  const [selectedMinute, setSelectedMinute] = useState<number>(getNearestMinute(initial.minute));
  const [selectedPeriod, setSelectedPeriod] = useState<Period>(() => toTwelveHour(initial.hour).period);

  const hourItems = useMemo<Array<WheelItem<number>>>(
    () =>
      timeFormat === "24h"
        ? Array.from({ length: 24 }, (_, hour) => ({
            value: hour,
            label: String(hour).padStart(2, "0")
          }))
        : Array.from({ length: 12 }, (_, index) => ({
            value: index + 1,
            label: String(index + 1)
          })),
    [timeFormat]
  );
  const minuteItems = useMemo<Array<WheelItem<number>>>(
    () =>
      Array.from({ length: 12 }, (_, index) => {
        const minute = index * 5;
        return {
          value: minute,
          label: String(minute).padStart(2, "0")
        };
      }),
    []
  );
  const periodItems = useMemo<Array<WheelItem<Period>>>(
    () => [
      { value: "AM", label: "AM" },
      { value: "PM", label: "PM" }
    ],
    []
  );
  const wheelHours = useMemo(() => createWheelItems(hourItems), [hourItems]);
  const wheelMinutes = useMemo(() => createWheelItems(minuteItems), [minuteItems]);
  const wheelPeriods = periodItems;
  const displayHour = timeFormat === "24h" ? selectedHour : toTwelveHour(selectedHour).hour;
  const [selectedHourIndex, setSelectedHourIndex] = useState<number>(() => getInitialWheelIndex(hourItems, displayHour));
  const [selectedMinuteIndex, setSelectedMinuteIndex] = useState<number>(() =>
    getInitialWheelIndex(minuteItems, selectedMinute)
  );
  const [selectedPeriodIndex, setSelectedPeriodIndex] = useState<number>(() =>
    getPeriodWheelIndex(periodItems, selectedPeriod)
  );
  const fieldValue = value ? formatDisplayTime(value, timeFormat) : formatDisplayTime(placeholder, timeFormat) || placeholder;

  function scrollToIndex(ref: React.RefObject<ScrollView | null>, index: number, animated = false): void {
    ref.current?.scrollTo({
      y: index * TIME_WHEEL_ITEM_HEIGHT,
      animated
    });
  }

  function openPicker(): void {
    const parsed = normalizeTime(value);
    const twelveHour = toTwelveHour(parsed.hour);
    const minute = getNearestMinute(parsed.minute);
    const hourValue = timeFormat === "24h" ? parsed.hour : twelveHour.hour;
    const hourIndex = getInitialWheelIndex(hourItems, hourValue);
    const minuteIndex = getInitialWheelIndex(minuteItems, minute);
    const periodIndex = getPeriodWheelIndex(periodItems, twelveHour.period);

    setSelectedHour(parsed.hour);
    setSelectedMinute(minute);
    setSelectedPeriod(twelveHour.period);
    setSelectedHourIndex(hourIndex);
    setSelectedMinuteIndex(minuteIndex);
    setSelectedPeriodIndex(periodIndex);
    setIsOpen(true);

    setTimeout(() => {
      scrollToIndex(hourScrollRef, hourIndex);
      scrollToIndex(minuteScrollRef, minuteIndex);
      scrollToIndex(periodScrollRef, periodIndex);
    }, 80);
  }

  function commit(hour: number, minute: number): void {
    setSelectedHour(hour);
    setSelectedMinute(minute);
    setSelectedPeriod(toTwelveHour(hour).period);
    onChange(formatTime(hour, minute));
  }

  function commitHour(hour: number): void {
    const resolvedHour = timeFormat === "24h" ? hour : toTwentyFourHour(hour, selectedPeriod);
    commit(resolvedHour, selectedMinute);
  }

  function commitMinute(minute: number): void {
    commit(selectedHour, minute);
  }

  function commitPeriod(period: Period): void {
    const twelveHour = toTwelveHour(selectedHour).hour;
    setSelectedPeriod(period);
    commit(toTwentyFourHour(twelveHour, period), selectedMinute);
  }

  function getScrollIndex(event: NativeSyntheticEvent<NativeScrollEvent>, maxIndex: number): number {
    return clampIndex(Math.round(event.nativeEvent.contentOffset.y / TIME_WHEEL_ITEM_HEIGHT), maxIndex);
  }

  function handleHourScroll(event: NativeSyntheticEvent<NativeScrollEvent>): void {
    const index = getScrollIndex(event, wheelHours.length - 1);
    const item = wheelHours[index];

    if (!item || index === selectedHourIndex) {
      return;
    }

    setSelectedHourIndex(index);
    commitHour(item.value);
  }

  function handleMinuteScroll(event: NativeSyntheticEvent<NativeScrollEvent>): void {
    const index = getScrollIndex(event, wheelMinutes.length - 1);
    const item = wheelMinutes[index];

    if (!item || index === selectedMinuteIndex) {
      return;
    }

    setSelectedMinuteIndex(index);
    commitMinute(item.value);
  }

  function handlePeriodScroll(event: NativeSyntheticEvent<NativeScrollEvent>): void {
    const index = getScrollIndex(event, wheelPeriods.length - 1);
    const item = wheelPeriods[index];

    if (!item || index === selectedPeriodIndex) {
      return;
    }

    setSelectedPeriodIndex(index);
    commitPeriod(item.value);
  }

  function renderWheel<T extends number | Period>({
    items,
    selectedIndex,
    onSelect,
    onScroll,
    scrollRef,
    width
  }: {
    items: Array<WheelItem<T>>;
    selectedIndex: number;
    onSelect: (index: number, value: T) => void;
    onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
    scrollRef: React.RefObject<ScrollView | null>;
    width?: number;
  }) {
    return (
      <View style={[styles.wheelFrame, width ? { width } : null]}>
        <View pointerEvents="none" style={styles.wheelSelection} />
        <ScrollView
          ref={scrollRef}
          style={styles.wheelScroll}
          contentContainerStyle={styles.wheelContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          snapToInterval={TIME_WHEEL_ITEM_HEIGHT}
          decelerationRate="fast"
          scrollEventThrottle={32}
          onScroll={onScroll}
          onMomentumScrollEnd={onScroll}
          onScrollEndDrag={onScroll}
          onContentSizeChange={() => scrollToIndex(scrollRef, selectedIndex)}
        >
          {items.map((item, index) => {
            const isSelected = index === selectedIndex;
            return (
              <Pressable
                key={`${item.value}-${index}`}
                onPress={() => {
                  onSelect(index, item.value);
                  scrollToIndex(scrollRef, index, true);
                }}
                style={[styles.timeCell, isSelected ? styles.timeCellSelected : null]}
              >
                <Text style={[styles.timeText, isSelected ? styles.timeTextSelected : null]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={openPicker}
        style={({ pressed }) => [
          styles.field,
          disabled ? styles.fieldDisabled : null,
          pressed && !disabled ? styles.fieldPressed : null
        ]}
      >
        <Text style={[styles.value, value ? null : styles.placeholder]}>{fieldValue}</Text>
        <Text style={styles.fieldIcon}>{"\u25BE"}</Text>
      </Pressable>

      <Modal visible={isOpen} animationType="slide" transparent={Platform.OS === "web"}>
        <SafeAreaView style={styles.modalRoot}>
          <View style={styles.modalPanel}>
            <Text style={styles.modalTitle}>{label}</Text>
            <View style={styles.columns}>
              <View style={styles.column}>
                <Text style={styles.columnLabel}>{timeFormat === "24h" ? "HH" : "H"}</Text>
                {renderWheel({
                  items: wheelHours,
                  selectedIndex: selectedHourIndex,
                  onSelect: (index, hour) => {
                    setSelectedHourIndex(index);
                    commitHour(hour);
                  },
                  onScroll: handleHourScroll,
                  scrollRef: hourScrollRef
                })}
              </View>

              <View style={styles.column}>
                <Text style={styles.columnLabel}>MM</Text>
                {renderWheel({
                  items: wheelMinutes,
                  selectedIndex: selectedMinuteIndex,
                  onSelect: (index, minute) => {
                    setSelectedMinuteIndex(index);
                    commitMinute(minute);
                  },
                  onScroll: handleMinuteScroll,
                  scrollRef: minuteScrollRef
                })}
              </View>

              {timeFormat === "12h" ? (
                <View style={styles.periodColumn}>
                  <Text style={styles.columnLabel}>AM/PM</Text>
                  {renderWheel({
                    items: wheelPeriods,
                    selectedIndex: selectedPeriodIndex,
                    onSelect: (index, period) => {
                      setSelectedPeriodIndex(index);
                      commitPeriod(period);
                    },
                    onScroll: handlePeriodScroll,
                    scrollRef: periodScrollRef
                  })}
                </View>
              ) : null}
            </View>

            <View style={styles.actionRow}>
              <AppButton title={doneLabel} onPress={() => setIsOpen(false)} />
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
      borderRadius: 16,
      paddingHorizontal: spacing.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm
    },
    fieldDisabled: {
      opacity: 0.55
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
      backgroundColor: Platform.OS === "web" ? "rgba(15, 23, 42, 0.45)" : colors.appBackground
    },
    modalPanel: {
      width: "100%",
      maxWidth: Platform.OS === "web" ? 520 : undefined,
      alignSelf: "center",
      maxHeight: Platform.OS === "web" ? "88%" : "100%",
      backgroundColor: colors.surface,
      borderRadius: Platform.OS === "web" ? 8 : 0,
      padding: spacing.lg,
      gap: spacing.md
    },
    modalTitle: {
      color: colors.textPrimary,
      fontSize: 18,
      fontWeight: "800"
    },
    columns: {
      flexDirection: "row",
      gap: spacing.md
    },
    column: {
      flex: 1,
      minWidth: 0,
      gap: spacing.sm
    },
    periodColumn: {
      width: 92,
      gap: spacing.sm
    },
    columnLabel: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: "800"
    },
    wheelFrame: {
      height: TIME_WHEEL_ITEM_HEIGHT * 5,
      borderRadius: 8,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted
    },
    wheelSelection: {
      position: "absolute",
      top: TIME_WHEEL_ITEM_HEIGHT * 2,
      left: 0,
      right: 0,
      height: TIME_WHEEL_ITEM_HEIGHT,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: colors.primaryBlueSoft,
      backgroundColor: colors.primaryBlueUltraSoft
    },
    wheelScroll: {
      flex: 1
    },
    wheelContent: {
      paddingVertical: TIME_WHEEL_ITEM_HEIGHT * 2
    },
    timeCell: {
      height: TIME_WHEEL_ITEM_HEIGHT,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center"
    },
    timeCellSelected: {
      backgroundColor: colors.primaryBlue
    },
    timeText: {
      color: colors.textPrimary,
      fontSize: 15,
      fontWeight: "800"
    },
    timeTextSelected: {
      color: colors.textOnPrimary
    },
    actionRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      flexWrap: "wrap",
      gap: spacing.sm
    }
  });
}
