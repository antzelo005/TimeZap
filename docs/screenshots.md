# Screenshot Plan

Screenshots have not been added yet. Store final images in `docs/screenshots/` using the filenames below so the root README and thesis references remain stable.

## Required Repository Screenshots

| File | Should Show |
| --- | --- |
| `docs/screenshots/01-dashboard-dark.png` | Dashboard in dark mode with today's tasks, habit summary, streak/progress information, and navigation. |
| `docs/screenshots/02-tasks.png` | Tasks screen with pending, completed, overdue, all-day/timed, and multi-day examples where possible. |
| `docs/screenshots/03-habits.png` | Habits screen with recurrence rules, daily logging, streak status, and periodic progress. |
| `docs/screenshots/04-calendar.png` | Calendar view with scheduled tasks and habit completion context. |
| `docs/screenshots/05-ai-suggestions.png` | AI Suggestions modal showing user prompt, generated suggestion cards, and manual add/review behavior. |
| `docs/screenshots/06-account-settings.png` | Account/settings screen with theme, language, notification, week start, time format, timezone, and profile settings. |
| `docs/screenshots/07-android-emulator.png` | TimeZap running in an Android emulator through Expo. |

## Additional Thesis Screenshots

| Screenshot | Should Show |
| --- | --- |
| Login screen | Authentication entry point and app branding. |
| New Task modal | Task title, description, date range, time fields, icon/color choices, and reminder option. |
| New Habit modal | Habit recurrence type, target count, active date range, icon/color choices, and reminder option. |
| Calendar day details | Selected day with tasks, expected habits, and completed habit logs. |
| Notification center | Backend notification records with read/unread state. |
| AI unavailable message | Graceful fallback when `GEMINI_API_KEY` is not configured. |
| Backend health endpoint | `GET /api/health` or `GET /api/db-health` response. |
| PostgreSQL ERD/database diagram | Users, tasks, habits, habit rules, habit logs, settings, and notifications relationships. |
| GitHub repository | Repository structure with `backend/`, `frontend/`, and `docs/`. |

## Capture Notes

- Do not include real credentials, API keys, passwords, tokens, or private data in screenshots.
- Use representative local demo data only.
- Capture both web and Android where useful for thesis presentation.
- Keep image names stable once referenced from the README or thesis draft.
