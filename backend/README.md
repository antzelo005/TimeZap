# TimeZap Backend

Express.js REST API for the TimeZap task and habit management system.

The backend handles authentication, validation, PostgreSQL persistence, dashboard/calendar aggregation, notification records, settings, and optional Gemini AI Suggestions. Runtime secrets stay in `backend/.env`.

## Tech Stack

- Node.js
- Express.js
- PostgreSQL with `pg`
- JWT authentication
- bcrypt password hashing
- dotenv
- CORS
- Gemini API for optional AI Suggestions

## Setup

```bash
cd backend
npm install
```

Copy the environment template on Windows CMD:

```cmd
copy .env.example .env
```

PowerShell:

```powershell
Copy-Item .env.example .env
```

Or on macOS/Linux:

```bash
cp .env.example .env
```

Update `.env` with local PostgreSQL credentials and a JWT secret. Add `GEMINI_API_KEY` only if AI Suggestions should be enabled.

```bash
npm start
```

Development mode:

```bash
npm run dev
```

## Environment Variables

Use `.env.example` as the safe template:

```env
PORT=
DB_HOST=
DB_PORT=
DB_NAME=
DB_USER=
DB_PASSWORD=
JWT_SECRET=
JWT_EXPIRES_IN=
GEMINI_API_KEY=
GEMINI_MODEL=
```

Do not commit `.env` or real credentials.

## Database

- Create a PostgreSQL database before starting the backend.
- Use `database/schema.sql` to create the reference schema when needed.
- `database/seed.example.sql` contains optional example seed data only.
- `src/server.js` performs safe startup schema preparation for missing V1 columns, indexes, and the notifications table.
- Existing data is not intentionally overwritten by the startup preparation step.

## API Overview

Public endpoints:

- `GET /api/health`
- `GET /api/db-health`
- `POST /api/auth/register`
- `POST /api/auth/login`

Authenticated groups:

- `/api/auth`
- `/api/tasks`
- `/api/habits`
- `/api/dashboard`
- `/api/calendar`
- `/api/settings`
- `/api/notifications`
- `/api/ai/suggestions`

Detailed API documentation lives in [../docs/api.md](../docs/api.md).

## AI Suggestions

The AI route calls Gemini only from the backend. `GEMINI_API_KEY` is read from `backend/.env`, never sent to the frontend, and can be left empty to disable the feature. Suggestions are returned for user review and are not inserted automatically.

## Manual Testing

See [docs/manual-test.md](docs/manual-test.md) and [../docs/testing.md](../docs/testing.md).
