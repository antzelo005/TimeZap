import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../theme/useAppTheme";

interface StreakBadgeProps {
  count: number;
  label?: string;
}

export default function StreakBadge({ count, label }: StreakBadgeProps) {
  const { colors, spacing } = useAppTheme();
  const styles = createStyles(colors, spacing);
  const isActive = count > 0;

  return (
    <View style={[styles.badge, isActive ? styles.badgeActive : styles.badgeInactive]}>
      <Text style={[styles.icon, isActive ? styles.iconActive : styles.iconInactive]}>{"\u26A1"}</Text>
      <Text style={[styles.count, isActive ? styles.countActive : styles.countInactive]}>{count}</Text>
      {label ? <Text style={[styles.label, isActive ? styles.labelActive : null]}>{label}</Text> : null}
    </View>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>["colors"],
  spacing: ReturnType<typeof useAppTheme>["spacing"]
) {
  return StyleSheet.create({
    badge: {
      minHeight: 42,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      gap: 6
    },
    badgeActive: {
      backgroundColor: colors.zapYellowSoft,
      borderColor: colors.zapYellow
    },
    badgeInactive: {
      backgroundColor: colors.surfaceMuted,
      borderColor: colors.border
    },
    icon: {
      fontSize: 16,
      fontWeight: "800"
    },
    iconActive: {
      color: colors.warning
    },
    iconInactive: {
      color: colors.textMuted
    },
    count: {
      fontSize: 16,
      fontWeight: "900"
    },
    countActive: {
      color: colors.primaryBlueDark
    },
    countInactive: {
      color: colors.textSecondary
    },
    label: {
      fontSize: 12,
      fontWeight: "800",
      color: colors.textSecondary
    },
    labelActive: {
      color: colors.primaryBlueDark
    }
  });
}
