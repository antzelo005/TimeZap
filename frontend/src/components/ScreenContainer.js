import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import colors from "../theme/colors";
import spacing from "../theme/spacing";

export default function ScreenContainer({ children, scroll = true }) {
  if (!scroll) {
    return <View style={styles.container}>{children}</View>;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md
  }
});
