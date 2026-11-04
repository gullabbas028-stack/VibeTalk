import mongoose from "mongoose";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import {
  createNotification,
  isEmailConfigured,
  notificationCategories,
  normalizeNotificationPreferences,
  retryNotificationEmail,
} from "../services/notificationService.js";

const notificationTypes = new Set([
  "friend_request",
  "friend_request_accepted",
  "new_message",
  "account_update",
  "promotional_offer",
  "system_alert",
  "event_reminder",
]);

const preferenceTypeKeys = new Set([
  "friendRequests",
  "acceptedRequests",
  "messages",
  "accountUpdates",
  "promotions",
  "events",
]);

const preferenceChannelKeys = new Set(["inApp", "email", "sms"]);

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const getNotifications = async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const filter = { recipient: req.user._id };
    const { type, read, q } = req.query;

    if (type && type !== "all") {
      if (!notificationTypes.has(type)) {
        return res.status(400).json({ message: "Invalid notification type" });
      }
      filter.type = type;
    }
    if (read === "unread") filter.readAt = null;
    if (read === "read") filter.readAt = { $ne: null };
    if (typeof q === "string" && q.trim()) {
      const search = new RegExp(escapeRegex(q.trim().slice(0, 100)), "i");
      filter.$or = [{ title: search }, { message: search }];
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ recipient: req.user._id, readAt: null }),
    ]);

    return res.status(200).json({
      notifications,
      page,
      limit,
      total,
      unreadCount,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return res.status(500).json({ message: "Unable to load notifications" });
  }
};

export const getNotificationPreferences = async (req, res) => {
  return res.status(200).json({
    preferences: normalizeNotificationPreferences(
      req.user.notificationPreferences,
    ),
    emailConfigured: isEmailConfigured(),
    smsConfigured: false,
  });
};

export const updateNotificationPreferences = async (req, res) => {
  try {
    if (!isPlainObject(req.body)) {
      return res.status(400).json({ message: "Invalid notification preferences" });
    }
    const { channels, types } = req.body;
    if (
      (channels !== undefined && !isPlainObject(channels)) ||
      (types !== undefined && !isPlainObject(types))
    ) {
      return res.status(400).json({ message: "Invalid notification preferences" });
    }

    const updates = {};
    if (channels) {
      for (const [channel, enabled] of Object.entries(channels)) {
        if (!preferenceChannelKeys.has(channel) || typeof enabled !== "boolean") {
          return res.status(400).json({ message: "Invalid notification channel" });
        }
        if (channel === "sms" && enabled) {
          return res.status(400).json({
            message: "SMS notifications are not configured for this application",
          });
        }
        updates[`notificationPreferences.channels.${channel}`] = enabled;
      }
    }
    if (types) {
      for (const [type, typeChannels] of Object.entries(types)) {
        if (!preferenceTypeKeys.has(type) || !isPlainObject(typeChannels)) {
          return res.status(400).json({ message: "Invalid notification type" });
        }
        for (const [channel, enabled] of Object.entries(typeChannels)) {
          if (!preferenceChannelKeys.has(channel) || typeof enabled !== "boolean") {
            return res.status(400).json({ message: "Invalid notification type preference" });
          }
          if (channel === "sms" && enabled) {
            return res.status(400).json({
              message: "SMS notifications are not configured for this application",
            });
          }
          updates[`notificationPreferences.types.${type}.${channel}`] = enabled;
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No notification preferences provided" });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true },
    ).select("notificationPreferences");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      preferences: normalizeNotificationPreferences(
        user.notificationPreferences,
      ),
      emailConfigured: isEmailConfigured(),
      smsConfigured: false,
    });
  } catch (error) {
    console.error("Error updating notification preferences:", error);
    return res.status(500).json({ message: "Unable to save notification preferences" });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid notification ID" });
    }
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { $set: { readAt: new Date() } },
      { new: true },
    );
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    return res.status(200).json({ notification });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return res.status(500).json({ message: "Unable to update notification" });
  }
};

export const markAllNotificationsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { recipient: req.user._id, readAt: null },
      { $set: { readAt: new Date() } },
    );
    return res.status(200).json({ updatedCount: result.modifiedCount });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return res.status(500).json({ message: "Unable to update notifications" });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid notification ID" });
    }
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user._id,
    });
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    return res.status(200).json({ message: "Notification deleted" });
  } catch (error) {
    console.error("Error deleting notification:", error);
    return res.status(500).json({ message: "Unable to delete notification" });
  }
};

export const retryNotificationEmailDelivery = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid notification ID" });
    }
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user._id,
    });
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    const preferences = normalizeNotificationPreferences(
      req.user.notificationPreferences,
    );
    if (!preferences.channels.email) {
      return res.status(400).json({
        message: "Email notifications are disabled in your preferences",
      });
    }
    const category = notificationCategories[notification.type];
    if (!category || !preferences.types[category].email) {
      return res.status(400).json({
        message: "Email is disabled for this notification type",
      });
    }
    if (!["failed", "not_configured"].includes(notification.channels.email.status)) {
      return res.status(409).json({
        message: "Only failed or unconfigured email notifications can be retried",
      });
    }

    await retryNotificationEmail(notification._id);
    return res.status(202).json({ message: "Email retry queued" });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error("Error retrying notification email:", error);
    return res.status(500).json({ message: "Unable to retry email delivery" });
  }
};

export const createMessageNotification = async (req, res) => {
  try {
    const { recipientId } = req.body;
    if (!mongoose.isValidObjectId(recipientId)) {
      return res.status(400).json({ message: "Invalid message recipient" });
    }

    const isFriend = req.user.friends.some(
      (friendId) => friendId.toString() === recipientId,
    );
    if (!isFriend) {
      return res.status(403).json({
        message: "You can only notify a connected learning partner",
      });
    }

    const recipient = await User.findOne({
      _id: recipientId,
      friends: req.user._id,
    }).select("_id");
    if (!recipient) {
      return res.status(403).json({
        message: "You can only notify a connected learning partner",
      });
    }

    const notification = await createNotification({
      recipientId,
      type: "new_message",
      title: `New message from ${req.user.fullName}`,
      message: `${req.user.fullName} sent you a message.`,
      actor: req.user,
      link: "/chat",
    });
    return res.status(201).json({
      message: "Message notification recorded",
      notificationId: notification?._id ?? null,
    });
  } catch (error) {
    console.error("Error creating new-message notification:", error);
    return res.status(500).json({ message: "Unable to record message notification" });
  }
};
