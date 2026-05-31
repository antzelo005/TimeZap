import React from "react";
import { StyleSheet, Text, View } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import colors from "../theme/colors";
import spacing from "../theme/spacing";

export default function CalendarScreen() {
  return (
    <ScreenContainer>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Calendar</Text>
        <View style={styles.headerPill}>
          <Text style={styles.headerPillText}>Upcoming</Text>
        </View>
      </View>
      <View style={styles.card}>
        <Text style={styles.heading}>Planned for next milestone</Text>
        <Text style={styles.body}>
          This screen is scaffolded and ready for the month/day calendar endpoints. The current
          milestone keeps it intentionally minimal.
        </Text>
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
    gap: spacing.sm
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
  }
});
