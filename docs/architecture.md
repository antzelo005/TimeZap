# Architecture

TimeZap V1 is a full-stack task and habit management information system. The application is organized as a React Native/Expo frontend and an Express/PostgreSQL backend.

## High-Level System Architecture

```text
User
  -> Expo React Native app
  -> frontend/src/api API client
  -> Express routes/controllers
  -> PostgreSQL tables
```

The frontend is responsible for user interaction, local token/settings caching, navigation, theme rendering, and platform-specific notification scheduling. The backend is responsible for authentication, validation, data persistence, calendar/dashboard aggregation, reminder record generation, notification read/unread state, and the optional AI Suggestions call to Gemini.

## Frontend Architecture

Main location: `frontend/src`

Important folders:

- `api`: typed API wrapper functions for backend endpoints.
- `components`: shared UI components such as buttons, inputs, date/time fields, modals, notification bell, streak badge, and icons.
- `context`: global auth and settings providers.
- `i18n`: localization setup and language resources.
- `navigation`: authenticated and unauthenticated navigation structure.
- `screens`: Login, Register, Dashboard, Tasks, Habits, Calendar, and Account screens.
- `services`: app events and notification scheduling logic.
- `storage`: AsyncStorage wrappers for token and settings persistence.
- `theme`: color, spacing, and theme hooks.
- `types`: TypeScript models for API payloads and responses.

Frontend boot flow:

```text
App
  -> SafeAreaProvider
  -> AuthProvider
  -> SettingsProvider
  -> AppContent
  -> NavigationContainer
  -> AppNavigator
```

`AuthProvider` loads the JWT token from AsyncStorage and validates it with `GET /api/auth/me`. `SettingsProvider` loads cached settings first, then synchronizes authenticated settings from the backend.

## Backend Architecture

Main location: `backend/src`

Important files and folders:

- `app.js`: Express app setup, middleware, health endpoints, route mounting, and 404 handler.
- `server.js`: environment loading, runtime schema preparation, and server startup.
- `config/db.js`: PostgreSQL connection pool using `DB_*` environment variables.
- `routes`: REST route definitions.
- `controllers`: request handling, validation, business logic, database queries, and response shaping.
- `middleware`: JWT authentication and error handling.
- `utils`: validation helpers and small shared utilities.

Backend request flow:

```text
HTTP request
  -> Express app
  -> route
  -> auth middleware when required
  -> controller
  -> PostgreSQL query
  -> JSON response
```

## Database Layer

The database is PostgreSQL. The reference schema is stored at `backend/database/schema.sql`.

The main tables are:

- `users`
- `user_settings`
- `tasks`
- `habits`
- `habit_rules`
- `habit_rule_days`
- `habit_logs`
- `notifications`

Primary keys use `BIGSERIAL`, and related IDs are `BIGINT`. Passwords are stored as bcrypt hashes in `users.password_hash`; plain-text passwords are not stored.

The backend uses direct SQL queries through the `pg` package. There is no ORM in V1.

## Optional AI Suggestions Flow

AI Suggestions is a small V1 helper, not a chatbot. It lets an authenticated user enter a short planning prompt and receive structured task and habit suggestions.

```text
Dashboard AI Suggestions modal
  -> POST /api/ai/suggestions
  -> backend validates prompt, language, and focus
  -> backend calls Gemini generateContent API with GEMINI_API_KEY
  -> backend validates and sanitizes structured JSON suggestions
  -> frontend displays suggestions as reviewable cards
  -> user explicitly adds one selected task or habit
  -> existing /api/tasks or /api/habits endpoint creates the item
```

The Gemini API key stays only in the backend environment. Prompts are not stored in the database in V1, and suggested tasks/habits are never created automatically. If `GEMINI_API_KEY` is missing, the backend returns a clean unavailable/configuration error and the frontend shows a friendly message.

## Authentication Flow

```text
Register/Login
  -> POST /api/auth/register or POST /api/auth/login
  -> backend validates credentials
  -> password is hashed or compared with bcrypt
  -> JWT is signed
  -> frontend stores token in AsyncStorage
  -> later requests include Authorization: Bearer <token>
```

On app startup, the frontend reads the token from AsyncStorage and calls `GET /api/auth/me`. If the token is missing, invalid, expired, or the request fails during bootstrapping, the user returns to the auth screens.

## Settings, Theme, and Language Flow

```text
Account/settings screen
  -> SettingsContext optimistic update
  -> PUT /api/settings
  -> user_settings and users rows updated
  -> settings cached in AsyncStorage
  -> theme/language/default view update in frontend
```

Settings are stored in two places:

- Backend: `user_settings` plus `users.timezone` and `users.language`.
- Frontend cache: AsyncStorage key `timezap_settings`.

The cache improves startup behavior and gives a fallback if settings cannot be fetched immediately.

## Task Flow

```text
Tasks screen
  -> create/edit/complete/cancel/delete action
  -> /api/tasks endpoint
  -> tasks table update
  -> notification records created or cancelled when reminders are enabled
  -> frontend refreshes task/dashboard/notification state
```

Task support includes:

- Single-day tasks.
- Multi-day tasks using `due_date` and `end_date`.
- Start and end time fields.
- All-day tasks.
- Pending, completed, and cancelled statuses.
- Overdue calculation using the task end reference plus a 60-minute grace period.
- Optional reminders.

When a task with reminders is created or updated, the backend cancels existing scheduled notification records for that task and creates a new set. When a task is completed, cancelled, or deleted, related scheduled notification records are cancelled.

## Habit Flow

```text
Habits screen
  -> create/edit/delete/log action
  -> /api/habits endpoint
  -> habits, habit_rules, habit_rule_days, or habit_logs updated
  -> notification records created or cancelled where applicable
  -> frontend refreshes habit/dashboard/calendar state
```

Habit support includes:

- Start date and optional end date.
- Active and archived-style status support through the database model.
- Recurrence rules: daily, specific weekdays, every N days, X times per week, and X times per month.
- Habit logs for completed dates.
- Streak calculation for daily/specific weekday activity.
- Optional reminder time.

Daily habit reminders are generated for a rolling 14-day window. If a habit has an `end_date`, reminders are not generated after that date. When a habit is logged for a date, remaining future reminders for that habit/date are cancelled.

## Calendar Flow

```text
Calendar screen
  -> GET /api/calendar/month?year=YYYY&month=M
  -> monthly task and habit-log summary

Calendar day selection
  -> GET /api/calendar/day?date=YYYY-MM-DD
  -> tasks active on that date and habits expected on that date
```

The calendar expands multi-day tasks with PostgreSQL `generate_series`, so a task from `due_date` to `end_date` can appear on each included day.

## Notification and Reminder Flow

The notification system has two layers.

### Backend Notification Center

Backend table: `notifications`

The backend stores notification center records with:

- related object type: task, habit, or system
- related object ID
- kind: standard reminder, overdue warning, or system
- title and body
- scheduled time
- occurrence date
- scheduled/cancelled status
- read timestamp

Unread notifications are records where:

```text
read_at IS NULL
status = 'scheduled'
scheduled_for <= NOW()
```

The red dot/bell state uses `GET /api/notifications/unread-count`.

### Task Reminder Records

For a timed pending task with reminders enabled, the backend can create:

- One standard reminder 30 minutes before the task start reference.
- Up to three overdue warning reminders before the grace deadline:
  - 30 minutes before overdue
  - 15 minutes before overdue
  - 5 minutes before overdue

The overdue deadline is based on the task end reference plus a 60-minute grace period. Candidate reminders in the past are not inserted.

### Habit Reminder Records

For active daily habits with reminders enabled and a `reminder_time`, the backend creates reminder records for the next 14 days, excluding dates that are already logged and dates outside the habit start/end date range.

### Native Local Notification Scheduling

The frontend reads scheduled backend notification records and schedules native local notifications only when supported. Native schedule IDs are stored in AsyncStorage under a per-user key. The backend notification record remains the source of truth for the in-app notification center.

The app reconciles notification schedules:

- on startup after authentication/settings load
- when the app returns to active state
- when relevant app events request notification refreshes

If `notifications_enabled` is false, the frontend cancels stored native local notification IDs and does not schedule device notifications.

## Android and Web Differences

Web:

- Uses `http://localhost:3000/api`.
- Supports the in-app notification center through backend records.
- Does not schedule native device notifications.
- Gracefully treats native notification APIs as unavailable.

Android emulator:

- Uses `http://10.0.2.2:3000/api`.
- Supports the same backend data and in-app notification center.
- Native local notification scheduling depends on `expo-notifications` availability and permissions.
- Current code treats Android Expo Go as native-notification unavailable, so in-app notifications still work, but native local notifications should be tested with a development build or production build.

Remote push notifications are not implemented in V1.
