import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { getSettings, updateSettings as updateSettingsRequest } from "../api/settings.api";
import { useAuth } from "./AuthContext";
import type {
  AppSettings,
  DefaultView,
  LanguageCode,
  ThemeMode,
  UpdateSettingsPayload,
  WeekStartsOn
} from "../types/settings";
import { clearStoredSettings, getStoredSettings, setStoredSettings } from "../storage/settingsStorage";
import { getErrorMessage } from "../types/api";

interface SettingsContextValue {
  settings: AppSettings;
  isLoading: boolean;
  isSaving: boolean;
  error: string;
  updateSettings: (payload: UpdateSettingsPayload) => Promise<void>;
  resetError: () => void;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

function getLocalTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function getDefaultSettings(): AppSettings {
  return {
    theme: "light",
    language: "en",
    notifications_enabled: true,
    default_view: "dashboard",
    week_starts_on: "monday",
    timezone: getLocalTimezone()
  };
}

function normalizeTheme(theme: string | undefined): ThemeMode {
  return theme === "dark" || theme === "system" ? theme : "light";
}

function normalizeLanguage(language: string | undefined): LanguageCode {
  return language === "el" || language === "ro" ? language : "en";
}

function normalizeDefaultView(view: string | undefined): DefaultView {
  return view === "tasks" || view === "habits" || view === "calendar" || view === "account"
    ? view
    : "dashboard";
}

function normalizeWeekStartsOn(value: string | undefined): WeekStartsOn {
  return value === "sunday" ? "sunday" : "monday";
}

function normalizeSettings(settings: Partial<AppSettings> | null | undefined): AppSettings {
  const defaults = getDefaultSettings();

  return {
    theme: normalizeTheme(settings?.theme),
    language: normalizeLanguage(settings?.language),
    notifications_enabled:
      settings?.notifications_enabled !== undefined
        ? settings.notifications_enabled
        : defaults.notifications_enabled,
    default_view: normalizeDefaultView(settings?.default_view),
    week_starts_on: normalizeWeekStartsOn(settings?.week_starts_on),
    timezone: settings?.timezone || defaults.timezone
  };
}

interface SettingsProviderProps {
  children: ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const { isAuthenticated, isBootstrapping } = useAuth();
  const [settings, setSettings] = useState<AppSettings>(getDefaultSettings);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (isBootstrapping) {
      return;
    }

    if (!isAuthenticated) {
      setSettings(getDefaultSettings());
      setError("");
      setIsLoading(false);
      void clearStoredSettings();
      return;
    }

    void loadSettings();
  }, [isAuthenticated, isBootstrapping]);

  async function loadSettings(): Promise<void> {
    try {
      setError("");
      setIsLoading(true);

      const cachedSettings = await getStoredSettings();
      if (cachedSettings) {
        setSettings(normalizeSettings(cachedSettings));
      }

      const response = await getSettings();
      const normalized = normalizeSettings(response.settings);
      setSettings(normalized);
      await setStoredSettings(normalized);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
      const cachedSettings = await getStoredSettings();
      if (cachedSettings) {
        setSettings(normalizeSettings(cachedSettings));
      } else {
        setSettings(getDefaultSettings());
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function updateSettings(payload: UpdateSettingsPayload): Promise<void> {
    const previous = settings;
    const optimistic = normalizeSettings({
      ...settings,
      ...payload
    });

    try {
      setError("");
      setIsSaving(true);
      setSettings(optimistic);
      await setStoredSettings(optimistic);

      const response = await updateSettingsRequest(payload);
      const normalized = normalizeSettings(response.settings);
      setSettings(normalized);
      await setStoredSettings(normalized);
    } catch (err: unknown) {
      setSettings(previous);
      await setStoredSettings(previous);
      setError(getErrorMessage(err));
      throw err;
    } finally {
      setIsSaving(false);
    }
  }

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      isLoading,
      isSaving,
      error,
      updateSettings,
      resetError: () => setError("")
    }),
    [settings, isLoading, isSaving, error]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);

  if (!context) {
    throw new Error("useSettings must be used within SettingsProvider");
  }

  return context;
}
