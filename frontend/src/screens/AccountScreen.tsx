import React, { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import AppButton from "../components/AppButton";
import AppInput from "../components/AppInput";
import FormModal from "../components/FormModal";
import ScreenContainer from "../components/ScreenContainer";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { useTranslation } from "../i18n";
import { cancelAllNativeNotifications, syncNotificationSchedules } from "../services/notifications";
import { useAppTheme } from "../theme/useAppTheme";
import { getErrorMessage } from "../types/api";
import type { AppSettings, DefaultView, LanguageCode, ThemeMode, TimeFormat, WeekStartsOn } from "../types/settings";

type SelectOption<T extends string> = {
  label: string;
  value: T;
};

type AccountModal = "name" | "email" | "password" | "timezone" | null;

const DISPLAY_NAME_PATTERN = /^[A-Za-z0-9_. \u00C0-\u024F\u0370-\u03FF\u1F00-\u1FFF]+$/;
const PASSWORD_MASK = "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022";
const TIMEZONE_OPTIONS = [
  "Europe/Athens",
  "Europe/London",
  "Europe/Amsterdam",
  "Europe/Berlin",
  "Europe/Paris",
  "Europe/Bucharest",
  "America/New_York",
  "America/Los_Angeles",
  "America/Chicago",
  "America/Denver",
  "Asia/Tokyo",
  "Asia/Dubai",
  "Australia/Sydney",
  "UTC"
] as const;

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
              style={({ pressed }) => [
                styles.optionChip,
                isActive ? styles.optionChipActive : null,
                pressed ? styles.pressed : null
              ]}
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

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function maskEmail(email: string): string {
  const trimmed = email.trim();
  const separatorIndex = trimmed.indexOf("@");

  if (separatorIndex <= 0) {
    return "*****";
  }

  const localPart = trimmed.slice(0, separatorIndex);
  const domain = trimmed.slice(separatorIndex + 1);
  const visiblePrefix = localPart.slice(0, Math.min(2, localPart.length));

  return `${visiblePrefix}${"*".repeat(5)}@${domain}`;
}

export default function AccountScreen() {
  const { user, logout, updateProfile, changePassword, isAuthLoading } = useAuth();
  const { settings, isLoading, isSaving, error, updateSettings, resetError } = useSettings();
  const { colors, spacing } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors, spacing), [colors, spacing]);
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [activeModal, setActiveModal] = useState<AccountModal>(null);
  const [emailRevealed, setEmailRevealed] = useState<boolean>(false);
  const [nameDraft, setNameDraft] = useState<string>(user?.display_name ?? "");
  const [namePassword, setNamePassword] = useState<string>("");
  const [nameError, setNameError] = useState<string>("");
  const [emailDraft, setEmailDraft] = useState<string>(user?.email ?? "");
  const [emailPassword, setEmailPassword] = useState<string>("");
  const [emailError, setEmailError] = useState<string>("");
  const [currentPassword, setCurrentPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [settingsMessage, setSettingsMessage] = useState<string>("");
  const [accountMessage, setAccountMessage] = useState<string>("");
  const [passwordMessage, setPasswordMessage] = useState<string>("");
  const [passwordError, setPasswordError] = useState<string>("");

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  useEffect(() => {
    setNameDraft(user?.display_name ?? "");
    setEmailDraft(user?.email ?? "");
    setEmailRevealed(false);
  }, [user?.display_name, user?.email]);

  const nameValue = user?.display_name?.trim() || t("account.nameNotSet");
  const emailValue = user?.email ?? "";
  const timezoneOptions = useMemo(
    () => Array.from(new Set([draft.timezone, ...TIMEZONE_OPTIONS].filter(Boolean))),
    [draft.timezone]
  );

  function setField<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    resetError();
    setSettingsMessage("");
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function openNameModal(): void {
    setNameDraft(user?.display_name ?? "");
    setNamePassword("");
    setNameError("");
    setAccountMessage("");
    setActiveModal("name");
  }

  function openEmailModal(): void {
    setEmailDraft(user?.email ?? "");
    setEmailPassword("");
    setEmailError("");
    setAccountMessage("");
    setActiveModal("email");
  }

  function openPasswordModal(): void {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
    setPasswordMessage("");
    setActiveModal("password");
  }

  function closeModal(): void {
    setActiveModal(null);
    setNameError("");
    setEmailError("");
    setPasswordError("");
  }

  async function handleSaveSettings(): Promise<void> {
    try {
      setSettingsMessage("");
      await updateSettings(draft);
      if (user) {
        if (!draft.notifications_enabled) {
          await cancelAllNativeNotifications(user.user_id);
        } else {
          await syncNotificationSchedules(user.user_id, undefined, true);
        }
      }
      setSettingsMessage(t("account.settingsSaved"));
    } catch {
      setSettingsMessage("");
    }
  }

  async function handleSaveName(): Promise<void> {
    if (!user) {
      return;
    }

    const nextName = nameDraft.trim();

    if (!nextName) {
      setNameError(t("account.nameRequired"));
      return;
    }

    if (nextName.length > 120 || !DISPLAY_NAME_PATTERN.test(nextName)) {
      setNameError(t("account.nameInvalid"));
      return;
    }

    if (!namePassword.trim()) {
      setNameError(t("account.currentPasswordRequired"));
      return;
    }

    try {
      setNameError("");
      await updateProfile({
        email: user.email,
        display_name: nextName,
        current_password: namePassword
      });
      setAccountMessage(t("account.profileUpdated"));
      closeModal();
    } catch (err: unknown) {
      setNameError(getErrorMessage(err));
    }
  }

  async function handleSaveEmail(): Promise<void> {
    if (!user) {
      return;
    }

    const nextEmail = emailDraft.trim().toLowerCase();

    if (!isValidEmail(nextEmail)) {
      setEmailError(t("account.invalidEmail"));
      return;
    }

    if (!emailPassword.trim()) {
      setEmailError(t("account.currentPasswordRequired"));
      return;
    }

    try {
      setEmailError("");
      await updateProfile({
        email: nextEmail,
        display_name: user.display_name ?? null,
        current_password: emailPassword
      });
      setEmailRevealed(false);
      setAccountMessage(t("account.emailUpdated"));
      closeModal();
    } catch (err: unknown) {
      setEmailError(getErrorMessage(err));
    }
  }

  async function handleChangePassword(): Promise<void> {
    if (!currentPassword.trim() || !newPassword.trim()) {
      setPasswordError(t("account.passwordRequired"));
      return;
    }

    if (newPassword.trim().length < 6) {
      setPasswordError(t("account.passwordMinLength"));
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
      setPasswordMessage(t("account.passwordUpdated"));
      closeModal();
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
    <>
      <ScreenContainer>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{t("account.title")}</Text>
          <View style={styles.headerPill}>
            <Text style={styles.headerPillText}>{t("account.secure")}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t("account.accountInfo")}</Text>
          <View style={styles.rowList}>
            <View style={styles.accountRow}>
              <Text style={styles.rowLabel}>{t("account.name")}</Text>
              <Text style={styles.rowValue} numberOfLines={1}>
                {nameValue}
              </Text>
              <Pressable onPress={openNameModal} style={({ pressed }) => [styles.smallButton, pressed ? styles.pressed : null]}>
                <Text style={styles.smallButtonText}>{t("account.edit")}</Text>
              </Pressable>
            </View>

            <View style={styles.accountRow}>
              <Text style={styles.rowLabel}>{t("account.email")}</Text>
              <View style={styles.emailValueWrap}>
                <Text style={styles.rowValue} numberOfLines={1}>
                  {emailRevealed ? emailValue : maskEmail(emailValue)}
                </Text>
                <Pressable
                  onPress={() => setEmailRevealed((current) => !current)}
                  style={({ pressed }) => [styles.linkButton, pressed ? styles.pressed : null]}
                >
                  <Text style={styles.linkButtonText}>{emailRevealed ? t("account.hide") : t("account.reveal")}</Text>
                </Pressable>
              </View>
              <Pressable onPress={openEmailModal} style={({ pressed }) => [styles.smallButton, pressed ? styles.pressed : null]}>
                <Text style={styles.smallButtonText}>{t("account.edit")}</Text>
              </Pressable>
            </View>
          </View>
          {accountMessage ? <Text style={styles.successText}>{accountMessage}</Text> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t("account.security")}</Text>
          <View style={styles.rowList}>
            <View style={styles.accountRow}>
              <Text style={styles.rowLabel}>{t("account.password")}</Text>
              <Text style={styles.rowValue} numberOfLines={1}>
                {PASSWORD_MASK}
              </Text>
              <Pressable onPress={openPasswordModal} style={({ pressed }) => [styles.smallButton, pressed ? styles.pressed : null]}>
                <Text style={styles.smallButtonText}>{t("account.edit")}</Text>
              </Pressable>
            </View>
          </View>
          {passwordMessage ? <Text style={styles.successText}>{passwordMessage}</Text> : null}
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("account.preferences")}</Text>
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

          <View style={styles.settingBlock}>
            <View style={styles.settingCopy}>
              <Text style={styles.settingLabel}>{t("account.timezone")}</Text>
              <Text style={styles.settingHint}>{t("account.timezoneDescription")}</Text>
            </View>
            <Pressable
              onPress={() => setActiveModal("timezone")}
              style={({ pressed }) => [styles.pickerButton, pressed ? styles.pressed : null]}
            >
              <Text style={styles.pickerValue} numberOfLines={1}>
                {draft.timezone}
              </Text>
              <Text style={styles.pickerAction}>{t("account.selectTimezone")}</Text>
            </Pressable>
          </View>

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

      <FormModal
        visible={activeModal === "name"}
        title={t("account.changeName")}
        subtitle={t("account.changeNameDescription")}
        closeLabel={t("common.cancel")}
        onClose={closeModal}
      >
        <AppInput
          label={t("account.name")}
          value={nameDraft}
          onChangeText={(value) => {
            setNameError("");
            setNameDraft(value);
          }}
          placeholder={t("account.nameNotSet")}
        />
        <AppInput
          label={t("account.currentPassword")}
          value={namePassword}
          onChangeText={(value) => {
            setNameError("");
            setNamePassword(value);
          }}
          secureTextEntry
        />
        {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
        <AppButton
          title={isAuthLoading ? t("common.saving") : t("common.done")}
          onPress={() => void handleSaveName()}
          loading={isAuthLoading}
        />
      </FormModal>

      <FormModal
        visible={activeModal === "email"}
        title={t("account.changeEmail")}
        subtitle={t("account.changeEmailDescription")}
        closeLabel={t("common.cancel")}
        onClose={closeModal}
      >
        <AppInput
          label={t("account.email")}
          value={emailDraft}
          onChangeText={(value) => {
            setEmailError("");
            setEmailDraft(value);
          }}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <AppInput
          label={t("account.currentPassword")}
          value={emailPassword}
          onChangeText={(value) => {
            setEmailError("");
            setEmailPassword(value);
          }}
          secureTextEntry
        />
        {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
        <AppButton
          title={isAuthLoading ? t("common.saving") : t("common.done")}
          onPress={() => void handleSaveEmail()}
          loading={isAuthLoading}
        />
      </FormModal>

      <FormModal
        visible={activeModal === "password"}
        title={t("account.updatePassword")}
        subtitle={t("account.updatePasswordDescription")}
        closeLabel={t("common.cancel")}
        onClose={closeModal}
      >
        <AppInput
          label={t("account.currentPassword")}
          value={currentPassword}
          onChangeText={(value) => {
            setPasswordError("");
            setCurrentPassword(value);
          }}
          secureTextEntry
        />
        <AppInput
          label={t("account.newPassword")}
          value={newPassword}
          onChangeText={(value) => {
            setPasswordError("");
            setNewPassword(value);
          }}
          secureTextEntry
        />
        <AppInput
          label={t("account.confirmNewPassword")}
          value={confirmPassword}
          onChangeText={(value) => {
            setPasswordError("");
            setConfirmPassword(value);
          }}
          secureTextEntry
        />
        {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
        <AppButton
          title={isAuthLoading ? t("common.saving") : t("common.done")}
          onPress={() => void handleChangePassword()}
          loading={isAuthLoading}
        />
      </FormModal>

      <FormModal
        visible={activeModal === "timezone"}
        title={t("account.selectTimezone")}
        subtitle={t("account.selectTimezoneDescription")}
        closeLabel={t("common.cancel")}
        onClose={closeModal}
      >
        <View style={styles.timezoneList}>
          {timezoneOptions.map((timezone) => {
            const isActive = timezone === draft.timezone;

            return (
              <Pressable
                key={timezone}
                onPress={() => {
                  setField("timezone", timezone);
                  closeModal();
                }}
                style={({ pressed }) => [
                  styles.timezoneOption,
                  isActive ? styles.timezoneOptionActive : null,
                  pressed ? styles.pressed : null
                ]}
              >
                <Text style={[styles.timezoneText, isActive ? styles.timezoneTextActive : null]}>{timezone}</Text>
              </Pressable>
            );
          })}
        </View>
      </FormModal>
    </>
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
    rowList: {
      borderTopWidth: 1,
      borderTopColor: colors.border
    },
    accountRow: {
      minHeight: 60,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingVertical: spacing.sm
    },
    rowLabel: {
      width: Platform.OS === "android" ? 90 : 120,
      color: colors.textSecondary,
      fontSize: 14,
      fontWeight: "700"
    },
    rowValue: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: 15,
      fontWeight: "700",
      textAlign: "right"
    },
    emailValueWrap: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: spacing.xs,
      minWidth: 0
    },
    smallButton: {
      minHeight: 36,
      minWidth: 52,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.primaryBlueSoft,
      backgroundColor: colors.primaryBlueUltraSoft,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.sm,
      paddingVertical: 7
    },
    smallButtonText: {
      color: colors.primaryBlueDark,
      fontSize: 12,
      fontWeight: "800"
    },
    linkButton: {
      minHeight: 34,
      justifyContent: "center",
      paddingHorizontal: 2
    },
    linkButtonText: {
      color: colors.primaryBlueDark,
      fontSize: 12,
      fontWeight: "800"
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
    pickerButton: {
      minHeight: 52,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm
    },
    pickerValue: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: 15,
      fontWeight: "700"
    },
    pickerAction: {
      color: colors.primaryBlueDark,
      fontSize: 12,
      fontWeight: "800"
    },
    timezoneList: {
      gap: spacing.sm
    },
    timezoneOption: {
      minHeight: 48,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
      justifyContent: "center",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm
    },
    timezoneOptionActive: {
      borderColor: colors.primaryBlue,
      backgroundColor: colors.primaryBlueUltraSoft
    },
    timezoneText: {
      color: colors.textPrimary,
      fontSize: 15,
      fontWeight: "700"
    },
    timezoneTextActive: {
      color: colors.primaryBlueDark
    },
    pressed: {
      transform: [{ translateY: 1 }]
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
