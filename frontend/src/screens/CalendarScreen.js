import React from "react";
import { StyleSheet, Text, View } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import colors from "../theme/colors";
import spacing from "../theme/spacing";

export default function CalendarScreen() {
  return (
    <ScreenContainer>
      <Text style={styles.title}>Calendar</Text>
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
    color: colors.text
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm
  },
  heading: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text
  },
  body: {
    fontSize: 15,
    lineHeight: 24,
    color: colors.textMuted
  }
});
