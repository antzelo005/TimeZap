# API Documentation

Base URL:

- Web: `http://localhost:3000/api`
- Android emulator: `http://10.0.2.2:3000/api`

Most endpoints require a JWT:

```http
Authorization: Bearer <token>
Content-Type: application/json
```

Error response shape:

```json
{
  "error": true,
  "message": "Error message"
}
```

## Health

| Method | Path | Purpose | Auth required |
| --- | --- | --- | --- |
| GET | `/api/health` | Check API process health. | No |
| GET | `/api/db-health` | Check PostgreSQL connectivity. | No |

Example response:

```json
{
  "status": "ok",
  "message": "TimeZap backend is running"
}
```

## Auth

| Method | Path | Purpose | Auth required |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | Create a user and default settings. | No |
| POST | `/api/auth/login` | Authenticate and receive a JWT. | No |
| GET | `/api/auth/me` | Return the current user from the JWT. | Yes |
| PUT | `/api/auth/profile` | Update email/display name and return a refreshed JWT. | Yes |
| PUT | `/api/auth/password` | Change the current user's password. | Yes |

Register/login request:

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Auth response shape:

```json
{
  "message": "Login successful",
  "token": "jwt-token",
  "user": {
    "user_id": "1",
    "email": "user@example.com",
    "display_name": null,
    "timezone": "Europe/Athens",
    "language": "en",
    "is_active": true,
    "created_at": "2026-06-10T00:00:00.000Z",
    "updated_at": "2026-06-10T00:00:00.000Z"
  }
}
```

Update profile request:

```json
{
  "email": "new@example.com",
  "display_name": "Antzelo"
}
```

Change password request:

```json
{
  "current_password": "old-password",
  "new_password": "new-password"
}
```

## Settings

| Method | Path | Purpose | Auth required |
| --- | --- | --- | --- |
| GET | `/api/settings` | Get user settings and account language/timezone fields. | Yes |
| PUT | `/api/settings` | Update preferences. | Yes |

Example request:

```json
{
  "theme": "dark",
  "language": "en",
  "notifications_enabled": true,
  "default_view": "dashboard",
  "week_starts_on": "monday",
  "time_format": "12h",
  "timezone": "Europe/Athens"
}
```

Example response shape:

```json
{
  "message": "Settings updated successfully",
  "settings": {
    "theme": "dark",
    "notifications_enabled": true,
    "default_view": "dashboard",
    "week_starts_on": "monday",
    "time_format": "12h",
    "timezone": "Europe/Athens",
    "language": "en"
  }
}
```

## Tasks

| Method | Path | Purpose | Auth required |
| --- | --- | --- | --- |
| GET | `/api/tasks` | List tasks. Supports `status`, `date`, `from`, and `to` query parameters. | Yes |
| GET | `/api/tasks/:id` | Get one task. | Yes |
| POST | `/api/tasks` | Create a task. | Yes |
| PUT | `/api/tasks/:id` | Update a task. | Yes |
| PATCH | `/api/tasks/:id/complete` | Mark a task as completed. | Yes |
| PATCH | `/api/tasks/:id/cancel` | Mark a task as cancelled. | Yes |
| DELETE | `/api/tasks/:id` | Delete a task. | Yes |

Example create/update request:

```json
{
  "title": "Prepare thesis slides",
  "description": "Finalize presentation",
  "due_date": "2026-06-15",
  "end_date": null,
  "start_time": "12:00",
  "end_time": "13:00",
  "due_time": "12:00",
  "is_all_day": false,
  "reminder_enabled": true,
  "emoji": "zap",
  "color": "#3B82F6"
}
```

Example response shape:

```json
{
  "message": "Task created successfully",
  "task": {
    "task_id": "1",
    "user_id": "1",
    "title": "Prepare thesis slides",
    "description": "Finalize presentation",
    "due_date": "2026-06-15",
    "end_date": null,
    "due_time": "12:00:00",
    "start_time": "12:00:00",
    "end_time": "13:00:00",
    "status": "pending",
    "is_all_day": false,
    "reminder_enabled": true,
    "completed_at": null,
    "emoji": "zap",
    "color": "#3B82F6",
    "is_overdue": false
  }
}
```

## Habits

| Method | Path | Purpose | Auth required |
| --- | --- | --- | --- |
| GET | `/api/habits` | List habits with active rule details. | Yes |
| GET | `/api/habits/:id` | Get one habit. | Yes |
| POST | `/api/habits` | Create a habit and recurrence rule. | Yes |
| PUT | `/api/habits/:id` | Update a habit and recurrence rule. | Yes |
| DELETE | `/api/habits/:id` | Delete a habit. | Yes |
| POST | `/api/habits/:id/log` | Log a habit completion for a date. | Yes |
| DELETE | `/api/habits/:id/log/:date` | Delete a habit log for a date. | Yes |
| GET | `/api/habits/:id/streak` | Get current streak for one habit. | Yes |

Example create/update request:

```json
{
  "title": "Read for 20 min",
  "description": "Daily reading habit",
  "start_date": "2026-06-10",
  "end_date": null,
  "start_time": "20:00",
  "end_time": "20:20",
  "reminder_enabled": true,
  "reminder_time": "19:30",
  "emoji": "book",
  "color": "#22C55E",
  "rule": {
    "recurrence_type": "daily",
    "interval_value": 1,
    "target_count": 1,
    "target_period": "day",
    "week_start": "monday",
    "days": []
  }
}
```

Log habit request:

```json
{
  "date": "2026-06-10"
}
```

Example habit response shape:

```json
{
  "message": "Habit created successfully",
  "habit": {
    "habit_id": "1",
    "user_id": "1",
    "title": "Read for 20 min",
    "start_date": "2026-06-10",
    "end_date": null,
    "reminder_enabled": true,
    "reminder_time": "19:30:00",
    "status": "active",
    "rule": {
      "rule_id": "1",
      "recurrence_type": "daily",
      "interval_value": 1,
      "target_count": 1,
      "target_period": "day",
      "week_start": "monday",
      "is_active": true,
      "days": []
    }
  }
}
```

## Calendar

| Method | Path | Purpose | Auth required |
| --- | --- | --- | --- |
| GET | `/api/calendar/month?year=YYYY&month=M` | Get month summary of tasks and completed habit-log counts. | Yes |
| GET | `/api/calendar/day?date=YYYY-MM-DD` | Get tasks and expected habits for a specific day. | Yes |

Month response shape:

```json
{
  "year": 2026,
  "month": 6,
  "dates": {
    "2026-06-10": {
      "tasks": [
        {
          "task_id": "1",
          "title": "Prepare thesis slides",
          "status": "pending",
          "start_time": "12:00:00",
          "end_time": "13:00:00"
        }
      ],
      "habit_logs_completed": 2
    }
  }
}
```

Day response shape:

```json
{
  "date": "2026-06-10",
  "tasks": [],
  "habits": []
}
```

## Dashboard

| Method | Path | Purpose | Auth required |
| --- | --- | --- | --- |
| GET | `/api/dashboard/today` | Get today's tasks, habits, completion counts, and current streak. | Yes |

Example response shape:

```json
{
  "date": "2026-06-10",
  "tasks": {
    "completed": 1,
    "total": 3,
    "items": []
  },
  "habits": {
    "completed": 2,
    "total": 2,
    "items": []
  },
  "current_streak": 1
}
```

## Notifications

| Method | Path | Purpose | Auth required |
| --- | --- | --- | --- |
| GET | `/api/notifications` | List notification records. Supports `unread=true` and `status=scheduled|cancelled`. | Yes |
| GET | `/api/notifications/unread-count` | Get unread scheduled notification count. | Yes |
| PATCH | `/api/notifications/read-all` | Mark due unread scheduled notifications as read. | Yes |
| PATCH | `/api/notifications/:id/read` | Mark one notification as read. | Yes |
| PATCH | `/api/notifications/:id/cancel` | Mark one notification as cancelled. | Yes |
| DELETE | `/api/notifications/:id` | Delete one notification. | Yes |

Example notification response shape:

```json
{
  "items": [
    {
      "notification_id": "1",
      "user_id": "1",
      "related_type": "task",
      "related_id": "1",
      "kind": "standard_reminder",
      "title": "Task reminder",
      "body": "Prepare thesis slides starts in 30 minutes.",
      "scheduled_for": "2026-06-15T11:30:00",
      "occurrence_date": "2026-06-15",
      "status": "scheduled",
      "read_at": null,
      "created_at": "2026-06-10T00:00:00.000Z",
      "updated_at": "2026-06-10T00:00:00.000Z"
    }
  ]
}
```

Unread count response:

```json
{
  "unread_count": 1
}
```
