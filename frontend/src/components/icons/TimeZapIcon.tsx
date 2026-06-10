import React from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Svg, { Circle, G, Line, Path, Polyline, Rect } from "react-native-svg";

export type TimeZapIconName =
  | "account"
  | "bell"
  | "book"
  | "brain"
  | "briefcase"
  | "calendar"
  | "cleaning"
  | "code"
  | "emptyCalendar"
  | "emptyHabits"
  | "emptyTasks"
  | "flame"
  | "food"
  | "gym"
  | "habit"
  | "heart"
  | "home"
  | "money"
  | "moon"
  | "music"
  | "notification"
  | "plus"
  | "sun"
  | "task"
  | "water"
  | "zap";

export interface TimeZapIconProps {
  name?: TimeZapIconName | string | null;
  size?: number;
  color?: string;
  secondaryColor?: string;
  style?: StyleProp<ViewStyle>;
  strokeWidth?: number;
}

const ICON_ALIASES: Record<string, TimeZapIconName> = {
  "\u26A1": "zap",
  "\u2665": "heart",
  "\u2600": "sun",
  "\u25D0": "moon",
  "\u266B": "music",
  "\u2715": "cleaning",
  "\u25CF": "food",
  "</>": "code",
  b: "book",
  bell: "notification",
  clean: "cleaning",
  fitness: "gym",
  health: "heart",
  sleep: "moon",
  streak: "flame",
  study: "book"
};

export function normalizeTimeZapIconName(
  value?: string | null,
  fallback: TimeZapIconName = "zap"
): TimeZapIconName {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim();
  const lower = normalized.toLowerCase();

  if (TIMEZAP_ICON_NAMES.includes(lower as TimeZapIconName)) {
    return lower as TimeZapIconName;
  }

  return ICON_ALIASES[normalized] ?? ICON_ALIASES[lower] ?? fallback;
}

export const TIMEZAP_ICON_NAMES: TimeZapIconName[] = [
  "zap",
  "flame",
  "task",
  "habit",
  "calendar",
  "notification",
  "book",
  "water",
  "gym",
  "code",
  "moon",
  "sun",
  "heart",
  "money",
  "music",
  "home",
  "cleaning",
  "food",
  "brain",
  "briefcase"
];

export default function TimeZapIcon({
  name,
  size = 24,
  color = "#2563EB",
  secondaryColor,
  style,
  strokeWidth = 2
}: TimeZapIconProps) {
  const iconName = normalizeTimeZapIconName(name);
  const accent = secondaryColor ?? color;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      {renderIcon(iconName, color, accent, strokeWidth)}
    </Svg>
  );
}

function renderIcon(name: TimeZapIconName, color: string, secondaryColor: string, strokeWidth: number) {
  switch (name) {
    case "account":
      return (
        <>
          <Circle cx="12" cy="8" r="3.5" stroke={color} strokeWidth={strokeWidth} />
          <Path d="M5 20C5 16.4 8.1 14 12 14C15.9 14 19 16.4 19 20" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        </>
      );
    case "bell":
    case "notification":
      return (
        <>
          <Path
            d="M18 9C18 5.7 15.3 3 12 3C8.7 3 6 5.7 6 9C6 14.5 3.5 16.5 3.5 16.5H20.5C20.5 16.5 18 14.5 18 9Z"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path d="M9.8 19C10.2 20.2 11 21 12 21C13 21 13.8 20.2 14.2 19" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        </>
      );
    case "book":
      return (
        <>
          <Path d="M5 5.5C5 4.7 5.7 4 6.5 4H19V18.5H7C5.9 18.5 5 19.4 5 20.5V5.5Z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
          <Path d="M5 20.5C5 19.4 5.9 18.5 7 18.5H19" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Line x1="8" y1="8" x2="16" y2="8" stroke={secondaryColor} strokeWidth={strokeWidth} strokeLinecap="round" />
        </>
      );
    case "brain":
      return (
        <>
          <Path
            d="M9 5C7.1 5 5.8 6.4 5.8 8.1C4.7 8.7 4 9.8 4 11.2C4 13 5.2 14.4 6.8 14.8C6.9 17 8.4 19 10.5 19H11V5H9Z"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
          <Path
            d="M15 5C16.9 5 18.2 6.4 18.2 8.1C19.3 8.7 20 9.8 20 11.2C20 13 18.8 14.4 17.2 14.8C17.1 17 15.6 19 13.5 19H13V5H15Z"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
          <Path d="M8 10H11M13 10H16M9 14H11M13 14H15" stroke={secondaryColor} strokeWidth={strokeWidth} strokeLinecap="round" />
        </>
      );
    case "briefcase":
      return (
        <>
          <Rect x="3.5" y="7" width="17" height="12" rx="2" stroke={color} strokeWidth={strokeWidth} />
          <Path d="M9 7V5.5C9 4.7 9.7 4 10.5 4H13.5C14.3 4 15 4.7 15 5.5V7" stroke={color} strokeWidth={strokeWidth} />
          <Path d="M3.5 12H20.5" stroke={secondaryColor} strokeWidth={strokeWidth} strokeLinecap="round" />
        </>
      );
    case "calendar":
    case "emptyCalendar":
      return (
        <>
          <Rect x="3.5" y="5" width="17" height="15.5" rx="2" stroke={color} strokeWidth={strokeWidth} />
          <Line x1="3.5" y1="9" x2="20.5" y2="9" stroke={color} strokeWidth={strokeWidth} />
          <Line x1="8" y1="3.5" x2="8" y2="6.5" stroke={secondaryColor} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Line x1="16" y1="3.5" x2="16" y2="6.5" stroke={secondaryColor} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Circle cx="8" cy="13.5" r="1" fill={secondaryColor} />
          <Circle cx="12" cy="13.5" r="1" fill={secondaryColor} />
          <Circle cx="16" cy="13.5" r="1" fill={secondaryColor} />
        </>
      );
    case "cleaning":
      return (
        <>
          <Path d="M15.5 4L20 8.5L8.5 20L4 20L4 15.5L15.5 4Z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
          <Path d="M13.5 6L18 10.5" stroke={secondaryColor} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Path d="M7 15L9 17M10 12L12 14" stroke={secondaryColor} strokeWidth={strokeWidth} strokeLinecap="round" />
        </>
      );
    case "code":
      return (
        <>
          <Path d="M8.5 8L4.5 12L8.5 16" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M15.5 8L19.5 12L15.5 16" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M13.5 5.5L10.5 18.5" stroke={secondaryColor} strokeWidth={strokeWidth} strokeLinecap="round" />
        </>
      );
    case "emptyHabits":
    case "habit":
      return (
        <>
          <Path d="M4.5 12C4.5 7.9 7.9 4.5 12 4.5C14.2 4.5 16.2 5.5 17.6 7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Path d="M19.5 12C19.5 16.1 16.1 19.5 12 19.5C9.8 19.5 7.8 18.5 6.4 17" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Path d="M17.5 7L17.1 4.5L20 5.3" stroke={secondaryColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M6.5 17L6.9 19.5L4 18.7" stroke={secondaryColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </>
      );
    case "emptyTasks":
    case "task":
      return (
        <>
          <Circle cx="6" cy="6.5" r="1.5" fill={secondaryColor} />
          <Line x1="10" y1="6.5" x2="20" y2="6.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Circle cx="6" cy="12" r="1.5" fill={secondaryColor} />
          <Line x1="10" y1="12" x2="20" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Circle cx="6" cy="17.5" r="1.5" stroke={secondaryColor} strokeWidth={strokeWidth} />
          <Line x1="10" y1="17.5" x2="20" y2="17.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        </>
      );
    case "flame":
      return (
        <>
          <Path
            d="M12 3C11.4 5.1 9.5 7.2 9.5 9.6C9.5 10.3 9.7 10.9 10.2 11.4C9.5 10.9 9.1 10.2 9.1 9.4C9.1 8.5 9.4 7.6 9.4 6.7C7.5 8.5 6 10.8 6 13.8C6 18.1 8.8 21 12 21C15.2 21 18 18.1 18 13.8C18 10.7 16.3 8.2 14.5 6.4C14.6 7.7 14.2 8.8 13.5 9.7C13.8 8.9 14 8.1 14 7.3C14 5.6 13.2 4.1 12 3Z"
            fill={color}
          />
          <Path
            d="M12 5.2C11.5 6.8 10.4 8.5 10.4 10.1C10.4 10.7 10.7 11.3 11.1 11.8C10.9 10.2 12.5 8.7 12.5 6.9C12.5 6.2 12.3 5.6 12 5.2Z"
            fill={secondaryColor}
            opacity={0.62}
          />
        </>
      );
    case "food":
      return (
        <>
          <Path d="M7 4V12M10 4V12M7 8H10M8.5 12V20" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Path d="M16.5 4C18.4 5.8 19 8.5 18.3 11.5C17.9 13.2 16.8 14 15.5 14V20" stroke={secondaryColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </>
      );
    case "gym":
      return (
        <>
          <Line x1="5" y1="12" x2="19" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Path d="M4 9V15M7 8V16M17 8V16M20 9V15" stroke={secondaryColor} strokeWidth={strokeWidth} strokeLinecap="round" />
        </>
      );
    case "heart":
      return (
        <Path
          d="M12 20C9.3 17.7 5 14.7 5 10.2C5 7.8 6.8 6 9.1 6C10.3 6 11.3 6.6 12 7.6C12.7 6.6 13.7 6 14.9 6C17.2 6 19 7.8 19 10.2C19 14.7 14.7 17.7 12 20Z"
          fill={color}
        />
      );
    case "home":
      return (
        <>
          <Path d="M4 11.5L12 4L20 11.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M6 10.5V20H18V10.5" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
          <Path d="M10 20V14H14V20" stroke={secondaryColor} strokeWidth={strokeWidth} strokeLinejoin="round" />
        </>
      );
    case "money":
      return (
        <>
          <Circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth={strokeWidth} />
          <Path d="M14.5 8.5C13.9 8 13.1 7.8 12.2 7.8C10.9 7.8 10 8.5 10 9.5C10 12 14.5 11.1 14.5 14.5C14.5 15.5 13.5 16.2 12.2 16.2C11.2 16.2 10.2 15.9 9.5 15.3" stroke={secondaryColor} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Line x1="12" y1="6.5" x2="12" y2="17.5" stroke={secondaryColor} strokeWidth={strokeWidth} strokeLinecap="round" />
        </>
      );
    case "moon":
      return (
        <Path
          d="M18.5 15.5C17.3 16.2 15.9 16.5 14.4 16.5C10.6 16.5 7.5 13.4 7.5 9.6C7.5 8.1 7.8 6.7 8.5 5.5C5.5 6.8 3.5 9.7 3.5 13C3.5 17.1 6.9 20.5 11 20.5C14.3 20.5 17.2 18.5 18.5 15.5Z"
          fill={color}
        />
      );
    case "music":
      return (
        <>
          <Path d="M9 17.5C9 18.9 7.9 20 6.5 20C5.1 20 4 18.9 4 17.5C4 16.1 5.1 15 6.5 15C7.9 15 9 16.1 9 17.5Z" fill={color} />
          <Path d="M20 15.5C20 16.9 18.9 18 17.5 18C16.1 18 15 16.9 15 15.5C15 14.1 16.1 13 17.5 13C18.9 13 20 14.1 20 15.5Z" fill={secondaryColor} />
          <Path d="M9 17.5V6L20 4V15.5M9 9L20 7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </>
      );
    case "plus":
      return (
        <>
          <Line x1="12" y1="5" x2="12" y2="19" stroke={color} strokeWidth={strokeWidth + 1} strokeLinecap="round" />
          <Line x1="5" y1="12" x2="19" y2="12" stroke={color} strokeWidth={strokeWidth + 1} strokeLinecap="round" />
        </>
      );
    case "sun":
      return (
        <>
          <Circle cx="12" cy="12" r="4" fill={color} />
          <G stroke={secondaryColor} strokeWidth={strokeWidth} strokeLinecap="round">
            <Line x1="12" y1="2.5" x2="12" y2="5" />
            <Line x1="12" y1="19" x2="12" y2="21.5" />
            <Line x1="2.5" y1="12" x2="5" y2="12" />
            <Line x1="19" y1="12" x2="21.5" y2="12" />
            <Line x1="5.3" y1="5.3" x2="7" y2="7" />
            <Line x1="17" y1="17" x2="18.7" y2="18.7" />
            <Line x1="18.7" y1="5.3" x2="17" y2="7" />
            <Line x1="7" y1="17" x2="5.3" y2="18.7" />
          </G>
        </>
      );
    case "water":
      return (
        <Path
          d="M12 3C9.2 6.4 6.5 10 6.5 13.5C6.5 17 8.9 20 12 20C15.1 20 17.5 17 17.5 13.5C17.5 10 14.8 6.4 12 3Z"
          fill={color}
        />
      );
    case "zap":
    default:
      return (
        <>
          <Path d="M15.4 2.5L5.5 14H11.7L8.6 21.5L18.5 10H12.3L15.4 2.5Z" fill={color} />
          <Path d="M15.4 2.5L5.5 14H9.5L13.1 9.1L15.4 2.5Z" fill={secondaryColor} opacity={0.72} />
        </>
      );
  }
}
