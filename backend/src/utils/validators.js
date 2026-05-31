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

  return Number(value);
}

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

module.exports = {
  createAppError,
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
