const { query } = require("../config/db");
const { calculateCurrentDailyStreak, getTodayDateString } = require("../utils/validators");

async function getTodayDashboard(req, res, next) {
  try {
    const today = getTodayDateString();

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
         color,
         created_at,
         updated_at
       FROM tasks
       WHERE user_id = $1
         AND due_date <= $2
         AND COALESCE(end_date, due_date) >= $2
         AND status != 'cancelled'
       ORDER BY COALESCE(start_time, due_time) ASC NULLS LAST, created_at DESC`,
      [req.user.user_id, today]
    );

    const habitsResult = await query(
      `SELECT
         h.habit_id,
         h.title,
         h.description,
         to_char(h.start_date, 'YYYY-MM-DD') AS start_date,
         to_char(h.end_date, 'YYYY-MM-DD') AS end_date,
         to_char(h.start_time, 'HH24:MI:SS') AS start_time,
         to_char(h.end_time, 'HH24:MI:SS') AS end_time,
         h.status,
         h.emoji,
         h.color,
         hr.recurrence_type,
         hr.target_count
       FROM habits h
       LEFT JOIN habit_rules hr
         ON hr.habit_id = h.habit_id AND hr.is_active = true
       WHERE h.user_id = $1 AND h.status = 'active'
       ORDER BY h.created_at DESC`,
      [req.user.user_id]
    );

    const habitLogsToday = await query(
      `SELECT habit_id
       FROM habit_logs
       WHERE user_id = $1 AND log_date = $2 AND status = 'completed'`,
      [req.user.user_id, today]
    );

    const completedHabitIds = new Set(habitLogsToday.rows.map((row) => row.habit_id));
    const habitsForToday = habitsResult.rows.filter((habit) => {
      return habit.start_date <= today && (!habit.end_date || habit.end_date >= today);
    });

    const habitItems = habitsForToday.map((habit) => ({
      ...habit,
      completed_today: completedHabitIds.has(habit.habit_id)
    }));

    const streaksResult = await query(
      `SELECT hl.habit_id, to_char(hl.log_date, 'YYYY-MM-DD') AS log_date
       FROM habit_logs hl
       INNER JOIN habits h
         ON h.habit_id = hl.habit_id AND h.user_id = hl.user_id
       LEFT JOIN habit_rules hr
         ON hr.habit_id = h.habit_id AND hr.is_active = true
       WHERE hl.user_id = $1
         AND hl.status = 'completed'
         AND COALESCE(hr.recurrence_type, 'daily') IN ('daily', 'specific_weekdays')
         AND h.start_date <= hl.log_date
         AND (h.end_date IS NULL OR h.end_date >= hl.log_date)
         AND (
           COALESCE(hr.recurrence_type, 'daily') = 'daily'
           OR EXISTS (
             SELECT 1
             FROM habit_rule_days hrd
             WHERE hrd.rule_id = hr.rule_id
               AND hrd.day_of_week = EXTRACT(DOW FROM hl.log_date)::int
           )
         )
       ORDER BY hl.habit_id ASC, hl.log_date DESC`,
      [req.user.user_id]
    );

    const byHabit = new Map();
    for (const row of streaksResult.rows) {
      if (!byHabit.has(row.habit_id)) {
        byHabit.set(row.habit_id, []);
      }
      byHabit.get(row.habit_id).push(row.log_date);
    }

    let maxStreak = 0;
    for (const dates of byHabit.values()) {
      maxStreak = Math.max(maxStreak, calculateCurrentDailyStreak(dates, today));
    }

    res.status(200).json({
      date: today,
      tasks: {
        completed: tasksResult.rows.filter((task) => task.status === "completed").length,
        total: tasksResult.rows.length,
        items: tasksResult.rows
      },
      habits: {
        completed: habitItems.filter((habit) => habit.completed_today).length,
        total: habitItems.length,
        items: habitItems
      },
      current_streak: maxStreak
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getTodayDashboard
};
