const express = require("express");
const dashboardController = require("../controllers/dashboard.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.use(authMiddleware);

router.get("/today", dashboardController.getTodayDashboard);

module.exports = router;
