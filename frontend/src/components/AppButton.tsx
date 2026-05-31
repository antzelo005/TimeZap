import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import colors from "../theme/colors";
import spacing from "../theme/spacing";

export type AppButtonVariant = "primary" | "secondary" | "accent" | "danger";

interface AppButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: AppButtonVariant;
  disabled?: boolean;
}

export default function AppButton({
  title,
  onPress,
  loading = false,
  variant = "primary",
  disabled = false
}: AppButtonProps) {
  const isSecondary = variant === "secondary";
  const isAccent = variant === "accent";
  const isDanger = variant === "danger";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        isDanger
          ? styles.danger
          : isSecondary
            ? styles.secondary
            : isAccent
              ? styles.accent
              : styles.primary,
        (disabled || loading) && styles.disabled,
        pressed && !disabled && !loading ? styles.pressed : null
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={
            isDanger
              ? colors.danger
              : isSecondary || isAccent
                ? colors.primaryBlue
                : colors.textOnPrimary
          }
        />
      ) : (
        <Text
          style={[
            styles.label,
            isDanger
              ? styles.dangerLabel
              : isSecondary || isAccent
                ? styles.secondaryLabel
                : styles.primaryLabel
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderWidth: 1
  },
  primary: {
    backgroundColor: colors.primaryBlue,
    borderColor: colors.primaryBlue
  },
  secondary: {
    backgroundColor: colors.primaryBlueUltraSoft,
    borderColor: colors.primaryBlueSoft
  },
  accent: {
    backgroundColor: colors.zapYellowSoft,
    borderColor: colors.zapYellow
  },
  danger: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger
  },
  disabled: {
    opacity: 0.6
  },
  pressed: {
    transform: [{ translateY: 1 }]
  },
  label: {
    fontSize: 15,
    fontWeight: "700"
  },
  primaryLabel: {
    color: colors.textOnPrimary
  },
  secondaryLabel: {
    color: colors.primaryBlueDark
  },
  dangerLabel: {
    color: colors.danger
  }
});
