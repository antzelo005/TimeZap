const { query } = require("../config/db");
const { createAppError, isNonEmptyString, validateEnum } = require("../utils/validators");

const ALLOWED_LANGUAGES = ["en", "el", "ro"];
const ALLOWED_FOCUS_VALUES = ["study", "work", "health", "personal", "general"];
const ALLOWED_DATE_HINTS = ["today", "tomorrow", "this_week", "none"];
const ALLOWED_PRIORITIES = ["low", "medium", "high"];
const ALLOWED_HABIT_RECURRENCE_TYPES = ["daily", "specific_weekdays", "x_times_per_week"];
const ALLOWED_TARGET_PERIODS = ["day", "week"];
const ALLOWED_ICONS = [
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
const DEFAULT_COLORS = ["#2563EB", "#FACC15", "#22C55E", "#EF4444", "#8B5CF6", "#14B8A6"];
const DEFAULT_MODEL = "gemini-2.5-flash";
const MAX_PROMPT_LENGTH = 1000;
const MAX_SUGGESTIONS = 5;
const AI_NOT_CONFIGURED_MESSAGE = "AI suggestions are not configured";
const AI_GENERATION_ERROR_MESSAGE = "Could not generate suggestions";

const suggestionsSchema = {
  type: "object",
  required: ["tasks", "habits", "notes"],
  properties: {
    tasks: {
      type: "array",
      maxItems: MAX_SUGGESTIONS,
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          date_hint: { type: "string", enum: ALLOWED_DATE_HINTS },
          estimated_duration_minutes: { type: "integer" },
          priority: { type: "string", enum: ALLOWED_PRIORITIES },
          icon: { type: "string", enum: ALLOWED_ICONS },
          color: { type: "string" }
        }
      }
    },
    habits: {
      type: "array",
      maxItems: MAX_SUGGESTIONS,
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          recurrence_type: { type: "string", enum: ALLOWED_HABIT_RECURRENCE_TYPES },
          target_count: { type: "integer" },
          target_period: { type: "string", enum: ALLOWED_TARGET_PERIODS },
          icon: { type: "string", enum: ALLOWED_ICONS },
          color: { type: "string" }
        }
      }
    },
    notes: { type: "string" }
  }
};

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, Math.round(number)));
}

function sanitizeText(value, fallback, maxLength) {
  const text = typeof value === "string" ? value.trim() : "";
  const resolved = text || fallback;
  return resolved.slice(0, maxLength);
}

function sanitizeColor(value, index) {
  if (typeof value === "string" && /^#[0-9A-Fa-f]{6}$/.test(value.trim())) {
    return value.trim().toUpperCase();
  }

  return DEFAULT_COLORS[index % DEFAULT_COLORS.length];
}

function sanitizeIcon(value, fallback) {
  const icon = typeof value === "string" ? value.trim().toLowerCase() : "";
  return ALLOWED_ICONS.includes(icon) ? icon : fallback;
}

function sanitizeTask(task, index) {
  const dateHint = ALLOWED_DATE_HINTS.includes(task?.date_hint) ? task.date_hint : "none";
  const priority = ALLOWED_PRIORITIES.includes(task?.priority) ? task.priority : "medium";

  return {
    title: sanitizeText(task?.title, `Suggested task ${index + 1}`, 80),
    description: sanitizeText(task?.description, "", 240),
    date_hint: dateHint,
    estimated_duration_minutes: clampNumber(task?.estimated_duration_minutes, 5, 240, 30),
    priority,
    icon: sanitizeIcon(task?.icon, "task"),
    color: sanitizeColor(task?.color, index)
  };
}

function sanitizeHabit(habit, index) {
  const recurrenceType = ALLOWED_HABIT_RECURRENCE_TYPES.includes(habit?.recurrence_type)
    ? habit.recurrence_type
    : "daily";
  const targetPeriod =
    recurrenceType === "x_times_per_week"
      ? "week"
      : ALLOWED_TARGET_PERIODS.includes(habit?.target_period)
        ? habit.target_period
        : "day";

  return {
    title: sanitizeText(habit?.title, `Suggested habit ${index + 1}`, 80),
    description: sanitizeText(habit?.description, "", 240),
    recurrence_type: recurrenceType,
    target_count: recurrenceType === "x_times_per_week" ? clampNumber(habit?.target_count, 1, 7, 3) : 1,
    target_period: targetPeriod,
    icon: sanitizeIcon(habit?.icon, "habit"),
    color: sanitizeColor(habit?.color, index + 2)
  };
}

function sanitizeSuggestions(value) {
  const tasks = Array.isArray(value?.tasks) ? value.tasks.slice(0, MAX_SUGGESTIONS).map(sanitizeTask) : [];
  const habits = Array.isArray(value?.habits) ? value.habits.slice(0, MAX_SUGGESTIONS).map(sanitizeHabit) : [];
  const notes = sanitizeText(value?.notes, "", 300);

  return {
    tasks,
    habits,
    notes
  };
}

function createAiSuggestionsError(statusCode, message, logMessage = "") {
  const error = createAppError(statusCode, message);
  error.isAiSuggestionsError = true;
  error.logMessage = logMessage;
  return error;
}

function extractGeminiOutputText(data) {
  const chunks = [];

  for (const candidate of data?.candidates || []) {
    for (const part of candidate?.content?.parts || []) {
      if (typeof part?.text === "string") {
        chunks.push(part.text);
      }
    }
  }

  return chunks.join("");
}

function parseJsonObjectFromText(text) {
  const trimmed = typeof text === "string" ? text.trim() : "";

  if (!trimmed) {
    throw createAiSuggestionsError(502, AI_GENERATION_ERROR_MESSAGE, "AI suggestions returned an empty response");
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    const fencedMatch = /```(?:json)?\s*([\s\S]*?)\s*```/i.exec(trimmed);
    const candidate = fencedMatch
      ? fencedMatch[1].trim()
      : trimmed.slice(trimmed.indexOf("{"), trimmed.lastIndexOf("}") + 1).trim();

    if (!candidate || candidate === trimmed) {
      throw createAiSuggestionsError(502, AI_GENERATION_ERROR_MESSAGE, "AI suggestions returned invalid JSON");
    }

    try {
      return JSON.parse(candidate);
    } catch {
      throw createAiSuggestionsError(502, AI_GENERATION_ERROR_MESSAGE, "AI suggestions returned invalid JSON");
    }
  }
}

async function getUserLanguage(userId) {
  const result = await query(
    `SELECT language
     FROM users
     WHERE user_id = $1
     LIMIT 1`,
    [userId]
  );

  return result.rows[0]?.language || "en";
}

function getSystemPrompt(language, focus) {
  return [
    "You generate small, practical task and habit suggestions for TimeZap, a task and habit management app.",
    "Return only suggestions that a user can review and manually add; never imply that items were created.",
    "Keep suggestions concrete, thesis-friendly, and useful for personal organization.",
    "Return at most five tasks and at most five habits.",
    "Do not provide medical, legal, or financial advice. Avoid unsafe, harmful, extreme, or high-risk suggestions.",
    "Return only valid JSON matching the requested schema. Do not include extra commentary outside JSON.",
    "If the prompt is vague, return simple general productivity suggestions.",
    "Use short titles and concise descriptions.",
    "Use only supported icons and valid hex colors.",
    "Prefer daily or x_times_per_week habits. Use specific_weekdays only for weekday/workday routines; TimeZap maps it to weekdays.",
    `Language for user-facing text: ${language}.`,
    `Focus: ${focus}.`
  ].join(" ");
}

async function requestGeminiSuggestions(prompt, language, focus) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw createAiSuggestionsError(503, AI_NOT_CONFIGURED_MESSAGE);
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  let response;

  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "x-goog-api-key": apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          store: false,
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          systemInstruction: {
            parts: [
              {
                text: getSystemPrompt(language, focus)
              }
            ]
          },
          generationConfig: {
            temperature: 0.4,
            candidateCount: 1,
            maxOutputTokens: 4096,
            responseFormat: {
              text: {
                mimeType: "APPLICATION_JSON",
                schema: suggestionsSchema
              }
            }
          }
        })
      }
    );
  } catch {
    throw createAiSuggestionsError(502, AI_GENERATION_ERROR_MESSAGE, "AI suggestions request failed");
  }

  const responseText = await response.text();
  let data = null;

  try {
    data = responseText ? JSON.parse(responseText) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw createAiSuggestionsError(
      502,
      AI_GENERATION_ERROR_MESSAGE,
      `AI suggestions request failed with status ${response.status}`
    );
  }

  const outputText = extractGeminiOutputText(data);
  if (!outputText) {
    throw createAiSuggestionsError(502, AI_GENERATION_ERROR_MESSAGE, "AI suggestions returned no content");
  }

  const parsed = parseJsonObjectFromText(outputText);
  return sanitizeSuggestions(parsed?.suggestions || parsed);
}

async function getSuggestions(req, res, next) {
  try {
    const prompt = typeof req.body.prompt === "string" ? req.body.prompt.trim() : "";
    const requestedLanguage = req.body.language;
    const requestedFocus = req.body.focus || "general";

    if (!isNonEmptyString(prompt)) {
      throw createAppError(400, "prompt is required");
    }

    if (prompt.length > MAX_PROMPT_LENGTH) {
      throw createAppError(400, `prompt must be ${MAX_PROMPT_LENGTH} characters or fewer`);
    }

    if (requestedLanguage && !validateEnum(requestedLanguage, ALLOWED_LANGUAGES)) {
      throw createAppError(400, "Invalid language");
    }

    if (requestedFocus && !validateEnum(requestedFocus, ALLOWED_FOCUS_VALUES)) {
      throw createAppError(400, "Invalid focus");
    }

    const userLanguage = requestedLanguage || (await getUserLanguage(req.user.user_id));
    const language = ALLOWED_LANGUAGES.includes(userLanguage) ? userLanguage : "en";
    const focus = ALLOWED_FOCUS_VALUES.includes(requestedFocus) ? requestedFocus : "general";
    const suggestions = await requestGeminiSuggestions(prompt, language, focus);

    res.status(200).json({
      suggestions
    });
  } catch (error) {
    if (error.isAiSuggestionsError) {
      if (error.logMessage) {
        console.error(error.logMessage);
      }

      return res.status(error.statusCode).json({
        message: error.message
      });
    }

    next(error);
  }
}

module.exports = {
  getSuggestions
};
