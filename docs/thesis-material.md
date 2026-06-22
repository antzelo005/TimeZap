# Thesis Material Summary

This document summarizes TimeZap in a form that can later support thesis writing.

## Project Overview

TimeZap is a full-stack task and habit management information system. It allows users to create tasks, track recurring habits, view daily progress, inspect calendar activity, configure personal settings, receive reminder records through an in-app notification center, and optionally request AI-generated task and habit suggestions.

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
- offering optional intelligent assistance for suggested tasks and habits without automatic creation
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
- The system shall allow users to request optional AI suggestions for tasks and habits from a short prompt.
- The system shall require user confirmation before creating any AI-suggested task or habit.
- The system shall keep the Gemini API key only in the backend environment.
- The system shall not automatically insert AI-generated suggestions into the user's task or habit data.
- The system shall return a clear unavailable message when AI Suggestions are not configured.

## Non-Functional Requirements

- The system should be understandable and maintainable for a thesis V1.
- The backend should expose clear REST endpoints.
- The database should use relational integrity through primary and foreign keys.
- Passwords must be hashed, not stored in plain text.
- The frontend should support web and Android using the same codebase.
- The UI should support dark/light/system theme preferences.
- The app should degrade gracefully on platforms where native notifications are unavailable.
- The AI Suggestions feature should degrade gracefully when the Gemini API key is not configured.
- External AI-provider errors should not expose raw provider internals or secrets to the frontend.
- The AI Suggestions feature should remain optional so the core task/habit system can operate without it.
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
- Gemini API for optional AI Suggestions

External service:

- Google Gemini API / Google AI Studio for optional structured task and habit suggestion generation. The integration is backend-mediated and depends on `GEMINI_API_KEY` being configured in the backend environment.

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
- AI Suggestions are implemented as a backend-mediated feature so the Gemini API key is not exposed to the frontend. The feature returns structured suggestions only; creation still goes through the existing task and habit APIs after explicit user action.
- AI prompt text and rejected suggestions are not persisted in V1. This keeps the feature lightweight and avoids adding AI-specific database tables before there is a clear product need.

## Implementation Summary

The backend exposes grouped routes for auth, settings, tasks, habits, calendar, dashboard, notifications, and AI suggestions. Controllers validate input, enforce user ownership through JWT middleware, query PostgreSQL or call the Gemini API where appropriate, and return JSON responses.

The frontend uses React Navigation to separate authentication screens from the main tab interface. Auth and settings are handled through React contexts. Screens call typed API wrapper functions, render reusable UI components, and refresh related dashboard or notification state after changes. The AI Suggestions modal appears as a small dashboard helper and creates selected suggestions through the existing task and habit creation functions.

Task reminder records are generated in the backend when reminders are enabled. Habit reminder records are generated for daily habits in a rolling window. The frontend uses these backend records to show the notification center and, where supported, schedule native local notifications.

## AI Suggestions Feature

AI Suggestions is an optional intelligent assistance feature in TimeZap V1. The user opens the AI Suggestions modal, writes a short prompt, selects a language and focus area, and sends the request to the backend endpoint `POST /api/ai/suggestions`.

The backend validates the prompt, language, and focus value before calling the Gemini API. The Gemini API key is read only from the backend environment and is never sent to the frontend. The backend asks Gemini for structured task and habit suggestions, then sanitizes the returned fields before sending them back to the app.

The response contains up to five task suggestions, up to five habit suggestions, and a notes string. Task suggestions include title, description, date hint, estimated duration, priority, icon, and color. Habit suggestions include title, description, recurrence type, target count, target period, icon, and color.

The feature is intentionally review-based. Nothing is auto-created by AI. The user must manually add each suggested task or habit, and the frontend then uses the same existing task/habit creation APIs used by normal manual entry.

V1 does not store AI prompts or Gemini responses in the database. It also does not use AI for medical, legal, or financial advice, and it does not perform autonomous schedule management.

## AI Security and Privacy Considerations

- `GEMINI_API_KEY` is stored only in `backend/.env` and must not be committed.
- The frontend never receives the Gemini API key and never calls Gemini directly.
- Raw provider errors are converted into short user-facing backend messages.
- User prompts are not stored in the TimeZap database in V1.
- Suggested items are not inserted unless the user explicitly chooses to add them.
- The feature is optional; the rest of the system works when `GEMINI_API_KEY` is missing.

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
- AI suggestions unavailable state when no API key is configured
- AI suggestion generation, review, and single-item add flow when the API key is configured
- AI suggestion generation in English, Greek, and Romanian where possible
- confirmation that AI suggestions are not auto-created before the user presses Add
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
- AI Suggestions require a Gemini API key and depend on an external AI provider.
- AI Suggestions are intentionally limited to structured suggestions, not full autonomous planning.
- AI Suggestions do not yet personalize output from long-term user history or existing task/habit patterns.
- AI prompts and rejected suggestions are not stored in V1.

## Future Work

- Remote push notifications.
- Google Calendar synchronization.
- Automated backend and frontend tests.
- A formal migration tool for schema changes.
- More advanced habit recurrence reminder scheduling.
- More advanced AI planning or personalization beyond the optional V1 suggestions helper.
- Personalized AI suggestions based on existing tasks, habits, and completion history.
- AI weekly planning that still requires explicit user confirmation.
- Smarter habit recurrence recommendations.
- Local or offline AI model alternatives if privacy, cost, or availability become important.
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
