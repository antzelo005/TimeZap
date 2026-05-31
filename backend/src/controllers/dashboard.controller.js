const { query } = require("../config/db");
const { getTodayDateString } = require("../utils/validators");

function calculateStreakFromDates(dateStrings) {
  const dates = new Set(dateStrings);
  const today = new Date();
  const todayString = today.toISOString().slice(0, 10);
  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  let cursor = dates.has(todayString) ? new Date(today) : yesterday;
  let streak = 0;

  while (dates.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return streak;
}

async function getTodayDashboard(req, res, next) {
  try {
    const today = getTodayDateString();

    const tasksResult = await query(
      `SELECT
         task_id,
         title,
         description,
         to_char(due_date, 'YYYY-MM-DD') AS due_date,
         to_char(due_time, 'HH24:MI:SS') AS due_time,
         status,
         is_all_day,
         completed_at,
         emoji,
         color,
         created_at,
         updated_at
       FROM tasks
       WHERE user_id = $1 AND due_date = $2
       ORDER BY due_time ASC NULLS LAST, created_at DESC`,
      [req.user.user_id, today]
    );

    const habitsResult = await query(
      `SELECT
         h.habit_id,
         h.title,
         h.description,
         to_char(h.start_date, 'YYYY-MM-DD') AS start_date,
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
      if (habit.recurrence_type === "specific_weekdays") {
        return true;
      }

      return habit.start_date <= today;
    });

    const habitItems = habitsForToday.map((habit) => ({
      ...habit,
      completed_today: completedHabitIds.has(habit.habit_id)
    }));

    const streaksResult = await query(
      `SELECT habit_id, to_char(log_date, 'YYYY-MM-DD') AS log_date
       FROM habit_logs
       WHERE user_id = $1 AND status = 'completed'
       ORDER BY habit_id ASC, log_date DESC`,
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
      maxStreak = Math.max(maxStreak, calculateStreakFromDates(dates));
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
