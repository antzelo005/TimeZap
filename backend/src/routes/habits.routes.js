const express = require("express");
const habitsController = require("../controllers/habits.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.use(authMiddleware);

router.get("/", habitsController.getHabits);
router.get("/:id", habitsController.getHabitById);
router.post("/", habitsController.createHabit);
router.put("/:id", habitsController.updateHabit);
router.delete("/:id", habitsController.deleteHabit);
router.post("/:id/log", habitsController.logHabit);
router.delete("/:id/log/:date", habitsController.deleteHabitLog);
router.get("/:id/streak", habitsController.getHabitStreak);

module.exports = router;
