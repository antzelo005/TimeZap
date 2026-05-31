import { useColorScheme } from "react-native";
import { useSettings } from "../context/SettingsContext";
import spacing from "./spacing";
import { getThemeColors } from "./theme";

export function useAppTheme() {
  const { settings } = useSettings();
  const systemColorScheme = useColorScheme();
  const resolvedTheme =
    settings.theme === "system"
      ? systemColorScheme === "dark"
        ? "dark"
        : "light"
      : settings.theme;

  return {
    colors: getThemeColors(resolvedTheme),
    spacing,
    themeMode: settings.theme,
    isDark: resolvedTheme === "dark"
  };
}
