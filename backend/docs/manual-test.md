# Manual Testing Flow

Run the backend first:

```bash
cd backend
npm install
npm run dev
```

Base URL:

```text
http://localhost:3000
```

## 1. Health Check

Request:

```http
GET http://localhost:3000/api/health
```

Expected response shape:

```json
{
  "status": "ok",
  "message": "TimeZap backend is running"
}
```

## 2. Database Health Check

Request:

```http
GET http://localhost:3000/api/db-health
```

Expected response shape:

```json
{
  "status": "ok",
  "database": "connected",
  "time": "2026-05-31T18:27:21.787Z"
}
```

## 3. Register

Request:

```http
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "email": "test@timezap.com",
  "password": "123456"
}
```

Expected success response shape:

```json
{
  "message": "User registered successfully",
  "token": "JWT_TOKEN",
  "user": {
    "user_id": "1",
    "email": "test@timezap.com",
    "timezone": "Europe/Athens",
    "language": "en",
    "is_active": true,
    "created_at": "2026-05-31T18:27:21.899Z",
    "updated_at": "2026-05-31T18:27:21.899Z"
  }
}
```

If the user already exists, expected conflict response:

```json
{
  "error": true,
  "message": "Email is already registered"
}
```

## 4. Login

Request:

```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "test@timezap.com",
  "password": "123456"
}
```

Expected response shape:

```json
{
  "message": "Login successful",
  "token": "JWT_TOKEN",
  "user": {
    "user_id": "1",
    "email": "test@timezap.com",
    "timezone": "Europe/Athens",
    "language": "en",
    "is_active": true,
    "created_at": "2026-05-31T18:27:21.899Z",
    "updated_at": "2026-05-31T18:27:21.899Z"
  }
}
```

## 5. Get Current User

Request:

```http
GET http://localhost:3000/api/auth/me
Authorization: Bearer <token>
```

Expected response shape:

```json
{
  "user": {
    "user_id": "1",
    "email": "test@timezap.com",
    "timezone": "Europe/Athens",
    "language": "en",
    "is_active": true,
    "created_at": "2026-05-31T18:27:21.899Z",
    "updated_at": "2026-05-31T18:27:21.899Z"
  }
}
```

## 6. Create Task

Request:

```http
POST http://localhost:3000/api/tasks
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Finish report",
  "description": "Complete thesis report section",
  "due_date": "2026-06-01",
  "due_time": "18:00",
  "is_all_day": false,
  "emoji": "note",
  "color": "#7B61FF"
}
```

Expected response shape:

```json
{
  "message": "Task created successfully",
  "task": {
    "task_id": "2",
    "user_id": "1",
    "title": "Finish report",
    "description": "Complete thesis report section",
    "due_date": "2026-06-01",
    "due_time": "18:00:00",
    "status": "pending",
    "is_all_day": false,
    "completed_at": null,
    "emoji": "note",
    "color": "#7B61FF",
    "created_at": "2026-05-31T18:28:55.633Z",
    "updated_at": "2026-05-31T18:28:55.633Z",
    "is_overdue": false
  }
}
```

## 7. Get Tasks

Request:

```http
GET http://localhost:3000/api/tasks
Authorization: Bearer <token>
```

Expected response shape:

```json
{
  "items": [
    {
      "task_id": "2",
      "user_id": "1",
      "title": "Finish report"
    }
  ]
}
```

## 8. Complete Task

Request:

```http
PATCH http://localhost:3000/api/tasks/<task_id>/complete
Authorization: Bearer <token>
```

Expected response shape:

```json
{
  "message": "Task marked as completed",
  "task": {
    "task_id": "2",
    "status": "completed",
    "completed_at": "2026-05-31T18:28:55.648Z"
  }
}
```

## 9. Create Habit

Request:

```http
POST http://localhost:3000/api/habits
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Read for 20 min",
  "description": "Daily reading habit",
  "start_date": "2026-06-01",
  "emoji": "book",
  "color": "#7B61FF",
  "rule": {
    "recurrence_type": "daily",
    "interval_value": 1,
    "target_count": 1,
    "target_period": null,
    "week_start": "monday",
    "days": []
  }
}
```

Expected response shape:

```json
{
  "message": "Habit created successfully",
  "habit": {
    "habit_id": "2",
    "user_id": "1",
    "title": "Read for 20 min",
    "start_date": "2026-06-01",
    "status": "active",
    "rule": {
      "rule_id": "2",
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

## 10. Log Habit

Request:

```http
POST http://localhost:3000/api/habits/<habit_id>/log
Authorization: Bearer <token>
Content-Type: application/json

{
  "date": "2026-05-31"
}
```

Expected response shape:

```json
{
  "message": "Habit logged successfully",
  "log": {
    "habit_log_id": "1",
    "habit_id": "2",
    "user_id": "1",
    "log_date": "2026-05-31",
    "completed_count": 1,
    "target_count_snapshot": 1,
    "status": "completed"
  }
}
```

## 11. Get Streak

Request:

```http
GET http://localhost:3000/api/habits/<habit_id>/streak
Authorization: Bearer <token>
```

Expected response shape:

```json
{
  "habit_id": "2",
  "current_streak": 1
}
```

## 12. Dashboard Today

Request:

```http
GET http://localhost:3000/api/dashboard/today
Authorization: Bearer <token>
```

Expected response shape:

```json
{
  "date": "2026-05-31",
  "tasks": {
    "completed": 1,
    "total": 2,
    "items": []
  },
  "habits": {
    "completed": 1,
    "total": 0,
    "items": []
  },
  "current_streak": 1
}
```
