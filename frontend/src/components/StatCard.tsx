import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../theme/useAppTheme";

interface StatCardProps {
  label: string;
  value: string | number;
  accent?: "blue" | "yellow" | "danger" | "neutral";
}

export default function StatCard({ label, value, accent = "neutral" }: StatCardProps) {
  const { colors, spacing } = useAppTheme();
  const styles = createStyles(colors, spacing);

  return (
    <View style={styles.card}>
      <Text
        style={[
          styles.value,
          accent === "blue" ? styles.valueBlue : null,
          accent === "yellow" ? styles.valueYellow : null,
          accent === "danger" ? styles.valueDanger : null
        ]}
      >
        {value}
      </Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>["colors"],
  spacing: ReturnType<typeof useAppTheme>["spacing"]
) {
  return StyleSheet.create({
    card: {
      flex: 1,
      minWidth: 96,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
      padding: spacing.sm,
      gap: 4
    },
    value: {
      fontSize: 22,
      fontWeight: "800",
      color: colors.textPrimary
    },
    valueBlue: {
      color: colors.primaryBlueDark
    },
    valueYellow: {
      color: colors.primaryBlueDark
    },
    valueDanger: {
      color: colors.danger
    },
    label: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.textSecondary
    }
  });
}
