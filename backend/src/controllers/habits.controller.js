const { pool, query } = require("../config/db");
const {
  calculateCurrentDailyStreak,
  createAppError,
  getPeriodBounds,
  getTodayDateString,
  isNonEmptyString,
  parseId,
  validateBoolean,
  validateISODate,
  validateEnum,
  validateTime
} = require("../utils/validators");
const {
  cancelNotificationsForRelated,
  cancelRemainingNotificationsForRelatedDate,
  createHabitReminderNotifications
} = require("./notifications.controller");

const ALLOWED_HABIT_STATUSES = ["active", "archived"];
const ALLOWED_RECURRENCE_TYPES = [
  "daily",
  "specific_weekdays",
  "every_n_days",
  "x_times_per_week",
  "x_times_per_month"
];
const ALLOWED_WEEK_STARTS = ["monday", "sunday"];
const PERIOD_RECURRENCE_TYPES = ["x_times_per_week", "x_times_per_month"];

function getDefaultTargetPeriod(recurrenceType, providedTargetPeriod) {
  if (providedTargetPeriod) {
    return providedTargetPeriod;
  }

  switch (recurrenceType) {
    case "daily":
      return "day";
    case "x_times_per_week":
      return "week";
    case "x_times_per_month":
      return "month";
    default:
      return "custom";
  }
}

function isPeriodProgressHabit(habit) {
  return Boolean(habit.rule && PERIOD_RECURRENCE_TYPES.includes(habit.rule.recurrence_type));
}

function getHabitTargetPeriod(habit) {
  if (!habit.rule) {
    return null;
  }

  if (habit.rule.recurrence_type === "x_times_per_week") {
    return "week";
  }

  if (habit.rule.recurrence_type === "x_times_per_month") {
    return "month";
  }

  return habit.rule.target_period;
}

function getHabitTargetCount(habit) {
  const targetCount = Number(habit.rule?.target_count ?? 1);
  return Number.isInteger(targetCount) && targetCount > 0 ? targetCount : 1;
}

function buildHabitPeriodMeta(habit, dateString, weekStartsOn) {
  if (!isPeriodProgressHabit(habit)) {
    return null;
  }

  const targetPeriod = getHabitTargetPeriod(habit);
  const bounds = getPeriodBounds(dateString, targetPeriod, weekStartsOn || habit.rule.week_start || "monday");

  if (!bounds) {
    return null;
  }

  return {
    ...bounds,
    period_label: targetPeriod,
    target_count: getHabitTargetCount(habit),
    target_period: targetPeriod
  };
}

function emptyPeriodProgress(habit) {
  return {
    ...habit,
    target_count: habit.rule ? getHabitTargetCount(habit) : null,
    target_period: habit.rule?.target_period ?? null,
    period_progress: null,
    completed_for_period: null,
    period_label: null
  };
}

async function getUserWeekStart(userId) {
  const settingsResult = await query(
    `SELECT week_starts_on
     FROM user_settings
     WHERE user_id = $1
     LIMIT 1`,
    [userId]
  );

  return settingsResult.rows[0]?.week_starts_on || "monday";
}

async function getHabitPeriodCompletedCount(executor, userId, habitId, startDate, endDate) {
  const result = await executor.query(
    `SELECT COALESCE(SUM(completed_count), 0)::int AS period_progress
     FROM habit_logs
     WHERE habit_id = $1
       AND user_id = $2
       AND log_date BETWEEN $3 AND $4
       AND status = 'completed'`,
    [habitId, userId, startDate, endDate]
  );

  return Number(result.rows[0]?.period_progress ?? 0);
}

function buildPeriodProgressResponse(habit, meta, periodProgress) {
  const clampedProgress = Math.min(periodProgress, meta.target_count);

  return {
    ...habit,
    target_count: meta.target_count,
    target_period: meta.target_period,
    period_progress: clampedProgress,
    completed_for_period: periodProgress >= meta.target_count,
    period_label: meta.period_label
  };
}

async function attachHabitPeriodProgress(habit, userId, dateString, weekStartsOn) {
  const meta = buildHabitPeriodMeta(habit, dateString, weekStartsOn);

  if (!meta) {
    return emptyPeriodProgress(habit);
  }

  const periodProgress = await getHabitPeriodCompletedCount(
    { query },
    userId,
    habit.habit_id,
    meta.start_date,
    meta.end_date
  );

  return buildPeriodProgressResponse(habit, meta, periodProgress);
}

function getProgressDateFromRequest(req) {
  const progressDate = req.query.date || getTodayDateString();

  if (!validateISODate(progressDate)) {
    throw createAppError(400, "date must be a valid ISO date");
  }

  return progressDate;
}

function mapHabitRow(habitRow, ruleRow, dayRows) {
  return {
    habit_id: habitRow.habit_id,
    user_id: habitRow.user_id,
    title: habitRow.title,
    description: habitRow.description,
    start_date: habitRow.start_date,
    end_date: habitRow.end_date,
    start_time: habitRow.start_time,
    end_time: habitRow.end_time,
    reminder_enabled: habitRow.reminder_enabled,
    reminder_time: habitRow.reminder_time,
    status: habitRow.status,
    emoji: habitRow.emoji,
    color: habitRow.color,
    created_at: habitRow.created_at,
    updated_at: habitRow.updated_at,
    rule: ruleRow
      ? {
          rule_id: ruleRow.rule_id,
          recurrence_type: ruleRow.recurrence_type,
          interval_value: ruleRow.interval_value,
          target_count: ruleRow.target_count,
          target_period: ruleRow.target_period,
          week_start: ruleRow.week_start,
          is_active: ruleRow.is_active,
          days: dayRows.map((row) => ({
            rule_day_id: row.rule_day_id,
            day_of_week: row.day_of_week,
            day_of_month: row.day_of_month
          }))
        }
      : null
  };
}

function validateHabitPayload(body, options = {}) {
  const { requireTitle = true, requireStartDate = true } = options;
  const { title, start_date, end_date, start_time, end_time, reminder_enabled, reminder_time, status, rule } = body;

  if (requireTitle && !isNonEmptyString(title)) {
    throw createAppError(400, "Title is required");
  }

  if (requireStartDate && !start_date) {
    throw createAppError(400, "start_date is required");
  }

  if (start_date && !validateISODate(start_date)) {
    throw createAppError(400, "start_date must be a valid ISO date");
  }

  if (end_date && !validateISODate(end_date)) {
    throw createAppError(400, "end_date must be a valid ISO date");
  }

  if (start_date && end_date && end_date < start_date) {
    throw createAppError(400, "end_date must be on or after start_date");
  }

  if (start_time && !validateTime(start_time)) {
    throw createAppError(400, "start_time must be a valid time");
  }

  if (end_time && !validateTime(end_time)) {
    throw createAppError(400, "end_time must be a valid time");
  }

  if (reminder_enabled !== undefined && !validateBoolean(reminder_enabled)) {
    throw createAppError(400, "reminder_enabled must be a boolean");
  }

  if (reminder_time && !validateTime(reminder_time)) {
    throw createAppError(400, "reminder_time must be a valid time");
  }

  if (status && !validateEnum(status, ALLOWED_HABIT_STATUSES)) {
    throw createAppError(400, "Invalid habit status");
  }

  if (rule) {
    if (!validateEnum(rule.recurrence_type, ALLOWED_RECURRENCE_TYPES)) {
      throw createAppError(400, "Invalid recurrence_type");
    }

    if (rule.week_start && !validateEnum(rule.week_start, ALLOWED_WEEK_STARTS)) {
      throw createAppError(400, "Invalid week_start");
    }

    if (rule.days && !Array.isArray(rule.days)) {
      throw createAppError(400, "rule.days must be an array");
    }
  }
}

async function getHabitWithRule(userId, habitId) {
  const habitResult = await query(
    `SELECT
       habit_id,
       user_id,
       title,
       description,
       to_char(start_date, 'YYYY-MM-DD') AS start_date,
       to_char(end_date, 'YYYY-MM-DD') AS end_date,
       to_char(start_time, 'HH24:MI:SS') AS start_time,
       to_char(end_time, 'HH24:MI:SS') AS end_time,
       reminder_enabled,
       to_char(reminder_time, 'HH24:MI:SS') AS reminder_time,
       status,
       emoji,
       color,
       created_at,
       updated_at
     FROM habits
     WHERE habit_id = $1 AND user_id = $2
     LIMIT 1`,
    [habitId, userId]
  );

  if (habitResult.rows.length === 0) {
    return null;
  }

  const habit = habitResult.rows[0];
  const ruleResult = await query(
    `SELECT
       rule_id,
       habit_id,
       recurrence_type,
       interval_value,
       target_count,
       target_period,
       week_start,
       is_active,
       created_at,
       updated_at
     FROM habit_rules
     WHERE habit_id = $1 AND is_active = true
     ORDER BY updated_at DESC, rule_id DESC
     LIMIT 1`,
    [habitId]
  );

  const rule = ruleResult.rows[0] || null;
  let dayRows = [];

  if (rule) {
    const daysResult = await query(
      `SELECT rule_day_id, rule_id, day_of_week, day_of_month
       FROM habit_rule_days
       WHERE rule_id = $1
       ORDER BY rule_day_id ASC`,
      [rule.rule_id]
    );
    dayRows = daysResult.rows;
  }

  return mapHabitRow(habit, rule, dayRows);
}

async function getHabits(req, res, next) {
  try {
    const progressDate = getProgressDateFromRequest(req);
    const weekStartsOn = await getUserWeekStart(req.user.user_id);
    const habitsResult = await query(
      `SELECT
         habit_id,
         user_id,
         title,
         description,
         to_char(start_date, 'YYYY-MM-DD') AS start_date,
         to_char(end_date, 'YYYY-MM-DD') AS end_date,
         to_char(start_time, 'HH24:MI:SS') AS start_time,
         to_char(end_time, 'HH24:MI:SS') AS end_time,
         reminder_enabled,
         to_char(reminder_time, 'HH24:MI:SS') AS reminder_time,
         status,
         emoji,
         color,
         created_at,
         updated_at
       FROM habits
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.user_id]
    );

    const habits = [];
    for (const row of habitsResult.rows) {
      const habit = await getHabitWithRule(req.user.user_id, row.habit_id);
      habits.push(await attachHabitPeriodProgress(habit, req.user.user_id, progressDate, weekStartsOn));
    }

    res.status(200).json({
      items: habits
    });
  } catch (error) {
    next(error);
  }
}

async function getHabitById(req, res, next) {
  try {
    const habitId = parseId(req.params.id, "Habit ID");
    const progressDate = getProgressDateFromRequest(req);
    const weekStartsOn = await getUserWeekStart(req.user.user_id);
    const habit = await getHabitWithRule(req.user.user_id, habitId);

    if (!habit) {
      throw createAppError(404, "Habit not found");
    }

    res.status(200).json({
      habit: await attachHabitPeriodProgress(habit, req.user.user_id, progressDate, weekStartsOn)
    });
  } catch (error) {
    next(error);
  }
}

async function createHabit(req, res, next) {
  let client;

  try {
    validateHabitPayload(req.body, { requireTitle: true, requireStartDate: true });

    const {
      title,
      description,
      start_date,
      end_date,
      start_time,
      end_time,
      reminder_enabled,
      reminder_time,
      emoji,
      color,
      rule = {}
    } = req.body;

    client = await pool.connect();
    await client.query("BEGIN");

    const habitResult = await client.query(
      `INSERT INTO habits (
         user_id,
         title,
         description,
         start_date,
         end_date,
         start_time,
         end_time,
         reminder_enabled,
         reminder_time,
         status,
         emoji,
         color,
         created_at,
         updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', $10, $11, NOW(), NOW())
       RETURNING habit_id`,
      [
        req.user.user_id,
        title.trim(),
        description || null,
        start_date,
        end_date || null,
        start_time || null,
        end_time || null,
        Boolean(reminder_enabled),
        reminder_time || null,
        emoji || null,
        color || null
      ]
    );

    const habitId = habitResult.rows[0].habit_id;

    const ruleResult = await client.query(
      `INSERT INTO habit_rules (
         habit_id,
         recurrence_type,
         interval_value,
         target_count,
         target_period,
         week_start,
         is_active,
         created_at,
         updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())
       RETURNING rule_id`,
      [
        habitId,
        rule.recurrence_type || "daily",
        rule.interval_value || 1,
        rule.target_count || 1,
        getDefaultTargetPeriod(rule.recurrence_type || "daily", rule.target_period),
        rule.week_start || "monday"
      ]
    );

    if (Array.isArray(rule.days)) {
      for (const day of rule.days) {
        await client.query(
          `INSERT INTO habit_rule_days (rule_id, day_of_week, day_of_month)
           VALUES ($1, $2, $3)`,
          [ruleResult.rows[0].rule_id, day.day_of_week ?? null, day.day_of_month ?? null]
        );
      }
    }

    await client.query("COMMIT");

    const weekStartsOn = await getUserWeekStart(req.user.user_id);
    const habit = await attachHabitPeriodProgress(
      await getHabitWithRule(req.user.user_id, habitId),
      req.user.user_id,
      getTodayDateString(),
      weekStartsOn
    );
    await createHabitReminderNotifications(req.user.user_id, habit);

    res.status(201).json({
      message: "Habit created successfully",
      habit
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

async function updateHabit(req, res, next) {
  let client;

  try {
    const habitId = parseId(req.params.id, "Habit ID");
    validateHabitPayload(req.body, { requireTitle: true, requireStartDate: true });

    const existingHabit = await getHabitWithRule(req.user.user_id, habitId);
    if (!existingHabit) {
      throw createAppError(404, "Habit not found");
    }

    const {
      title,
      description,
      start_date,
      end_date,
      start_time,
      end_time,
      reminder_enabled,
      reminder_time,
      status,
      emoji,
      color,
      rule
    } = req.body;

    client = await pool.connect();
    await client.query("BEGIN");

    await client.query(
      `UPDATE habits
       SET
         title = $1,
         description = $2,
         start_date = $3,
         end_date = $4,
         start_time = $5,
         end_time = $6,
         reminder_enabled = COALESCE($7, reminder_enabled),
         reminder_time = $8,
         status = $9,
         emoji = $10,
         color = $11,
         updated_at = NOW()
       WHERE habit_id = $12 AND user_id = $13`,
      [
        title.trim(),
        description || null,
        start_date,
        end_date || null,
        start_time || null,
        end_time || null,
        reminder_enabled !== undefined ? Boolean(reminder_enabled) : null,
        reminder_time || null,
        status || existingHabit.status,
        emoji || null,
        color || null,
        habitId,
        req.user.user_id
      ]
    );

    if (rule && existingHabit.rule) {
      await client.query(
        `UPDATE habit_rules
         SET
           recurrence_type = $1,
           interval_value = $2,
           target_count = $3,
           target_period = $4,
           week_start = $5,
           updated_at = NOW()
         WHERE rule_id = $6 AND habit_id = $7`,
        [
          rule.recurrence_type || existingHabit.rule.recurrence_type,
          rule.interval_value || existingHabit.rule.interval_value,
          rule.target_count || existingHabit.rule.target_count,
          getDefaultTargetPeriod(
            rule.recurrence_type || existingHabit.rule.recurrence_type,
            rule.target_period ?? existingHabit.rule.target_period
          ),
          rule.week_start || existingHabit.rule.week_start,
          existingHabit.rule.rule_id,
          habitId
        ]
      );

      if (Array.isArray(rule.days)) {
        await client.query("DELETE FROM habit_rule_days WHERE rule_id = $1", [existingHabit.rule.rule_id]);

        for (const day of rule.days) {
          await client.query(
            `INSERT INTO habit_rule_days (rule_id, day_of_week, day_of_month)
             VALUES ($1, $2, $3)`,
            [existingHabit.rule.rule_id, day.day_of_week ?? null, day.day_of_month ?? null]
          );
        }
      }
    }

    await client.query("COMMIT");

    const weekStartsOn = await getUserWeekStart(req.user.user_id);
    const habit = await attachHabitPeriodProgress(
      await getHabitWithRule(req.user.user_id, habitId),
      req.user.user_id,
      getTodayDateString(),
      weekStartsOn
    );
    await createHabitReminderNotifications(req.user.user_id, habit);

    res.status(200).json({
      message: "Habit updated successfully",
      habit
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

async function deleteHabit(req, res, next) {
  try {
    const habitId = parseId(req.params.id, "Habit ID");
    const result = await query(
      "DELETE FROM habits WHERE habit_id = $1 AND user_id = $2 RETURNING habit_id",
      [habitId, req.user.user_id]
    );

    if (result.rows.length === 0) {
      throw createAppError(404, "Habit not found");
    }

    await cancelNotificationsForRelated(req.user.user_id, "habit", habitId);

    res.status(200).json({
      message: "Habit deleted successfully"
    });
  } catch (error) {
    next(error);
  }
}

async function logPeriodProgressHabit(req, res, habit, requestedDate) {
  const habitId = habit.habit_id;
  const weekStartsOn = await getUserWeekStart(req.user.user_id);
  const meta = buildHabitPeriodMeta(habit, requestedDate, weekStartsOn);

  if (!meta) {
    throw createAppError(400, "Habit does not support period progress logging");
  }

  let client;
  let log = null;
  let periodProgress = 0;
  let completedForPeriod = false;

  try {
    client = await pool.connect();
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock($1::bigint)", [habitId]);

    const currentProgress = await getHabitPeriodCompletedCount(
      client,
      req.user.user_id,
      habitId,
      meta.start_date,
      meta.end_date
    );

    if (currentProgress >= meta.target_count) {
      periodProgress = currentProgress;
      completedForPeriod = true;
      await client.query("COMMIT");

      return res.status(200).json({
        message: `${meta.period_label} target already complete`,
        log,
        period_progress: Math.min(periodProgress, meta.target_count),
        target_count: meta.target_count,
        completed_for_period: completedForPeriod,
        period_label: meta.period_label
      });
    }

    const existingLog = await client.query(
      `SELECT habit_log_id, status
       FROM habit_logs
       WHERE habit_id = $1 AND user_id = $2 AND log_date = $3
       ORDER BY habit_log_id DESC
       LIMIT 1
       FOR UPDATE`,
      [habitId, req.user.user_id, requestedDate]
    );

    if (existingLog.rows.length > 0) {
      const updated = await client.query(
        `UPDATE habit_logs
         SET
           completed_count = CASE
             WHEN status = 'completed' THEN completed_count + 1
             ELSE 1
           END,
           target_count_snapshot = $1,
           status = 'completed',
           completed_at = COALESCE(completed_at, NOW()),
           updated_at = NOW()
         WHERE habit_log_id = $2
         RETURNING habit_log_id, habit_id, user_id, to_char(log_date, 'YYYY-MM-DD') AS log_date, completed_count, target_count_snapshot, status, completed_at, created_at, updated_at`,
        [meta.target_count, existingLog.rows[0].habit_log_id]
      );
      log = updated.rows[0];
    } else {
      const inserted = await client.query(
        `INSERT INTO habit_logs (
           habit_id,
           user_id,
           log_date,
           completed_count,
           target_count_snapshot,
           status,
           completed_at,
           created_at,
           updated_at
         ) VALUES ($1, $2, $3, 1, $4, 'completed', NOW(), NOW(), NOW())
         RETURNING habit_log_id, habit_id, user_id, to_char(log_date, 'YYYY-MM-DD') AS log_date, completed_count, target_count_snapshot, status, completed_at, created_at, updated_at`,
        [habitId, req.user.user_id, requestedDate, meta.target_count]
      );
      log = inserted.rows[0];
    }

    periodProgress = currentProgress + 1;
    completedForPeriod = periodProgress >= meta.target_count;
    await client.query("COMMIT");
  } catch (error) {
    if (client) {
      await client.query("ROLLBACK").catch(() => null);
    }
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }

  if (completedForPeriod) {
    await cancelRemainingNotificationsForRelatedDate(req.user.user_id, "habit", habitId, requestedDate);
  }

  return res.status(201).json({
    message: "Habit progress logged successfully",
    log,
    period_progress: Math.min(periodProgress, meta.target_count),
    target_count: meta.target_count,
    completed_for_period: completedForPeriod,
    period_label: meta.period_label
  });
}

async function logHabit(req, res, next) {
  try {
    const habitId = parseId(req.params.id, "Habit ID");
    const requestedDate = req.body.date || getTodayDateString();

    if (!validateISODate(requestedDate)) {
      throw createAppError(400, "date must be a valid ISO date");
    }

    const habit = await getHabitWithRule(req.user.user_id, habitId);
    if (!habit) {
      throw createAppError(404, "Habit not found");
    }

    if (requestedDate < habit.start_date || (habit.end_date && requestedDate > habit.end_date)) {
      throw createAppError(400, "Habit is not active on this date");
    }

    if (isPeriodProgressHabit(habit)) {
      return await logPeriodProgressHabit(req, res, habit, requestedDate);
    }

    const existingLog = await query(
      `SELECT habit_log_id
       FROM habit_logs
       WHERE habit_id = $1 AND user_id = $2 AND log_date = $3
       LIMIT 1`,
      [habitId, req.user.user_id, requestedDate]
    );

    if (existingLog.rows.length > 0) {
      throw createAppError(409, "Habit already logged for this date");
    }

    const result = await query(
      `INSERT INTO habit_logs (
         habit_id,
         user_id,
         log_date,
         completed_count,
         target_count_snapshot,
         status,
         completed_at,
         created_at,
         updated_at
       ) VALUES ($1, $2, $3, 1, $4, 'completed', NOW(), NOW(), NOW())
       RETURNING habit_log_id, habit_id, user_id, to_char(log_date, 'YYYY-MM-DD') AS log_date, completed_count, target_count_snapshot, status, completed_at, created_at, updated_at`,
      [habitId, req.user.user_id, requestedDate, habit.rule ? habit.rule.target_count : 1]
    );

    await cancelRemainingNotificationsForRelatedDate(req.user.user_id, "habit", habitId, requestedDate);

    res.status(201).json({
      message: "Habit logged successfully",
      log: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
}

async function deleteHabitLog(req, res, next) {
  try {
    const habitId = parseId(req.params.id, "Habit ID");
    const requestedDate = req.params.date;

    if (!validateISODate(requestedDate)) {
      throw createAppError(400, "date must be a valid ISO date");
    }

    const result = await query(
      `DELETE FROM habit_logs
       WHERE habit_id = $1 AND user_id = $2 AND log_date = $3
       RETURNING habit_log_id`,
      [habitId, req.user.user_id, requestedDate]
    );

    if (result.rows.length === 0) {
      throw createAppError(404, "Habit log not found");
    }

    res.status(200).json({
      message: "Habit log deleted successfully"
    });
  } catch (error) {
    next(error);
  }
}

async function getHabitStreak(req, res, next) {
  try {
    const habitId = parseId(req.params.id, "Habit ID");
    const habit = await getHabitWithRule(req.user.user_id, habitId);

    if (!habit) {
      throw createAppError(404, "Habit not found");
    }

    const logsResult = await query(
      `SELECT to_char(log_date, 'YYYY-MM-DD') AS log_date
       FROM habit_logs
       WHERE habit_id = $1 AND user_id = $2 AND status = 'completed'
       ORDER BY log_date DESC`,
      [habitId, req.user.user_id]
    );

    const streak = calculateCurrentDailyStreak(logsResult.rows.map((row) => row.log_date));

    res.status(200).json({
      habit_id: habitId,
      current_streak: streak
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createHabit,
  deleteHabit,
  deleteHabitLog,
  getHabitById,
  getHabits,
  getHabitStreak,
  logHabit,
  updateHabit
};
