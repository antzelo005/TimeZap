require("dotenv").config();

const app = require("./app");
const { query } = require("./config/db");

const PORT = Number(process.env.PORT || 3000);

async function ensureRuntimeSchema() {
  await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(120)");
  await query("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_time TIME");
  await query("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS end_time TIME");
  await query("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS end_date DATE");
  await query("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE");
  await query("UPDATE tasks SET start_time = due_time WHERE start_time IS NULL AND due_time IS NOT NULL");
  await query("ALTER TABLE habits ADD COLUMN IF NOT EXISTS start_time TIME");
  await query("ALTER TABLE habits ADD COLUMN IF NOT EXISTS end_time TIME");
  await query("ALTER TABLE habits ADD COLUMN IF NOT EXISTS end_date DATE");
  await query("ALTER TABLE habits ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE");
  await query("ALTER TABLE habits ADD COLUMN IF NOT EXISTS reminder_time TIME");
  await query("CREATE INDEX IF NOT EXISTS idx_tasks_user_end_date ON tasks(user_id, end_date)");
  await query("CREATE INDEX IF NOT EXISTS idx_habits_user_end_date ON habits(user_id, end_date)");
  await query("ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS time_format VARCHAR(10) NOT NULL DEFAULT '12h'");
  await query("UPDATE user_settings SET time_format = '12h' WHERE time_format IS NULL");
  await query("ALTER TABLE user_settings ALTER COLUMN time_format SET DEFAULT '12h'");
  await query("ALTER TABLE user_settings ALTER COLUMN time_format SET NOT NULL");
  await query(`
    CREATE TABLE IF NOT EXISTS notifications (
      notification_id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      related_type VARCHAR(20) NOT NULL,
      related_id BIGINT,
      kind VARCHAR(40),
      title TEXT,
      body TEXT,
      scheduled_for TIMESTAMP NOT NULL,
      occurrence_date DATE,
      status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
      read_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await query("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS kind VARCHAR(40)");
  await query("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title TEXT");
  await query("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS body TEXT");
  await query("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS occurrence_date DATE");
  await query("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMP");
  await query("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW()");
  await query("ALTER TABLE notifications ALTER COLUMN related_id DROP NOT NULL");
  await query("ALTER TABLE notifications ALTER COLUMN status SET DEFAULT 'scheduled'");
  await query("UPDATE notifications SET status = 'scheduled' WHERE status = 'pending'");
  await query("UPDATE notifications SET kind = 'standard_reminder' WHERE kind IS NULL");
  await query("UPDATE notifications SET title = 'Notification' WHERE title IS NULL");
  await query("UPDATE notifications SET body = '' WHERE body IS NULL");
  await query("ALTER TABLE notifications ALTER COLUMN kind SET NOT NULL");
  await query("ALTER TABLE notifications ALTER COLUMN title SET NOT NULL");
  await query("ALTER TABLE notifications ALTER COLUMN body SET NOT NULL");
  await query("CREATE INDEX IF NOT EXISTS idx_notifications_user_scheduled ON notifications(user_id, scheduled_for)");
  await query("CREATE INDEX IF NOT EXISTS idx_notifications_user_status_read ON notifications(user_id, status, read_at)");
  await query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_unique_scheduled
    ON notifications(user_id, related_type, related_id, kind, scheduled_for)
    WHERE status = 'scheduled'
  `);
  await query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_notifications_related_type'
      ) THEN
        ALTER TABLE notifications
          ADD CONSTRAINT chk_notifications_related_type
          CHECK (related_type IN ('task', 'habit', 'system'));
      END IF;
    END
    $$
  `);
  await query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_notifications_kind'
      ) THEN
        ALTER TABLE notifications
          ADD CONSTRAINT chk_notifications_kind
          CHECK (kind IN ('standard_reminder', 'overdue_30', 'overdue_15', 'overdue_5', 'system'));
      END IF;
    END
    $$
  `);
  await query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_notifications_status'
      ) THEN
        ALTER TABLE notifications
          ADD CONSTRAINT chk_notifications_status
          CHECK (status IN ('scheduled', 'cancelled'));
      END IF;
    END
    $$
  `);
}

ensureRuntimeSchema()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`TimeZap backend listening on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to prepare TimeZap runtime schema", error);
    process.exit(1);
  });
