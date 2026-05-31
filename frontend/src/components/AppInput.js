import React from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import colors from "../theme/colors";
import spacing from "../theme/spacing";

export default function AppInput({ label, error, style, ...props }) {
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

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs
  },
  label: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: "600"
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    color: colors.text
  },
  inputError: {
    borderColor: colors.danger
  },
  error: {
    color: colors.danger,
    fontSize: 13
  }
});
