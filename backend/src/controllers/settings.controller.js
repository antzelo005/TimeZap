const { pool, query } = require("../config/db");
const {
  createAppError,
  validateBoolean,
  validateEnum
} = require("../utils/validators");

const ALLOWED_THEMES = ["light", "dark", "system"];
const ALLOWED_VIEWS = ["dashboard", "tasks", "habits", "calendar", "account"];
const ALLOWED_WEEK_STARTS = ["monday", "sunday"];
const ALLOWED_TIME_FORMATS = ["12h", "24h"];

async function ensureUserSettings(userId, runner = query) {
  const existing = await runner.query(
    `SELECT
       setting_id,
       user_id,
       theme,
       notifications_enabled,
       default_view,
       week_starts_on,
       COALESCE(time_format, '12h') AS time_format,
       created_at,
       updated_at
     FROM user_settings
     WHERE user_id = $1
     LIMIT 1`,
    [userId]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0];
  }

  const inserted = await runner.query(
    `INSERT INTO user_settings (
       user_id,
       theme,
       notifications_enabled,
       default_view,
       week_starts_on,
       created_at,
       updated_at
     ) VALUES ($1, 'system', true, 'dashboard', 'monday', NOW(), NOW())
     RETURNING setting_id, user_id, theme, notifications_enabled, default_view, week_starts_on, COALESCE(time_format, '12h') AS time_format, created_at, updated_at`,
    [userId]
  );

  return inserted.rows[0];
}

async function getSettings(req, res, next) {
  try {
    const settings = await ensureUserSettings(req.user.user_id, { query });
    const userResult = await query(
      `SELECT timezone, language
       FROM users
       WHERE user_id = $1
       LIMIT 1`,
      [req.user.user_id]
    );

    if (userResult.rows.length === 0) {
      throw createAppError(404, "User not found");
    }

    res.status(200).json({
      settings: {
        theme: settings.theme,
        notifications_enabled: settings.notifications_enabled,
        default_view: settings.default_view,
        week_starts_on: settings.week_starts_on,
        time_format: settings.time_format || "12h",
        timezone: userResult.rows[0].timezone,
        language: userResult.rows[0].language
      }
    });
  } catch (error) {
    next(error);
  }
}

async function updateSettings(req, res, next) {
  let client;

  try {
    const {
      theme,
      notifications_enabled,
      default_view,
      week_starts_on,
      time_format,
      timezone,
      language
    } = req.body;

    if (theme && !validateEnum(theme, ALLOWED_THEMES)) {
      throw createAppError(400, "Invalid theme");
    }

    if (
      notifications_enabled !== undefined &&
      !validateBoolean(notifications_enabled)
    ) {
      throw createAppError(400, "notifications_enabled must be a boolean");
    }

    if (default_view && !validateEnum(default_view, ALLOWED_VIEWS)) {
      throw createAppError(400, "Invalid default_view");
    }

    if (week_starts_on && !validateEnum(week_starts_on, ALLOWED_WEEK_STARTS)) {
      throw createAppError(400, "Invalid week_starts_on");
    }

    if (time_format && !validateEnum(time_format, ALLOWED_TIME_FORMATS)) {
      throw createAppError(400, "Invalid time_format");
    }

    if (timezone !== undefined && typeof timezone !== "string") {
      throw createAppError(400, "timezone must be a string");
    }

    if (language !== undefined && typeof language !== "string") {
      throw createAppError(400, "language must be a string");
    }

    client = await pool.connect();
    await client.query("BEGIN");

    const currentSettings = await ensureUserSettings(req.user.user_id, client);

    await client.query(
      `UPDATE user_settings
       SET
         theme = $1,
         notifications_enabled = $2,
         default_view = $3,
         week_starts_on = $4,
         time_format = $5,
         updated_at = NOW()
       WHERE user_id = $6`,
      [
        theme || currentSettings.theme,
        notifications_enabled !== undefined
          ? notifications_enabled
          : currentSettings.notifications_enabled,
        default_view || currentSettings.default_view,
        week_starts_on || currentSettings.week_starts_on,
        time_format || currentSettings.time_format || "12h",
        req.user.user_id
      ]
    );

    const userResult = await client.query(
      `SELECT timezone, language
       FROM users
       WHERE user_id = $1
       LIMIT 1`,
      [req.user.user_id]
    );

    if (userResult.rows.length === 0) {
      throw createAppError(404, "User not found");
    }

    await client.query(
      `UPDATE users
       SET
         timezone = $1,
         language = $2,
         updated_at = NOW()
       WHERE user_id = $3`,
      [
        timezone || userResult.rows[0].timezone,
        language || userResult.rows[0].language,
        req.user.user_id
      ]
    );

    await client.query("COMMIT");

    const updatedSettings = await ensureUserSettings(req.user.user_id, { query });
    const updatedUserResult = await query(
      `SELECT timezone, language
       FROM users
       WHERE user_id = $1
       LIMIT 1`,
      [req.user.user_id]
    );

    res.status(200).json({
      message: "Settings updated successfully",
      settings: {
        theme: updatedSettings.theme,
        notifications_enabled: updatedSettings.notifications_enabled,
        default_view: updatedSettings.default_view,
        week_starts_on: updatedSettings.week_starts_on,
        time_format: updatedSettings.time_format || "12h",
        timezone: updatedUserResult.rows[0].timezone,
        language: updatedUserResult.rows[0].language
      }
    });
  } catch (error) {
    if (client) {
      await client.query("ROLLBACK").catch(() => null);
    }
    next(error);
  } finally {
    if (client) {
      client.release();
    }
  }
}

module.exports = {
  getSettings,
  updateSettings
};
