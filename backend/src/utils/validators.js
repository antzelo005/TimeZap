function createAppError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function validatePassword(password) {
  return typeof password === "string" && password.trim().length >= 6;
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validateISODate(value) {
  if (typeof value !== "string") {
    return false;
  }

  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return false;
  }

  const date = new Date(`${trimmed}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === trimmed;
}

function validateTime(value) {
  return typeof value === "string" && /^\d{2}:\d{2}(:\d{2})?$/.test(value.trim());
}

function validateBoolean(value) {
  return typeof value === "boolean";
}

function validateEnum(value, allowedValues) {
  return allowedValues.includes(value);
}

function parseId(value, fieldName) {
  if (!/^\d+$/.test(String(value || ""))) {
    throw createAppError(400, `${fieldName} must be a valid numeric identifier`);
  }

  return String(value);
}

function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftDateString(value, dayOffset) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + dayOffset);

  const shiftedYear = date.getFullYear();
  const shiftedMonth = String(date.getMonth() + 1).padStart(2, "0");
  const shiftedDay = String(date.getDate()).padStart(2, "0");
  return `${shiftedYear}-${shiftedMonth}-${shiftedDay}`;
}

function parseUTCDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatUTCDate(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPeriodBounds(dateString, targetPeriod, weekStartsOn = "monday") {
  if (targetPeriod === "day") {
    return {
      start_date: dateString,
      end_date: dateString
    };
  }

  if (targetPeriod === "week") {
    const date = parseUTCDate(dateString);
    const weekStartDay = weekStartsOn === "sunday" ? 0 : 1;
    const startOffset = (date.getUTCDay() - weekStartDay + 7) % 7;
    const startDate = new Date(date);
    startDate.setUTCDate(date.getUTCDate() - startOffset);

    const endDate = new Date(startDate);
    endDate.setUTCDate(startDate.getUTCDate() + 6);

    return {
      start_date: formatUTCDate(startDate),
      end_date: formatUTCDate(endDate)
    };
  }

  if (targetPeriod === "month") {
    const [year, month] = dateString.split("-").map(Number);
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0));

    return {
      start_date: formatUTCDate(startDate),
      end_date: formatUTCDate(endDate)
    };
  }

  return null;
}

function calculateCurrentDailyStreak(dateStrings, todayString = getTodayDateString()) {
  const completedDates = new Set(dateStrings);
  let cursor = completedDates.has(todayString) ? todayString : shiftDateString(todayString, -1);
  let streak = 0;

  while (completedDates.has(cursor)) {
    streak += 1;
    cursor = shiftDateString(cursor, -1);
  }

  return streak;
}

module.exports = {
  calculateCurrentDailyStreak,
  createAppError,
  getPeriodBounds,
  getTodayDateString,
  isNonEmptyString,
  isValidEmail,
  parseId,
  validateBoolean,
  validateEnum,
  validateISODate,
  validatePassword,
  validateTime
};
