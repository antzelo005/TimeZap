const { query } = require("../config/db");
const {
  createAppError,
  isNonEmptyString,
  parseId,
  validateBoolean,
  validateISODate,
  validateTime
} = require("../utils/validators");
const {
  cancelNotificationsForRelated,
  createTaskReminderNotifications
} = require("./notifications.controller");

const ALLOWED_TASK_STATUSES = ["pending", "completed", "cancelled"];
const TASK_GRACE_PERIOD_MINUTES = 60;

const TASK_SELECT = `
  SELECT
    task_id,
    user_id,
    title,
    description,
    to_char(due_date, 'YYYY-MM-DD') AS due_date,
    to_char(end_date, 'YYYY-MM-DD') AS end_date,
    to_char(due_time, 'HH24:MI:SS') AS due_time,
    to_char(COALESCE(start_time, due_time), 'HH24:MI:SS') AS start_time,
    to_char(end_time, 'HH24:MI:SS') AS end_time,
    status,
    is_all_day,
    reminder_enabled,
    completed_at,
    emoji,
    color,
    created_at,
    updated_at
  FROM tasks
`;

function parseLocalTaskDate(dateString) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateString || ""))) {
    return null;
  }

  const [year, month, day] = dateString.split("-").map(Number);
  return { year, month, day };
}

function isTaskOverdue(task, now = new Date()) {
  if (!task.due_date || task.status !== "pending") {
    return false;
  }

  const effectiveDate = task.end_date || task.due_date;
  const dateParts = parseLocalTaskDate(effectiveDate);
  if (!dateParts) {
    return false;
  }

  const scheduledTime = task.end_date ? task.end_time : task.end_time || task.start_time || task.due_time;
  if (task.is_all_day || !scheduledTime) {
    const nextDayStart = new Date(dateParts.year, dateParts.month - 1, dateParts.day + 1);
    return now.getTime() >= nextDayStart.getTime();
  }

  const [hour, minute] = scheduledTime.split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return false;
  }

  const scheduledAt = new Date(dateParts.year, dateParts.month - 1, dateParts.day, hour, minute, 0, 0);
  const graceDeadline = new Date(scheduledAt.getTime() + TASK_GRACE_PERIOD_MINUTES * 60 * 1000);
  return now.getTime() >= graceDeadline.getTime();
}

function mapTask(task) {
  const isOverdue = isTaskOverdue(task);

  return {
    ...task,
    is_overdue: isOverdue
  };
}

async function getTasks(req, res, next) {
  try {
    const { status, date, from, to } = req.query;
    const conditions = ["user_id = $1"];
    const values = [req.user.user_id];

    if (status) {
      if (!ALLOWED_TASK_STATUSES.includes(status)) {
        throw createAppError(400, "Invalid task status");
      }

      values.push(status);
      conditions.push(`status = $${values.length}`);
    }

    if (date) {
      if (!validateISODate(date)) {
        throw createAppError(400, "date must be a valid ISO date");
      }

      values.push(date);
      conditions.push(`due_date <= $${values.length} AND COALESCE(end_date, due_date) >= $${values.length}`);
    }

    if (from) {
      if (!validateISODate(from)) {
        throw createAppError(400, "from must be a valid ISO date");
      }

      values.push(from);
      conditions.push(`COALESCE(end_date, due_date) >= $${values.length}`);
    }

    if (to) {
      if (!validateISODate(to)) {
        throw createAppError(400, "to must be a valid ISO date");
      }

      values.push(to);
      conditions.push(`due_date <= $${values.length}`);
    }

    const result = await query(
      `${TASK_SELECT}
       WHERE ${conditions.join(" AND ")}
       ORDER BY due_date ASC NULLS LAST, COALESCE(start_time, due_time) ASC NULLS LAST, created_at DESC`,
      values
    );

    res.status(200).json({
      items: result.rows.map(mapTask)
    });
  } catch (error) {
    next(error);
  }
}

async function getTaskById(req, res, next) {
  try {
    const taskId = parseId(req.params.id, "Task ID");
    const result = await query(
      `${TASK_SELECT}
       WHERE task_id = $1 AND user_id = $2
       LIMIT 1`,
      [taskId, req.user.user_id]
    );

    if (result.rows.length === 0) {
      throw createAppError(404, "Task not found");
    }

    res.status(200).json({
      task: mapTask(result.rows[0])
    });
  } catch (error) {
    next(error);
  }
}

async function createTask(req, res, next) {
  try {
    const {
      title,
      description,
      due_date,
      end_date,
      due_time,
      start_time,
      end_time,
      is_all_day,
      reminder_enabled,
      emoji,
      color
    } = req.body;
    const resolvedStartTime = start_time || due_time || null;
    const resolvedEndDate = end_date || null;

    if (!isNonEmptyString(title)) {
      throw createAppError(400, "Title is required");
    }

    if (due_date && !validateISODate(due_date)) {
      throw createAppError(400, "due_date must be a valid ISO date");
    }

    if (resolvedEndDate && !validateISODate(resolvedEndDate)) {
      throw createAppError(400, "end_date must be a valid ISO date");
    }

    if (resolvedEndDate && due_date && resolvedEndDate < due_date) {
      throw createAppError(400, "end_date must be on or after due_date");
    }

    if (resolvedStartTime && !validateTime(resolvedStartTime)) {
      throw createAppError(400, "start_time must be a valid time");
    }

    if (end_time && !validateTime(end_time)) {
      throw createAppError(400, "end_time must be a valid time");
    }

    if (reminder_enabled !== undefined && !validateBoolean(reminder_enabled)) {
      throw createAppError(400, "reminder_enabled must be a boolean");
    }

    const result = await query(
      `INSERT INTO tasks (
         user_id,
         title,
         description,
         due_date,
         end_date,
         due_time,
         start_time,
         end_time,
         status,
         is_all_day,
         reminder_enabled,
         completed_at,
         emoji,
         color,
         created_at,
         updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, $10, NULL, $11, $12, NOW(), NOW())
       RETURNING task_id`,
      [
        req.user.user_id,
        title.trim(),
        description || null,
        due_date || null,
        resolvedEndDate,
        resolvedStartTime,
        resolvedStartTime,
        end_time || null,
        Boolean(is_all_day),
        Boolean(reminder_enabled),
        emoji || null,
        color || null
      ]
    );

    const taskResult = await query(
      `${TASK_SELECT}
       WHERE task_id = $1 AND user_id = $2
       LIMIT 1`,
      [result.rows[0].task_id, req.user.user_id]
    );

    const task = mapTask(taskResult.rows[0]);
    await createTaskReminderNotifications(req.user.user_id, task);

    res.status(201).json({
      message: "Task created successfully",
      task
    });
  } catch (error) {
    next(error);
  }
}

async function updateTask(req, res, next) {
  try {
    const taskId = parseId(req.params.id, "Task ID");
    const {
      title,
      description,
      due_date,
      end_date,
      due_time,
      start_time,
      end_time,
      is_all_day,
      reminder_enabled,
      emoji,
      color
    } = req.body;
    const resolvedStartTime = start_time || due_time || null;
    const resolvedEndDate = end_date || null;

    if (!isNonEmptyString(title)) {
      throw createAppError(400, "Title is required");
    }

    if (due_date && !validateISODate(due_date)) {
      throw createAppError(400, "due_date must be a valid ISO date");
    }

    if (resolvedEndDate && !validateISODate(resolvedEndDate)) {
      throw createAppError(400, "end_date must be a valid ISO date");
    }

    if (resolvedEndDate && due_date && resolvedEndDate < due_date) {
      throw createAppError(400, "end_date must be on or after due_date");
    }

    if (resolvedStartTime && !validateTime(resolvedStartTime)) {
      throw createAppError(400, "start_time must be a valid time");
    }

    if (end_time && !validateTime(end_time)) {
      throw createAppError(400, "end_time must be a valid time");
    }

    if (reminder_enabled !== undefined && !validateBoolean(reminder_enabled)) {
      throw createAppError(400, "reminder_enabled must be a boolean");
    }

    const result = await query(
      `UPDATE tasks
       SET
         title = $1,
         description = $2,
         due_date = $3,
         end_date = $4,
         due_time = $5,
         start_time = $6,
         end_time = $7,
         is_all_day = $8,
         reminder_enabled = COALESCE($9, reminder_enabled),
         emoji = $10,
         color = $11,
         updated_at = NOW()
       WHERE task_id = $12 AND user_id = $13
       RETURNING task_id`,
      [
        title.trim(),
        description || null,
        due_date || null,
        resolvedEndDate,
        resolvedStartTime,
        resolvedStartTime,
        end_time || null,
        Boolean(is_all_day),
        reminder_enabled !== undefined ? Boolean(reminder_enabled) : null,
        emoji || null,
        color || null,
        taskId,
        req.user.user_id
      ]
    );

    if (result.rows.length === 0) {
      throw createAppError(404, "Task not found");
    }

    const taskResult = await query(
      `${TASK_SELECT}
       WHERE task_id = $1 AND user_id = $2
       LIMIT 1`,
      [taskId, req.user.user_id]
    );

    const task = mapTask(taskResult.rows[0]);
    await createTaskReminderNotifications(req.user.user_id, task);

    res.status(200).json({
      message: "Task updated successfully",
      task
    });
  } catch (error) {
    next(error);
  }
}

async function deleteTask(req, res, next) {
  try {
    const taskId = parseId(req.params.id, "Task ID");
    const result = await query(
      "DELETE FROM tasks WHERE task_id = $1 AND user_id = $2 RETURNING task_id",
      [taskId, req.user.user_id]
    );

    if (result.rows.length === 0) {
      throw createAppError(404, "Task not found");
    }

    await cancelNotificationsForRelated(req.user.user_id, "task", taskId);

    res.status(200).json({
      message: "Task deleted successfully"
    });
  } catch (error) {
    next(error);
  }
}

async function completeTask(req, res, next) {
  try {
    const taskId = parseId(req.params.id, "Task ID");
    const result = await query(
      `UPDATE tasks
       SET status = 'completed', completed_at = NOW(), updated_at = NOW()
       WHERE task_id = $1 AND user_id = $2
       RETURNING task_id`,
      [taskId, req.user.user_id]
    );

    if (result.rows.length === 0) {
      throw createAppError(404, "Task not found");
    }

    await cancelNotificationsForRelated(req.user.user_id, "task", taskId);

    const taskResult = await query(
      `${TASK_SELECT}
       WHERE task_id = $1 AND user_id = $2
       LIMIT 1`,
      [taskId, req.user.user_id]
    );

    res.status(200).json({
      message: "Task marked as completed",
      task: mapTask(taskResult.rows[0])
    });
  } catch (error) {
    next(error);
  }
}

async function cancelTask(req, res, next) {
  try {
    const taskId = parseId(req.params.id, "Task ID");
    const result = await query(
      `UPDATE tasks
       SET status = 'cancelled', completed_at = NULL, updated_at = NOW()
       WHERE task_id = $1 AND user_id = $2
       RETURNING task_id`,
      [taskId, req.user.user_id]
    );

    if (result.rows.length === 0) {
      throw createAppError(404, "Task not found");
    }

    await cancelNotificationsForRelated(req.user.user_id, "task", taskId);

    const taskResult = await query(
      `${TASK_SELECT}
       WHERE task_id = $1 AND user_id = $2
       LIMIT 1`,
      [taskId, req.user.user_id]
    );

    res.status(200).json({
      message: "Task cancelled successfully",
      task: mapTask(taskResult.rows[0])
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  cancelTask,
  completeTask,
  createTask,
  deleteTask,
  getTaskById,
  getTasks,
  updateTask
};
