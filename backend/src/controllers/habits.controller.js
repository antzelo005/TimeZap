const { pool, query } = require("../config/db");
const {
  createAppError,
  getTodayDateString,
  isNonEmptyString,
  parseId,
  validateISODate,
  validateEnum
} = require("../utils/validators");

const ALLOWED_HABIT_STATUSES = ["active", "archived"];
const ALLOWED_RECURRENCE_TYPES = [
  "daily",
  "specific_weekdays",
  "every_n_days",
  "x_times_per_week",
  "x_times_per_month"
];
const ALLOWED_WEEK_STARTS = ["monday", "sunday"];

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

function mapHabitRow(habitRow, ruleRow, dayRows) {
  return {
    habit_id: habitRow.habit_id,
    user_id: habitRow.user_id,
    title: habitRow.title,
    description: habitRow.description,
    start_date: habitRow.start_date,
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
  const { title, start_date, status, rule } = body;

  if (requireTitle && !isNonEmptyString(title)) {
    throw createAppError(400, "Title is required");
  }

  if (requireStartDate && !start_date) {
    throw createAppError(400, "start_date is required");
  }

  if (start_date && !validateISODate(start_date)) {
    throw createAppError(400, "start_date must be a valid ISO date");
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
    const habitsResult = await query(
      `SELECT
         habit_id,
         user_id,
         title,
         description,
         to_char(start_date, 'YYYY-MM-DD') AS start_date,
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
      habits.push(habit);
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
    const habit = await getHabitWithRule(req.user.user_id, habitId);

    if (!habit) {
      throw createAppError(404, "Habit not found");
    }

    res.status(200).json({
      habit
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
         status,
         emoji,
         color,
         created_at,
         updated_at
       ) VALUES ($1, $2, $3, $4, 'active', $5, $6, NOW(), NOW())
       RETURNING habit_id`,
      [
        req.user.user_id,
        title.trim(),
        description || null,
        start_date,
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

    const habit = await getHabitWithRule(req.user.user_id, habitId);

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
         status = $4,
         emoji = $5,
         color = $6,
         updated_at = NOW()
       WHERE habit_id = $7 AND user_id = $8`,
      [
        title.trim(),
        description || null,
        start_date,
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

    const habit = await getHabitWithRule(req.user.user_id, habitId);

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

    res.status(200).json({
      message: "Habit deleted successfully"
    });
  } catch (error) {
    next(error);
  }
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

    const completedDates = new Set(logsResult.rows.map((row) => row.log_date));
    const today = new Date();

    const todayString = today.toISOString().slice(0, 10);
    const yesterday = new Date(today);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    let cursor = completedDates.has(todayString) ? new Date(today) : yesterday;
    let streak = 0;

    while (true) {
      const dateString = cursor.toISOString().slice(0, 10);
      if (!completedDates.has(dateString)) {
        break;
      }

      streak += 1;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }

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
