import { useColorScheme } from "react-native";
import { useSettings } from "../context/SettingsContext";
import spacing from "./spacing";
import { getThemeColors, type ResolvedTheme } from "./theme";
import type { ThemeMode } from "../types/settings";

function normalizeThemeMode(theme: string | undefined): ThemeMode {
  return theme === "dark" || theme === "system" ? theme : "light";
}

export function useAppTheme() {
  const { settings } = useSettings();
  const systemColorScheme = useColorScheme();
  const themeMode = normalizeThemeMode(settings?.theme);
  const resolvedTheme =
    themeMode === "system"
      ? systemColorScheme === "dark"
        ? "dark"
        : "light"
      : themeMode;

  return {
    colors: getThemeColors(resolvedTheme as ResolvedTheme),
    spacing,
    themeMode,
    isDark: resolvedTheme === "dark"
  };
}
