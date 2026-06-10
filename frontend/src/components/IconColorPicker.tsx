import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../theme/useAppTheme";
import TimeZapIcon, { normalizeTimeZapIconName, type TimeZapIconName } from "./icons/TimeZapIcon";

export interface TimeZapIconOption {
  id: TimeZapIconName;
  label: string;
}

export const TIMEZAP_ICON_OPTIONS: TimeZapIconOption[] = [
  { id: "zap", label: "Zap" },
  { id: "flame", label: "Streak" },
  { id: "task", label: "Task" },
  { id: "habit", label: "Habit" },
  { id: "calendar", label: "Calendar" },
  { id: "notification", label: "Notification" },
  { id: "book", label: "Study / book" },
  { id: "water", label: "Water" },
  { id: "gym", label: "Gym" },
  { id: "code", label: "Code" },
  { id: "moon", label: "Sleep" },
  { id: "sun", label: "Morning" },
  { id: "heart", label: "Health" },
  { id: "money", label: "Money" },
  { id: "music", label: "Music" },
  { id: "home", label: "Home" },
  { id: "cleaning", label: "Cleaning" },
  { id: "food", label: "Food" },
  { id: "brain", label: "Focus" },
  { id: "briefcase", label: "Briefcase" }
];

export const TIMEZAP_COLOR_OPTIONS = [
  "#2563EB",
  "#FACC15",
  "#0EA5E9",
  "#14B8A6",
  "#22C55E",
  "#84CC16",
  "#F59E0B",
  "#EF4444",
  "#EC4899",
  "#A855F7",
  "#6366F1",
  "#64748B",
  "#0891B2",
  "#10B981",
  "#D946EF",
  "#F97316"
];

export function getTimeZapIcon(iconId?: string | null): TimeZapIconOption {
  const normalized = normalizeTimeZapIconName(iconId);
  return TIMEZAP_ICON_OPTIONS.find((icon) => icon.id === normalized) ?? TIMEZAP_ICON_OPTIONS[0];
}

export function IconBadge({
  iconId,
  color,
  size = 34,
  fallbackIcon = "zap"
}: {
  iconId?: string | null;
  color?: string | null;
  size?: number;
  fallbackIcon?: TimeZapIconName;
}) {
  const { colors } = useAppTheme();
  const iconName = normalizeTimeZapIconName(iconId, fallbackIcon);
  const backgroundColor = color || colors.primaryBlue;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: Math.max(8, size / 3),
        alignItems: "center",
        justifyContent: "center",
        backgroundColor,
        borderWidth: 1,
        borderColor: colors.surface
      }}
    >
      <TimeZapIcon
        name={iconName}
        size={Math.max(16, Math.round(size * 0.58))}
        color={colors.textOnPrimary}
        secondaryColor={colors.textOnPrimary}
        strokeWidth={2.2}
      />
    </View>
  );
}

interface IconColorPickerProps {
  icon: string;
  color: string;
  iconLabel: string;
  colorLabel: string;
  onIconChange: (value: string) => void;
  onColorChange: (value: string) => void;
}

export default function IconColorPicker({
  icon,
  color,
  iconLabel,
  colorLabel,
  onIconChange,
  onColorChange
}: IconColorPickerProps) {
  const { colors, spacing } = useAppTheme();
  const styles = createStyles(colors, spacing);
  const selectedIcon = normalizeTimeZapIconName(icon);

  return (
    <View style={styles.container}>
      <View style={styles.block}>
        <Text style={styles.label}>{iconLabel}</Text>
        <View style={styles.grid}>
          {TIMEZAP_ICON_OPTIONS.map((option) => {
            const isSelected = option.id === selectedIcon;
            return (
              <Pressable
                key={option.id}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                onPress={() => onIconChange(option.id)}
                style={[styles.iconButton, isSelected ? styles.iconButtonSelected : null]}
              >
                <IconBadge iconId={option.id} color={color || colors.primaryBlue} size={38} />
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.block}>
        <Text style={styles.label}>{colorLabel}</Text>
        <View style={styles.grid}>
          {TIMEZAP_COLOR_OPTIONS.map((option) => {
            const isSelected = option === color;
            return (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityLabel={option}
                onPress={() => onColorChange(option)}
                style={[styles.colorButton, isSelected ? styles.colorButtonSelected : null]}
              >
                <View style={[styles.colorSwatch, { backgroundColor: option }]} />
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>["colors"],
  spacing: ReturnType<typeof useAppTheme>["spacing"]
) {
  return StyleSheet.create({
    container: {
      gap: spacing.md
    },
    block: {
      gap: spacing.sm
    },
    label: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: "700"
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm
    },
    iconButton: {
      width: 48,
      height: 48,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted
    },
    iconButtonSelected: {
      borderColor: colors.primaryBlue,
      backgroundColor: colors.primaryBlueUltraSoft
    },
    colorButton: {
      width: 38,
      height: 38,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface
    },
    colorButtonSelected: {
      borderColor: colors.primaryBlue,
      backgroundColor: colors.primaryBlueUltraSoft
    },
    colorSwatch: {
      width: 24,
      height: 24,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.surface
    }
  });
}
