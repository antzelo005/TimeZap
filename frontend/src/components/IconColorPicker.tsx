import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../theme/useAppTheme";

export interface TimeZapIconOption {
  id: string;
  glyph: string;
  label: string;
}

export const TIMEZAP_ICON_OPTIONS: TimeZapIconOption[] = [
  { id: "zap", glyph: "\u26A1", label: "Lightning" },
  { id: "book", glyph: "B", label: "Book" },
  { id: "water", glyph: "W", label: "Water" },
  { id: "fitness", glyph: "F", label: "Fitness" },
  { id: "heart", glyph: "\u2665", label: "Heart" },
  { id: "briefcase", glyph: "Br", label: "Briefcase" },
  { id: "code", glyph: "</>", label: "Code" },
  { id: "study", glyph: "S", label: "Study" },
  { id: "moon", glyph: "\u25D0", label: "Moon" },
  { id: "sun", glyph: "\u2600", label: "Sun" },
  { id: "home", glyph: "H", label: "Home" },
  { id: "clean", glyph: "\u2715", label: "Cleaning" },
  { id: "money", glyph: "$", label: "Money" },
  { id: "music", glyph: "\u266B", label: "Music" },
  { id: "health", glyph: "+", label: "Health" },
  { id: "food", glyph: "\u25CF", label: "Food" }
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
  return TIMEZAP_ICON_OPTIONS.find((icon) => icon.id === iconId) ?? TIMEZAP_ICON_OPTIONS[0];
}

export function IconBadge({
  iconId,
  color,
  size = 34
}: {
  iconId?: string | null;
  color?: string | null;
  size?: number;
}) {
  const { colors } = useAppTheme();
  const icon = getTimeZapIcon(iconId);
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
      <Text
        style={{
          color: colors.textOnPrimary,
          fontSize: icon.glyph.length > 1 ? Math.max(10, size * 0.28) : Math.max(14, size * 0.46),
          fontWeight: "900"
        }}
      >
        {icon.glyph}
      </Text>
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

  return (
    <View style={styles.container}>
      <View style={styles.block}>
        <Text style={styles.label}>{iconLabel}</Text>
        <View style={styles.grid}>
          {TIMEZAP_ICON_OPTIONS.map((option) => {
            const isSelected = option.id === icon;
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
