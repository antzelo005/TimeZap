import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import colors from "../theme/colors";
import spacing from "../theme/spacing";

export default function AppButton({
  title,
  onPress,
  loading = false,
  variant = "primary",
  disabled = false
}) {
  const isSecondary = variant === "secondary";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        isSecondary ? styles.secondary : styles.primary,
        (disabled || loading) && styles.disabled
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isSecondary ? colors.primary : colors.white} />
      ) : (
        <Text style={[styles.label, isSecondary ? styles.secondaryLabel : styles.primaryLabel]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md
  },
  primary: {
    backgroundColor: colors.primary
  },
  secondary: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border
  },
  disabled: {
    opacity: 0.6
  },
  label: {
    fontSize: 15,
    fontWeight: "600"
  },
  primaryLabel: {
    color: colors.white
  },
  secondaryLabel: {
    color: colors.primary
  }
});
