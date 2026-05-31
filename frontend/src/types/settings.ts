export type ThemeMode = "light" | "dark" | "system";
export type LanguageCode = "en" | "el" | "ro";
export type WeekStartsOn = "monday" | "sunday";
export type DefaultView = "dashboard" | "tasks" | "habits" | "calendar" | "account";

export interface AppSettings {
  theme: ThemeMode;
  notifications_enabled: boolean;
  default_view: DefaultView;
  week_starts_on: WeekStartsOn;
  timezone: string;
  language: LanguageCode;
}

export interface SettingsResponse {
  settings: AppSettings;
}

export interface UpdateSettingsResponse {
  message: string;
  settings: AppSettings;
}

export type UpdateSettingsPayload = Partial<AppSettings>;
