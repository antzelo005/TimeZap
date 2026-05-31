const express = require("express");
const settingsController = require("../controllers/settings.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.use(authMiddleware);

router.get("/", settingsController.getSettings);
router.put("/", settingsController.updateSettings);

module.exports = router;
