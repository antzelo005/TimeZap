require("dotenv").config();

const app = require("./app");
const { query } = require("./config/db");

const PORT = Number(process.env.PORT || 3000);

async function ensureRuntimeSchema() {
  await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(120)");
  await query("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_time TIME");
  await query("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS end_time TIME");
  await query("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS end_date DATE");
  await query("UPDATE tasks SET start_time = due_time WHERE start_time IS NULL AND due_time IS NOT NULL");
  await query("ALTER TABLE habits ADD COLUMN IF NOT EXISTS start_time TIME");
  await query("ALTER TABLE habits ADD COLUMN IF NOT EXISTS end_time TIME");
  await query("ALTER TABLE habits ADD COLUMN IF NOT EXISTS end_date DATE");
  await query("CREATE INDEX IF NOT EXISTS idx_tasks_user_end_date ON tasks(user_id, end_date)");
  await query("CREATE INDEX IF NOT EXISTS idx_habits_user_end_date ON habits(user_id, end_date)");
  await query("ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS time_format VARCHAR(10) NOT NULL DEFAULT '12h'");
  await query("UPDATE user_settings SET time_format = '12h' WHERE time_format IS NULL");
  await query("ALTER TABLE user_settings ALTER COLUMN time_format SET DEFAULT '12h'");
  await query("ALTER TABLE user_settings ALTER COLUMN time_format SET NOT NULL");
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
