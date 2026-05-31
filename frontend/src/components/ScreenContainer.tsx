import React from "react";
import type { ReactNode } from "react";
import { Platform, ScrollView, StyleSheet, View } from "react-native";
import colors from "../theme/colors";
import spacing from "../theme/spacing";

interface ScreenContainerProps {
  children: ReactNode;
  scroll?: boolean;
}

export default function ScreenContainer({
  children,
  scroll = true
}: ScreenContainerProps) {
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

const styles = StyleSheet.create({
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
