import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { API_BASE_URL } from "../api/client";
import AppButton from "../components/AppButton";
import AppInput from "../components/AppInput";
import ScreenContainer from "../components/ScreenContainer";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { useTranslation } from "../i18n";
import { cancelAllLocalReminders } from "../services/notifications";
import { useAppTheme } from "../theme/useAppTheme";
import { getErrorMessage } from "../types/api";
import type { AppSettings, DefaultView, LanguageCode, ThemeMode, TimeFormat, WeekStartsOn } from "../types/settings";

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
  const { user, logout, updateProfile, changePassword, isAuthLoading } = useAuth();
  const { settings, isLoading, isSaving, error, updateSettings, resetError } = useSettings();
  const { colors, spacing } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors, spacing), [colors, spacing]);
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [profileName, setProfileName] = useState<string>(user?.display_name ?? "");
  const [profileEmail, setProfileEmail] = useState<string>(user?.email ?? "");
  const [currentPassword, setCurrentPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [settingsMessage, setSettingsMessage] = useState<string>("");
  const [profileMessage, setProfileMessage] = useState<string>("");
  const [profileError, setProfileError] = useState<string>("");
  const [passwordMessage, setPasswordMessage] = useState<string>("");
  const [passwordError, setPasswordError] = useState<string>("");

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  useEffect(() => {
    setProfileEmail(user?.email ?? "");
    setProfileName(user?.display_name ?? "");
  }, [user?.display_name, user?.email]);

  function setField<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    resetError();
    setSettingsMessage("");
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function handleSaveSettings(): Promise<void> {
    try {
      setSettingsMessage("");
      await updateSettings(draft);
      if (!draft.notifications_enabled) {
        await cancelAllLocalReminders();
      }
      setSettingsMessage(t("account.settingsSaved"));
    } catch {
      setSettingsMessage("");
    }
  }

  async function handleSaveProfile(): Promise<void> {
    try {
      setProfileError("");
      setProfileMessage("");
      await updateProfile({ email: profileEmail, display_name: profileName });
      setProfileMessage(t("account.profileSaved"));
    } catch (err: unknown) {
      setProfileError(getErrorMessage(err));
    }
  }

  async function handleChangePassword(): Promise<void> {
    if (!currentPassword || !newPassword) {
      setPasswordError(t("account.passwordRequired"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(t("account.passwordMismatch"));
      return;
    }

    try {
      setPasswordError("");
      setPasswordMessage("");
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage(t("account.passwordSaved"));
    } catch (err: unknown) {
      setPasswordError(getErrorMessage(err));
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

  const timeFormatOptions: SelectOption<TimeFormat>[] = [
    { value: "12h", label: t("account.timeFormat.12h") },
    { value: "24h", label: t("account.timeFormat.24h") }
  ];

  return (
    <ScreenContainer>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{t("account.title")}</Text>
        <View style={styles.headerPill}>
          <Text style={styles.headerPillText}>{t("account.secure")}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t("account.profileTitle")}</Text>
        <AppInput
          label={t("account.name")}
          value={profileName}
          onChangeText={(value) => {
            setProfileError("");
            setProfileMessage("");
            setProfileName(value);
          }}
          placeholder={t("account.nameNotSet")}
        />
        <AppInput
          label={t("account.email")}
          value={profileEmail}
          onChangeText={(value) => {
            setProfileError("");
            setProfileMessage("");
            setProfileEmail(value);
          }}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <View style={styles.infoRow}>
          <Text style={styles.label}>{t("account.apiBaseUrl")}</Text>
          <Text style={styles.meta}>{API_BASE_URL}</Text>
        </View>
        {profileError ? <Text style={styles.errorText}>{profileError}</Text> : null}
        {profileMessage ? <Text style={styles.successText}>{profileMessage}</Text> : null}
        <AppButton
          title={isAuthLoading ? t("common.saving") : t("account.saveProfile")}
          onPress={() => void handleSaveProfile()}
          loading={isAuthLoading}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t("account.securityTitle")}</Text>
        <AppInput
          label={t("account.currentPassword")}
          value={currentPassword}
          onChangeText={(value) => {
            setPasswordError("");
            setPasswordMessage("");
            setCurrentPassword(value);
          }}
          secureTextEntry
        />
        <AppInput
          label={t("account.newPassword")}
          value={newPassword}
          onChangeText={(value) => {
            setPasswordError("");
            setPasswordMessage("");
            setNewPassword(value);
          }}
          secureTextEntry
        />
        <AppInput
          label={t("account.confirmNewPassword")}
          value={confirmPassword}
          onChangeText={(value) => {
            setPasswordError("");
            setPasswordMessage("");
            setConfirmPassword(value);
          }}
          secureTextEntry
        />
        {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
        {passwordMessage ? <Text style={styles.successText}>{passwordMessage}</Text> : null}
        <AppButton
          title={isAuthLoading ? t("common.saving") : t("account.changePassword")}
          onPress={() => void handleChangePassword()}
          loading={isAuthLoading}
          variant="secondary"
        />
      </View>

      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t("account.settingsTitle")}</Text>
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>{isSaving ? t("common.saving") : t("account.synced")}</Text>
          </View>
        </View>

        {isLoading ? <Text style={styles.hint}>{t("common.loading")}</Text> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {settingsMessage ? <Text style={styles.successText}>{settingsMessage}</Text> : null}

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

        <AppInput
          label={t("account.timezone")}
          value={draft.timezone}
          onChangeText={(value) => setField("timezone", value)}
          placeholder="Europe/Athens"
          autoCapitalize="none"
        />

        <SelectGroup<TimeFormat>
          title={t("account.timeFormat")}
          description={t("account.timeFormatDescription")}
          value={draft.time_format}
          options={timeFormatOptions}
          onChange={(value) => setField("time_format", value)}
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

        <AppButton title={isSaving ? t("common.saving") : t("common.save")} onPress={() => void handleSaveSettings()} loading={isSaving} />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t("account.sessionTitle")}</Text>
        <Text style={styles.hint}>{t("account.sessionHint")}</Text>
        <AppButton title={t("common.logout")} onPress={() => void logout()} variant="danger" />
      </View>
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
    card: {
      backgroundColor: colors.surface,
      borderRadius: 8,
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
      color: colors.textSecondary,
      lineHeight: 20
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
      color: colors.textSecondary,
      lineHeight: 19
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
