const { query } = require("../config/db");
const {
  createAppError,
  getTodayDateString,
  isNonEmptyString,
  parseId,
  validateISODate,
  validateTime
} = require("../utils/validators");

const ALLOWED_TASK_STATUSES = ["pending", "completed", "cancelled"];

const TASK_SELECT = `
  SELECT
    task_id,
    user_id,
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
`;

function mapTask(task) {
  const today = getTodayDateString();
  const isOverdue = Boolean(task.due_date && task.status === "pending" && task.due_date < today);

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
      conditions.push(`due_date = $${values.length}`);
    }

    if (from) {
      if (!validateISODate(from)) {
        throw createAppError(400, "from must be a valid ISO date");
      }

      values.push(from);
      conditions.push(`due_date >= $${values.length}`);
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
       ORDER BY due_date ASC NULLS LAST, due_time ASC NULLS LAST, created_at DESC`,
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
    const { title, description, due_date, due_time, is_all_day, emoji, color } = req.body;

    if (!isNonEmptyString(title)) {
      throw createAppError(400, "Title is required");
    }

    if (due_date && !validateISODate(due_date)) {
      throw createAppError(400, "due_date must be a valid ISO date");
    }

    if (due_time && !validateTime(due_time)) {
      throw createAppError(400, "due_time must be a valid time");
    }

    const result = await query(
      `INSERT INTO tasks (
         user_id,
         title,
         description,
         due_date,
         due_time,
         status,
         is_all_day,
         completed_at,
         emoji,
         color,
         created_at,
         updated_at
       ) VALUES ($1, $2, $3, $4, $5, 'pending', $6, NULL, $7, $8, NOW(), NOW())
       RETURNING task_id`,
      [
        req.user.user_id,
        title.trim(),
        description || null,
        due_date || null,
        due_time || null,
        Boolean(is_all_day),
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

    res.status(201).json({
      message: "Task created successfully",
      task: mapTask(taskResult.rows[0])
    });
  } catch (error) {
    next(error);
  }
}

async function updateTask(req, res, next) {
  try {
    const taskId = parseId(req.params.id, "Task ID");
    const { title, description, due_date, due_time, is_all_day, emoji, color } = req.body;

    if (!isNonEmptyString(title)) {
      throw createAppError(400, "Title is required");
    }

    if (due_date && !validateISODate(due_date)) {
      throw createAppError(400, "due_date must be a valid ISO date");
    }

    if (due_time && !validateTime(due_time)) {
      throw createAppError(400, "due_time must be a valid time");
    }

    const result = await query(
      `UPDATE tasks
       SET
         title = $1,
         description = $2,
         due_date = $3,
         due_time = $4,
         is_all_day = $5,
         emoji = $6,
         color = $7,
         updated_at = NOW()
       WHERE task_id = $8 AND user_id = $9
       RETURNING task_id`,
      [
        title.trim(),
        description || null,
        due_date || null,
        due_time || null,
        Boolean(is_all_day),
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

    res.status(200).json({
      message: "Task updated successfully",
      task: mapTask(taskResult.rows[0])
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
