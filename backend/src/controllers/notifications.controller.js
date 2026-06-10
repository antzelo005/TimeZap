const { query } = require("../config/db");
const { createAppError, parseId, validateEnum } = require("../utils/validators");

const NOTIFICATION_KINDS = [
  "standard_reminder",
  "overdue_30",
  "overdue_15",
  "overdue_5",
  "system"
];
const NOTIFICATION_STATUSES = ["scheduled", "cancelled"];
const RELATED_TYPES = ["task", "habit", "system"];
const TASK_GRACE_PERIOD_MINUTES = 60;
const STANDARD_REMINDER_LEAD_MINUTES = 30;
const OVERDUE_WARNING_LEAD_MINUTES = [30, 15, 5];
const HABIT_REMINDER_WINDOW_DAYS = 14;

const NOTIFICATION_SELECT = `
  SELECT
    notification_id,
    user_id,
    related_type,
    related_id,
    kind,
    title,
    body,
    to_char(scheduled_for, 'YYYY-MM-DD"T"HH24:MI:SS') AS scheduled_for,
    to_char(occurrence_date, 'YYYY-MM-DD') AS occurrence_date,
    status,
    read_at,
    created_at,
    updated_at
  FROM notifications
`;

function padTimePart(value) {
  return String(value).padStart(2, "0");
}

function formatDatePart(date) {
  return `${date.getFullYear()}-${padTimePart(date.getMonth() + 1)}-${padTimePart(date.getDate())}`;
}

function formatTimestamp(date) {
  return `${formatDatePart(date)} ${padTimePart(date.getHours())}:${padTimePart(date.getMinutes())}:${padTimePart(date.getSeconds())}`;
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function addDays(date, days) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + days);
  return next;
}

function parseISODateParts(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
}

function parseTimeParts(value) {
  if (!value) {
    return null;
  }

  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/.exec(String(value));
  if (!match) {
    return null;
  }

  return {
    hour: Number(match[1]),
    minute: Number(match[2])
  };
}

function buildLocalDateTime(dateValue, timeValue) {
  const dateParts = parseISODateParts(dateValue);
  const timeParts = parseTimeParts(timeValue);

  if (!dateParts || !timeParts) {
    return null;
  }

  return new Date(dateParts.year, dateParts.month - 1, dateParts.day, timeParts.hour, timeParts.minute, 0, 0);
}

function isDailyHabit(habit) {
  return habit.rule && habit.rule.recurrence_type === "daily";
}

function getTaskScheduledReference(task) {
  if (!task || task.status !== "pending" || !task.due_date || task.is_all_day) {
    return null;
  }

  if (task.end_date) {
    if (!task.end_time) {
      return null;
    }

    return buildLocalDateTime(task.end_date, task.end_time);
  }

  const scheduledTime = task.end_time || task.start_time || task.due_time;
  if (!scheduledTime) {
    return null;
  }

  return buildLocalDateTime(task.due_date, scheduledTime);
}

function getTaskStartReminderReference(task) {
  if (!task || task.status !== "pending" || !task.due_date || task.is_all_day) {
    return null;
  }

  const scheduledTime = task.start_time || task.due_time || task.end_time;
  if (!scheduledTime) {
    return null;
  }

  return buildLocalDateTime(task.due_date, scheduledTime);
}

function getOverdueKind(minutesBeforeDeadline) {
  return `overdue_${minutesBeforeDeadline}`;
}

function buildReminderRecords({
  userId,
  relatedType,
  relatedId,
  occurrenceDate,
  scheduledReference,
  standardReference,
  overdueReference,
  includeOverdueWarnings = true,
  title,
  standardBody,
  overdueBodies
}) {
  const now = Date.now();
  const standardAt = standardReference || scheduledReference;
  const overdueAt = overdueReference || scheduledReference;
  const graceDeadline = addMinutes(overdueAt, TASK_GRACE_PERIOD_MINUTES);
  const candidates = [
    {
      kind: "standard_reminder",
      title,
      body: standardBody,
      scheduledFor: addMinutes(standardAt, -STANDARD_REMINDER_LEAD_MINUTES)
    }
  ];

  if (includeOverdueWarnings) {
    for (const leadMinutes of OVERDUE_WARNING_LEAD_MINUTES) {
      candidates.push({
        kind: getOverdueKind(leadMinutes),
        title,
        body: overdueBodies[leadMinutes],
        scheduledFor: addMinutes(graceDeadline, -leadMinutes)
      });
    }
  }

  return candidates
    .filter((candidate) => candidate.scheduledFor.getTime() > now)
    .map((candidate) => ({
      user_id: userId,
      related_type: relatedType,
      related_id: relatedId,
      kind: candidate.kind,
      title: candidate.title,
      body: candidate.body,
      scheduled_for: formatTimestamp(candidate.scheduledFor),
      occurrence_date: occurrenceDate,
      status: "scheduled"
    }));
}

async function upsertNotificationRecords(records) {
  for (const record of records) {
    await query(
      `INSERT INTO notifications (
         user_id,
         related_type,
         related_id,
         kind,
         title,
         body,
         scheduled_for,
         occurrence_date,
         status,
         read_at,
         created_at,
         updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'scheduled', NULL, NOW(), NOW())
       ON CONFLICT (user_id, related_type, related_id, kind, scheduled_for)
       WHERE status = 'scheduled'
       DO UPDATE SET
         title = EXCLUDED.title,
         body = EXCLUDED.body,
         occurrence_date = EXCLUDED.occurrence_date,
         read_at = NULL,
         updated_at = NOW()`,
      [
        record.user_id,
        record.related_type,
        record.related_id,
        record.kind,
        record.title,
        record.body,
        record.scheduled_for,
        record.occurrence_date
      ]
    );
  }
}

async function cancelNotificationsForRelated(userId, relatedType, relatedId) {
  await query(
    `UPDATE notifications
     SET status = 'cancelled', updated_at = NOW()
     WHERE user_id = $1
       AND related_type = $2
       AND related_id = $3
       AND status = 'scheduled'`,
    [userId, relatedType, relatedId]
  );
}

async function cancelRemainingNotificationsForRelatedDate(userId, relatedType, relatedId, occurrenceDate) {
  await query(
    `UPDATE notifications
     SET status = 'cancelled', updated_at = NOW()
     WHERE user_id = $1
       AND related_type = $2
       AND related_id = $3
       AND occurrence_date = $4
       AND scheduled_for > NOW()
       AND status = 'scheduled'`,
    [userId, relatedType, relatedId, occurrenceDate]
  );
}

async function createTaskReminderNotifications(userId, task) {
  await cancelNotificationsForRelated(userId, "task", task.task_id);

  if (!task.reminder_enabled || task.status !== "pending") {
    return [];
  }

  const overdueReference = getTaskScheduledReference(task);
  const standardReference = getTaskStartReminderReference(task);
  if (!overdueReference && !standardReference) {
    return [];
  }

  const occurrenceDate = formatDatePart(overdueReference || standardReference);
  const records = buildReminderRecords({
    userId,
    relatedType: "task",
    relatedId: task.task_id,
    occurrenceDate,
    scheduledReference: overdueReference || standardReference,
    standardReference,
    overdueReference,
    includeOverdueWarnings: Boolean(overdueReference),
    title: "Task reminder",
    standardBody: `${task.title} starts in 30 minutes.`,
    overdueBodies: {
      30: `${task.title} will become overdue in 30 minutes.`,
      15: `${task.title} will become overdue in 15 minutes.`,
      5: `${task.title} will become overdue in 5 minutes.`
    }
  });

  await upsertNotificationRecords(records);
  return records;
}

async function createHabitReminderNotifications(userId, habit, options = {}) {
  const { cancelExisting = true } = options;

  if (cancelExisting) {
    await cancelNotificationsForRelated(userId, "habit", habit.habit_id);
  }

  if (
    !habit.reminder_enabled ||
    habit.status !== "active" ||
    !habit.reminder_time ||
    !isDailyHabit(habit)
  ) {
    return [];
  }

  const today = new Date();
  const todayString = formatDatePart(today);
  if (habit.end_date && habit.end_date < todayString) {
    return [];
  }

  const logsResult = await query(
    `SELECT to_char(log_date, 'YYYY-MM-DD') AS log_date
     FROM habit_logs
     WHERE user_id = $1
       AND habit_id = $2
       AND log_date >= CURRENT_DATE
       AND log_date < CURRENT_DATE + ($3::int * INTERVAL '1 day')`,
    [userId, habit.habit_id, HABIT_REMINDER_WINDOW_DAYS]
  );
  const loggedDates = new Set(logsResult.rows.map((row) => row.log_date));

  const records = [];
  for (let dayOffset = 0; dayOffset < HABIT_REMINDER_WINDOW_DAYS; dayOffset += 1) {
    const occurrence = addDays(today, dayOffset);
    const occurrenceDate = formatDatePart(occurrence);

    if (loggedDates.has(occurrenceDate)) {
      continue;
    }

    if (occurrenceDate < habit.start_date) {
      continue;
    }

    if (habit.end_date && occurrenceDate > habit.end_date) {
      continue;
    }

    const scheduledReference = buildLocalDateTime(occurrenceDate, habit.reminder_time);
    if (!scheduledReference) {
      continue;
    }

    records.push(
      ...buildReminderRecords({
        userId,
        relatedType: "habit",
        relatedId: habit.habit_id,
        occurrenceDate,
        scheduledReference,
        title: "Habit reminder",
        standardBody: `Time to complete ${habit.title} in 30 minutes.`,
        overdueBodies: {
          30: `${habit.title} will be missed in 30 minutes.`,
          15: `${habit.title} will be missed in 15 minutes.`,
          5: `${habit.title} will be missed in 5 minutes.`
        }
      })
    );
  }

  await upsertNotificationRecords(records);
  return records;
}

async function ensureUserHabitNotificationWindow(userId) {
  const habitsResult = await query(
    `SELECT
       h.habit_id,
       h.user_id,
       h.title,
       h.description,
       to_char(h.start_date, 'YYYY-MM-DD') AS start_date,
       to_char(h.end_date, 'YYYY-MM-DD') AS end_date,
       to_char(h.start_time, 'HH24:MI:SS') AS start_time,
       to_char(h.end_time, 'HH24:MI:SS') AS end_time,
       h.status,
       h.emoji,
       h.color,
       h.reminder_enabled,
       to_char(h.reminder_time, 'HH24:MI:SS') AS reminder_time,
       h.created_at,
       h.updated_at,
       hr.rule_id,
       hr.recurrence_type,
       hr.interval_value,
       hr.target_count,
       hr.target_period,
       hr.week_start,
       hr.is_active
     FROM habits h
     INNER JOIN habit_rules hr
       ON hr.habit_id = h.habit_id AND hr.is_active = true
     WHERE h.user_id = $1
       AND h.status = 'active'
       AND h.reminder_enabled = true
       AND hr.recurrence_type = 'daily'
       AND (h.end_date IS NULL OR h.end_date >= CURRENT_DATE)`,
    [userId]
  );

  for (const row of habitsResult.rows) {
    await createHabitReminderNotifications(
      userId,
      {
        habit_id: row.habit_id,
        user_id: row.user_id,
        title: row.title,
        description: row.description,
        start_date: row.start_date,
        end_date: row.end_date,
        start_time: row.start_time,
        end_time: row.end_time,
        status: row.status,
        emoji: row.emoji,
        color: row.color,
        reminder_enabled: row.reminder_enabled,
        reminder_time: row.reminder_time,
        created_at: row.created_at,
        updated_at: row.updated_at,
        rule: {
          rule_id: row.rule_id,
          recurrence_type: row.recurrence_type,
          interval_value: row.interval_value,
          target_count: row.target_count,
          target_period: row.target_period,
          week_start: row.week_start,
          is_active: row.is_active,
          days: []
        }
      },
      { cancelExisting: false }
    );
  }
}

async function getNotifications(req, res, next) {
  try {
    await ensureUserHabitNotificationWindow(req.user.user_id);

    const { unread, status } = req.query;
    const conditions = ["user_id = $1"];
    const values = [req.user.user_id];

    if (unread === "true") {
      conditions.push("read_at IS NULL");
      conditions.push("status = 'scheduled'");
      conditions.push("scheduled_for <= NOW()");
    }

    if (status) {
      if (!validateEnum(status, NOTIFICATION_STATUSES)) {
        throw createAppError(400, "Invalid notification status");
      }

      values.push(status);
      conditions.push(`status = $${values.length}`);
    }

    const result = await query(
      `${NOTIFICATION_SELECT}
       WHERE ${conditions.join(" AND ")}
       ORDER BY scheduled_for ASC, created_at ASC
       LIMIT 200`,
      values
    );

    res.status(200).json({
      items: result.rows
    });
  } catch (error) {
    next(error);
  }
}

async function getUnreadCount(req, res, next) {
  try {
    await ensureUserHabitNotificationWindow(req.user.user_id);

    const result = await query(
      `SELECT COUNT(*)::int AS unread_count
       FROM notifications
       WHERE user_id = $1
         AND read_at IS NULL
         AND status = 'scheduled'
         AND scheduled_for <= NOW()`,
      [req.user.user_id]
    );

    res.status(200).json({
      unread_count: result.rows[0].unread_count
    });
  } catch (error) {
    next(error);
  }
}

async function markNotificationRead(req, res, next) {
  try {
    const notificationId = parseId(req.params.id, "Notification ID");
    const result = await query(
      `UPDATE notifications
       SET read_at = COALESCE(read_at, NOW()), updated_at = NOW()
       WHERE notification_id = $1 AND user_id = $2
       RETURNING notification_id`,
      [notificationId, req.user.user_id]
    );

    if (result.rows.length === 0) {
      throw createAppError(404, "Notification not found");
    }

    const notificationResult = await query(
      `${NOTIFICATION_SELECT}
       WHERE notification_id = $1 AND user_id = $2
       LIMIT 1`,
      [notificationId, req.user.user_id]
    );

    res.status(200).json({
      message: "Notification marked as read",
      notification: notificationResult.rows[0]
    });
  } catch (error) {
    next(error);
  }
}

async function markAllNotificationsRead(req, res, next) {
  try {
    const result = await query(
      `UPDATE notifications
       SET read_at = COALESCE(read_at, NOW()), updated_at = NOW()
       WHERE user_id = $1
         AND read_at IS NULL
         AND status = 'scheduled'
         AND scheduled_for <= NOW()
       RETURNING notification_id`,
      [req.user.user_id]
    );

    res.status(200).json({
      message: "Notifications marked as read",
      updated_count: result.rows.length
    });
  } catch (error) {
    next(error);
  }
}

async function cancelNotification(req, res, next) {
  try {
    const notificationId = parseId(req.params.id, "Notification ID");
    const result = await query(
      `UPDATE notifications
       SET status = 'cancelled', updated_at = NOW()
       WHERE notification_id = $1 AND user_id = $2
       RETURNING notification_id`,
      [notificationId, req.user.user_id]
    );

    if (result.rows.length === 0) {
      throw createAppError(404, "Notification not found");
    }

    const notificationResult = await query(
      `${NOTIFICATION_SELECT}
       WHERE notification_id = $1 AND user_id = $2
       LIMIT 1`,
      [notificationId, req.user.user_id]
    );

    res.status(200).json({
      message: "Notification cancelled",
      notification: notificationResult.rows[0]
    });
  } catch (error) {
    next(error);
  }
}

async function deleteNotification(req, res, next) {
  try {
    const notificationId = parseId(req.params.id, "Notification ID");
    const result = await query(
      `DELETE FROM notifications
       WHERE notification_id = $1 AND user_id = $2
       RETURNING notification_id`,
      [notificationId, req.user.user_id]
    );

    if (result.rows.length === 0) {
      throw createAppError(404, "Notification not found");
    }

    res.status(200).json({
      message: "Notification deleted"
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  cancelNotification,
  cancelNotificationsForRelated,
  cancelRemainingNotificationsForRelatedDate,
  createHabitReminderNotifications,
  createTaskReminderNotifications,
  deleteNotification,
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead
};
