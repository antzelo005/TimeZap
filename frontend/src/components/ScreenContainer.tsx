import React from "react";
import type { ReactNode } from "react";
import type { RefObject } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../theme/useAppTheme";

interface ScreenContainerProps {
  children: ReactNode;
  scroll?: boolean;
  scrollRef?: RefObject<ScrollView | null>;
  extraBottomPadding?: number;
}

export default function ScreenContainer({
  children,
  scroll = true,
  scrollRef,
  extraBottomPadding = 0
}: ScreenContainerProps) {
  const { colors, spacing } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors, spacing);
  const bottomPadding = spacing.xl + insets.bottom + 96 + extraBottomPadding;

  if (!scroll) {
    return (
      <View style={styles.container}>
        <View style={[styles.staticContent, { paddingBottom: bottomPadding }]}>{children}</View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
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
      maxWidth: Platform.OS === "web" ? 1040 : undefined,
      alignSelf: "center",
      gap: spacing.md
    },
    staticContent: {
      width: "100%",
      maxWidth: Platform.OS === "web" ? 1040 : undefined,
      alignSelf: "center",
      flex: 1
    }
  });
}
