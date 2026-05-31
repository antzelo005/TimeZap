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
      <View style={styles.headerRow}>
        <Text style={styles.title}>Account</Text>
        <View style={styles.headerPill}>
          <Text style={styles.headerPillText}>Secure</Text>
        </View>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Signed in as</Text>
        <Text style={styles.value}>{user?.email || "Unknown user"}</Text>
        <Text style={styles.meta}>API base URL: {API_BASE_URL}</Text>
        <AppButton title="Logout" onPress={() => void logout()} variant="danger" />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.textPrimary
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md
  },
  headerPill: {
    borderRadius: 999,
    backgroundColor: colors.primaryBlueUltraSoft,
    borderWidth: 1,
    borderColor: colors.primaryBlueSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6
  },
  headerPillText: {
    fontSize: 12,
    color: colors.primaryBlueDark,
    fontWeight: "700"
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md
  },
  label: {
    fontSize: 14,
    color: colors.textSecondary
  },
  value: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary
  },
  meta: {
    fontSize: 13,
    color: colors.textSecondary
  }
});
