# Manual Testing Checklist

This document describes manual V1 test cases for TimeZap. Run the backend before testing frontend behavior.

Backend:

```powershell
cd C:\AntzeloProjects\TimeZap\backend
npm start
```

Web:

```powershell
cd C:\AntzeloProjects\TimeZap\frontend
npm run web
```

Android emulator:

```powershell
cd C:\AntzeloProjects\TimeZap\frontend
npm run android
```

Optional type check:

```powershell
cd C:\AntzeloProjects\TimeZap\frontend
npm run typecheck
```

## Auth

- [ ] Register a new user with a valid email and password.
- [ ] Confirm registration logs the user in.
- [ ] Log out.
- [ ] Log in with the same user.
- [ ] Try an invalid email or wrong password and confirm an error appears.
- [ ] Refresh the web page and confirm the stored token restores the session.
- [ ] Open the app on Android and confirm authentication works against `10.0.2.2`.
- [ ] Update profile email/display name.
- [ ] Change password and confirm the old password no longer works.

## Settings, Theme, and Language

- [ ] Open Account/settings.
- [ ] Switch theme to dark and confirm all main screens update.
- [ ] Switch theme to light and confirm all main screens update.
- [ ] Switch theme to system and confirm the app still renders correctly.
- [ ] Change language to English, Greek, and Romanian.
- [ ] Change default view and restart/refresh the app to confirm initial tab behavior.
- [ ] Change week start and verify calendar display.
- [ ] Change time format and verify task/habit time labels.
- [ ] Disable notifications and verify native local notification scheduling is cancelled or skipped.
- [ ] Re-enable notifications and verify reminder records still appear in the notification center when due.

## Tasks CRUD

- [ ] Create a basic task with title only.
- [ ] Create a timed task with start and end time.
- [ ] Create a task with description, icon, and color.
- [ ] Edit title, description, date, time, icon, and color.
- [ ] Mark a task complete and confirm it moves to completed history.
- [ ] Delete a task and confirm it disappears.
- [ ] Cancel a task through the API/UI path where available and confirm it is excluded from active views.
- [ ] Filter tasks by today.
- [ ] Use All dates and confirm expected tasks appear once.

## Multi-Day Tasks

- [ ] Create a task with `due_date` and later `end_date`.
- [ ] Confirm the task appears on each included calendar day.
- [ ] Confirm the task appears in task date filters for dates inside the range.
- [ ] Confirm the task does not appear for dates outside the range.
- [ ] Edit the end date and confirm calendar/task views update.
- [ ] Complete or delete the multi-day task and confirm related reminders are cancelled.

## Habits CRUD, Log, and Streak

- [ ] Create a daily habit.
- [ ] Create a habit with visual icon/color values.
- [ ] Edit habit title, description, date, time, reminder, icon, and color.
- [ ] Log a habit for today.
- [ ] Confirm the habit appears as completed on Dashboard and Habits.
- [ ] Confirm a duplicate log for the same habit/date is prevented.
- [ ] Delete a habit log and confirm the completed state is removed.
- [ ] Check streak value after logging consecutive days.
- [ ] Delete a habit and confirm it disappears.

## Multi-Day Habits and End Date

- [ ] Create a habit with a future `start_date`.
- [ ] Confirm it does not appear before its start date.
- [ ] Create a habit with an `end_date`.
- [ ] Confirm it appears through the end date.
- [ ] Confirm it does not appear after the end date.
- [ ] Use All dates and confirm each habit appears once, not once per active day.
- [ ] Confirm reminders are not generated after `end_date`.

## Calendar

- [ ] Open the monthly calendar.
- [ ] Navigate between months.
- [ ] Confirm tasks appear on correct dates.
- [ ] Confirm multi-day tasks appear on each included date.
- [ ] Confirm completed habit counts appear on dates with logs.
- [ ] Open a day detail view.
- [ ] Confirm day detail includes tasks active on that date.
- [ ] Confirm day detail includes habits expected on that date.

## Dashboard

- [ ] Open Dashboard after login.
- [ ] Confirm today's pending/completed task counts.
- [ ] Confirm today's completed/total habit counts.
- [ ] Confirm current streak value.
- [ ] Complete a task and confirm dashboard counts update.
- [ ] Log a habit and confirm dashboard counts update.
- [ ] Confirm the top-right status chips match dashboard totals.

## Notifications and Reminders

- [ ] Create a timed task at least 32 minutes in the future with reminders enabled.
- [ ] Confirm backend notification records are created for that task.
- [ ] Wait until the 30-minute-before time and confirm the notification center shows an unread item.
- [ ] Confirm the red dot appears on the notification bell when unread count is greater than zero.
- [ ] Open the notification center and confirm notification content is readable.
- [ ] Mark one notification as read and confirm it leaves the unread list/history state updates correctly.
- [ ] Mark all as read from history/unread controls where available.
- [ ] Complete the task and confirm future related notification records are cancelled.
- [ ] Delete the task and confirm future related notification records are cancelled.
- [ ] Edit/reschedule the task and confirm old future records are cancelled and new records are created.
- [ ] Create a daily habit with reminder enabled.
- [ ] Confirm daily habit reminder records are created for the rolling window.
- [ ] Log the habit for today and confirm remaining future notifications for today are cancelled.
- [ ] Disable notifications in settings and confirm native local scheduling is skipped/cancelled.
- [ ] Re-enable notifications and confirm backend in-app notification center still works.

## Web

- [ ] Run `npm run web`.
- [ ] Confirm the app reaches `http://localhost:3000/api`.
- [ ] Confirm auth, dashboard, tasks, habits, calendar, settings, and notification center work.
- [ ] Confirm web gracefully degrades by not scheduling native device notifications.
- [ ] Confirm responsive layout works at desktop and narrow browser widths.

## Android Emulator

- [ ] Start backend on Windows.
- [ ] Start an Android emulator.
- [ ] Run `npm run android`.
- [ ] Confirm API calls reach `http://10.0.2.2:3000/api`.
- [ ] Confirm auth, dashboard, tasks, habits, calendar, settings, and notification center work.
- [ ] Confirm bottom-sheet notification center can be opened and dismissed.
- [ ] Confirm native local notifications are not expected in Android Expo Go with the current implementation.
- [ ] Test native local notifications in an Android development build or production build if that build is available.

## Backend Health and Database

- [ ] Visit `http://localhost:3000/api/health`.
- [ ] Confirm response contains `status: ok`.
- [ ] Visit `http://localhost:3000/api/db-health`.
- [ ] Confirm database response contains `database: connected`.
- [ ] Confirm PostgreSQL contains expected tables from `backend/database/schema.sql`.
