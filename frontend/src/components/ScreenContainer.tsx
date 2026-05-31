import React from "react";
import type { ReactNode } from "react";
import { Platform, ScrollView, StyleSheet, View } from "react-native";
import { useAppTheme } from "../theme/useAppTheme";

interface ScreenContainerProps {
  children: ReactNode;
  scroll?: boolean;
}

export default function ScreenContainer({
  children,
  scroll = true
}: ScreenContainerProps) {
  const { colors, spacing } = useAppTheme();
  const styles = createStyles(colors, spacing);

  if (!scroll) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>{children}</View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.content}>{children}</View>
    </ScrollView>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>["colors"],
  spacing: ReturnType<typeof useAppTheme>["spacing"]
) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.appBackground
    },
    scrollContent: {
      padding: spacing.lg,
      paddingBottom: spacing.xl,
      width: "100%"
    },
    content: {
      width: "100%",
      maxWidth: Platform.OS === "web" ? 1040 : "100%",
      alignSelf: "center",
      gap: spacing.md
    }
  });
}
