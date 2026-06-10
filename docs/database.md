# Database Documentation

TimeZap uses PostgreSQL as its persistent data store. The reference schema is stored in `backend/database/schema.sql`.

## Design Notes

- Primary keys use `BIGSERIAL`.
- Foreign keys use `BIGINT`.
- User passwords are stored as bcrypt hashes in `users.password_hash`.
- Plain-text passwords are never stored.
- Multi-day tasks and habits use `end_date`.
- Notifications are stored in the backend database for the in-app notification center and scheduling source records.

ERD placeholder:

[Screenshot: PostgreSQL ERD/database diagram]

## Main Tables

## `users`

Purpose: Stores application users and account-level profile fields.

Important columns:

- `user_id`: BIGSERIAL primary key.
- `email`: unique login email.
- `password_hash`: bcrypt password hash.
- `display_name`: optional user display name.
- `timezone`: user timezone, default `Europe/Athens`.
- `language`: user language, default `en`.
- `is_active`: account active flag.
- `created_at`, `updated_at`: audit timestamps.

Relationships:

- One user has one `user_settings` row.
- One user has many `tasks`.
- One user has many `habits`.
- One user has many `habit_logs`.
- One user has many `notifications`.

## `user_settings`

Purpose: Stores user preferences.

Important columns:

- `setting_id`: BIGSERIAL primary key.
- `user_id`: unique foreign key to `users`.
- `theme`: `light`, `dark`, or `system`.
- `notifications_enabled`: controls native device notification scheduling.
- `default_view`: dashboard, tasks, habits, calendar, or account.
- `week_starts_on`: monday or sunday.
- `time_format`: 12h or 24h.
- `created_at`, `updated_at`: audit timestamps.

Relationships:

- Belongs to one user.
- Deleted automatically when the user is deleted through `ON DELETE CASCADE`.

## `tasks`

Purpose: Stores user-created tasks.

Important columns:

- `task_id`: BIGSERIAL primary key.
- `user_id`: foreign key to `users`.
- `title`: required task title.
- `description`: optional details.
- `due_date`: first date for the task.
- `end_date`: optional final date for multi-day tasks.
- `due_time`: legacy/effective time field.
- `start_time`: task start time.
- `end_time`: task end time.
- `status`: pending, completed, or cancelled.
- `is_all_day`: all-day task flag.
- `reminder_enabled`: whether reminder records should be generated.
- `completed_at`: completion timestamp.
- `emoji`, `color`: visual customization.
- `created_at`, `updated_at`: audit timestamps.

Relationships:

- Belongs to one user.
- May have related rows in `notifications` using `related_type = 'task'` and `related_id = task_id`.

Multi-day support:

- A task can span from `due_date` to `end_date`.
- Calendar and task date filtering include dates where `due_date <= selected date <= COALESCE(end_date, due_date)`.

## `habits`

Purpose: Stores habits that users want to track over time.

Important columns:

- `habit_id`: BIGSERIAL primary key.
- `user_id`: foreign key to `users`.
- `title`: required habit title.
- `description`: optional details.
- `start_date`: first active date.
- `end_date`: optional final active date.
- `start_time`, `end_time`: optional display/scheduling times.
- `reminder_enabled`: whether reminder records should be generated.
- `reminder_time`: time used for habit reminder generation.
- `status`: active or archived.
- `emoji`, `color`: visual customization.
- `created_at`, `updated_at`: audit timestamps.

Relationships:

- Belongs to one user.
- Has one or more `habit_rules`.
- Has many `habit_logs`.
- May have related rows in `notifications` using `related_type = 'habit'` and `related_id = habit_id`.

End date behavior:

- A habit with `end_date` is considered active only through that date.
- Habit reminders are not generated after `end_date`.
- Calendar and dashboard views exclude habits outside their start/end range.

## `habit_rules`

Purpose: Stores recurrence configuration for each habit.

Important columns:

- `rule_id`: BIGSERIAL primary key.
- `habit_id`: foreign key to `habits`.
- `recurrence_type`: daily, specific_weekdays, every_n_days, x_times_per_week, or x_times_per_month.
- `interval_value`: numeric recurrence interval.
- `target_count`: expected completion count.
- `target_period`: day, week, month, or custom.
- `week_start`: monday or sunday.
- `is_active`: active rule flag.
- `created_at`, `updated_at`: audit timestamps.

Relationships:

- Belongs to one habit.
- Has many `habit_rule_days` when recurrence needs selected days.

## `habit_rule_days`

Purpose: Stores selected weekdays or month days for recurrence rules.

Important columns:

- `rule_day_id`: BIGSERIAL primary key.
- `rule_id`: foreign key to `habit_rules`.
- `day_of_week`: weekday number when used.
- `day_of_month`: month day number when used.

Relationships:

- Belongs to one habit rule.

## `habit_logs`

Purpose: Stores habit completions by date.

Important columns:

- `habit_log_id`: BIGSERIAL primary key.
- `habit_id`: foreign key to `habits`.
- `user_id`: foreign key to `users`.
- `log_date`: date completed.
- `completed_count`: completed amount for that date.
- `target_count_snapshot`: target count at time of logging.
- `status`: completion status.
- `completed_at`: completion timestamp.
- `created_at`, `updated_at`: audit timestamps.

Relationships:

- Belongs to one habit.
- Belongs to one user.

Behavior:

- Logging a habit creates one row for the habit/date.
- The backend prevents duplicate logs for the same habit/date.
- Logging a habit cancels remaining future notifications for that habit occurrence date.

## `notifications`

Purpose: Stores backend notification center items and reminder schedule records.

Important columns:

- `notification_id`: BIGSERIAL primary key.
- `user_id`: foreign key to `users`.
- `related_type`: task, habit, or system.
- `related_id`: task ID, habit ID, or null for system notifications.
- `kind`: standard_reminder, overdue_30, overdue_15, overdue_5, or system.
- `title`: notification title.
- `body`: notification message.
- `scheduled_for`: timestamp when the notification becomes due.
- `occurrence_date`: task/habit occurrence date.
- `status`: scheduled or cancelled.
- `read_at`: null when unread, timestamp when read.
- `created_at`, `updated_at`: audit timestamps.

Relationships:

- Belongs to one user.
- Related to tasks or habits by `related_type` and `related_id`.

Important constraints/indexes:

- Unique scheduled notification index prevents duplicate active records for the same user, related object, kind, and scheduled time.
- Status/read indexes support unread count and notification center queries.

Unread definition:

```text
read_at IS NULL
status = 'scheduled'
scheduled_for <= NOW()
```
