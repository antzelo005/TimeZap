# TimeZap Backend

TimeZap is a task and habit management information system backend built for a thesis project. This backend focuses on a clean, minimal, scalable Express + PostgreSQL architecture for authentication, tasks, habits, dashboard summaries, calendar views, notifications-ready data structures, and user settings.

## Tech Stack

- Node.js
- Express.js
- PostgreSQL
- `pg`
- JWT authentication
- `bcrypt`
- `dotenv`
- `cors`
- `nodemon`

## Project Structure

```text
backend/
  src/
    config/
    controllers/
    middleware/
    routes/
    utils/
    app.js
    server.js
  database/
    schema.sql
    seed.example.sql
  docs/
    manual-test.md
  .env.example
  .gitignore
  package.json
  README.md
```

## Setup

1. Move into the backend folder:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create your local environment file from `.env.example`:
```bash
cp .env.example .env
```

4. Update `.env` with your real local PostgreSQL credentials and JWT secret.

5. Start the development server:
```bash
npm run dev
```

6. For production-style startup:
```bash
npm start
```

## Environment Variables

Use your own local `.env` file based on `.env.example`:

```env
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=timezap_db
DB_USER=your_db_user
DB_PASSWORD=your_db_password

JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
```

## Database Notes

- The application connects to an existing PostgreSQL database using environment variables.
- The app does not auto-run SQL files.
- [`database/schema.sql`](./database/schema.sql) is documentation/reference only.
- [`database/seed.example.sql`](./database/seed.example.sql) is example reference data only.
- This implementation assumes the live database already exists with the BIGINT-based TimeZap V1 schema.
- Do not use the reference SQL files to overwrite or reset an existing database.

## API Overview

### Public

- `GET /api/health`
- `GET /api/db-health`
- `POST /api/auth/register`
- `POST /api/auth/login`

### Authenticated

- `GET /api/auth/me`
- `GET /api/tasks`
- `GET /api/tasks/:id`
- `POST /api/tasks`
- `PUT /api/tasks/:id`
- `DELETE /api/tasks/:id`
- `PATCH /api/tasks/:id/complete`
- `PATCH /api/tasks/:id/cancel`
- `GET /api/habits`
- `GET /api/habits/:id`
- `POST /api/habits`
- `PUT /api/habits/:id`
- `DELETE /api/habits/:id`
- `POST /api/habits/:id/log`
- `DELETE /api/habits/:id/log/:date`
- `GET /api/habits/:id/streak`
- `GET /api/dashboard/today`
- `GET /api/calendar/month?year=2026&month=6`
- `GET /api/calendar/day?date=2026-06-01`
- `GET /api/settings`
- `PUT /api/settings`

## Example Requests

### Health

```bash
curl http://localhost:3000/api/health
```

### Register

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"user@example.com\",\"password\":\"password123\"}"
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"user@example.com\",\"password\":\"password123\"}"
```

### Create Task

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d "{\"title\":\"Finish report\",\"description\":\"Complete thesis section\",\"due_date\":\"2026-06-01\",\"due_time\":\"18:00\",\"is_all_day\":false}"
```

## Manual Testing

See [`docs/manual-test.md`](./docs/manual-test.md) for a short checklist covering health, auth, tasks, habits, streaks, and dashboard testing.

## GitHub Safety Notes

- `.env` is ignored in [`backend/.gitignore`](./.gitignore).
- `.env.example` is committed as a safe template only.
- No real credentials, tokens, passwords, or personal data should be committed.
- JWT secrets and database credentials must stay in your local `.env`.
- The repository should only contain placeholder/example values.
