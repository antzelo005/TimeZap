import React from "react";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useAppTheme } from "../theme/useAppTheme";

interface SectionCardProps {
  children: ReactNode;
  onPress?: () => void;
}

export default function SectionCard({ children, onPress }: SectionCardProps) {
  const { colors, spacing } = useAppTheme();
  const styles = createStyles(colors, spacing);

  if (!onPress) {
    return <View style={styles.card}>{children}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
    >
      {children}
    </Pressable>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>["colors"],
  spacing: ReturnType<typeof useAppTheme>["spacing"]
) {
  return StyleSheet.create({
    card: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.md
    },
    pressed: {
      transform: [{ translateY: 1 }],
      borderColor: colors.primaryBlueSoft
    }
  });
}
