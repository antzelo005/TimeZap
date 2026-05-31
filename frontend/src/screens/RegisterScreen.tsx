import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import AppButton from "../components/AppButton";
import AppInput from "../components/AppInput";
import ScreenContainer from "../components/ScreenContainer";
import { useAuth } from "../context/AuthContext";
import { useAppTheme } from "../theme/useAppTheme";
import type { AuthCredentials } from "../types/auth";
import { getErrorMessage } from "../types/api";
import { useTranslation } from "../i18n";

export default function RegisterScreen() {
  const { register, isAuthLoading } = useAuth();
  const { colors, spacing } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors, spacing), [colors, spacing]);
  const [form, setForm] = useState<AuthCredentials>({
    email: "",
    password: ""
  });
  const [error, setError] = useState<string>("");

  async function handleRegister(): Promise<void> {
    try {
      setError("");
      await register(form);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <View style={styles.brandRow}>
          <View style={styles.zapBadge}>
            <Text style={styles.zapText}>⚡</Text>
          </View>
          <Text style={styles.eyebrow}>{t("register.eyebrow")}</Text>
        </View>
        <Text style={styles.title}>{t("register.title")}</Text>
        <Text style={styles.subtitle}>{t("register.subtitle")}</Text>
        <View style={styles.form}>
          <AppInput
            label={t("login.email")}
            value={form.email}
            onChangeText={(value) => setForm((current) => ({ ...current, email: value }))}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="test@timezap.com"
          />
          <AppInput
            label={t("login.password")}
            value={form.password}
            onChangeText={(value) => setForm((current) => ({ ...current, password: value }))}
            placeholder="123456"
            secureTextEntry
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <AppButton title={t("register.submit")} onPress={() => void handleRegister()} loading={isAuthLoading} />
        </View>
      </View>
    </ScreenContainer>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>["colors"],
  spacing: ReturnType<typeof useAppTheme>["spacing"]
) {
  return StyleSheet.create({
    container: {
      gap: spacing.lg
    },
    brandRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm
    },
    zapBadge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.zapYellowSoft,
      borderWidth: 1,
      borderColor: colors.zapYellow
    },
    zapText: {
      color: colors.primaryBlueDark,
      fontSize: 14,
      fontWeight: "800"
    },
    eyebrow: {
      fontSize: 13,
      color: colors.primaryBlue,
      fontWeight: "700"
    },
    title: {
      fontSize: 30,
      fontWeight: "700",
      color: colors.textPrimary
    },
    subtitle: {
      fontSize: 15,
      color: colors.textSecondary
    },
    form: {
      gap: spacing.md,
      backgroundColor: colors.surface,
      padding: spacing.lg,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.textPrimary,
      shadowOpacity: 0.04,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 2
    },
    error: {
      color: colors.danger,
      fontSize: 14
    }
  });
}
