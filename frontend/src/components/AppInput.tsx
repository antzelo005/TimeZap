import React from "react";
import type { StyleProp, TextStyle, TextInputProps } from "react-native";
import { Platform, StyleSheet, Text, TextInput, View } from "react-native";
import { useAppTheme } from "../theme/useAppTheme";

interface AppInputProps extends TextInputProps {
  label?: string;
  error?: string;
  style?: StyleProp<TextStyle>;
}

export default function AppInput({ label, error, style, ...props }: AppInputProps) {
  const { colors, spacing } = useAppTheme();
  const styles = createStyles(colors, spacing);

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.primaryBlue}
        style={[styles.input, error ? styles.inputError : null, style]}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>["colors"],
  spacing: ReturnType<typeof useAppTheme>["spacing"]
) {
  return StyleSheet.create({
    wrapper: {
      gap: spacing.xs
    },
    label: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: "700"
    },
    input: {
      minHeight: Platform.OS === "android" ? 56 : 52,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
      borderRadius: 16,
      paddingHorizontal: spacing.md,
      paddingVertical: Platform.OS === "android" ? 10 : 8,
      fontSize: 16,
      lineHeight: 22,
      color: colors.textPrimary
    },
    inputError: {
      borderColor: colors.danger
    },
    error: {
      color: colors.danger,
      fontSize: 13
    }
  });
}
