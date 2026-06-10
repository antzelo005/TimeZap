import type { TimeFormat } from "../types/settings";

export function normalizeTimeForInput(value?: string | null): string {
  if (!value) {
    return "";
  }

  return value.split(":").slice(0, 2).join(":");
}

function parseTime(value?: string | null): { hour: number; minute: number } | null {
  const normalized = normalizeTimeForInput(value);
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(normalized);

  if (!match) {
    return null;
  }

  return {
    hour: Number(match[1]),
    minute: Number(match[2])
  };
}

export function formatTimeForDisplay(value?: string | null, timeFormat: TimeFormat = "12h"): string {
  const parsed = parseTime(value);

  if (!parsed) {
    return "";
  }

  if (timeFormat === "24h") {
    return `${String(parsed.hour).padStart(2, "0")}:${String(parsed.minute).padStart(2, "0")}`;
  }

  const hour = parsed.hour % 12 === 0 ? 12 : parsed.hour % 12;
  const period = parsed.hour >= 12 ? "PM" : "AM";
  return `${hour}:${String(parsed.minute).padStart(2, "0")} ${period}`;
}

export function formatTimeRangeForDisplay(
  startTime?: string | null,
  endTime?: string | null,
  timeFormat: TimeFormat = "12h"
): string {
  const startLabel = formatTimeForDisplay(startTime, timeFormat);
  const endLabel = formatTimeForDisplay(endTime, timeFormat);

  if (startLabel && endLabel) {
    return `${startLabel} - ${endLabel}`;
  }

  return startLabel || endLabel;
}

export function timeToMinutes(value?: string | null): number | null {
  const parsed = parseTime(value);
  return parsed ? parsed.hour * 60 + parsed.minute : null;
}
