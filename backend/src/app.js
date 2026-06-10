const express = require("express");
const cors = require("cors");
const { query } = require("./config/db");
const authRoutes = require("./routes/auth.routes");
const tasksRoutes = require("./routes/tasks.routes");
const habitsRoutes = require("./routes/habits.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const calendarRoutes = require("./routes/calendar.routes");
const settingsRoutes = require("./routes/settings.routes");
const notificationsRoutes = require("./routes/notifications.routes");
const errorMiddleware = require("./middleware/error.middleware");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "TimeZap backend is running"
  });
});

app.get("/api/db-health", async (req, res, next) => {
  try {
    const result = await query("SELECT NOW() AS current_time");
    res.status(200).json({
      status: "ok",
      database: "connected",
      time: result.rows[0].current_time
    });
  } catch (error) {
    next(error);
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/tasks", tasksRoutes);
app.use("/api/habits", habitsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/notifications", notificationsRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: true,
    message: "Route not found"
  });
});

app.use(errorMiddleware);

module.exports = app;
