const { query } = require("../config/db");
const { createAppError, getPeriodBounds, validateISODate } = require("../utils/validators");

const PERIOD_RECURRENCE_TYPES = ["x_times_per_week", "x_times_per_month"];

function isPeriodProgressHabit(habit) {
  return PERIOD_RECURRENCE_TYPES.includes(habit.recurrence_type);
}

function getHabitTargetPeriod(habit) {
  if (habit.recurrence_type === "x_times_per_week") {
    return "week";
  }

  if (habit.recurrence_type === "x_times_per_month") {
    return "month";
  }

  return habit.target_period;
}

function getHabitTargetCount(habit) {
  const targetCount = Number(habit.target_count ?? 1);
  return Number.isInteger(targetCount) && targetCount > 0 ? targetCount : 1;
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

async function getHabitPeriodProgress(userId, habit, dateString, weekStartsOn) {
  if (!isPeriodProgressHabit(habit)) {
    return {
      target_count: getHabitTargetCount(habit),
      target_period: habit.target_period ?? null,
      period_progress: null,
      completed_for_period: null,
      period_label: null
    };
  }

  const targetPeriod = getHabitTargetPeriod(habit);
  const targetCount = getHabitTargetCount(habit);
  const bounds = getPeriodBounds(dateString, targetPeriod, weekStartsOn || habit.week_start || "monday");
  const progressResult = await query(
    `SELECT COALESCE(SUM(completed_count), 0)::int AS period_progress
     FROM habit_logs
     WHERE habit_id = $1
       AND user_id = $2
       AND log_date BETWEEN $3 AND $4
       AND status = 'completed'`,
    [habit.habit_id, userId, bounds.start_date, bounds.end_date]
  );
  const periodProgress = Number(progressResult.rows[0]?.period_progress ?? 0);

  return {
    target_count: targetCount,
    target_period: targetPeriod,
    period_progress: Math.min(periodProgress, targetCount),
    completed_for_period: periodProgress >= targetCount,
    period_label: targetPeriod
  };
}

function normalizeMonthInput(year, month) {
  const yearNumber = Number(year);
  const monthNumber = Number(month);

  if (!Number.isInteger(yearNumber) || yearNumber < 1970) {
    throw createAppError(400, "year must be a valid number");
  }

  if (!Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 12) {
    throw createAppError(400, "month must be between 1 and 12");
  }

  return {
    yearNumber,
    monthNumber,
    monthString: String(monthNumber).padStart(2, "0")
  };
}

async function getMonthView(req, res, next) {
  try {
    const { yearNumber, monthString } = normalizeMonthInput(req.query.year, req.query.month);
    const monthPrefix = `${yearNumber}-${monthString}`;

    const tasksResult = await query(
      `SELECT
         to_char(entry_date, 'YYYY-MM-DD') AS entry_date,
         task_id,
         title,
         status,
         to_char(COALESCE(start_time, due_time), 'HH24:MI:SS') AS start_time,
         to_char(end_time, 'HH24:MI:SS') AS end_time
       FROM tasks
       CROSS JOIN LATERAL generate_series(due_date, COALESCE(end_date, due_date), interval '1 day') AS range_days(entry_date)
       WHERE user_id = $1
         AND due_date IS NOT NULL
         AND to_char(entry_date, 'YYYY-MM') = $2
         AND status != 'cancelled'
       ORDER BY entry_date ASC, COALESCE(start_time, due_time) ASC NULLS LAST`,
      [req.user.user_id, monthPrefix]
    );

    const habitLogsResult = await query(
      `SELECT
         to_char(log_date, 'YYYY-MM-DD') AS entry_date,
         COALESCE(SUM(completed_count), 0)::int AS completed_count
       FROM habit_logs
       WHERE user_id = $1
         AND to_char(log_date, 'YYYY-MM') = $2
         AND status = 'completed'
       GROUP BY log_date
       ORDER BY log_date ASC`,
      [req.user.user_id, monthPrefix]
    );

    const grouped = {};

    for (const task of tasksResult.rows) {
      if (!grouped[task.entry_date]) {
        grouped[task.entry_date] = {
          tasks: [],
          habit_logs_completed: 0
        };
      }

      grouped[task.entry_date].tasks.push({
        task_id: task.task_id,
        title: task.title,
        status: task.status,
        start_time: task.start_time,
        end_time: task.end_time
      });
    }

    for (const log of habitLogsResult.rows) {
      if (!grouped[log.entry_date]) {
        grouped[log.entry_date] = {
          tasks: [],
          habit_logs_completed: 0
        };
      }

      grouped[log.entry_date].habit_logs_completed = log.completed_count;
    }

    res.status(200).json({
      year: yearNumber,
      month: Number(req.query.month),
      dates: grouped
    });
  } catch (error) {
    next(error);
  }
}

async function getDayView(req, res, next) {
  try {
    const { date } = req.query;

    if (!validateISODate(date)) {
      throw createAppError(400, "date must be a valid ISO date");
    }

    const tasksResult = await query(
      `SELECT
         task_id,
         title,
         description,
         to_char(due_date, 'YYYY-MM-DD') AS due_date,
         to_char(end_date, 'YYYY-MM-DD') AS end_date,
         to_char(due_time, 'HH24:MI:SS') AS due_time,
         to_char(COALESCE(start_time, due_time), 'HH24:MI:SS') AS start_time,
         to_char(end_time, 'HH24:MI:SS') AS end_time,
         status,
         is_all_day,
         completed_at,
         emoji,
         color
       FROM tasks
       WHERE user_id = $1
         AND due_date <= $2
         AND COALESCE(end_date, due_date) >= $2
         AND status != 'cancelled'
       ORDER BY COALESCE(start_time, due_time) ASC NULLS LAST, created_at DESC`,
      [req.user.user_id, date]
    );

    const habitsResult = await query(
      `SELECT
         h.habit_id,
         h.title,
         h.description,
         h.status,
         h.emoji,
         h.color,
         to_char(h.start_date, 'YYYY-MM-DD') AS start_date,
         to_char(h.end_date, 'YYYY-MM-DD') AS end_date,
         to_char(h.start_time, 'HH24:MI:SS') AS start_time,
         to_char(h.end_time, 'HH24:MI:SS') AS end_time,
         hr.recurrence_type,
         hr.target_count,
         hr.target_period,
         hr.week_start
       FROM habits h
       LEFT JOIN habit_rules hr
         ON hr.habit_id = h.habit_id AND hr.is_active = true
       WHERE h.user_id = $1 AND h.status = 'active'
       ORDER BY h.created_at DESC`,
      [req.user.user_id]
    );

    const logsResult = await query(
      `SELECT
         habit_id,
         COALESCE(SUM(completed_count), 0)::int AS completed_count,
         MAX(target_count_snapshot)::int AS target_count_snapshot,
         'completed' AS status
       FROM habit_logs
       WHERE user_id = $1 AND log_date = $2 AND status = 'completed'
       GROUP BY habit_id`,
      [req.user.user_id, date]
    );

    const loggedHabitIds = new Map(logsResult.rows.map((row) => [row.habit_id, row]));
    const weekStartsOn = await getUserWeekStart(req.user.user_id);
    const expectedHabits = [];
    for (const habit of habitsResult.rows.filter(
      (habit) => habit.start_date <= date && (!habit.end_date || habit.end_date >= date)
    )) {
      const periodProgress = await getHabitPeriodProgress(req.user.user_id, habit, date, weekStartsOn);
      const completed = isPeriodProgressHabit(habit)
        ? Boolean(periodProgress.completed_for_period)
        : loggedHabitIds.has(habit.habit_id);

      expectedHabits.push({
        ...habit,
        ...periodProgress,
        completed,
        log: loggedHabitIds.get(habit.habit_id) || null
      });
    }

    res.status(200).json({
      date,
      tasks: tasksResult.rows,
      habits: expectedHabits
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDayView,
  getMonthView
};
