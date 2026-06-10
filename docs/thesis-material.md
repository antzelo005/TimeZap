# Thesis Material Summary

This document summarizes TimeZap in a form that can later support thesis writing.

## Project Overview

TimeZap is a full-stack task and habit management information system. It allows users to create tasks, track recurring habits, view daily progress, inspect calendar activity, configure personal settings, and receive reminder records through an in-app notification center.

The system is implemented with an Express/PostgreSQL backend and an Expo React Native frontend that runs on web and Android.

Thesis context: **Task & Habit Management Information System**

## Problem Statement

Many users manage tasks and habits using separate tools or informal notes. This can make it difficult to see daily obligations, recurring routines, progress, and reminders in one place. TimeZap addresses this by combining task scheduling, habit tracking, dashboard summaries, calendar views, and reminder records in a single information system.

## Goal of the System

The goal of TimeZap is to provide a clear and practical V1 system for personal task and habit management. The system focuses on:

- organizing one-time and multi-day tasks
- tracking recurring habits and completions
- summarizing daily progress
- displaying activity in calendar form
- supporting user personalization through settings
- storing reminder records and read/unread notification state
- running on both web and Android through a shared frontend codebase

## User Roles / Target Users

V1 has one primary user role:

- Registered user: creates and manages their own tasks, habits, settings, calendar activity, and notifications.

Target users are individuals who want a lightweight system for daily planning and habit tracking.

## Functional Requirements

- The system shall allow users to register and log in.
- The system shall authenticate protected requests using JWT.
- The system shall allow users to update profile information and password.
- The system shall allow users to create, read, update, complete, cancel, and delete tasks.
- The system shall support timed, all-day, and multi-day tasks.
- The system shall calculate task overdue state.
- The system shall allow users to create, read, update, log, and delete habits.
- The system shall support habit recurrence rules.
- The system shall support habit start dates and optional end dates.
- The system shall calculate habit completion and streak information.
- The system shall provide a dashboard summary for the current day.
- The system shall provide monthly and daily calendar views.
- The system shall allow users to configure theme, language, notification setting, default view, week start, time format, and timezone.
- The system shall store notification center records in the backend.
- The system shall show unread notification state in the frontend.
- The system shall mark individual or grouped notifications as read.
- The system shall schedule native local notifications on supported Android builds when notification permissions are enabled.

## Non-Functional Requirements

- The system should be understandable and maintainable for a thesis V1.
- The backend should expose clear REST endpoints.
- The database should use relational integrity through primary and foreign keys.
- Passwords must be hashed, not stored in plain text.
- The frontend should support web and Android using the same codebase.
- The UI should support dark/light/system theme preferences.
- The app should degrade gracefully on platforms where native notifications are unavailable.
- The repository should include documentation for setup, architecture, database, API, testing, and thesis material.

## Technologies Used

Frontend:

- Expo
- React Native
- React Native Web
- TypeScript
- React Navigation
- AsyncStorage
- Expo Notifications
- React Native SVG

Backend:

- Node.js
- Express
- PostgreSQL
- `pg`
- JWT
- bcrypt
- dotenv

Database:

- PostgreSQL relational schema
- BIGSERIAL/BIGINT IDs
- Foreign-key relationships and indexes

## Design Decisions

- The project is separated into `backend` and `frontend` folders to keep API/server concerns separate from UI/client concerns.
- REST endpoints were used because they are simple, inspectable, and suitable for a thesis V1.
- PostgreSQL was selected to model users, tasks, habits, logs, settings, and notifications relationally.
- JWT authentication was used to protect user-specific API data.
- Passwords are hashed with bcrypt.
- AsyncStorage is used on the frontend for JWT and settings cache.
- The notification center is backend-backed so web and Android can share notification records.
- Native local notification scheduling is handled on the frontend because device scheduling is platform-specific.
- Web uses in-app notifications only because native device scheduling is not available through the current web implementation.
- Android emulator API calls use `10.0.2.2` so the emulator can reach the Windows host backend.

## Implementation Summary

The backend exposes grouped routes for auth, settings, tasks, habits, calendar, dashboard, and notifications. Controllers validate input, enforce user ownership through JWT middleware, query PostgreSQL, and return JSON responses.

The frontend uses React Navigation to separate authentication screens from the main tab interface. Auth and settings are handled through React contexts. Screens call typed API wrapper functions, render reusable UI components, and refresh related dashboard or notification state after changes.

Task reminder records are generated in the backend when reminders are enabled. Habit reminder records are generated for daily habits in a rolling window. The frontend uses these backend records to show the notification center and, where supported, schedule native local notifications.

## Testing Summary

Manual testing should cover:

- registration and login
- token restoration
- profile and password changes
- settings persistence
- theme and language switching
- task CRUD and completion
- multi-day task visibility
- habit CRUD, logging, and streaks
- habit end-date behavior
- calendar monthly and daily views
- dashboard summaries
- notification unread/read state
- reminder cancellation on task/habit changes
- web behavior
- Android emulator behavior

Detailed test cases are documented in `docs/testing.md`.

## Known Limitations

- Remote push notifications are not implemented in V1.
- Google Calendar integration is not implemented in V1.
- Web does not schedule native device notifications.
- Android native local notifications require a build where `expo-notifications` is available; Android Expo Go is treated as unsupported for native notification scheduling by the current implementation.
- Habit native reminder coverage is focused on daily habits.
- A formal automated test suite is not yet included.
- Production database migrations are not yet implemented as a dedicated migration system.

## Future Work

- Remote push notifications.
- Google Calendar synchronization.
- Automated backend and frontend tests.
- A formal migration tool for schema changes.
- More advanced habit recurrence reminder scheduling.
- Deployment documentation.
- Export/reporting features for thesis evaluation or user analytics.

## Suggested Thesis Chapter Structure

1. Introduction
   - Background
   - Problem statement
   - Project goals
   - Scope and limitations

2. Literature and Technology Review
   - Task management systems
   - Habit tracking systems
   - Web/mobile application frameworks
   - REST APIs and relational databases

3. Requirements Analysis
   - Functional requirements
   - Non-functional requirements
   - User roles
   - Use cases

4. System Design
   - High-level architecture
   - Database design
   - API design
   - Frontend navigation and UI design

5. Implementation
   - Backend implementation
   - Frontend implementation
   - Authentication
   - Tasks and habits
   - Calendar and dashboard
   - Notifications/reminders

6. Testing and Evaluation
   - Manual testing process
   - Test cases
   - Results and observations
   - Known limitations

7. Conclusions and Future Work
   - Summary of implemented system
   - Lessons learned
   - Future enhancements
