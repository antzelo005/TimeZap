const express = require("express");
const tasksController = require("../controllers/tasks.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.use(authMiddleware);

router.get("/", tasksController.getTasks);
router.get("/:id", tasksController.getTaskById);
router.post("/", tasksController.createTask);
router.put("/:id", tasksController.updateTask);
router.delete("/:id", tasksController.deleteTask);
router.patch("/:id/complete", tasksController.completeTask);
router.patch("/:id/cancel", tasksController.cancelTask);

module.exports = router;
