-- TimeZap example seed file
-- Reference only.
-- Do not run this blindly against an existing database.
-- Replace placeholder values with your own local test data.

-- Example developer workflow:
-- 1. Register a user through POST /api/auth/register
-- 2. Use the API to create tasks and habits
-- 3. Keep this file as a reference for future reproducible demo data

-- Example inserts for a local disposable environment only:
-- INSERT INTO users (email, password_hash, timezone, language, is_active, created_at, updated_at)
-- VALUES ('demo@example.com', '<bcrypt_hash_here>', 'Europe/Athens', 'en', true, NOW(), NOW());

-- INSERT INTO user_settings (user_id, theme, notifications_enabled, default_view, week_starts_on, created_at, updated_at)
-- VALUES (1, 'light', true, 'dashboard', 'monday', NOW(), NOW());
