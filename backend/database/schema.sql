-- TimeZap V1 reference schema
-- Documentation only.
-- Do not run this automatically from the application.
-- Do not use this to overwrite an existing database.

CREATE TABLE IF NOT EXISTS users (
  user_id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name VARCHAR(120),
  timezone VARCHAR(100) NOT NULL DEFAULT 'Europe/Athens',
  language VARCHAR(20) NOT NULL DEFAULT 'en',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_settings (
  setting_id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
  theme VARCHAR(20) NOT NULL DEFAULT 'system',
  notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  default_view VARCHAR(30) NOT NULL DEFAULT 'dashboard',
  week_starts_on VARCHAR(10) NOT NULL DEFAULT 'monday',
  time_format VARCHAR(10) NOT NULL DEFAULT '12h',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_user_settings_theme CHECK (theme IN ('light', 'dark', 'system')),
  CONSTRAINT chk_user_settings_week_start CHECK (week_starts_on IN ('monday', 'sunday'))
);

CREATE TABLE IF NOT EXISTS tasks (
  task_id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  title VARCHAR(150) NOT NULL,
  description TEXT,
  due_date DATE,
  end_date DATE,
  due_time TIME,
  start_time TIME,
  end_time TIME,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  is_all_day BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMP,
  emoji VARCHAR(20),
  color VARCHAR(20),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_tasks_status CHECK (status IN ('pending', 'completed', 'cancelled'))
);

CREATE TABLE IF NOT EXISTS habits (
  habit_id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  title VARCHAR(150) NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  start_time TIME,
  end_time TIME,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  emoji VARCHAR(20),
  color VARCHAR(20),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_habits_status CHECK (status IN ('active', 'archived'))
);

CREATE TABLE IF NOT EXISTS habit_rules (
  rule_id BIGSERIAL PRIMARY KEY,
  habit_id BIGINT NOT NULL REFERENCES habits(habit_id) ON DELETE CASCADE,
  recurrence_type VARCHAR(30) NOT NULL,
  interval_value INT NOT NULL DEFAULT 1,
  target_count INT NOT NULL DEFAULT 1,
  target_period VARCHAR(20),
  week_start VARCHAR(10) NOT NULL DEFAULT 'monday',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_habit_rules_recurrence CHECK (
    recurrence_type IN (
      'daily',
      'specific_weekdays',
      'every_n_days',
      'x_times_per_week',
      'x_times_per_month'
    )
  )
);

CREATE TABLE IF NOT EXISTS habit_rule_days (
  rule_day_id BIGSERIAL PRIMARY KEY,
  rule_id BIGINT NOT NULL REFERENCES habit_rules(rule_id) ON DELETE CASCADE,
  day_of_week INT,
  day_of_month INT
);

CREATE TABLE IF NOT EXISTS habit_logs (
  habit_log_id BIGSERIAL PRIMARY KEY,
  habit_id BIGINT NOT NULL REFERENCES habits(habit_id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  completed_count INT NOT NULL DEFAULT 1,
  target_count_snapshot INT NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'completed',
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  notification_id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  related_type VARCHAR(20) NOT NULL,
  related_id BIGINT NOT NULL,
  scheduled_for TIMESTAMP NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_due_date ON tasks(user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_user_end_date ON tasks(user_id, end_date);
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habits_user_end_date ON habits(user_id, end_date);
CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_date ON habit_logs(habit_id, log_date);
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date ON habit_logs(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_notifications_user_scheduled ON notifications(user_id, scheduled_for);
