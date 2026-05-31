const express = require("express");
const calendarController = require("../controllers/calendar.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.use(authMiddleware);

router.get("/month", calendarController.getMonthView);
router.get("/day", calendarController.getDayView);

module.exports = router;
