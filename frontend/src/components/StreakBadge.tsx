import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../theme/useAppTheme";
import TimeZapIcon from "./icons/TimeZapIcon";

interface StreakBadgeProps {
  count: number;
  label?: string;
  compact?: boolean;
}

export default function StreakBadge({ count, label, compact = false }: StreakBadgeProps) {
  const { colors, spacing } = useAppTheme();
  const styles = createStyles(colors, spacing);
  const isActive = count > 0;
  const displayCount = count > 99 ? "99+" : String(count);

  return (
    <View style={[styles.badge, compact ? styles.badgeCompact : null, isActive ? styles.badgeActive : styles.badgeInactive]}>
      <View style={[styles.flameWrap, compact ? styles.flameWrapCompact : null]}>
        <TimeZapIcon
          name="flame"
          size={compact ? 31 : 34}
          color={isActive ? colors.warning : colors.textMuted}
          secondaryColor={isActive ? colors.zapYellow : colors.textMuted}
        />
        <Text
          style={[
            styles.countOverlay,
            displayCount.length > 1 ? styles.countOverlaySmall : null,
            isActive ? styles.countOverlayActive : styles.countOverlayInactive
          ]}
        >
          {displayCount}
        </Text>
      </View>
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
      justifyContent: "center",
      gap: 6
    },
    badgeCompact: {
      width: 52,
      height: 34,
      minHeight: 34,
      paddingHorizontal: 0
    },
    badgeActive: {
      backgroundColor: colors.zapYellowSoft,
      borderColor: colors.zapYellow
    },
    badgeInactive: {
      backgroundColor: colors.surfaceMuted,
      borderColor: colors.border
    },
    flameWrap: {
      width: 38,
      height: 36,
      alignItems: "center",
      justifyContent: "center"
    },
    flameWrapCompact: {
      width: 36,
      height: 32
    },
    countOverlay: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 12,
      textAlign: "center",
      fontSize: 11,
      lineHeight: 12,
      fontWeight: "900",
      textShadowColor: "rgba(0, 0, 0, 0.32)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2
    },
    countOverlaySmall: {
      fontSize: 9,
      lineHeight: 10,
      top: 13
    },
    countOverlayActive: {
      color: colors.textOnPrimary
    },
    countOverlayInactive: {
      color: colors.textOnPrimary
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
