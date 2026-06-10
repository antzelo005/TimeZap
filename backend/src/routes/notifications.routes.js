const express = require("express");
const notificationsController = require("../controllers/notifications.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.use(authMiddleware);

router.get("/", notificationsController.getNotifications);
router.get("/unread-count", notificationsController.getUnreadCount);
router.patch("/read-all", notificationsController.markAllNotificationsRead);
router.patch("/:id/read", notificationsController.markNotificationRead);
router.patch("/:id/cancel", notificationsController.cancelNotification);
router.delete("/:id", notificationsController.deleteNotification);

module.exports = router;
