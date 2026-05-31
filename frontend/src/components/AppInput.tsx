import React from "react";
import type { StyleProp, TextStyle, TextInputProps } from "react-native";
import { StyleSheet, Text, TextInput, View } from "react-native";
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
      fontWeight: "600"
    },
    input: {
      minHeight: 50,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: 16,
      paddingHorizontal: spacing.md,
      fontSize: 15,
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
