import React from "react";
import { StyleSheet, Text, View } from "react-native";
import AppButton from "../components/AppButton";
import ScreenContainer from "../components/ScreenContainer";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../api/client";
import colors from "../theme/colors";
import spacing from "../theme/spacing";

export default function AccountScreen() {
  const { user, logout } = useAuth();

  return (
    <ScreenContainer>
      <Text style={styles.title}>Account</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Signed in as</Text>
        <Text style={styles.value}>{user?.email || "Unknown user"}</Text>
        <Text style={styles.meta}>API base URL: {API_BASE_URL}</Text>
        <AppButton title="Logout" onPress={logout} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md
  },
  label: {
    fontSize: 14,
    color: colors.textMuted
  },
  value: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text
  },
  meta: {
    fontSize: 13,
    color: colors.textMuted
  }
});
