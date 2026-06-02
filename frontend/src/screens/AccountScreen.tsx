import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { API_BASE_URL } from "../api/client";
import AppButton from "../components/AppButton";
import ScreenContainer from "../components/ScreenContainer";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { useTranslation } from "../i18n";
import { cancelAllLocalReminders } from "../services/notifications";
import { useAppTheme } from "../theme/useAppTheme";
import type { AppSettings, DefaultView, LanguageCode, ThemeMode, WeekStartsOn } from "../types/settings";

type SelectOption<T extends string> = {
  label: string;
  value: T;
};

function SelectGroup<T extends string>({
  title,
  description,
  value,
  options,
  onChange,
  colors,
  spacing
}: {
  title: string;
  description?: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (nextValue: T) => void;
  colors: ReturnType<typeof useAppTheme>["colors"];
  spacing: ReturnType<typeof useAppTheme>["spacing"];
}) {
  const styles = useMemo(() => createStyles(colors, spacing), [colors, spacing]);

  return (
    <View style={styles.settingBlock}>
      <View style={styles.settingCopy}>
        <Text style={styles.settingLabel}>{title}</Text>
        {description ? <Text style={styles.settingHint}>{description}</Text> : null}
      </View>
      <View style={styles.optionRow}>
        {options.map((option) => {
          const isActive = option.value === value;

          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              style={[styles.optionChip, isActive ? styles.optionChipActive : null]}
            >
              <Text style={[styles.optionChipText, isActive ? styles.optionChipTextActive : null]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function AccountScreen() {
  const { user, logout } = useAuth();
  const { settings, isLoading, isSaving, error, updateSettings, resetError } = useSettings();
  const { colors, spacing } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors, spacing), [colors, spacing]);
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [successMessage, setSuccessMessage] = useState<string>("");

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  function setField<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    resetError();
    setSuccessMessage("");
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function handleSave(): Promise<void> {
    try {
      setSuccessMessage("");
      await updateSettings(draft);
      if (!draft.notifications_enabled) {
        await cancelAllLocalReminders();
      }
      setSuccessMessage(t("account.settingsSaved"));
    } catch {
      setSuccessMessage("");
    }
  }

  const themeOptions: SelectOption<ThemeMode>[] = [
    { value: "light", label: t("account.theme.light") },
    { value: "dark", label: t("account.theme.dark") },
    { value: "system", label: t("account.theme.system") }
  ];

  const languageOptions: SelectOption<LanguageCode>[] = [
    { value: "en", label: t("account.language.en") },
    { value: "el", label: t("account.language.el") },
    { value: "ro", label: t("account.language.ro") }
  ];

  const defaultViewOptions: SelectOption<DefaultView>[] = [
    { value: "dashboard", label: t("account.defaultView.dashboard") },
    { value: "tasks", label: t("account.defaultView.tasks") },
    { value: "habits", label: t("account.defaultView.habits") },
    { value: "calendar", label: t("account.defaultView.calendar") },
    { value: "account", label: t("account.defaultView.account") }
  ];

  const weekOptions: SelectOption<WeekStartsOn>[] = [
    { value: "monday", label: t("account.weekStartsOn.monday") },
    { value: "sunday", label: t("account.weekStartsOn.sunday") }
  ];

  return (
    <ScreenContainer>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{t("account.title")}</Text>
        <View style={styles.headerPill}>
          <Text style={styles.headerPillText}>{t("account.secure")}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t("account.accountDetails")}</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>{t("account.signedInAs")}</Text>
            <Text style={styles.value}>{user?.email || t("account.unknownUser")}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>{t("account.timezone")}</Text>
            <Text style={styles.value}>{draft.timezone}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>{t("account.apiBaseUrl")}</Text>
            <Text style={styles.meta}>{API_BASE_URL}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("account.settingsTitle")}</Text>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>
                {isSaving ? t("common.saving") : t("account.synced")}
              </Text>
            </View>
          </View>

          {isLoading ? <Text style={styles.hint}>{t("common.loading")}</Text> : null}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}

          <SelectGroup<ThemeMode>
            title={t("account.theme")}
            description={t("account.themeDescription")}
            value={draft.theme}
            options={themeOptions}
            onChange={(value) => setField("theme", value)}
            colors={colors}
            spacing={spacing}
          />

          <SelectGroup<LanguageCode>
            title={t("account.language")}
            description={t("account.languageDescription")}
            value={draft.language}
            options={languageOptions}
            onChange={(value) => setField("language", value)}
            colors={colors}
            spacing={spacing}
          />

          <SelectGroup<"on" | "off">
            title={t("account.notifications")}
            description={t("account.notificationsDescription")}
            value={draft.notifications_enabled ? "on" : "off"}
            options={[
              { value: "on", label: t("common.enabled") },
              { value: "off", label: t("common.disabled") }
            ]}
            onChange={(value) => setField("notifications_enabled", value === "on")}
            colors={colors}
            spacing={spacing}
          />

          <SelectGroup<DefaultView>
            title={t("account.defaultView")}
            description={t("account.defaultViewDescription")}
            value={draft.default_view}
            options={defaultViewOptions}
            onChange={(value) => setField("default_view", value)}
            colors={colors}
            spacing={spacing}
          />

          <SelectGroup<WeekStartsOn>
            title={t("account.weekStartsOn")}
            description={t("account.weekStartsDescription")}
            value={draft.week_starts_on}
            options={weekOptions}
            onChange={(value) => setField("week_starts_on", value)}
            colors={colors}
            spacing={spacing}
          />

          <AppButton
            title={isSaving ? t("common.saving") : t("common.save")}
            onPress={() => void handleSave()}
            loading={isSaving}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t("account.sessionTitle")}</Text>
          <Text style={styles.hint}>{t("account.sessionHint")}</Text>
          <AppButton title={t("common.logout")} onPress={() => void logout()} variant="danger" />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>["colors"],
  spacing: ReturnType<typeof useAppTheme>["spacing"]
) {
  return StyleSheet.create({
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: spacing.md
    },
    title: {
      fontSize: 28,
      fontWeight: "700",
      color: colors.textPrimary
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
    scrollContent: {
      gap: spacing.md
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 22,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.md
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: spacing.sm
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.textPrimary
    },
    statusPill: {
      borderRadius: 999,
      backgroundColor: colors.primaryBlueUltraSoft,
      borderWidth: 1,
      borderColor: colors.primaryBlueSoft,
      paddingHorizontal: spacing.sm,
      paddingVertical: 6
    },
    statusPillText: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.primaryBlueDark
    },
    infoRow: {
      gap: spacing.xs
    },
    label: {
      fontSize: 13,
      color: colors.textSecondary
    },
    value: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.textPrimary
    },
    meta: {
      fontSize: 13,
      color: colors.textSecondary
    },
    hint: {
      fontSize: 14,
      color: colors.textSecondary
    },
    settingBlock: {
      gap: spacing.sm
    },
    settingCopy: {
      gap: spacing.xs
    },
    settingLabel: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.textPrimary
    },
    settingHint: {
      fontSize: 13,
      color: colors.textSecondary
    },
    optionRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm
    },
    optionChip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
      paddingHorizontal: spacing.md,
      paddingVertical: 10
    },
    optionChipActive: {
      backgroundColor: colors.primaryBlueUltraSoft,
      borderColor: colors.primaryBlue
    },
    optionChipText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textSecondary
    },
    optionChipTextActive: {
      color: colors.primaryBlueDark
    },
    errorText: {
      fontSize: 14,
      color: colors.danger
    },
    successText: {
      fontSize: 14,
      color: colors.primaryBlueDark
    }
  });
}
