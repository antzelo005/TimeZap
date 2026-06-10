import React from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { Pressable, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../theme/useAppTheme";

interface FloatingActionButtonProps {
  onPress: () => void;
  label: string;
  icon?: string;
  style?: StyleProp<ViewStyle>;
}

export default function FloatingActionButton({
  onPress,
  label,
  icon = "+",
  style
}: FloatingActionButtonProps) {
  const { colors, spacing } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors, spacing);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={10}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { bottom: Math.max(insets.bottom, 8) + 92 },
        pressed ? styles.pressed : null,
        style
      ]}
    >
      <Text style={styles.icon}>{icon}</Text>
    </Pressable>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>["colors"],
  spacing: ReturnType<typeof useAppTheme>["spacing"]
) {
  return StyleSheet.create({
    button: {
      position: "absolute",
      right: spacing.lg,
      width: 60,
      height: 60,
      borderRadius: 30,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primaryBlue,
      borderWidth: 1,
      borderColor: colors.primaryBlueDark,
      shadowColor: colors.textPrimary,
      shadowOpacity: 0.18,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6
    },
    pressed: {
      transform: [{ translateY: 1 }]
    },
    icon: {
      color: colors.textOnPrimary,
      fontSize: 32,
      lineHeight: 34,
      fontWeight: "600"
    }
  });
}
