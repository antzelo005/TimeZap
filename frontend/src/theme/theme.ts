import baseColors from "./colors";

export type ResolvedTheme = "light" | "dark";
export type ThemeColors = Record<keyof typeof baseColors, string>;

export const lightColors: ThemeColors = {
  ...baseColors
};

export const darkColors: ThemeColors = {
  primaryBlue: "#60A5FA",
  primaryBlueDark: "#3B82F6",
  primaryBlueSoft: "#1E3A8A",
  primaryBlueUltraSoft: "#172554",
  zapYellow: "#FACC15",
  zapYellowDark: "#EAB308",
  zapYellowSoft: "#713F12",
  appBackground: "#020617",
  surface: "#0F172A",
  surfaceMuted: "#1E293B",
  border: "#334155",
  textPrimary: "#F8FAFC",
  textSecondary: "#CBD5E1",
  textMuted: "#94A3B8",
  textOnPrimary: "#FFFFFF",
  danger: "#F87171",
  dangerSoft: "#451A1A",
  warning: "#F59E0B",
  warningSoft: "#78350F",
  success: "#60A5FA"
};

export function getThemeColors(theme: ResolvedTheme): ThemeColors {
  return theme === "dark" ? darkColors : lightColors;
}
