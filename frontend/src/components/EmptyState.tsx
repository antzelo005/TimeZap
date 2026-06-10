import React from "react";
import { StyleSheet, Text, View } from "react-native";
import AppButton from "./AppButton";
import { useAppTheme } from "../theme/useAppTheme";

interface EmptyStateProps {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  accent?: "blue" | "yellow";
}

export default function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
  accent = "blue"
}: EmptyStateProps) {
  const { colors, spacing } = useAppTheme();
  const styles = createStyles(colors, spacing);
  const isYellow = accent === "yellow";

  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, isYellow ? styles.iconWrapYellow : null]}>
        <Text style={[styles.icon, isYellow ? styles.iconYellow : null]}>{"\u26A1"}</Text>
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>
      {actionLabel && onAction ? (
        <AppButton title={actionLabel} onPress={onAction} variant={isYellow ? "accent" : "secondary"} />
      ) : null}
    </View>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>["colors"],
  spacing: ReturnType<typeof useAppTheme>["spacing"]
) {
  return StyleSheet.create({
    container: {
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: spacing.lg,
      gap: spacing.md
    },
    iconWrap: {
      width: 58,
      height: 58,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primaryBlueUltraSoft,
      borderWidth: 1,
      borderColor: colors.primaryBlueSoft
    },
    iconWrapYellow: {
      backgroundColor: colors.zapYellowSoft,
      borderColor: colors.zapYellow
    },
    icon: {
      color: colors.primaryBlueDark,
      fontSize: 28,
      fontWeight: "800"
    },
    iconYellow: {
      color: colors.primaryBlueDark
    },
    copy: {
      alignItems: "center",
      gap: spacing.xs
    },
    title: {
      color: colors.textPrimary,
      fontSize: 17,
      fontWeight: "800",
      textAlign: "center"
    },
    message: {
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      textAlign: "center"
    }
  });
}
