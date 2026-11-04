import express from "express";
import { authUser } from "../middleware/authmiddleware.js";
import {
  createMessageNotification,
  deleteNotification,
  getNotificationPreferences,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  retryNotificationEmailDelivery,
  updateNotificationPreferences,
} from "../controllers/notificationController.js";

const notificationRouter = express.Router();

notificationRouter.use(authUser);
notificationRouter.get("/", getNotifications);
notificationRouter.get("/preferences", getNotificationPreferences);
notificationRouter.patch("/preferences", updateNotificationPreferences);
notificationRouter.post("/read-all", markAllNotificationsRead);
notificationRouter.post("/message", createMessageNotification);
notificationRouter.post("/:id/retry-email", retryNotificationEmailDelivery);
notificationRouter.patch("/:id/read", markNotificationRead);
notificationRouter.delete("/:id", deleteNotification);

export default notificationRouter;
