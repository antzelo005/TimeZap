import React, { useMemo, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
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
    <ScreenContainer scroll={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={Keyboard.dismiss}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.authPanel}>
            <View style={styles.hero}>
              <View style={styles.brandRow}>
                <View style={styles.zapBadge}>
                  <Text style={styles.zapText}>{"\u26A1"}</Text>
                </View>
                <Text style={styles.eyebrow}>{t("register.eyebrow")}</Text>
              </View>
              <Text style={styles.title}>{t("register.title")}</Text>
              <Text style={styles.subtitle}>{t("register.subtitle")}</Text>
            </View>

            <View style={styles.form}>
              <AppInput
                label={t("login.email")}
                value={form.email}
                onChangeText={(value) => setForm((current) => ({ ...current, email: value }))}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                placeholder="test@timezap.com"
                textContentType="emailAddress"
              />
              <AppInput
                label={t("login.password")}
                value={form.password}
                onChangeText={(value) => setForm((current) => ({ ...current, password: value }))}
                placeholder="123456"
                secureTextEntry
                textContentType="newPassword"
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <AppButton title={t("register.submit")} onPress={() => void handleRegister()} loading={isAuthLoading} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>["colors"],
  spacing: ReturnType<typeof useAppTheme>["spacing"]
) {
  return StyleSheet.create({
    keyboardView: {
      flex: 1,
      width: "100%"
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: "center",
      paddingHorizontal: spacing.lg,
      paddingTop: Platform.OS === "android" ? spacing.xl : spacing.lg,
      paddingBottom: Platform.OS === "android" ? spacing.xl * 2 : spacing.xl
    },
    authPanel: {
      width: "100%",
      maxWidth: 460,
      alignSelf: "center",
      gap: spacing.lg
    },
    hero: {
      alignItems: "center",
      gap: spacing.sm
    },
    brandRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm
    },
    zapBadge: {
      width: 30,
      height: 30,
      borderRadius: 15,
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
      fontWeight: "800",
      textAlign: "center"
    },
    title: {
      fontSize: Platform.OS === "android" ? 32 : 36,
      fontWeight: "800",
      color: colors.textPrimary,
      textAlign: "center"
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      lineHeight: 24,
      textAlign: "center"
    },
    form: {
      gap: spacing.md,
      backgroundColor: colors.surface,
      padding: spacing.lg,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.textPrimary,
      shadowOpacity: 0.05,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 2
    },
    error: {
      color: colors.danger,
      fontSize: 14
    }
  });
}
