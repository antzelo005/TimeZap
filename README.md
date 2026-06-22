# TimeZap

TimeZap is a task and habit management application built as a full-stack thesis project. It provides authenticated task tracking, habit tracking, dashboard summaries, calendar views, settings, localization, themes, a notification/reminder center for web and Android, and optional Gemini-powered AI Suggestions.

Thesis context: **Task & Habit Management Information System**

## Main Features

- User registration, login, JWT authentication, profile editing, and password changes.
- Task CRUD with pending, completed, cancelled, overdue, all-day, timed, and multi-day task support.
- Habit CRUD with recurrence rules, daily logging, streak calculation, multi-day active ranges, and optional end dates.
- Dashboard summary for today's tasks, habits, and current streak.
- Calendar monthly and daily views for scheduled tasks and habit completion data.
- Account/settings screen for theme, language, notifications, default view, week start, time format, timezone, and account details.
- Dark/light/system theme support.
- Localization support for English, Greek, and Romanian.
- Backend notification center with unread/read state.
- Local reminder scheduling on supported native Android builds when notification permissions are enabled.
- SVG-based icon system shared across screens.
- Optional AI Suggestions helper: users enter a prompt, receive structured task/habit suggestions from Gemini through the backend, review the suggestions, and manually choose what to add.

## Tech Stack

### Frontend

- Expo
- React Native
- React Native Web
- TypeScript
- React Navigation
- AsyncStorage
- Expo Notifications
- React Native SVG

### Backend

- Node.js
- Express
- PostgreSQL
- `pg`
- JWT
- bcrypt
- dotenv
- CORS
- Google Gemini API through a backend-only API call for optional AI Suggestions

### Database

- PostgreSQL
- BIGSERIAL/BIGINT primary and foreign keys
- Relational tables for users, settings, tasks, habits, habit rules, habit logs, and notifications

## Architecture Overview

TimeZap is split into two applications:

- `backend`: Express REST API connected to PostgreSQL.
- `frontend`: Expo React Native app targeting web and Android.

High-level flow:

```text
User
  -> Expo React Native frontend
  -> API client
  -> Express backend
  -> PostgreSQL database
```

Notifications use two layers:

- The backend `notifications` table is the source of truth for in-app notification center items.
- The frontend schedules native local notifications from backend notification records when the platform supports it and the user has notifications enabled.

See [docs/architecture.md](docs/architecture.md) for the full technical architecture.

## Project Structure

```text
TimeZap/
  backend/
    database/
      schema.sql
      seed.example.sql
    src/
      app.js
      server.js
      config/
      controllers/
      middleware/
      routes/
      utils/
  frontend/
    src/
      api/
      components/
      context/
      i18n/
      navigation/
      screens/
      services/
      storage/
      theme/
      types/
  docs/
```

## Backend Setup

Install backend dependencies:

```powershell
cd C:\AntzeloProjects\TimeZap\backend
npm install
```

Create a backend `.env` file in `backend\`. Do not commit this file.

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=timezap
DB_USER=postgres
DB_PASSWORD=your_local_password
JWT_SECRET=replace_with_a_local_secret
JWT_EXPIRES_IN=7d
NODE_ENV=development
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```

The current backend configuration uses individual `DB_*` variables, not a single `DATABASE_URL`.

`GEMINI_API_KEY` is optional and enables AI Suggestions. Keep it only in the backend `.env`; the frontend never receives the key and never calls Gemini directly. If `GEMINI_API_KEY` is missing, the AI Suggestions endpoint returns a clean unavailable response and the rest of the app continues to work.

To enable AI Suggestions:

1. Create or update `backend\.env`.
2. Add `GEMINI_API_KEY=your_gemini_api_key_here`.
3. Optionally set `GEMINI_MODEL=gemini-2.5-flash`.
4. Restart the backend.

AI Suggestions are review-only in V1. Generated tasks and habits are not inserted automatically; the user must press Add on each suggestion, which then uses the normal Tasks/Habits APIs.

## PostgreSQL Setup

Create a local PostgreSQL database:

```powershell
psql -U postgres
CREATE DATABASE timezap;
\q
```

Apply the reference schema from the project root:

```powershell
cd C:\AntzeloProjects\TimeZap
psql -U postgres -d timezap -f backend\database\schema.sql
```

Optional example seed data is available at:

```text
backend\database\seed.example.sql
```

The backend also runs a small startup schema preparation step in `backend\src\server.js` to add required V1 columns/tables if they are missing. The application does not intentionally overwrite existing data.

## Run Backend

```powershell
cd C:\AntzeloProjects\TimeZap\backend
npm start
```

Development mode with nodemon:

```powershell
cd C:\AntzeloProjects\TimeZap\backend
npm run dev
```

Health checks:

```text
http://localhost:3000/api/health
http://localhost:3000/api/db-health
```

## Frontend Setup

Install frontend dependencies:

```powershell
cd C:\AntzeloProjects\TimeZap\frontend
npm install
```

The current frontend API base URLs are defined in `frontend\src\api\client.ts`:

- Web: `http://localhost:3000/api`
- Android emulator: `http://10.0.2.2:3000/api`

This is important because `localhost` inside the Android emulator refers to the emulator itself. `10.0.2.2` points back to the Windows host machine.

## Run Web App

Start the backend first, then run:

```powershell
cd C:\AntzeloProjects\TimeZap\frontend
npm run web
```

Expo will print the local web URL in the terminal.

## Run Android Emulator

Start the backend first, open an Android emulator, then run:

```powershell
cd C:\AntzeloProjects\TimeZap\frontend
npm run android
```

The Android emulator uses `http://10.0.2.2:3000/api` to reach the backend running on Windows.

## Useful Scripts

Backend scripts from `backend\package.json`:

```powershell
npm start
npm run dev
```

Frontend scripts from `frontend\package.json`:

```powershell
npm start
npm run android
npm run web
npm run typecheck
```

## Environment Variables

Backend variables:

- `PORT`: backend port, default `3000`.
- `DB_HOST`: PostgreSQL host.
- `DB_PORT`: PostgreSQL port, usually `5432`.
- `DB_NAME`: PostgreSQL database name.
- `DB_USER`: PostgreSQL user.
- `DB_PASSWORD`: PostgreSQL password.
- `JWT_SECRET`: secret used to sign JWT tokens.
- `JWT_EXPIRES_IN`: optional JWT lifetime, default `7d`.
- `NODE_ENV`: optional runtime mode.
- `GEMINI_API_KEY`: optional backend-only Gemini key for AI Suggestions. Use `GEMINI_API_KEY=your_gemini_api_key_here` in local setup examples only; do not commit a real key.
- `GEMINI_MODEL`: optional Gemini model override for AI Suggestions, default `gemini-2.5-flash`.

Frontend variables:

- No frontend `.env` variables are required in the current V1 implementation.
- API base URLs are currently constants in `frontend\src\api\client.ts`.

Do not commit real secrets, local passwords, or production credentials.

## Screenshots

Screenshot placeholders and thesis caption suggestions are tracked in [docs/screenshots.md](docs/screenshots.md).

Suggested screenshots:

- [Screenshot: Login screen]
- [Screenshot: Dashboard dark mode]
- [Screenshot: Tasks screen with pending tasks]
- [Screenshot: New Task modal]
- [Screenshot: Habits screen]
- [Screenshot: New Habit modal]
- [Screenshot: Calendar monthly view]
- [Screenshot: Calendar day details]
- [Screenshot: Account/settings screen]
- [Screenshot: Notification center]
- [Screenshot: AI Suggestions modal with prompt]
- [Screenshot: AI suggested tasks]
- [Screenshot: AI suggested habits]
- [Screenshot: AI-generated task added to Tasks]
- [Screenshot: AI-generated habit added to Habits]
- [Screenshot: Android emulator running TimeZap]
- [Screenshot: Backend health endpoint]
- [Screenshot: PostgreSQL ERD/database diagram]
- [Screenshot: GitHub repository]

## Documentation

- [Architecture](docs/architecture.md)
- [Database](docs/database.md)
- [API](docs/api.md)
- [Manual Testing](docs/testing.md)
- [Screenshot Checklist](docs/screenshots.md)
- [Thesis Material](docs/thesis-material.md)

## Known Limitations

- Remote push notifications are not implemented in V1.
- Google Calendar integration is not implemented in V1.
- AI Suggestions are optional and unavailable when `GEMINI_API_KEY` is not configured.
- AI Suggestions never auto-create tasks or habits; users must add each suggestion explicitly.
- Web supports the in-app notification center, but not native device notifications.
- Android native local notifications require a build where `expo-notifications` is available. Android Expo Go can run the app but native notification scheduling is treated as unavailable by the current implementation.
- Habit reminder scheduling is focused on daily habits.
- The project currently relies mainly on manual testing documentation rather than a complete automated test suite.
- The backend startup schema preparation helps local V1 development, but production migrations would need a dedicated migration workflow.

## Future Enhancements

- Remote push notifications using a push notification service.
- Google Calendar integration.
- More advanced AI planning flows, if needed, beyond the small V1 AI Suggestions helper.
- Automated backend and frontend test suites.
- Dedicated database migrations.
- More recurrence-specific reminder scheduling for non-daily habits.
- Production deployment documentation.
- Admin/reporting screens for thesis evaluation data, if needed.

## Author / Developer

Developed by Antzelo as a thesis-oriented full-stack application.

Project context: **TimeZap - Task & Habit Management Information System**
